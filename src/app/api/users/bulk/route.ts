import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    
    const canManageUsers = session?.user?.role === 'IT Administrator';
    
    if (!canManageUsers) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { users } = await req.json();

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid users list' }, { status: 400 });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const userData of users) {
      try {
        const username = userData.username || userData.email;
        const role = userData.role || 'Auditor';
        const password = userData.password || 'Welcome123!'; 

        if (!username) {
          results.skipped++;
          continue;
        }

        const existingUser = await prisma.user.findUnique({
          where: { username },
        });

        if (existingUser) {
          results.skipped++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            role,
            mustChangePassword: true, // Force password change on first login
          },
        });

        try {
          await prisma.auditLog.create({
            data: {
              action: 'CREATE',
              entityType: 'USER',
              entityId: newUser.id,
              details: `Bulk imported user: ${newUser.username} with role: ${newUser.role}`,
              performedBy: session.user.username || 'System',
            }
          });
        } catch (logErr) {
          console.warn('Bulk import log failed (non-critical):', logErr);
        }

        results.created++;
      } catch (err: any) {
        console.error(`Bulk import error for ${userData.username}:`, err);
        results.errors.push(`Failed to create ${userData.username || 'unknown'}: ${err.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Bulk create CRITICAL error:', error);
    return NextResponse.json({ error: 'Failed to process bulk import', details: error.message }, { status: 500 });
  }
}
