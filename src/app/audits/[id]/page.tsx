import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import AuditTabs from '@/components/AuditTabs';
import EditableAuditHeader from '@/components/EditableAuditHeader';
import { getSession } from '@/lib/auth';
import type { TeamMember } from '@prisma/client';
import type { AuditWithRelations } from '@/lib/types';

interface AuditRaw {
  id: string;
  title: string;
  category: string;
  auditNumber: string | null;
  objective: string | null;
  status: string;
  milestoneAttachmentUrl: string | null;
  milestoneAttachmentName: string | null;
  pbcAttachmentUrl: string | null;
  pbcAttachmentName: string | null;
  pbcRequests: string | null;
  fieldworkStartDate: Date | null;
  fieldworkEndDate: Date | null;
  reportIssuedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProcedureGroupRaw {
  id: string;
  auditId: string;
  title: string;
  phase: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProcedureRaw {
  id: string;
  auditId: string;
  groupId: string | null;
  title: string | null;
  purpose: string | null;
  source: string | null;
  scope: string | null;
  methodology: string | null;
  results: string | null;
  conclusions: string | null;
  status: string;
  phase: string;
  preparedBy: string | null;
  preparedDate: Date | null;
  reviewedBy: string | null;
  reviewedDate: Date | null;
  assignedToId: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  assignedToName?: string | null;
  assignedToRole?: string | null;
  assignedToEmail?: string | null;
}

interface AttachmentRaw {
  id: string;
  procedureId: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  displayOrder: number;
  createdAt: Date;
}

interface ProcedureMessageRaw {
  id: string;
  procedureId: string;
  text: string;
  sender: string;
  createdAt: Date;
}

export default async function AuditDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const user = session.user;
  const userRole = user.role || 'User';

  let auditData: {
    auditBase: AuditRaw;
    teamMembers: TeamMember[];
    rawGroups: ProcedureGroupRaw[];
    proceduresWithRelations: (ProcedureRaw & { attachments: AttachmentRaw[]; messages: ProcedureMessageRaw[] })[];
  } | null = null;

  let isUnauthorized = false;
  let errorMessage: string | null = null;

  try {
    const audits = await prisma.$queryRawUnsafe<AuditRaw[]>(
      `SELECT * FROM Audit WHERE id = ? LIMIT 1`,
      params.id
    );
    
    if (!audits || audits.length === 0) {
      notFound();
    }
    
    const auditBase = audits[0];
    const teamMembers = await prisma.teamMember.findMany({
      where: { auditId: auditBase.id }
    });

    const isGlobalManager = userRole === 'Business Operations';
    if (!isGlobalManager) {
      const isMember = teamMembers.some((m: TeamMember) => m.userId === user.id);
      if (!isMember) {
        isUnauthorized = true;
      }
    }

    if (!isUnauthorized) {
      let rawGroups: ProcedureGroupRaw[] = [];
      try {
        rawGroups = await prisma.$queryRawUnsafe<ProcedureGroupRaw[]>(
          `SELECT * FROM ProcedureGroup WHERE auditId = ? ORDER BY displayOrder ASC, createdAt ASC`,
          auditBase.id
        );
      } catch {
        rawGroups = await prisma.$queryRawUnsafe<ProcedureGroupRaw[]>(
          `SELECT * FROM ProcedureGroup WHERE auditId = ? ORDER BY createdAt ASC`,
          auditBase.id
        );
      }

      let rawProcedures: ProcedureRaw[] = [];
      try {
        rawProcedures = await prisma.$queryRawUnsafe<ProcedureRaw[]>(
          `SELECT p.*, t.name as assignedToName, t.role as assignedToRole, t.email as assignedToEmail
           FROM Procedure p
           LEFT JOIN TeamMember t ON p.assignedToId = t.id
           WHERE p.auditId = ?
           ORDER BY p.displayOrder ASC, p.createdAt ASC`,
          auditBase.id
        );
      } catch {
        rawProcedures = await prisma.$queryRawUnsafe<ProcedureRaw[]>(
          `SELECT p.*, t.name as assignedToName, t.role as assignedToRole, t.email as assignedToEmail
           FROM Procedure p
           LEFT JOIN TeamMember t ON p.assignedToId = t.id
           WHERE p.auditId = ?
           ORDER BY p.createdAt ASC`,
          auditBase.id
        );
      }

      const proceduresWithRelations = await Promise.all(rawProcedures.map(async (proc) => {
        const attachments = await prisma.$queryRawUnsafe<AttachmentRaw[]>(
          `SELECT * FROM Attachment WHERE procedureId = ? ORDER BY displayOrder ASC`,
          proc.id
        );
        
        const messages = await prisma.$queryRawUnsafe<ProcedureMessageRaw[]>(
          `SELECT * FROM ProcedureMessage WHERE procedureId = ? ORDER BY createdAt ASC`,
          proc.id
        );

        return {
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
      }));

      auditData = {
        auditBase,
        teamMembers,
        rawGroups,
        proceduresWithRelations
      };
    }
  } catch (error: unknown) {
    console.error("Critical Error loading audit:", error);
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
  }

  if (isUnauthorized) {
    return (
      <div className="p-8 text-center bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-800">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="mb-4">You are not authorized to view this audit.</p>
        <div className="mt-6">
          <Link href="/" className="text-blue-600 underline font-medium">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 text-red-800">
        <h1 className="text-2xl font-bold mb-2">Error Loading Audit</h1>
        <code className="text-xs bg-red-100 p-2 rounded">{errorMessage}</code>
        <div className="mt-6">
          <Link href="/" className="text-blue-600 underline font-medium">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!auditData) notFound();

  const { auditBase, teamMembers, rawGroups, proceduresWithRelations } = auditData;

  const groupsWithProcedures = rawGroups.map(group => ({
    ...group,
    procedures: proceduresWithRelations.filter(p => p.groupId === group.id)
  }));

  const finalAuditData = {
    ...auditBase,
    teamMembers,
    procedureGroups: groupsWithProcedures,
    procedures: proceduresWithRelations
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/" className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors group">
        <div className="bg-slate-100 p-1 rounded-lg group-hover:bg-slate-200 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Back to Dashboard</span>
      </Link>

      <EditableAuditHeader audit={finalAuditData as unknown as AuditWithRelations} userRole={userRole} />
      <AuditTabs audit={finalAuditData as unknown as AuditWithRelations} user={session.user} />
    </div>
  );
}
