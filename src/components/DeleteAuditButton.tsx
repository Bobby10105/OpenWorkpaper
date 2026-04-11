'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeleteAuditButton({ 
  auditId, 
  userRole 
}: { 
  auditId: string;
  userRole?: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Only show the delete button to Business Operations
  const canDelete = userRole === 'Business Operations';
  if (!canDelete) {
    return null;
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entire audit? This action cannot be undone and all procedures and attachments will be lost.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/audits/${auditId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete the audit.');
      }
    } catch (error) {
      console.error('Error deleting audit:', error);
      alert('An error occurred while deleting the audit.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center space-x-2 px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
      title="Delete Audit"
    >
      <Trash2 className="w-4 h-4" />
      <span>{isDeleting ? 'Deleting...' : 'Delete Audit'}</span>
    </button>
  );
}
