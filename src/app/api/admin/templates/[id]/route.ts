import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

interface TemplateProcedureInput {
  title: string;
  purpose: string;
}

interface TemplateGroupInput {
  phase: string;
  title: string;
  procedures: TemplateProcedureInput[];
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  console.log(`[API/Templates/${params.id}] GET request received`);
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const template = await prisma.auditTemplate.findUnique({
      where: { id: params.id },
      include: {
        groups: {
          orderBy: { displayOrder: 'asc' },
          include: {
            procedures: {
              orderBy: { displayOrder: 'asc' }
            }
          }
        },
        procedures: {
          where: { groupId: null },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!template) {
      console.warn(`[API/Templates/${params.id}] Template not found`);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log(`[API/Templates/${params.id}] Found template: ${template.name} with ${template.groups.length} groups`);
    return NextResponse.json(template);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API/Templates/${params.id}] GET Error:`, message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

async function updateTemplateTransaction(
  tx: Prisma.TransactionClient,
  templateId: string,
  name: string,
  description: string,
  groups: TemplateGroupInput[]
) {
  // Update template details
  await tx.auditTemplate.update({
    where: { id: templateId },
    data: { name, description }
  });

  // Clear existing structure
  await tx.templateProcedure.deleteMany({ where: { templateId } });
  await tx.templateGroup.deleteMany({ where: { templateId } });

  // Create new groups and procedures
  if (groups && Array.isArray(groups)) {
    await Promise.all(groups.map(async (g, gIndex) => {
      const group = await tx.templateGroup.create({
        data: {
          templateId,
          phase: g.phase,
          title: g.title,
          displayOrder: gIndex
        }
      });

      if (g.procedures && Array.isArray(g.procedures)) {
        await tx.templateProcedure.createMany({
          data: g.procedures.map((p: TemplateProcedureInput, pIndex: number) => ({
            templateId,
            groupId: group.id,
            phase: g.phase,
            title: p.title,
            purpose: p.purpose,
            displayOrder: pIndex
          }))
        });
      }
    }));
  }

  // Fetch and return the fully populated template
  return await tx.auditTemplate.findUnique({
    where: { id: templateId },
    include: {
      groups: {
        orderBy: { displayOrder: 'asc' },
        include: {
          procedures: {
            orderBy: { displayOrder: 'asc' }
          }
        }
      }
    }
  });
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  const canManageTemplates = session?.user?.role === 'Business Operations';

  if (!session || !canManageTemplates) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, description, groups }: { name: string, description: string, groups: TemplateGroupInput[] } = await req.json();

    const result = await prisma.$transaction((tx) =>
      updateTemplateTransaction(tx, params.id, name, description, groups)
    );

    if (!result) {
      return NextResponse.json({ error: 'Template not found after update' }, { status: 404 });
    }

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'TEMPLATE',
        entityId: params.id,
        details: `Updated audit template structure: ${result.name}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Failed to update template', details: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  const canManageTemplates = session?.user?.role === 'Business Operations';

  if (!session || !canManageTemplates) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const template = await prisma.auditTemplate.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'TEMPLATE',
        entityId: params.id,
        details: `Deleted audit template: ${template.name}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete template', details: message }, { status: 500 });
  }
}
