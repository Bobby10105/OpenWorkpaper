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

      const groupsToCreate = [];
      const proceduresToCreate = [];

      for (const tg of templateGroups) {
        const groupId = crypto.randomUUID();
        groupsToCreate.push({
          id: groupId,
          auditId: params.id,
          phase: tg.phase,
          title: tg.title,
          displayOrder: tg.displayOrder
        });

        for (const tp of tg.procedures) {
          const procedureId = crypto.randomUUID();
          proceduresToCreate.push({
            id: procedureId,
            auditId: params.id,
            groupId: groupId,
            phase: tp.phase,
            title: tp.title,
            purpose: tp.purpose
          });
        }
      }

      // 2. Process Ungrouped Procedures
      const ungroupedToCopy = phase 
        ? template.procedures.filter(p => p.phase === phase)
        : template.procedures;

      for (const tp of ungroupedToCopy) {
        proceduresToCreate.push({
          id: crypto.randomUUID(),
          auditId: params.id,
          groupId: null,
          phase: tp.phase,
          title: tp.title,
          purpose: tp.purpose
        });
      }

      // Execute bulk inserts
      if (groupsToCreate.length > 0) {
        await tx.procedureGroup.createMany({ data: groupsToCreate });
      }

      if (proceduresToCreate.length > 0) {
        await tx.procedure.createMany({ data: proceduresToCreate });

        // Fetch fully hydrated database objects to return in API response
        const newProcedures = await tx.procedure.findMany({
          where: {
            id: {
              in: proceduresToCreate.map(p => p.id)
            }
          }
        });
        createdProcedures.push(...newProcedures);
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
