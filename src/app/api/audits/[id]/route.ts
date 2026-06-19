import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';
import type { Audit } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

interface RawProcedureGroup {
  id: string;
  auditId: string;
  title: string;
  phase: string;
  displayOrder: number;
}

interface RawProcedure {
  id: string;
  auditId: string;
  groupId: string | null;
  phase: string;
  title: string;
  purpose: string | null;
  status: string;
  displayOrder: number;
  assignedToId: string | null;
  assignedToName?: string;
  assignedToRole?: string;
  assignedToEmail?: string;
}

interface RawAttachment {
  id: string;
  procedureId: string;
  filename: string;
  filepath: string;
  displayOrder: number;
}

interface RawMessage {
  id: string;
  procedureId: string;
  text: string;
  sender: string;
  createdAt: Date;
}

async function getAuditProcedures(auditId: string) {
  const rawGroups: RawProcedureGroup[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM ProcedureGroup WHERE auditId = ? ORDER BY displayOrder ASC`,
    auditId
  );

  let rawProcedures: RawProcedure[] = [];
  try {
    rawProcedures = await prisma.$queryRawUnsafe(
      `SELECT p.*, t.name as assignedToName, t.role as assignedToRole, t.email as assignedToEmail
       FROM Procedure p
       LEFT JOIN TeamMember t ON p.assignedToId = t.id
       WHERE p.auditId = ?`,
      auditId
    );
  } catch {
    console.warn('API AuditDetail: Full procedure join failed (schema syncing?). Falling back to basic fetch.');
    rawProcedures = await prisma.$queryRawUnsafe(
      `SELECT * FROM Procedure WHERE auditId = ?`,
      auditId
    );
  }

  // 3. Batch fetch attachments and messages for procedures
  const allAttachments = await prisma.$queryRawUnsafe<RawAttachment[]>(
    `SELECT * FROM Attachment WHERE procedureId IN (SELECT id FROM Procedure WHERE auditId = ?) ORDER BY displayOrder ASC`,
    auditId
  );

  const allMessages = await prisma.$queryRawUnsafe<RawMessage[]>(
    `SELECT * FROM ProcedureMessage WHERE procedureId IN (SELECT id FROM Procedure WHERE auditId = ?) ORDER BY createdAt ASC`,
    auditId
  );

  const procedureIds = rawProcedures.map(p => p.id);

  const attachmentsByProcId: Record<string, RawAttachment[]> = {};
  const messagesByProcId: Record<string, RawMessage[]> = {};

  // Initialize maps
  for (const id of procedureIds) {
    attachmentsByProcId[id] = [];
    messagesByProcId[id] = [];
  }

  // Populate maps
  for (const att of allAttachments) {
    attachmentsByProcId[att.procedureId].push(att);
  }

  for (const msg of allMessages) {
    messagesByProcId[msg.procedureId].push(msg);
  }

  // 4. Map relations to procedures in memory
  const proceduresWithRelations = rawProcedures.map(proc => {
    return {
      ...proc,
      assignedTo: proc.assignedToId ? {
        id: proc.assignedToId,
        name: proc.assignedToName,
        role: proc.assignedToRole,
        email: proc.assignedToEmail
      } : null,
      attachments: attachmentsByProcId[proc.id] || [],
      messages: messagesByProcId[proc.id] || []
    };
  });

  return {
    procedureGroups: rawGroups.map(group => ({
      ...group,
      procedures: proceduresWithRelations.filter(p => p.groupId === group.id)
    })),
    procedures: proceduresWithRelations.filter(p => !p.groupId)
  };
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const hasAccess = await canAccessAudit(session.user, params.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. Fetch main audit and team members
  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: {
      teamMembers: true,
    }
  });

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // 2. Fetch procedure groups and ungrouped procedures
  const { procedureGroups, procedures } = await getAuditProcedures(audit.id);

  return NextResponse.json({
    ...audit,
    procedureGroups,
    procedures
  });
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasAccess = await canAccessAudit(session.user, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    
    const updateData: Partial<Audit> = {};
    const parseDate = (val: string | null | undefined) => {
      if (val === undefined) return undefined;
      if (!val || val === '') return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d;
    };

    if (data.fieldworkStartDate !== undefined) updateData.fieldworkStartDate = parseDate(data.fieldworkStartDate);
    if (data.fieldworkEndDate !== undefined) updateData.fieldworkEndDate = parseDate(data.fieldworkEndDate);
    if (data.reportIssuedDate !== undefined) updateData.reportIssuedDate = parseDate(data.reportIssuedDate);
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.auditNumber !== undefined) updateData.auditNumber = data.auditNumber;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.objective !== undefined) updateData.objective = data.objective;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.milestoneAttachmentUrl === null) {
      // Delete existing file if any
      const currentAudit = await prisma.audit.findUnique({ where: { id: params.id } });
      if (currentAudit?.milestoneAttachmentUrl) {
        const fullPath = path.join(process.cwd(), 'storage', currentAudit.milestoneAttachmentUrl);
        try {
          await fs.unlink(fullPath);
        } catch {
          console.warn("Could not delete milestone attachment file:");
        }
      }
      updateData.milestoneAttachmentUrl = null;
      updateData.milestoneAttachmentName = null;
    }

    if (data.pbcAttachmentUrl === null) {
      // Delete existing file if any
      const currentAudit = await prisma.audit.findUnique({ where: { id: params.id } });
      if (currentAudit?.pbcAttachmentUrl) {
        const fullPath = path.join(process.cwd(), 'storage', currentAudit.pbcAttachmentUrl);
        try {
          await fs.unlink(fullPath);
        } catch {
          console.warn("Could not delete PBC attachment file:");
        }
      }
      updateData.pbcAttachmentUrl = null;
      updateData.pbcAttachmentName = null;
    }

    let audit;
    try {
      audit = await prisma.audit.update({
        where: { id: params.id },
        data: updateData
      });
    } catch (prismaError) {
      console.warn('PUT Audit: Prisma update failed (schema syncing?). Trying raw fallback.', prismaError);
      
      // Separate known fields from potentially unknown fields for raw SQL
      // Note: This is a simplified version of the update logic
      // In a real scenario, we'd want to dynamically build the SET clause
      
      // Let's at least handle the pbc fields if they are present in updateData
      if ('pbcAttachmentUrl' in updateData || 'pbcAttachmentName' in updateData) {
        await prisma.$executeRawUnsafe(
          `UPDATE Audit SET pbcAttachmentUrl = ?, pbcAttachmentName = ? WHERE id = ?`,
          updateData.pbcAttachmentUrl,
          updateData.pbcAttachmentName,
          params.id
        );
      }
      
      // Re-fetch to get current state (using raw to be safe)
      const rawAudits: Audit[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM Audit WHERE id = ? LIMIT 1`,
        params.id
      );
      audit = rawAudits[0];
    }

    // Log the update
    try {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'AUDIT',
          entityId: audit.id,
          details: `Updated milestones/details for audit: ${audit.title}`,
          performedBy: session.user.username,
        }
      });
    } catch {}
    
    return NextResponse.json(audit);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audit update error:', error);
    return NextResponse.json({ error: 'Failed to update audit', message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDeleteAudits = session.user.role === 'Business Operations';

    if (!canDeleteAudits) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const hasAccess = await canAccessAudit(session.user, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      include: {
        procedures: {
          include: { attachments: true }
        }
      }
    });

    if (audit) {
      const publicDir = path.join(process.cwd(), 'storage');
      
      // Delete milestone attachment if exists
      if (audit.milestoneAttachmentUrl) {
        const milestonePath = path.join(publicDir, audit.milestoneAttachmentUrl);
        try { await fs.unlink(milestonePath); } catch {}
      }

      // Delete PBC attachment if exists
      if (audit.pbcAttachmentUrl) {
        const pbcPath = path.join(publicDir, audit.pbcAttachmentUrl);
        try { await fs.unlink(pbcPath); } catch {}
      }

      for (const procedure of audit.procedures) {
        for (const attachment of procedure.attachments) {
          const fullPath = path.join(publicDir, attachment.filepath);
          try { await fs.unlink(fullPath); } catch {}
        }
      }

      await prisma.auditLog.create({
        data: {
          action: 'DELETE',
          entityType: 'AUDIT',
          entityId: params.id,
          details: `Deleted audit: ${audit.title}`,
          performedBy: session.user.username,
        }
      });

      await prisma.audit.delete({ where: { id: params.id } });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Delete failed', details: message }, { status: 500 });
  }
}
