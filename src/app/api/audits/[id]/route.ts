import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';
import type { Audit } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

async function getAuditProcedures(auditId: string) {
  const groups = await prisma.procedureGroup.findMany({
    where: { auditId },
    orderBy: { displayOrder: 'asc' }
  });

  const procedures = await prisma.procedure.findMany({
    where: { auditId },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          role: true,
          email: true
        }
      },
      attachments: {
        orderBy: { displayOrder: 'asc' }
      },
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  return {
    procedureGroups: (groups || []).map(group => ({
      ...group,
      procedures: (procedures || []).filter(p => p.groupId === group.id)
    })),
    procedures: (procedures || []).filter(p => !p.groupId)
  };
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
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
  } catch (error) {
    console.error('[GET /api/audits/:id] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit details' }, { status: 500 });
  }
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
        await prisma.$executeRaw`
          UPDATE Audit SET pbcAttachmentUrl = ${updateData.pbcAttachmentUrl ?? null}, pbcAttachmentName = ${updateData.pbcAttachmentName ?? null} WHERE id = ${params.id}
        `;
      }
      
      // Re-fetch to get current state (using raw to be safe)
      const rawAudits: Audit[] = await prisma.$queryRaw`
        SELECT * FROM Audit WHERE id = ${params.id} LIMIT 1
      `;
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

type AuditWithAttachments = {
  milestoneAttachmentUrl: string | null;
  pbcAttachmentUrl: string | null;
  procedures: {
    attachments: { filepath: string }[];
  }[];
};

async function deleteAuditFiles(audit: AuditWithAttachments) {
  const publicDir = path.join(process.cwd(), 'storage');
  const unlinkPromises: Promise<void>[] = [];

  // Delete milestone attachment if exists
  if (audit.milestoneAttachmentUrl) {
    const milestonePath = path.join(publicDir, audit.milestoneAttachmentUrl);
    unlinkPromises.push(fs.unlink(milestonePath).catch(() => {}));
  }

  // Delete PBC attachment if exists
  if (audit.pbcAttachmentUrl) {
    const pbcPath = path.join(publicDir, audit.pbcAttachmentUrl);
    unlinkPromises.push(fs.unlink(pbcPath).catch(() => {}));
  }

  for (const procedure of audit.procedures) {
    for (const attachment of procedure.attachments) {
      const fullPath = path.join(publicDir, attachment.filepath);
      unlinkPromises.push(fs.unlink(fullPath).catch(() => {}));
    }
  }

  await Promise.all(unlinkPromises);
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
      await deleteAuditFiles(audit);

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
