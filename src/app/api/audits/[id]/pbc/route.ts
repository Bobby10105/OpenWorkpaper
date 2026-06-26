import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const hasAccess = await canAccessAudit(session.user, params.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  try {
    const audit = await prisma.audit.findUnique({
      where: { id: params.id },
      select: { pbcAttachmentUrl: true, pbcAttachmentName: true }
    });

    if (!audit || !audit.pbcAttachmentUrl) {
      return NextResponse.json({ error: 'PBC attachment not found' }, { status: 404 });
    }

    const filepath = path.join(process.cwd(), 'storage', audit.pbcAttachmentUrl);
    const fileBuffer = await fs.readFile(filepath);
    
    // Determine content type based on extension
    const ext = path.extname(audit.pbcAttachmentUrl).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.xls') contentType = 'application/vnd.ms-excel';
    else if (ext === '.csv') contentType = 'text/csv';

    const sanitizedName = audit.pbcAttachmentName 
      ? path.basename(audit.pbcAttachmentName.replace(/\\/g, '/')).replace(/[\r\n"]/g, '_')
      : 'pbc_requests' + ext;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${sanitizedName}"`,
      },
    });
  } catch (error) {
    console.error('Fetch PBC attachment error:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 404 });
  }
}

export async function POST(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasAccess = await canAccessAudit(session.user, params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    
    const audit = await prisma.audit.update({
      where: { id: params.id },
      data: {
        pbcRequests: body.pbcRequests
      }
    });

    return NextResponse.json(audit);
  } catch (error: unknown) {
    console.error('PBC update error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update PBC requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
