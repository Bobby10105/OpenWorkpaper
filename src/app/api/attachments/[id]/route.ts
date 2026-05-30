import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAttachment } from '@/lib/audit-access';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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
    const allowed = await canAccessAttachment(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id }
    });

    if (!attachment || !attachment.filepath) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const filepath = path.join(process.cwd(), 'public', attachment.filepath);
    const fileBuffer = await fs.readFile(filepath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.mimetype || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${attachment.filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Fetch attachment error:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 404 });
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
    const allowed = await canAccessAttachment(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as unknown as File;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Valid file is required' }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete old file
    const oldFilepath = path.join(process.cwd(), 'public', attachment.filepath);
    try { await fs.unlink(oldFilepath); } catch { /* ignore */ }

    // Save new file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uniqueSuffix = crypto.randomUUID();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const diskFilename = `${uniqueSuffix}-${safeFilename}`;
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const newFilepath = path.join(uploadDir, diskFilename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(newFilepath, buffer);

    const updated = await prisma.attachment.update({
      where: { id: params.id },
      data: {
        filename: file.name,
        filepath: `/uploads/${diskFilename}`,
        mimetype: file.type || 'application/octet-stream',
        size: file.size,
      }
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Replace attachment error:', error);
    return NextResponse.json({ error: 'Failed to replace attachment' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await props.params;
    const allowed = await canAccessAttachment(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    const allowed = await canAccessAttachment(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
