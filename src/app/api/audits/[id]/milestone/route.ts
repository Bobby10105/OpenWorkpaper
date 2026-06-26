import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = await props.params;

  const allowed = await canAccessAudit(session.user, params.id);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
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

    const sanitizedName = audit.milestoneAttachmentName 
      ? path.basename(audit.milestoneAttachmentName.replace(/\\/g, '/')).replace(/[\r\n"]/g, '_')
      : 'milestones' + ext;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${sanitizedName}"`,
      },
    });
  } catch (error) {
    console.error('Fetch milestone attachment error:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 404 });
  }
}
