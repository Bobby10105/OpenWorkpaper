import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { login } from '@/lib/auth';
import bcrypt from 'bcryptjs';



const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
// TODO: Migrate failedAttempts to a distributed store like Redis for rate limiting in clustered environments
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

// Periodic cleanup of expired locks to prevent memory leaks from unbounded map
setInterval(() => {
  const now = Date.now();
  for (const [key, attempt] of failedAttempts.entries()) {
    if (attempt.lockedUntil < now && attempt.lockedUntil !== 0) {
      failedAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

function handleFailedLogin(username: string) {
  const currentAttempt = failedAttempts.get(username) || { count: 0, lockedUntil: 0 };
  currentAttempt.count += 1;
  if (currentAttempt.count >= MAX_FAILED_ATTEMPTS) {
    currentAttempt.lockedUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
    console.warn(`[Login] Account locked for user: ${username}`);
  }
  failedAttempts.set(username, currentAttempt);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const attempt = failedAttempts.get(username);
    if (attempt && attempt.lockedUntil > Date.now()) {
      return NextResponse.json({ error: 'Account locked due to too many failed attempts. Try again later.' }, { status: 429 });
    }


    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.password) {
      console.warn(`[Login] User not found or has no password: ${username}`);

    handleFailedLogin(username);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn(`[Login] Invalid password for user: ${username}`);

    handleFailedLogin(username);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    // Reset failed attempts on success
    failedAttempts.delete(username);


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
