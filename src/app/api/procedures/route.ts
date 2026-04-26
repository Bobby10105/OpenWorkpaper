import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Helper to handle BigInt serialization for SQLite/Prisma
 */
function serialize(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export async function GET() {
  return NextResponse.json({ status: 'healthy', service: 'procedures' });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json().catch(() => ({}));
    const { auditId, phase, groupId, title, purpose } = data;

    if (!auditId || !phase) {
      return NextResponse.json({ error: 'Missing required fields: auditId and phase' }, { status: 400 });
    }

    // 1. Calculate next displayOrder
    let nextOrder = 0;
    try {
      const maxOrderRes = await prisma.procedure.aggregate({
        where: groupId ? { groupId } : { auditId, phase, groupId: null },
        _max: { displayOrder: true }
      });
      nextOrder = Number(maxOrderRes._max.displayOrder || 0) + 10;
    } catch (e) {
      // Non-fatal if order calculation fails
    }

    // 2. Create the procedure with self-healing fallback
    const createProcedure = async () => {
      return await prisma.procedure.create({
        data: {
          auditId,
          phase,
          groupId: groupId || null,
          title: title || 'New Procedure',
          purpose: purpose || '',
          displayOrder: nextOrder,
          source: data.source || null,
          scope: data.scope || null,
          methodology: data.methodology || null,
          results: data.results || null,
          conclusions: data.conclusions || null,
          preparedBy: data.preparedBy || null,
          reviewedBy: data.reviewedBy || null,
          assignedToId: data.assignedToId || null,
        }
      });
    };

    let procedure;
    try {
      procedure = await createProcedure();
    } catch (dbErr: any) {
      // Auto-repair if column is missing (common in Docker volumes)
      if (dbErr.message.includes('displayOrder') || dbErr.message.includes('column')) {
        try {
          await prisma.$executeRawUnsafe("ALTER TABLE Procedure ADD COLUMN displayOrder INTEGER DEFAULT 0 NOT NULL;");
          procedure = await createProcedure();
        } catch (repairErr) {
          // Final fallback: try without displayOrder if repair fails
          procedure = await prisma.procedure.create({
            data: {
              auditId,
              phase,
              groupId: groupId || null,
              title: title || 'New Procedure',
              purpose: purpose || ''
            }
          });
        }
      } else {
        throw dbErr;
      }
    }

    // 3. Log the action (async, non-blocking)
    const logAction = async () => {
      try {
        const audit = await prisma.audit.findUnique({
          where: { id: auditId },
          select: { title: true }
        });
        
        await prisma.auditLog.create({
          data: {
            action: 'CREATE',
            entityType: 'PROCEDURE',
            entityId: procedure.id,
            details: `Created procedure: ${procedure.title} in audit: ${audit?.title || auditId}`,
            performedBy: session.user.username,
          }
        });
      } catch (logErr) {
        console.warn('[API/Procedures] Audit log failed:', logErr);
      }
    };
    logAction();

    return new Response(JSON.stringify(serialize(procedure)), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[API/Procedures] Fatal Error:', error);
    return NextResponse.json({ 
      error: 'Failed to create procedure', 
      details: error.message 
    }, { status: 500 });
  }
}
