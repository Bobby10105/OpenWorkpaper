import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const dbList: any = await prisma.$queryRawUnsafe("PRAGMA database_list;");
    const tableInfo: any = await prisma.$queryRawUnsafe("PRAGMA table_info(Procedure);");
    
    return NextResponse.json({
      database_url: process.env.DATABASE_URL,
      active_database_files: dbList,
      procedure_columns: tableInfo.map((c: any) => c.name),
      full_info: tableInfo
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
