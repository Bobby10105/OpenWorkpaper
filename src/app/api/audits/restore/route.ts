import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

interface RestoreAttachment {
  filename: string;
  filepath: string;
  mimetype: string | null;
  size: number | null;
  displayOrder: number | null;
}

interface RestoreProcedure {
  title: string | null;
  purpose: string | null;
  source: string | null;
  scope: string | null;
  methodology: string | null;
  results: string | null;
  conclusions: string | null;
  status: string;
  phase: string;
  preparedBy: string | null;
  preparedDate: string | Date | null;
  reviewedBy: string | null;
  reviewedDate: string | Date | null;
  displayOrder: number;
  groupId: string | null;
  attachments?: RestoreAttachment[];
}

interface RestoreGroup {
  id: string;
  title: string;
  phase: string;
  displayOrder: number;
  procedures?: RestoreProcedure[];
}

interface RestoreTeamMember {
  name: string;
  role: string | null;
  email: string | null;
}

interface RestoreAuditData {
  title: string;
  category?: string;
  auditNumber?: string;
  objective?: string;
  status?: string;
  procedureGroups?: RestoreGroup[];
  procedures?: RestoreProcedure[];
  teamMembers?: RestoreTeamMember[];
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let data: RestoreAuditData;
    let zip: JSZip | null = null;

    if (contentType.includes('multipart/form-data')) {
      // 1. Handle ZIP Upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

      const buffer = await file.arrayBuffer();
      zip = await JSZip.loadAsync(buffer);
      const dataFile = zip.file('audit_data.json');
      if (!dataFile) throw new Error('Invalid backup ZIP: audit_data.json missing');
      
      const dataStr = await dataFile.async('string');
      data = JSON.parse(dataStr);
    } else {
      // 2. Handle Legacy JSON Upload
      data = await req.json();
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the main audit record
      const audit = await tx.audit.create({
        data: {
          title: `${data.title} (Restored)`,
          category: data.category || 'General',
          auditNumber: data.auditNumber,
          objective: data.objective,
          status: data.status || 'Planning',
        },
      });

      const groupMap = new Map<string, string>();
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await fs.mkdir(uploadDir, { recursive: true });

      // 2. Create Groups
      if (data.procedureGroups && Array.isArray(data.procedureGroups)) {
        for (const group of data.procedureGroups) {
          const newGroup = await tx.procedureGroup.create({
            data: {
              auditId: audit.id,
              title: group.title,
              phase: group.phase,
              displayOrder: group.displayOrder,
            }
          });
          groupMap.set(group.id, newGroup.id);
        }
      }

      // 3. Create Procedures and Attachments
      const proceduresToRestore = data.procedures || 
        (data.procedureGroups?.flatMap(g => (g.procedures || []).map(p => ({ ...p, groupId: g.id })))) || 
        [];

      if (Array.isArray(proceduresToRestore)) {
        for (const p of proceduresToRestore) {
          const newProcedure = await tx.procedure.create({
            data: {
              auditId: audit.id,
              groupId: p.groupId ? groupMap.get(p.groupId) : null,
              title: p.title,
              purpose: p.purpose,
              source: p.source,
              scope: p.scope,
              methodology: p.methodology,
              results: p.results,
              conclusions: p.conclusions,
              status: p.status || 'Not Started',
              phase: p.phase,
              preparedBy: p.preparedBy,
              preparedDate: p.preparedDate ? new Date(p.preparedDate) : null,
              reviewedBy: p.reviewedBy,
              reviewedDate: p.reviewedDate ? new Date(p.reviewedDate) : null,
              displayOrder: p.displayOrder || 0,
            }
          });

          // Restore Attachments for this procedure
          if (p.attachments && Array.isArray(p.attachments)) {
            for (const att of p.attachments) {
              // If we have a ZIP, try to restore the file to disk
              let finalFilepath = att.filepath;
              
              if (zip) {
                const diskFilename = path.basename(att.filepath);
                const zipFile = zip.file(`attachments/${diskFilename}`);
                
                if (zipFile) {
                  const fileBuffer = await zipFile.async('nodebuffer');
                  // We keep the original filename or generate a new one to avoid collisions?
                  // Best practice is to use the original disk filename from the ZIP
                  await fs.writeFile(path.join(uploadDir, diskFilename), fileBuffer);
                  finalFilepath = `/uploads/${diskFilename}`;
                }
              }

              await tx.attachment.create({
                data: {
                  procedureId: newProcedure.id,
                  filename: att.filename,
                  filepath: finalFilepath,
                  mimetype: att.mimetype,
                  size: att.size,
                  displayOrder: att.displayOrder,
                }
              });
            }
          }
        }
      }

      // 4. Create Team Members
      if (data.teamMembers && Array.isArray(data.teamMembers)) {
        for (const m of data.teamMembers) {
          await tx.teamMember.create({
            data: {
              auditId: audit.id,
              name: m.name,
              role: m.role,
              email: m.email,
            }
          });
        }
      }

      return audit;
    });
    
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Restore error:', error);
    const message = error instanceof Error ? error.message : 'Restore failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
