import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access: Only Business Operations can manage team assignments
    if (session.user.role !== 'Business Operations') {
      return NextResponse.json({ error: 'Forbidden: Only Business Operations can manage team members' }, { status: 403 });
    }

    const params = await props.params;
    const data = await req.json();

    // If userId was explicitly provided (from the dropdown), use it.
    // Otherwise, try to find a user by email/name as a fallback.
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
  } catch (error) {
    console.error('Update team member error:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access: Only Business Operations can manage team assignments
    if (session.user.role !== 'Business Operations') {
      return NextResponse.json({ error: 'Forbidden: Only Business Operations can manage team members' }, { status: 403 });
    }

    const params = await props.params;
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: params.id },
      include: { audit: { select: { title: true } } }
    });

    if (teamMember) {
      // Log the action
      try {
        await prisma.auditLog.create({
          data: {
            action: 'DELETE',
            entityType: 'TEAM_MEMBER',
            entityId: params.id,
            details: `Removed team member: ${teamMember.name} from audit: ${teamMember.audit?.title || teamMember.auditId}`,
            performedBy: session?.user?.username || 'System',
          }
        });
      } catch (logErr) {}

      await prisma.teamMember.delete({
        where: { id: params.id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete team member error:', error);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
