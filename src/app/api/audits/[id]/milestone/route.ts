import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  
  try {
    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      select: { milestoneAttachmentUrl: true, milestoneAttachmentName: true }
    });

    if (!audit || !audit.milestoneAttachmentUrl) {
      return NextResponse.json({ error: 'Milestone attachment not found' }, { status: 404 });
    }

    const filepath = path.join(process.cwd(), 'storage', audit.milestoneAttachmentUrl);
    const fileBuffer = await fs.readFile(filepath);
    
    // Determine content type based on extension
    const ext = path.extname(audit.milestoneAttachmentUrl).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.xls') contentType = 'application/vnd.ms-excel';
    else if (ext === '.csv') contentType = 'text/csv';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${audit.milestoneAttachmentName || 'milestones' + ext}"`,
      },
    });
  } catch (error) {
    console.error('Fetch milestone attachment error:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 404 });
  }
}
