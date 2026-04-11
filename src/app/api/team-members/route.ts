import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access: Only Business Operations can manage team assignments
    if (session.user.role !== 'Business Operations') {
      return NextResponse.json({ error: 'Forbidden: Only Business Operations can manage team members' }, { status: 403 });
    }

    let data;
    try {
      data = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { auditId } = data;
    if (!auditId) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    // Attempt to create the member with minimal requirements
    const teamMember = await prisma.teamMember.create({
      data: {
        auditId: auditId,
        name: 'New Team Member',
        role: '',
        email: '',
      }
    });

    // Attempt logging silently so it doesn't break the main action
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
      console.warn('Silent log failure:', logErr);
    }

    return NextResponse.json(teamMember);
  } catch (error: any) {
    console.error('CRITICAL Team Member Creation Error:', error);
    return NextResponse.json({ 
      error: 'Failed to create team member', 
      details: error.message,
      code: error.code 
    }, { status: 500 });
  }
}
