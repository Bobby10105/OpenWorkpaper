import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { action } = data;

    if (action === 'unlock') {
      const allowedRoles = ['Auditor', 'Audit Manager', 'Audit Director', 'Audit Partner', 'Business Operations', 'Engagement Manager'];
      
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const procedure = await prisma.procedure.update({
        where: { id: params.id },
        data: {
          reviewedBy: null,
          reviewedDate: null,
          preparedBy: null,
          preparedDate: null,
          updatedAt: new Date()
        }
      });

      await prisma.auditLog.create({
        data: {
          action: 'UNLOCK',
          entityType: 'PROCEDURE',
          entityId: params.id,
          details: `Unlocked procedure and cleared sign-offs`,
          performedBy: session.user.username,
        }
      });

      revalidatePath('/');
      revalidatePath(`/audits/${procedure.auditId}`);
      revalidatePath(`/audits/${procedure.auditId}/procedures/${procedure.id}`);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Patch procedure error:', error);
    return NextResponse.json({ error: 'Failed to update procedure', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession();
    const data = await req.json();
    
    // Check if ALREADY locked in DB
    const existing = await prisma.procedure.findUnique({
      where: { id: params.id },
      select: { reviewedBy: true, reviewedDate: true, auditId: true }
    });
    
    // If it's already reviewed, don't allow PUT updates (must use PATCH unlock)
    if (existing?.reviewedBy && existing?.reviewedDate) {
      return NextResponse.json({ error: 'Procedure is locked' }, { status: 423 });
    }

    const parseDate = (dateStr: any) => {
      if (!dateStr || dateStr === '') return null;
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    const assignedToId = (data.assignedToId === '' || data.assignedToId === undefined) ? null : data.assignedToId;

    // Perform Update
    const procedure = await prisma.procedure.update({
      where: { id: params.id },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        purpose: data.purpose !== undefined ? data.purpose : undefined,
        source: data.source !== undefined ? data.source : undefined,
        scope: data.scope !== undefined ? data.scope : undefined,
        methodology: data.methodology !== undefined ? data.methodology : undefined,
        results: data.results !== undefined ? data.results : undefined,
        conclusions: data.conclusions !== undefined ? data.conclusions : undefined,
        preparedBy: data.preparedBy !== undefined ? data.preparedBy : undefined,
        preparedDate: data.preparedDate !== undefined ? parseDate(data.preparedDate) : undefined,
        reviewedBy: data.reviewedBy !== undefined ? data.reviewedBy : undefined,
        reviewedDate: data.reviewedDate !== undefined ? parseDate(data.reviewedDate) : undefined,
        assignedToId: assignedToId,
      }
    });

    revalidatePath('/');
    revalidatePath(`/audits/${procedure.auditId}`);
    revalidatePath(`/audits/${procedure.auditId}/procedures/${procedure.id}`);

    return NextResponse.json(procedure);
  } catch (error: any) {
    console.error('Update procedure error:', error);
    return NextResponse.json({ 
      error: 'Failed to update procedure', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const params = await props.params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'Specialist') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const procedure = await prisma.procedure.findUnique({
      where: { id: params.id },
      include: { attachments: true }
    });

    if (procedure) {
      const publicDir = path.join(process.cwd(), 'public');
      for (const attachment of procedure.attachments) {
        const fullPath = path.join(publicDir, attachment.filepath);
        try {
          await fs.unlink(fullPath);
        } catch (e) {}
      }

      await prisma.procedure.delete({ where: { id: params.id } });
      
      revalidatePath('/');
      revalidatePath(`/audits/${procedure.auditId}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete procedure error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete procedure', 
      details: error.message 
    }, { status: 500 });
  }
}
