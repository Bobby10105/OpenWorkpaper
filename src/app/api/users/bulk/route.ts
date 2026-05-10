import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

interface BulkUser {
  username?: string;
  email?: string;
  role?: string;
  password?: string;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const canManageUsers = session?.user?.role === 'IT Administrator';
    
    if (!canManageUsers || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as { users: BulkUser[] };
    const { users } = body;

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
        await prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            role,
            mustChangePassword: true,
          },
        });

        results.created++;
      } catch (err: unknown) {
        console.error('Bulk import error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Failed to create ${userData.username}: ${message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('Bulk create error:', error);
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
