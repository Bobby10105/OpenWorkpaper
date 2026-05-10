import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json();
    
    const audit = await prisma.audit.update({
      where: { id: params.id },
      data: {
        pbcRequests: body.pbcRequests
      }
    });

    return NextResponse.json(audit);
  } catch (error: unknown) {
    console.error('PBC update error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update PBC requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
