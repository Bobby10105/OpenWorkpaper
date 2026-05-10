import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json();
    const group = await prisma.procedureGroup.update({
      where: { id: params.id },
      data: body
    });
    return NextResponse.json(group);
  } catch (error: unknown) {
    console.error('Update group error:', error);
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await prisma.procedureGroup.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete group error:', error);
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
