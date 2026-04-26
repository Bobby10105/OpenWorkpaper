import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const data = await req.json();

    const parseDate = (dateStr: any) => {
      if (dateStr === null || dateStr === undefined || dateStr === '') return null;
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    const title = data.title || 'New Procedure';
    const auditId = data.auditId;
    const groupId = data.groupId || null;
    const phase = data.phase;
    
    // Calculate next displayOrder
    let nextOrder = 0;
    try {
      const maxResults: any[] = await prisma.$queryRawUnsafe(
        groupId 
          ? `SELECT MAX(displayOrder) as maxOrder FROM Procedure WHERE groupId = ?`
          : `SELECT MAX(displayOrder) as maxOrder FROM Procedure WHERE auditId = ? AND phase = ? AND groupId IS NULL`,
        groupId ? groupId : auditId,
        groupId ? undefined : phase
      );
      nextOrder = (Number(maxResults[0]?.maxOrder || 0)) + 10;
    } catch (e) {
      console.warn("Failed to calculate max displayOrder, defaulting to 0");
    }

    const id = crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      `INSERT INTO Procedure (
        id, auditId, groupId, phase, title, purpose, source, scope, 
        methodology, results, conclusions, preparedBy, preparedDate, 
        reviewedBy, reviewedDate, assignedToId, displayOrder, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      id,
      auditId,
      groupId,
      phase,
      title,
      data.purpose ?? null,
      data.source ?? null,
      data.scope ?? null,
      data.methodology ?? null,
      data.results ?? null,
      data.conclusions ?? null,
      data.preparedBy ?? null,
      parseDate(data.preparedDate),
      data.reviewedBy ?? null,
      parseDate(data.reviewedDate),
      (data.assignedToId === '' || data.assignedToId === undefined) ? null : data.assignedToId,
      nextOrder
    );

    const procedureResults: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Procedure WHERE id = ? LIMIT 1`,
      id
    );
    const procedure = procedureResults[0];

    // Log the action
    const auditResults: any[] = await prisma.$queryRawUnsafe(
      `SELECT title FROM Audit WHERE id = ? LIMIT 1`,
      auditId
    );
    const auditTitle = auditResults[0]?.title || auditId;

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'PROCEDURE',
        entityId: id,
        details: `Created procedure: ${title} in audit: ${auditTitle}`,
        performedBy: session?.user?.username || 'System',
      }
    });

    return NextResponse.json(procedure);
  } catch (error: any) {
    console.error('Create procedure error (RAW):', error);
    return NextResponse.json({ 
      error: 'Failed to create procedure', 
      details: error.message 
    }, { status: 500 });
  }
}
