import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

export async function GET(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      include: {
        teamMembers: true,
        procedureGroups: {
          include: {
            procedures: {
              include: { attachments: true }
            }
          }
        },
        procedures: {
          include: { attachments: true }
        }
      }
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    const zip = new JSZip();

    // Add audit data as JSON
    zip.file('audit_data.json', JSON.stringify(audit, null, 2));

    const publicDir = path.join(process.cwd(), 'public');

    // Add milestone attachment if exists
    if (audit.milestoneAttachmentUrl) {
      const fullPath = path.join(publicDir, audit.milestoneAttachmentUrl);
      try {
        const fileBuffer = await fs.readFile(fullPath);
        const diskFilename = path.basename(audit.milestoneAttachmentUrl);
        zip.file(`attachments/${diskFilename}`, fileBuffer);
      } catch (err) {
        console.warn(`Could not read milestone file: ${fullPath}`, err);
      }
    }

    // Add procedure attachments
    for (const procedure of audit.procedures) {
      for (const attachment of procedure.attachments) {
        // attachment.filepath is like "/uploads/..."
        const fullPath = path.join(publicDir, attachment.filepath);
        try {
          const fileBuffer = await fs.readFile(fullPath);
          // Store in a flat 'attachments' folder inside the zip
          const diskFilename = path.basename(attachment.filepath);
          zip.file(`attachments/${diskFilename}`, fileBuffer);
        } catch (err) {
          console.warn(`Could not read file: ${fullPath}`, err);
        }
      }
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    const safeTitle = audit.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    return new Response(zipContent as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="backup_${safeTitle}_${timestamp}.zip"`,
      },
    });

  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
