import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'Business Operations') {
      return NextResponse.json({ error: 'Unauthorized. Business Operations only.' }, { status: 403 });
    }

    // 1. Fetch all procedures with Audit and TeamMember (assignedTo) data
    // Using $queryRawUnsafe because it's safer for dynamic schema environments (like Docker)
    const procedures: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        a.title as auditTitle,
        a.status as auditStatus,
        p.id as procedureId,
        p.phase,
        p.title as procedureTitle,
        p.preparedBy,
        p.preparedDate,
        p.reviewedBy,
        p.reviewedDate,
        t.name as assignedToName
      FROM Procedure p
      JOIN Audit a ON p.auditId = a.id
      LEFT JOIN TeamMember t ON p.assignedToId = t.id
      ORDER BY a.createdAt DESC, p.phase, p.displayOrder ASC
    `);

    // 2. Format data for Excel
    const reportData = procedures.map(p => {
      const prepDate = p.preparedDate ? new Date(p.preparedDate) : null;
      const revDate = p.reviewedDate ? new Date(p.reviewedDate) : null;
      
      let reviewLag = '';
      if (prepDate && revDate) {
        const diffTime = Math.abs(revDate.getTime() - prepDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        reviewLag = diffDays.toString();
      }

      let status = 'Not Started';
      if (p.reviewedBy && p.reviewedDate) status = 'Completed';
      else if (p.preparedBy && p.preparedDate) status = 'Pending Review';
      else if (p.assignedToName) status = 'In Progress';

      return {
        'Audit Title': p.auditTitle,
        'Audit Status': p.auditStatus,
        'Phase': p.phase,
        'Procedure Title': p.procedureTitle || 'Untitled',
        'Status': status,
        'Assigned To': p.assignedToName || 'Unassigned',
        'Prepared By': p.preparedBy || '',
        'Prepared Date': p.preparedDate ? new Date(p.preparedDate).toLocaleDateString() : '',
        'Reviewed By': p.reviewedBy || '',
        'Reviewed Date': p.reviewedDate ? new Date(p.reviewedDate).toLocaleDateString() : '',
        'Review Lag (Days)': reviewLag
      };
    });

    // 3. Create Workbook
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Global Procedures');

    // Add some styling (Auto-size columns)
    const colWidths = [
      { wch: 30 }, // Audit Title
      { wch: 15 }, // Audit Status
      { wch: 15 }, // Phase
      { wch: 40 }, // Procedure Title
      { wch: 15 }, // Status
      { wch: 20 }, // Assigned To
      { wch: 20 }, // Prepared By
      { wch: 15 }, // Prepared Date
      { wch: 20 }, // Reviewed By
      { wch: 15 }, // Reviewed Date
      { wch: 15 }, // Review Lag
    ];
    worksheet['!cols'] = colWidths;

    // 4. Return as Buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="OpenWorkpaper_Global_Report.xlsx"'
      }
    });

  } catch (error: any) {
    console.error('[API/Export] Export Error:', error);
    return NextResponse.json({ error: 'Failed to generate report', details: error.message }, { status: 500 });
  }
}
