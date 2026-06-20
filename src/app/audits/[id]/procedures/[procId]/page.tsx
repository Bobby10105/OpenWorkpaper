import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ProcedureDetail from '@/components/ProcedureDetail';
import { Suspense } from 'react';
import type { Attachment, ProcedureMessage, TeamMember } from '@prisma/client';
import type { ProcedureWithRelations } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface RawProcedure {
  id: string;
  title: string;
  description: string;
  status: string;
  phase: string;
  auditId: string;
  groupId: string | null;
  assignedToId: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  assignedToName?: string;
  assignedToRole?: string;
  assignedToEmail?: string;
}

export default async function ProcedurePage(props: { params: Promise<{ id: string; procId: string }> }) {
  const params = await props.params;
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const userRole = user.role || 'User';

  let procedureData: {
    proc: RawProcedure;
    attachments: Attachment[];
    messages: ProcedureMessage[];
    teamMembers: TeamMember[];
    nomenclature: string;
  } | null = null;

  let errorMessage: string | null = null;
  let isUnauthorized = false;

  try {
    // 1. Fetch Procedure with relations using RAW SQL for robustness
    const procedures = await prisma.$queryRaw<RawProcedure[]>`
       SELECT p.*, t.name as assignedToName, t.role as assignedToRole, t.email as assignedToEmail
       FROM Procedure p
       LEFT JOIN TeamMember t ON p.assignedToId = t.id
       WHERE p.id = ${params.procId} AND p.auditId = ${params.id} LIMIT 1
    `;

    if (!procedures || procedures.length === 0) {
      notFound();
    }

    const proc = procedures[0];

    // 2. Fetch attachments and messages
    const attachments = await prisma.$queryRaw<Attachment[]>`SELECT * FROM Attachment WHERE procedureId = ${proc.id} ORDER BY displayOrder ASC`;
    
    const messages = await prisma.$queryRaw<ProcedureMessage[]>`SELECT * FROM ProcedureMessage WHERE procedureId = ${proc.id} ORDER BY createdAt ASC`;

    // 3. Fetch team members for the assignment dropdown
    const teamMembers = await prisma.teamMember.findMany({
      where: { auditId: params.id }
    });

    // Access Control
    const isGlobalManager = userRole === 'Business Operations';
    if (!isGlobalManager) {
      const isMember = teamMembers.some(m => m.userId === user.id);
      if (!isMember) {
        isUnauthorized = true;
      }
    }

    if (!isUnauthorized) {
      // 4. Calculate nomenclature (Phase.Group.Index)
      let nomenclature = "?";
      if (proc.groupId) {
        const allGroups = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM ProcedureGroup WHERE auditId = ${params.id} AND phase = ${proc.phase} ORDER BY displayOrder ASC`;
        const groupIndex = allGroups.findIndex(g => g.id === proc.groupId);
        const phaseMap: Record<string, number> = { 'Planning': 1, 'Fieldwork': 2, 'Reporting': 3 };
        const phaseNum = phaseMap[proc.phase] || 0;
        
        // Find procedure index in group
        let groupProcs: { id: string }[] = [];
        try {
          groupProcs = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM Procedure WHERE groupId = ${proc.groupId} ORDER BY displayOrder ASC, createdAt ASC`;
        } catch (e) {
          console.warn("[ProcedurePage] displayOrder column missing, falling back to createdAt", e);
          groupProcs = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM Procedure WHERE groupId = ${proc.groupId} ORDER BY createdAt ASC`;
        }
        const procIndex = groupProcs.findIndex(p => p.id === proc.id);
        const getLetter = (index: number) => String.fromCharCode(97 + index);

        nomenclature = `${phaseNum}.${groupIndex + 1}.${getLetter(procIndex)}`;
      }

      procedureData = {
        proc,
        attachments,
        messages,
        teamMembers,
        nomenclature
      };
    }

  } catch (error: unknown) {
    console.error("Error loading procedure detail:", error);
    errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
  }

  // --- RENDERING ---
  
  if (errorMessage) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 text-red-800">
        <h1 className="text-2xl font-bold mb-2">Error Loading Procedure</h1>
        <code className="text-xs bg-red-100 p-2 rounded">{errorMessage}</code>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="p-8 text-center bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-800">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="mb-4">You are not authorized to view this procedure.</p>
      </div>
    );
  }

  if (!procedureData) {
    notFound();
  }

  const { proc, attachments, messages, teamMembers, nomenclature } = procedureData;

  const procedureWithRelations = {
    ...proc,
    assignedTo: proc.assignedToId ? {
      id: proc.assignedToId,
      name: proc.assignedToName || "Unknown",
      role: proc.assignedToRole || "User",
      email: proc.assignedToEmail || ""
    } : null,
    attachments,
    messages
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Suspense fallback={<div className="p-12 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Loading Procedure Workspace...</div>}>
        <ProcedureDetail 
          procedure={procedureWithRelations as unknown as ProcedureWithRelations} 
          nomenclature={nomenclature}
          auditId={params.id}
          user={session.user}
          teamMembers={teamMembers}
        />
      </Suspense>
    </div>
  );
}
