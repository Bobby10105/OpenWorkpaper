import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';

async function assertGroupAccess(user: { id: string; role: string }, groupId: string) {
  const group = await prisma.procedureGroup.findUnique({
    where: { id: groupId },
    select: { auditId: true },
  });
  if (!group) return { ok: false as const, status: 404, message: 'Procedure group not found' };
  const allowed = await canAccessAudit(user, group.auditId);
  if (!allowed) return { ok: false as const, status: 403, message: 'Forbidden' };
  return { ok: true as const };
}

export async function PUT(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const access = await assertGroupAccess(session.user, params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const body = await req.json();
    const group = await prisma.procedureGroup.update({
      where: { id: params.id },
      data: body
    });
    return NextResponse.json(group);
  } catch (error: unknown) {
    console.error('Update group error:', error);
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const access = await assertGroupAccess(session.user, params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    await prisma.procedureGroup.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete group error:', error);
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
