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
    const phase = searchParams.get('phase');

    // Strict input validation
    if (!auditId || typeof auditId !== 'string' || auditId.trim() === '') {
      return NextResponse.json({ error: 'Invalid or missing auditId' }, { status: 400 });
    }

    if (phase !== null && (typeof phase !== 'string' || phase.trim() === '')) {
      return NextResponse.json({ error: 'Invalid phase parameter' }, { status: 400 });
    }

    // Authorization
    const allowed = await canAccessAudit(session.user, auditId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const procedures = await prisma.procedure.findMany({
      where: {
        auditId,
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
    // Log the actual error internally
    console.error('[Procedures GET] Error:', error);
    // Return a generic, safe error message to the client
    return NextResponse.json({ error: 'An unexpected error occurred while fetching procedures' }, { status: 500 });
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
  } catch (error) {
    console.error('[AuditLog] Failed to log procedure creation:', error);
  }
}

// Strictly typed interface for POST body
interface CreateProcedureInput {
  auditId: string;
  phase: string;
  groupId?: string | null;
  title?: string;
  purpose?: string;
}

// Type guard for strict input validation
function isValidCreateInput(data: any): data is CreateProcedureInput {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.auditId !== 'string' || data.auditId.trim() === '') return false;
  if (typeof data.phase !== 'string' || data.phase.trim() === '') return false;
  if (data.groupId !== undefined && data.groupId !== null && typeof data.groupId !== 'string') return false;
  if (data.title !== undefined && typeof data.title !== 'string') return false;
  if (data.purpose !== undefined && typeof data.purpose !== 'string') return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let data: any;
    try {
      data = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Strict input validation
    if (!isValidCreateInput(data)) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    const { auditId, phase, groupId, title, purpose } = data;

    // Authorization
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
        title: title?.trim() || 'New Procedure',
        purpose: purpose?.trim() || '',
        status: 'Not Started',
        displayOrder: nextOrder,
      }
    });

    await logProcedureCreation(procedure.id, procedure.title || 'New Procedure', session.user.username);

    return NextResponse.json(procedure);
  } catch (error: unknown) {
    // Log the actual error internally
    console.error('[Procedures POST] Error:', error);
    // Return a safe error response without exposing sensitive data
    return NextResponse.json({ error: 'An unexpected error occurred while creating the procedure' }, { status: 500 });
  }
}
