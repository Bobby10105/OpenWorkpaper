import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isGlobalManager = session.user.role === 'IT Administrator' || session.user.role === 'Business Operations';
    if (!isGlobalManager) {
      return NextResponse.json({ error: 'Forbidden: Only managers can manage team members' }, { status: 403 });
    }

    let data;
    try {
      data = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { auditId } = data;
    if (!auditId) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        auditId: auditId,
        name: 'New Team Member',
        role: '',
        email: '',
      }
    });

    try {
      const audit = await prisma.audit.findUnique({
        where: { id: auditId },
        select: { title: true }
      });

      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'TEAM_MEMBER',
          entityId: teamMember.id,
          details: `Added a new team member row to audit: ${audit?.title || auditId}`,
          performedBy: session.user.username,
        }
      });
    } catch (logErr) {
      console.warn('Log error (non-critical):', logErr);
    }

    return NextResponse.json(teamMember);
  } catch (error: unknown) {
    console.error('CRITICAL Team Member Creation Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to create team member', 
      details: message
    }, { status: 500 });
  }
}
