import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
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
    const data = await req.json();

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

export async function DELETE(
  _req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await prisma.procedure.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete procedure error:', error);
    return NextResponse.json({ error: 'Failed to delete procedure' }, { status: 500 });
  }
}
