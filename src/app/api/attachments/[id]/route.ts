import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id }
    });

    if (!attachment) {
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
  } catch (error) {
    console.error('Fetch attachment error:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 404 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const params = await props.params;
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({ 
      where: { id: params.id },
      include: {
        procedure: {
          include: { audit: { select: { title: true } } }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // 1. Save new file
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const uniqueSuffix = crypto.randomUUID();
    const newFilename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const newFilepath = path.join(uploadDir, newFilename);

    await fs.writeFile(newFilepath, buffer);

    // 2. Delete old file
    const oldFilepath = path.join(process.cwd(), 'public', attachment.filepath);
    try {
      await fs.unlink(oldFilepath);
    } catch (e) {
      console.warn("Could not delete old file", e);
    }

    // 3. Update database record
    const updatedAttachment = await prisma.attachment.update({
      where: { id: params.id },
      data: {
        filename: file.name,
        filepath: `/uploads/${newFilename}`,
        mimetype: file.type,
        size: file.size,
      }
    });

    // 4. Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'ATTACHMENT',
        entityId: params.id,
        details: `Replaced attachment: ${attachment.filename} with ${file.name} in procedure: ${attachment.procedure.title}`,
        performedBy: session?.user?.username || 'System',
      }
    });

    return NextResponse.json(updatedAttachment);
  } catch (error) {
    console.error('Replace attachment error:', error);
    return NextResponse.json({ error: 'Replace failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const params = await props.params;
  
  try {
    const data = await req.json();
    
    const updateData: any = {};
    if (data.preparedBy !== undefined) updateData.preparedBy = data.preparedBy;
    if (data.reviewedBy !== undefined) updateData.reviewedBy = data.reviewedBy;
    
    const parseDate = (val: string | null | undefined) => {
      if (val === undefined) return undefined;
      if (!val || val === '') return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d;
    };

    if (data.preparedDate !== undefined) updateData.preparedDate = parseDate(data.preparedDate);
    if (data.reviewedDate !== undefined) updateData.reviewedDate = parseDate(data.reviewedDate);

    const updatedAttachment = await prisma.attachment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        procedure: {
          include: { audit: { select: { title: true } } }
        }
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'ATTACHMENT',
        entityId: params.id,
        details: `Updated metadata for attachment: ${updatedAttachment.filename} in procedure: ${updatedAttachment.procedure.title}`,
        performedBy: session?.user?.username || 'System',
      }
    });

    return NextResponse.json(updatedAttachment);
  } catch (error) {
    console.error('Update attachment metadata error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const params = await props.params;
  try {
    const attachment = await prisma.attachment.findUnique({ 
      where: { id: params.id },
      include: {
        procedure: {
          include: { audit: { select: { title: true } } }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Try to delete file
    const filepath = path.join(process.cwd(), 'public', attachment.filepath);
    try {
      await fs.unlink(filepath);
    } catch (e) {
      console.warn("Could not delete file", e);
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'ATTACHMENT',
        entityId: params.id,
        details: `Deleted attachment: ${attachment.filename} from procedure: ${attachment.procedure.title} in audit: ${attachment.procedure.audit.title}`,
        performedBy: session?.user?.username || 'System',
      }
    });

    await prisma.attachment.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
