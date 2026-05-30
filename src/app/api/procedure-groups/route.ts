import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { auditId, phase, title } = body;
    if (!auditId || !phase || !title) {
      return NextResponse.json({ error: 'auditId, phase and title are required' }, { status: 400 });
    }

    const hasAccess = await canAccessAudit(session.user, auditId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const aggregate = await prisma.procedureGroup.aggregate({
      where: { auditId, phase },
      _max: { displayOrder: true }
    });
    
    const nextOrder = (aggregate._max.displayOrder || 0) + 1;

    const group = await prisma.procedureGroup.create({
      data: {
        auditId,
        phase,
        title,
        displayOrder: nextOrder
      }
    });

    return NextResponse.json(group);
  } catch (error: unknown) {
    console.error('Create group error:', error);
    const message = error instanceof Error ? error.message : 'Creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
