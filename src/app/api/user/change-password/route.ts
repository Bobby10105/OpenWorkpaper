import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, logout } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export function validatePassword(password: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;
  return regex.test(password);
}

// Define user type instead of using 'any'
interface UserWithPassword {
  id: string;
  username: string;
  password?: string | null;
}

// Helper to validate the current password
async function validateCurrentPassword(user: UserWithPassword, currentPassword: string) {
  if (user.password) {
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'Password change not available for SSO users' }, { status: 400 });
  }
  return null;
}

// Helper to update password and log the action
async function updatePasswordAndLog(user: UserWithPassword, newPassword: string) {
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
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!validatePassword(newPassword)) {
      return NextResponse.json({ error: 'Password does not meet complexity requirements' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const validationError = await validateCurrentPassword(user, currentPassword);
    if (validationError) {
      return validationError;
    }

    await updatePasswordAndLog(user, newPassword);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
