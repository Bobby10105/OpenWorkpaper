import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { login } from '@/lib/auth';
import { redis } from '@/lib/redis';
import bcrypt from 'bcryptjs';

const RATE_LIMIT_WINDOW_SEC = 15 * 60; // 15 minutes in seconds
const MAX_FAILED_ATTEMPTS = 5;

async function handleFailedLogin(username: string) {
  const attemptsKey = `login_attempts:${username}`;
  const lockedKey = `account_locked:${username}`;

  try {
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) {
      await redis.expire(attemptsKey, RATE_LIMIT_WINDOW_SEC);
    }

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await redis.set(lockedKey, '1', 'EX', RATE_LIMIT_WINDOW_SEC);
      console.warn(`[Login] Account locked for user: ${username}`);
    }
  } catch (error) {
    console.error('[Login] Failed to record login attempt to Redis', error);
  }
}

async function isAccountLocked(username: string): Promise<boolean> {
  try {
    const locked = await redis.get(`account_locked:${username}`);
    return locked !== null;
  } catch (error) {
    console.error('[Login] Failed to check lock status from Redis', error);
    return false;
  }
}

async function clearFailedAttempts(username: string) {
  try {
    await redis.del(`login_attempts:${username}`);
    await redis.del(`account_locked:${username}`);
  } catch (error) {
    console.error('[Login] Failed to clear failed attempts from Redis', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const locked = await isAccountLocked(username);
    if (locked) {
      return NextResponse.json({ error: 'Account locked due to too many failed attempts. Try again later.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.password) {
      console.warn(`[Login] User not found or has no password: ${username}`);

      await handleFailedLogin(username);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn(`[Login] Invalid password for user: ${username}`);

      await handleFailedLogin(username);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    // Reset failed attempts on success
    await clearFailedAttempts(username);

    await login({ 
      id: user.id, 
      username: user.username, 
      role: user.role,
      mustChangePassword: user.mustChangePassword
    });

    return NextResponse.json({ 
      success: true, 
      role: user.role,
      mustChangePassword: user.mustChangePassword
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
