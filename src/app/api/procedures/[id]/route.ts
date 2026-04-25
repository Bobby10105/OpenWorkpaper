import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const data = await req.json();
    console.log(`PUT Procedure ${params.id} Data:`, JSON.stringify(data));
    
    const parseDate = (dateStr: any) => {
      if (dateStr === null || dateStr === undefined || dateStr === '') return null;
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    // Use RAW SQL Update with explicit error catching per step
    const assignedToId = (data.assignedToId === '' || data.assignedToId === undefined) ? null : data.assignedToId;

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE Procedure 
         SET title = ?, 
             purpose = ?, 
             source = ?, 
             scope = ?, 
             methodology = ?, 
             results = ?, 
             conclusions = ?, 
             preparedBy = ?, 
             preparedDate = ?, 
             reviewedBy = ?, 
             reviewedDate = ?, 
             assignedToId = ?,
             updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        data.title ?? null,
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
        assignedToId,
        params.id
      );
    } catch (sqlError: any) {
      console.error('SQL Update Failed:', sqlError.message);
      throw new Error(`Database update failed: ${sqlError.message}`);
    }

    // Fetch the updated procedure using standard Prisma (it should work now if instance is fresh)
    // or use RAW if still paranoid. Let's use RAW to be safe.
    const updated: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Procedure WHERE id = ? LIMIT 1`,
      params.id
    );

    if (!updated || updated.length === 0) {
      throw new Error("Procedure not found after update");
    }

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error('Update procedure error:', error);
    return NextResponse.json({ 
      error: 'Failed to update procedure', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const params = await props.params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'Specialist') {
      return NextResponse.json({ error: 'Forbidden: Specialists cannot delete procedures' }, { status: 403 });
    }
    
    const procedureResults: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Procedure WHERE id = ? LIMIT 1`,
      params.id
    );
    const procedure = procedureResults[0];

    if (procedure) {
      const attachments: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM Attachment WHERE procedureId = ?`,
        params.id
      );

      const publicDir = path.join(process.cwd(), 'public');
      for (const attachment of attachments) {
        const fullPath = path.join(publicDir, attachment.filepath);
        try {
          await fs.unlink(fullPath);
        } catch (e) {}
      }

      await prisma.$executeRawUnsafe(`DELETE FROM Procedure WHERE id = ?`, params.id);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete procedure error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete procedure', 
      details: error.message 
    }, { status: 500 });
  }
}
