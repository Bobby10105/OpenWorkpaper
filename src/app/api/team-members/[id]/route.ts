import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'Specialist') {
      return NextResponse.json({ error: 'Forbidden: Specialists cannot manage team members' }, { status: 403 });
    }

    const params = await props.params;
    const data = await req.json();

    let userId = data.userId;
    
    if (!userId && (data.email || data.name)) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(data.email ? [{ username: data.email }] : []),
            ...(data.name ? [{ username: data.name }] : [])
          ]
        }
      });
      userId = user?.id || null;
    }

    const teamMember = await prisma.teamMember.update({
      where: { id: params.id },
      data: {
        name: data.name,
        role: data.role,
        email: data.email,
        userId: userId,
      }
    });
    return NextResponse.json(teamMember);
  } catch (error: unknown) {
    console.error('Update team member error:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'Specialist') {
      return NextResponse.json({ error: 'Forbidden: Specialists cannot manage team members' }, { status: 403 });
    }

    const params = await props.params;
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: params.id },
      include: { audit: { select: { title: true } } }
    });

    if (teamMember) {
      try {
        await prisma.auditLog.create({
          data: {
            action: 'DELETE',
            entityType: 'TEAM_MEMBER',
            entityId: params.id,
            details: `Removed team member: ${teamMember.name} from audit: ${teamMember.audit?.title || teamMember.auditId}`,
            performedBy: session.user.username,
          }
        });
      } catch (logErr) {
        console.warn('Log error (non-critical):', logErr);
      }

      await prisma.teamMember.delete({
        where: { id: params.id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete team member error:', error);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
