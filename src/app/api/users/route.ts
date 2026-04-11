import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;
    const parsed = await decrypt(session);
    return (parsed as any).user;
  } catch (e) {
    return null;
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await getSessionUser();
    
    const canManageUsers = adminUser?.role === 'IT Administrator';
    
    if (!canManageUsers) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, password, role } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        mustChangePassword: true, // Force password change on first login
      },
    });

    // Log the action
    try {
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'USER',
          entityId: user.id,
          details: `Created user: ${user.username} with role: ${user.role}`,
          performedBy: adminUser.username || 'System',
        }
      });
    } catch (logErr) {
      console.warn('User creation log failed (non-critical):', logErr);
    }

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Create user CRITICAL error:', error);
    return NextResponse.json({ 
      error: 'Failed to create user', 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}
