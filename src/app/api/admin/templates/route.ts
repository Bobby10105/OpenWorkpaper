import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  console.log('[API/Templates] GET request received');
  try {
    const session = await getSession();
    if (!session) {
      console.warn('[API/Templates] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Defensive check: Log available models if auditTemplate is missing
    if (!prisma.auditTemplate) {
      const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
      console.error('[API/Templates] auditTemplate model NOT FOUND in Prisma client.');
      console.error('[API/Templates] Available models:', models.join(', '));
      return NextResponse.json({ 
        error: 'Database configuration error', 
        details: 'AuditTemplate model not found in client',
        availableModels: models
      }, { status: 500 });
    }

    console.log('[API/Templates] Fetching from database...');
    const templates = await prisma.auditTemplate.findMany({
      include: {
        _count: {
          select: { procedures: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`[API/Templates] Found ${templates.length} templates`);
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('[API/Templates] GET Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const canManageTemplates = session?.user?.role === 'Business Operations';

    if (!session || !canManageTemplates) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!prisma.auditTemplate) {
      return NextResponse.json({ error: 'Database model not initialized' }, { status: 500 });
    }

    const template = await prisma.auditTemplate.create({
      data: { name, description }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'TEMPLATE',
        entityId: template.id,
        details: `Created audit template: ${template.name}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('[API/Templates] POST Error:', error.message);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Template name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create template', details: error.message }, { status: 500 });
  }
}
