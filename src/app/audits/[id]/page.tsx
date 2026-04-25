import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import AuditTabs from '@/components/AuditTabs';
import EditableAuditHeader from '@/components/EditableAuditHeader';
import { getSession } from '@/lib/auth';

export default async function AuditDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const userRole = user.role || 'User';

  try {
    // 1. Fetch Audit via RAW SQL to ensure we get new fields even if client is stale
    const audits: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Audit WHERE id = ? LIMIT 1`,
      params.id
    );
    
    if (!audits || audits.length === 0) {
      notFound();
    }
    
    const auditBase = audits[0];
    
    // Fetch team members separately since we can't 'include' in raw queries easily
    const teamMembers = await prisma.teamMember.findMany({
      where: { auditId: auditBase.id }
    });

    const audit = {
      ...auditBase,
      teamMembers
    };

    // Access Control: Only allow team members or Business Operations
    const isGlobalManager = userRole === 'Business Operations';
    if (!isGlobalManager) {
      const isMember = audit.teamMembers.some(m => m.userId === user.id);
      if (!isMember) {
        return (
          <div className="p-8 text-center bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-800">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="mb-4">You are not authorized to view this audit. Please contact Business Operations if you believe this is an error.</p>
            <div className="mt-6">
              <Link href="/" className="text-blue-600 underline font-medium">Return to Dashboard</Link>
            </div>
          </div>
        );
      }
    }

    // 2. Fetch Groups and Procedures with RAW logic to avoid schema mismatch errors
    const rawGroups: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM ProcedureGroup WHERE auditId = ? ORDER BY displayOrder ASC`,
      audit.id
    );

    let rawProcedures: any[] = [];
    try {
      rawProcedures = await prisma.$queryRawUnsafe(
        `SELECT p.*, t.name as assignedToName, t.role as assignedToRole, t.email as assignedToEmail
         FROM Procedure p
         LEFT JOIN TeamMember t ON p.assignedToId = t.id
         WHERE p.auditId = ?`,
        audit.id
      );
    } catch (e) {
      console.warn('AuditDetail: Full procedure join failed (schema syncing?). Falling back to basic fetch.');
      // Fallback: Fetch procedures without the join to ensure page loads
      rawProcedures = await prisma.$queryRawUnsafe(
        `SELECT * FROM Procedure WHERE auditId = ?`,
        audit.id
      );
    }

    // 3. For each procedure, fetch attachments and messages
    const proceduresWithRelations = await Promise.all(rawProcedures.map(async (proc) => {
      const attachments: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM Attachment WHERE procedureId = ? ORDER BY displayOrder ASC`,
        proc.id
      );
      
      const messages: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM ProcedureMessage WHERE procedureId = ? ORDER BY createdAt ASC`,
        proc.id
      );

      return {
        ...proc,
        assignedTo: proc.assignedToId ? {
          id: proc.assignedToId,
          name: proc.assignedToName,
          role: proc.assignedToRole,
          email: proc.assignedToEmail
        } : null,
        attachments,
        messages
      };
    }));

    // 4. Map procedures to groups
    const groupsWithProcedures = rawGroups.map(group => ({
      ...group,
      procedures: proceduresWithRelations.filter(p => p.groupId === group.id)
    }));

    const finalAuditData = {
      ...audit,
      procedureGroups: groupsWithProcedures,
      procedures: proceduresWithRelations // Keep all for backward compatibility if needed
    };

    return (
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors group">
          <div className="bg-slate-100 p-1 rounded-lg group-hover:bg-slate-200 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Back to Dashboard</span>
        </Link>

        <EditableAuditHeader audit={finalAuditData as any} userRole={userRole} />

        <AuditTabs audit={finalAuditData as any} user={session?.user} />
      </div>
    );
  } catch (error: any) {
    console.error("Critical Error loading audit:", error);
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 text-red-800">
        <h1 className="text-2xl font-bold mb-2">Error Loading Audit</h1>
        <p className="mb-4">The system encountered an error while retrieving the audit data.</p>
        <code className="text-xs bg-red-100 p-2 rounded">{error.message}</code>
        <div className="mt-6">
          <Link href="/" className="text-blue-600 underline font-medium">Return to Dashboard</Link>
        </div>
      </div>
    );
  }
}
