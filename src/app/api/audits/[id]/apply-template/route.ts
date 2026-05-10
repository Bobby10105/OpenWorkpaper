import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import type { Procedure } from '@prisma/client';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { templateId, phase }: { templateId: string, phase?: string } = await req.json();
    
    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const template = await prisma.auditTemplate.findUnique({
      where: { id: templateId },
      include: { 
        groups: {
          include: { procedures: true }
        },
        procedures: {
          where: { groupId: null }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const createdProcedures: Procedure[] = [];

    await prisma.$transaction(async (tx) => {
      // 1. Process Groups
      const templateGroups = phase 
        ? template.groups.filter(g => g.phase === phase)
        : template.groups;

      for (const tg of templateGroups) {
        const group = await tx.procedureGroup.create({
          data: {
            auditId: params.id,
            phase: tg.phase,
            title: tg.title,
            displayOrder: tg.displayOrder
          }
        });

        const procs = await Promise.all(
          tg.procedures.map(tp => tx.procedure.create({
            data: {
              auditId: params.id,
              groupId: group.id,
              phase: tp.phase,
              title: tp.title,
              purpose: tp.purpose
            }
          }))
        );
        createdProcedures.push(...procs);
      }

      // 2. Process Ungrouped Procedures
      const ungroupedToCopy = phase 
        ? template.procedures.filter(p => p.phase === phase)
        : template.procedures;

      if (ungroupedToCopy.length > 0) {
        const procs = await Promise.all(
          ungroupedToCopy.map(tp => tx.procedure.create({
            data: {
              auditId: params.id,
              phase: tp.phase,
              title: tp.title,
              purpose: tp.purpose
            }
          }))
        );
        createdProcedures.push(...procs);
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'AUDIT',
        entityId: params.id,
        details: `Applied template: ${template.name}${phase ? ` for phase: ${phase}` : ''}. Created ${createdProcedures.length} procedures.`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json({ 
      success: true, 
      count: createdProcedures.length,
      procedures: createdProcedures 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Apply template error:', error);
    return NextResponse.json({ error: 'Failed to apply template', details: message }, { status: 500 });
  }
}
