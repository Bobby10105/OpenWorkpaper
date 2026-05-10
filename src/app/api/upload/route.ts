import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface RawAuditPBC {
  id: string;
  pbcAttachmentUrl: string | null;
  title: string;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json({ error: 'Failed to parse form data', details: msg }, { status: 400 });
    }
    
    const file = formData.get('file');
    const procedureId = formData.get('procedureId')?.toString();
    const auditId = formData.get('auditId')?.toString();
    const type = formData.get('type')?.toString();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Valid file is required' }, { status: 400 });
    }

    const uploadedFile = file as unknown as File;
    const filenameAttr = uploadedFile.name || 'unknown_file';
    
    const cleanProcedureId = (procedureId === 'null' || procedureId === 'undefined' || !procedureId) ? undefined : procedureId;
    const cleanAuditId = (auditId === 'null' || auditId === 'undefined' || !auditId) ? undefined : auditId;
    const cleanType = type?.toLowerCase();

    if (!cleanProcedureId && !cleanAuditId) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json({ error: 'Failed to read file', details: msg }, { status: 500 });
    }
    
    const uniqueSuffix = crypto.randomUUID();
    const safeFilename = filenameAttr.replace(/[^a-zA-Z0-9.-]/g, '_');
    const diskFilename = `${uniqueSuffix}-${safeFilename}`;
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const filepath = path.join(uploadDir, diskFilename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filepath, buffer);

    if (cleanAuditId && cleanType === 'milestone') {
      const audit = await prisma.audit.findUnique({
        where: { id: cleanAuditId },
        select: { id: true, milestoneAttachmentUrl: true }
      });

      if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

      if (audit.milestoneAttachmentUrl) {
        try { await fs.unlink(path.join(process.cwd(), 'public', audit.milestoneAttachmentUrl)); } catch { /* ignore */ }
      }

      const updated = await prisma.audit.update({
        where: { id: cleanAuditId },
        data: {
          milestoneAttachmentUrl: `/uploads/${diskFilename}`,
          milestoneAttachmentName: filenameAttr,
        }
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: 'UPDATE',
            entityType: 'AUDIT',
            entityId: cleanAuditId,
            details: `Uploaded milestone: ${filenameAttr}`,
            performedBy: session?.user?.username || 'System',
          }
        });
      } catch { /* ignore */ }

      return NextResponse.json(updated);
    }

    if (cleanAuditId && cleanType === 'pbc') {
      const audits = await prisma.$queryRawUnsafe<RawAuditPBC[]>(
        `SELECT id, pbcAttachmentUrl, title FROM Audit WHERE id = ? LIMIT 1`,
        cleanAuditId
      );
      const audit = audits[0];

      if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

      if (audit.pbcAttachmentUrl) {
        try { await fs.unlink(path.join(process.cwd(), 'public', audit.pbcAttachmentUrl)); } catch { /* ignore */ }
      }

      await prisma.$executeRawUnsafe(
        `UPDATE Audit SET pbcAttachmentUrl = ?, pbcAttachmentName = ? WHERE id = ?`,
        `/uploads/${diskFilename}`,
        filenameAttr,
        cleanAuditId
      );

      return NextResponse.json({ ...audit, pbcAttachmentUrl: `/uploads/${diskFilename}` });
    }

    if (!cleanProcedureId) return NextResponse.json({ error: 'procedureId required' }, { status: 400 });

    const aggregate = await prisma.attachment.aggregate({
      where: { procedureId: cleanProcedureId },
      _max: { displayOrder: true }
    });
    
    const attachment = await prisma.attachment.create({
      data: {
        procedureId: cleanProcedureId,
        filename: filenameAttr,
        filepath: `/uploads/${diskFilename}`,
        mimetype: uploadedFile.type || 'application/octet-stream',
        size: uploadedFile.size,
        displayOrder: (aggregate._max.displayOrder || 0) + 1,
      }
    });

    return NextResponse.json(attachment);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal error', details: msg }, { status: 500 });
  }
}
