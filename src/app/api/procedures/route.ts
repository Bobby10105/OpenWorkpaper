import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const auditId = searchParams.get('auditId');
    if (!auditId) {
      return NextResponse.json({ error: 'auditId is required' }, { status: 400 });
    }

    const allowed = await canAccessAudit(session.user, auditId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const phase = searchParams.get('phase');

    const procedures = await prisma.procedure.findMany({
      where: {
        ...(auditId ? { auditId } : {}),
        ...(phase ? { phase } : {}),
      },
      include: {
        assignedTo: true,
        _count: { select: { attachments: true, messages: true } }
      },
      orderBy: { displayOrder: 'asc' }
    });

    return NextResponse.json(procedures);
  } catch (error: unknown) {
    console.error('Fetch procedures error:', error);
    return NextResponse.json({ error: 'Failed to fetch procedures' }, { status: 500 });
  }
}

async function getNextProcedureOrder(auditId: string, phase: string, groupId: string | null) {
  const aggregate = await prisma.procedure.aggregate({
    where: { auditId, phase, groupId },
    _max: { displayOrder: true }
  });
  return (aggregate._max.displayOrder || 0) + 1;
}

async function logProcedureCreation(procedureId: string, title: string, username: string) {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'PROCEDURE',
        entityId: procedureId,
        details: `Created new procedure: ${title}`,
        performedBy: username,
      }
    });
  } catch {
    // ignore log errors
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { auditId, phase, groupId, title, purpose } = data;

    const allowed = await canAccessAudit(session.user, auditId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nextOrder = await getNextProcedureOrder(auditId, phase, groupId || null);

    const procedure = await prisma.procedure.create({
      data: {
        auditId,
        phase,
        groupId: groupId || null,
        title: title || 'New Procedure',
        purpose: purpose || '',
        status: 'Not Started',
        displayOrder: nextOrder,
      }
    });

    await logProcedureCreation(procedure.id, procedure.title || 'New Procedure', session.user.username);

    return NextResponse.json(procedure);
  } catch (error: unknown) {
    console.error('Create procedure error:', error);
    const message = error instanceof Error ? error.message : 'Creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
