import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { login } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

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
