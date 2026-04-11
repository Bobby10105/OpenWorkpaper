import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import type { Audit } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id: params.id },
    include: {
      teamMembers: true,
      procedureGroups: {
        orderBy: { displayOrder: 'asc' },
        include: {
          procedures: {
            include: { 
              attachments: { orderBy: { displayOrder: 'asc' } },
              messages: { orderBy: { createdAt: 'asc' } }
            }
          }
        }
      },
      procedures: {
        where: { groupId: null }, // Include ungrouped ones too just in case
        include: { 
          attachments: { orderBy: { displayOrder: 'asc' } },
          messages: { orderBy: { createdAt: 'asc' } }
        }
      }
    }
  });
  return NextResponse.json(audit);
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
        } catch (e) {
          console.warn("Could not delete milestone attachment file:", e);
        }
      }
      updateData.milestoneAttachmentUrl = null;
      updateData.milestoneAttachmentName = null;
    }

    const audit = await prisma.audit.update({
      where: { id: params.id },
      data: updateData
    });

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
    } catch (e) {}
    
    return NextResponse.json(audit);
  } catch (error: any) {
    console.error('Audit update error:', error);
    return NextResponse.json({ error: 'Failed to update audit', message: error.message }, { status: 500 });
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
        try { await fs.unlink(milestonePath); } catch (e) {}
      }

      for (const procedure of audit.procedures) {
        for (const attachment of procedure.attachments) {
          const fullPath = path.join(publicDir, attachment.filepath);
          try { await fs.unlink(fullPath); } catch (e) {}
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
  } catch (error: any) {
    return NextResponse.json({ error: 'Delete failed', details: error.message }, { status: 500 });
  }
}
