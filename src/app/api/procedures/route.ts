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

    // Use RAW SQL to create to bypass any Prisma Client validation issues
    const title = data.title || 'New Procedure';
    const auditId = data.auditId;
    const groupId = data.groupId || null;
    const phase = data.phase;
    
    // Create random ID for SQLite (Prisma usually does this via UUID)
    // Using a simpler approach for the raw insert
    const id = crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      `INSERT INTO Procedure (
        id, auditId, groupId, phase, title, purpose, source, scope, 
        methodology, results, conclusions, preparedBy, preparedDate, 
        reviewedBy, reviewedDate, assignedToId, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
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
      (data.assignedToId === '' || data.assignedToId === undefined) ? null : data.assignedToId
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
