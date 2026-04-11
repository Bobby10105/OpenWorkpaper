import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, logout } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SSO users might not have a password
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
      }
    } else {
        return NextResponse.json({ error: 'Password change not available for SSO users' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        mustChangePassword: false // Clear the force change flag
      },
    });

    // Clear the session - user must log back in with new password
    await logout();

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'USER',
        entityId: user.id,
        details: 'User changed their password (session terminated)',
        performedBy: user.username,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
