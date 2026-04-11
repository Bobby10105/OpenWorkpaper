import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const params = await props.params;

    const canManageUsers = session?.user?.role === 'IT Administrator';

    if (!canManageUsers) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.id === params.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'USER',
        entityId: params.id,
        details: `Deleted user: ${user.username}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
