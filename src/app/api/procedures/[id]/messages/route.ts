import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessProcedure } from '@/lib/audit-access';
import DOMPurify from 'isomorphic-dompurify';

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
    
    const allowed = await canAccessProcedure(session.user, params.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    
    const text = DOMPurify.sanitize(String(body.text ?? '').trim());
    if (!text) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }
    
    const message = await prisma.procedureMessage.create({
      data: {
        procedureId: params.id,
        text: text,
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
