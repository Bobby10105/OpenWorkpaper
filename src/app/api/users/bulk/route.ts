import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const ALLOWED_ROLES = ['Auditor', 'Specialist', 'IT Administrator', 'Business Operations', 'Audit Manager', 'Audit Director'];

function validatePassword(password: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;
  return regex.test(password);
}

interface BulkUser {
  username?: string;
  email?: string;
  role?: string;
  password?: string;
}

export async function processBulkUsers(users: BulkUser[]) {
  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Filter out valid users and handle missing usernames
  const validUsers = users.map(u => ({
    username: u.username || u.email,
    role: u.role || 'Auditor',
    password: u.password || 'Welcome123!',
    originalData: u,
  })).filter(u => {
    if (!u.username) {
      results.skipped++;
      results.errors.push('Skipped entry with missing username or email.');
      return false;
    }
    if (!ALLOWED_ROLES.includes(u.role)) {
      results.skipped++;
      results.errors.push(`Skipped ${u.username}: Invalid role.`);
      return false;
    }
    if (!validatePassword(u.password)) {
      results.skipped++;
      results.errors.push(`Skipped ${u.username}: Password does not meet complexity requirements.`);
      return false;
    }
    return true;
  });

  if (validUsers.length === 0) {
    return results;
  }

  // Single query to find existing users
  const usernames = validUsers.map(u => u.username as string);
  const existingUsers = await prisma.user.findMany({
    where: {
      username: {
        in: usernames,
      },
    },
    select: { username: true },
  });

  const existingUsernames = new Set(existingUsers.map(u => u.username));

  // Filter for new users only
  const newUsersToCreate = [];
  for (const u of validUsers) {
    if (existingUsernames.has(u.username as string)) {
      results.skipped++;
    } else {
      newUsersToCreate.push(u);
    }
  }

  if (newUsersToCreate.length > 0) {
    try {
      // Parallelize password hashing
      const usersWithHashedPasswords = await Promise.all(
        newUsersToCreate.map(async (u) => ({
          username: u.username as string,
          role: u.role,
          password: await bcrypt.hash(u.password, 10),
          mustChangePassword: true,
        }))
      );

      // Batch insert
      const createResult = await prisma.user.createMany({
        data: usersWithHashedPasswords,
      });

      results.created += createResult.count;
    } catch (err: unknown) {
      console.error('Bulk import error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.errors.push(`Failed to bulk create users: ${message}`);
    }
  }

  return results;
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

    const results = await processBulkUsers(users);

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('Bulk create error:', error);
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
