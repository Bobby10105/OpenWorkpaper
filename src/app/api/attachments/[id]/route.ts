import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function PATCH(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await props.params;
    const body = await req.json();
    
    // Sanitize incoming data to avoid Prisma validation errors
    const updates: Record<string, unknown> = { ...body };
    const dateFields = ['preparedDate', 'reviewedDate'];
    const optionalStringFields = ['preparedBy', 'reviewedBy'];
    
    dateFields.forEach(field => {
      if (updates[field] === '') {
        updates[field] = null;
      } else if (updates[field]) {
        const d = new Date(updates[field] as string | number);
        if (!isNaN(d.getTime())) updates[field] = d;
      }
    });

    optionalStringFields.forEach(field => {
      if (updates[field] === '') {
        updates[field] = null;
      }
    });

    const attachment = await prisma.attachment.update({
      where: { id: params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updates as any
    });

    return NextResponse.json(attachment);
  } catch (error: unknown) {
    console.error('Update attachment error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await props.params;
    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id }
    });

    if (attachment) {
      const filepath = path.join(process.cwd(), 'public', attachment.filepath);
      try { await fs.unlink(filepath); } catch { /* ignore */ }
      
      await prisma.attachment.delete({
        where: { id: params.id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
