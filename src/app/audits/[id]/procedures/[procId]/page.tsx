import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ProcedureDetail from '@/components/ProcedureDetail';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function ProcedurePage(props: { params: Promise<{ id: string; procId: string }> }) {
  const params = await props.params;
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const userRole = user.role || 'User';

  try {
    // 1. Fetch Procedure with relations using RAW SQL for robustness
    const procedures: any[] = await prisma.$queryRawUnsafe(
      `SELECT p.*, t.name as assignedToName, t.role as assignedToRole, t.email as assignedToEmail
       FROM Procedure p
       LEFT JOIN TeamMember t ON p.assignedToId = t.id
       WHERE p.id = ? AND p.auditId = ? LIMIT 1`,
      params.procId,
      params.id
    );

    if (!procedures || procedures.length === 0) {
      notFound();
    }

    const proc = procedures[0];

    // 2. Fetch attachments and messages
    const attachments: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Attachment WHERE procedureId = ? ORDER BY displayOrder ASC`,
      proc.id
    );
    
    const messages: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM ProcedureMessage WHERE procedureId = ? ORDER BY createdAt ASC`,
      proc.id
    );

    // 3. Fetch team members for the assignment dropdown
    const teamMembers = await prisma.teamMember.findMany({
      where: { auditId: params.id }
    });

    // Access Control
    const isGlobalManager = userRole === 'Business Operations';
    if (!isGlobalManager) {
      const isMember = teamMembers.some(m => m.userId === user.id);
      if (!isMember) {
        return (
          <div className="p-8 text-center bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-800">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="mb-4">You are not authorized to view this procedure.</p>
          </div>
        );
      }
    }

    // 4. Calculate nomenclature (Phase.Group.Index)
    let nomenclature = "?";
    if (proc.groupId) {
      const allGroups: any[] = await prisma.$queryRawUnsafe(
        `SELECT id FROM ProcedureGroup WHERE auditId = ? AND phase = ? ORDER BY displayOrder ASC`,
        params.id,
        proc.phase
      );
      const groupIndex = allGroups.findIndex(g => g.id === proc.groupId);
      const phaseMap: Record<string, number> = { 'Planning': 1, 'Fieldwork': 2, 'Reporting': 3 };
      const phaseNum = phaseMap[proc.phase] || 0;
      // Find procedure index in group
      let groupProcs: any[] = [];
      try {
        groupProcs = await prisma.$queryRawUnsafe(
          `SELECT id FROM Procedure WHERE groupId = ? ORDER BY displayOrder ASC, createdAt ASC`,
          proc.groupId
        );
      } catch (e) {
        console.warn("[ProcedurePage] displayOrder column missing, falling back to createdAt");
        groupProcs = await prisma.$queryRawUnsafe(
          `SELECT id FROM Procedure WHERE groupId = ? ORDER BY createdAt ASC`,
          proc.groupId
        );
      }
      const procIndex = groupProcs.findIndex(p => p.id === proc.id);
      const getLetter = (index: number) => String.fromCharCode(97 + index);

      nomenclature = `${phaseNum}.${groupIndex + 1}.${getLetter(procIndex)}`;
      }


    const procedureWithRelations = {
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

    return (
      <div className="min-h-screen bg-slate-50/50">
        <Suspense fallback={<div className="p-12 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Loading Procedure Workspace...</div>}>
          <ProcedureDetail 
            procedure={procedureWithRelations as any} 
            nomenclature={nomenclature}
            auditId={params.id}
            user={session.user}
            teamMembers={teamMembers}
          />
        </Suspense>
      </div>
    );

  } catch (error: any) {
    console.error("Error loading procedure detail:", error);
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 text-red-800">
        <h1 className="text-2xl font-bold mb-2">Error Loading Procedure</h1>
        <code className="text-xs bg-red-100 p-2 rounded">{error.message}</code>
      </div>
    );
  }
}
