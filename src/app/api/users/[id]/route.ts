import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManageUsers = session.user.role === 'IT Administrator';
    if (!canManageUsers) {
      return NextResponse.json({ error: 'Forbidden: Only IT Administrators can update roles' }, { status: 403 });
    }

    const params = await props.params;
    const { role } = await req.json();

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_ROLE',
        entityType: 'USER',
        entityId: params.id,
        details: `Updated role for user: ${user.username} from ${user.role} to ${role}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Update user role error:', error);
    return NextResponse.json({ error: 'Failed to update user role', details: error.message }, { status: 500 });
  }
}

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
