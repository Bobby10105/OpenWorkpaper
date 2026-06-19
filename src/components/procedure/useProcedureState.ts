import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DOMPurify from 'isomorphic-dompurify';
import type { Attachment, ProcedureMessage } from '@prisma/client';
import type { ProcedureWithRelations } from '@/lib/types';

export function useProcedureState({
  procedure,
}: {
  procedure: ProcedureWithRelations;
}) {
  const router = useRouter();

  const RICH_TEXT_FIELDS = useMemo(() => ['purpose', 'source', 'scope', 'methodology', 'results', 'conclusions'], []);

  const formatDateForInput = (date: Date | string | null | number | undefined) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const normalizeData = useCallback((p: ProcedureWithRelations) => {
    const d: Record<string, string> = {
      title: (p.title || '').trim(),
      purpose: p.purpose || '',
      source: p.source || '',
      scope: p.scope || '',
      methodology: p.methodology || '',
      results: p.results || '',
      conclusions: p.conclusions || '',
      preparedBy: (p.preparedBy || '').trim(),
      preparedDate: formatDateForInput(p.preparedDate),
      reviewedBy: (p.reviewedBy || '').trim(),
      reviewedDate: formatDateForInput(p.reviewedDate),
      assignedToId: p.assignedToId || '',
    };

    RICH_TEXT_FIELDS.forEach(field => {
      if (typeof d[field] === 'string') {
        d[field] = DOMPurify.sanitize(d[field]).trim();
      }
    });

    return JSON.stringify(d);
  }, [RICH_TEXT_FIELDS]);

  const [data, setData] = useState(procedure);
  const [saving, setSaving] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(normalizeData(procedure));
  const [attachments, setAttachments] = useState<Attachment[]>(procedure.attachments || []);
  const [messages, setMessages] = useState<ProcedureMessage[]>(procedure.messages || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  
  const lastSavedDataRef = useRef(lastSavedData);
  useEffect(() => { lastSavedDataRef.current = lastSavedData; }, [lastSavedData]);

  const isLocked = !!(procedure.reviewedBy && procedure.reviewedDate);
  const isReviewed = !!(data.reviewedBy && data.reviewedDate);
  const isPrepared = !!(data.preparedBy && data.preparedDate);

  useEffect(() => {
    const normalizedProp = normalizeData(procedure);
    const normalizedState = normalizeData(dataRef.current);
    
    if (normalizedProp !== lastSavedDataRef.current || normalizedProp !== normalizedState) {
      setData(procedure);
      setAttachments(procedure.attachments || []);
      setMessages(procedure.messages || []);
      setLastSavedData(normalizedProp);
      setHasUnsavedChanges(false);
    }
  }, [procedure, normalizeData]);

  const handleSave = useCallback(async (updatedData?: ProcedureWithRelations) => {
    if (isLocked) return;

    const rawData = updatedData || dataRef.current;
    const currentDataStr = normalizeData(rawData);

    if (currentDataStr === lastSavedDataRef.current) {
      setHasUnsavedChanges(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/procedures/${procedure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: currentDataStr,
      });
      
      if (res.ok) {
        const savedProcedure = await res.json();
        const savedNormalized = normalizeData(savedProcedure);
        setLastSavedData(savedNormalized);
        
        const parsedSaved = JSON.parse(savedNormalized);
        setData(prev => ({ ...prev, ...parsedSaved }));
        setHasUnsavedChanges(false);
        
        router.refresh();
      } else if (res.status === 423) {
        toast.error("This procedure is locked for review and cannot be saved.");
      } else {
        toast.error("Failed to save changes.");
      }
    } catch (err: unknown) {
      console.error('Save failed:', err);
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }, [procedure.id, router, normalizeData, isLocked]);

  useEffect(() => {
    if (isLocked) return;

    const currentDataStr = normalizeData(data);
    const isDirty = currentDataStr !== lastSavedData;

    if (isDirty) {
      if (!hasUnsavedChanges) setHasUnsavedChanges(true);
      
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave();
      }, 3000);
    } else {
      if (hasUnsavedChanges) setHasUnsavedChanges(false);
    }

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [data, lastSavedData, handleSave, isLocked, hasUnsavedChanges, normalizeData]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (isLocked) return;
    setData({ ...data, [e.target.name]: e.target.value });
    
    if (e.target instanceof HTMLTextAreaElement) {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
  };

  const handleRichTextChange = (fieldName: string, content: string) => {
    if (isLocked) return;
    setData(prev => ({ ...prev, [fieldName]: content }));
  };

  const isFieldDirty = (fieldName: string) => {
    return data[fieldName as keyof ProcedureWithRelations] !== procedure[fieldName as keyof ProcedureWithRelations];
  };

  return {
    data,
    setData,
    saving,
    hasUnsavedChanges,
    attachments,
    setAttachments,
    messages,
    setMessages,
    isLocked,
    isReviewed,
    isPrepared,
    isUnlocking,
    setIsUnlocking,
    formatDateForInput,
    handleSave,
    handleChange,
    handleRichTextChange,
    isFieldDirty
  };
}
