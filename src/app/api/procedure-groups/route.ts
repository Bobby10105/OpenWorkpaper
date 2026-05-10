import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { auditId, phase, title } = body;

    const aggregate = await prisma.procedureGroup.aggregate({
      where: { auditId, phase },
      _max: { displayOrder: true }
    });
    
    const nextOrder = (aggregate._max.displayOrder || 0) + 1;

    const group = await prisma.procedureGroup.create({
      data: {
        auditId,
        phase,
        title,
        displayOrder: nextOrder
      }
    });

    return NextResponse.json(group);
  } catch (error: unknown) {
    console.error('Create group error:', error);
    const message = error instanceof Error ? error.message : 'Creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
