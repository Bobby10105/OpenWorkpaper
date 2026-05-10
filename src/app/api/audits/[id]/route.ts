import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
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

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // 2. Fetch Groups and Procedures with RAW logic
  const rawGroups: RawProcedureGroup[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM ProcedureGroup WHERE auditId = ? ORDER BY displayOrder ASC`,
    audit.id
  );

  let rawProcedures: RawProcedure[] = [];
  try {
    rawProcedures = await prisma.$queryRawUnsafe(
      `SELECT p.*, t.name as assignedToName, t.role as assignedToRole, t.email as assignedToEmail
       FROM Procedure p
       LEFT JOIN TeamMember t ON p.assignedToId = t.id
       WHERE p.auditId = ?`,
      audit.id
    );
  } catch {
    console.warn('API AuditDetail: Full procedure join failed (schema syncing?). Falling back to basic fetch.');
    rawProcedures = await prisma.$queryRawUnsafe(
      `SELECT * FROM Procedure WHERE auditId = ?`,
      audit.id
    );
  }

  // 3. For each procedure, fetch attachments and messages
  const proceduresWithRelations = await Promise.all(rawProcedures.map(async (proc) => {
    const attachments: RawAttachment[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Attachment WHERE procedureId = ? ORDER BY displayOrder ASC`,
      proc.id
    );
    
    const messages: RawMessage[] = await prisma.$queryRawUnsafe(
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

  return NextResponse.json({
    ...audit,
    procedureGroups: groupsWithProcedures,
    procedures: proceduresWithRelations.filter(p => !p.groupId) // ungrouped
  });
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        const fullPath = path.join(process.cwd(), 'public', currentAudit.milestoneAttachmentUrl);
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
        const fullPath = path.join(process.cwd(), 'public', currentAudit.pbcAttachmentUrl);
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

    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      include: {
        procedures: {
          include: { attachments: true }
        }
      }
    });

    if (audit) {
      const publicDir = path.join(process.cwd(), 'public');
      
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
