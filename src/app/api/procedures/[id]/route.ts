import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessProcedure } from '@/lib/audit-access';
import DOMPurify from 'isomorphic-dompurify';

export async function GET(
  _req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const allowed = await canAccessProcedure(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const procedure = await prisma.procedure.findUnique({
      where: { id: params.id },
      include: {
        attachments: { orderBy: { displayOrder: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        assignedTo: true,
      },
    });

    if (!procedure) {
      return NextResponse.json({ error: 'Procedure not found' }, { status: 404 });
    }

    return NextResponse.json(procedure);
  } catch (error: unknown) {
    console.error('Fetch procedure error:', error);
    return NextResponse.json({ error: 'Failed to fetch procedure' }, { status: 500 });
  }
}

export async function PUT(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const allowed = await canAccessProcedure(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();

    const existing = await prisma.procedure.findUnique({
      where: { id: params.id },
      select: { reviewedBy: true, reviewedDate: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Procedure not found' }, { status: 404 });
    }

    const isLocked = !!(existing.reviewedBy && existing.reviewedDate);
    if (isLocked) {
      return NextResponse.json(
        { error: 'Procedure is locked for review' },
        { status: 423 }
      );
    }

    // Map fields from client to Prisma-friendly values
    const updates: Record<string, unknown> = {};
    const stringFields = ['title', 'purpose', 'source', 'scope', 'methodology', 'results', 'conclusions', 'preparedBy', 'reviewedBy', 'status', 'phase'];
    const optionalFields = ['groupId', 'assignedToId', 'preparedDate', 'reviewedDate'];

    // Copy over standard string fields
    stringFields.forEach(field => {
      if (data[field] !== undefined) updates[field] = data[field];
    });

    // Handle optional fields: convert empty strings to null
    optionalFields.forEach(field => {
      if (data[field] !== undefined) {
        updates[field] = data[field] === '' ? null : data[field];
      }
    });

    // Ensure dates are Date objects if they are valid strings/numbers
    if (updates.preparedDate && typeof updates.preparedDate === 'string') {
      const d = new Date(updates.preparedDate);
      if (!isNaN(d.getTime())) updates.preparedDate = d;
    }
    if (updates.reviewedDate && typeof updates.reviewedDate === 'string') {
      const d = new Date(updates.reviewedDate);
      if (!isNaN(d.getTime())) updates.reviewedDate = d;
    }

    // AUTO-FILL: If By is provided but Date is missing, set it to now
    if (updates.preparedBy && !updates.preparedDate) {
      // Only auto-fill if it wasn't already set in the DB or if it's being cleared/reset
      // For simplicity, if the user sends preparedBy and NO preparedDate, we assume they want 'now'
      updates.preparedDate = new Date();
    }
    if (updates.reviewedBy && !updates.reviewedDate) {
      updates.reviewedDate = new Date();
    }

    const RICH_TEXT_FIELDS = ['purpose', 'source', 'scope', 'methodology', 'results', 'conclusions'];
    for (const field of RICH_TEXT_FIELDS) {
      if (typeof updates[field] === 'string') {
        updates[field] = DOMPurify.sanitize(updates[field] as string);
      }
    }

    const procedure = await prisma.procedure.update({
      where: { id: params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updates as any,
    });

    return NextResponse.json(procedure);
  } catch (error: unknown) {
    console.error('Update procedure error:', error);
    return NextResponse.json({ error: 'Failed to update procedure' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const allowed = await canAccessProcedure(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    if (body.action === 'unlock') {
      const allowedRoles = ['Auditor', 'Audit Manager', 'Audit Director', 'Audit Partner', 'Business Operations', 'Engagement Manager'];
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json({ error: 'Insufficient permissions to unlock procedure' }, { status: 403 });
      }

      const procedure = await prisma.procedure.update({
        where: { id: params.id },
        data: {
          preparedBy: null,
          preparedDate: null,
          reviewedBy: null,
          reviewedDate: null,
          status: 'In Progress'
        }
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: 'UPDATE',
            entityType: 'PROCEDURE',
            entityId: params.id,
            details: 'Procedure unlocked for editing (sign-offs cleared)',
            performedBy: session.user.username,
          }
        });
      } catch { /* ignore log error */ }

      return NextResponse.json(procedure);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Unlock procedure error:', error);
    return NextResponse.json({ error: 'Failed to unlock procedure' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const allowed = await canAccessProcedure(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.procedure.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete procedure error:', error);
    return NextResponse.json({ error: 'Failed to delete procedure' }, { status: 500 });
  }
}
