import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const body = await req.json();
    
    const message = await prisma.procedureMessage.create({
      data: {
        procedureId: params.id,
        text: body.text,
        sender: session.user.username,
      }
    });
    return NextResponse.json(message);
  } catch (error: unknown) {
    console.error('Create message error:', error);
    const message = error instanceof Error ? error.message : 'Creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
