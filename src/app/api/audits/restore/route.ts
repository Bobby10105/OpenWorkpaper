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

interface RestoreMessage {
  sender: string;
  text: string;
  createdAt: string | Date;
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
  assignedToId: string | null;
  attachments?: RestoreAttachment[];
  messages?: RestoreMessage[];
}

interface RestoreGroup {
  id: string;
  title: string;
  phase: string;
  displayOrder: number;
  procedures?: RestoreProcedure[];
}

interface RestoreTeamMember {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
}

interface RestoreAuditData {
  title: string;
  description?: string;
  category?: string;
  auditNumber?: string;
  objective?: string;
  status?: string;
  pbcRequests?: string;
  pbcAttachmentUrl?: string;
  pbcAttachmentName?: string;
  milestoneAttachmentUrl?: string;
  milestoneAttachmentName?: string;
  fieldworkStartDate?: string | Date;
  fieldworkEndDate?: string | Date;
  reportIssuedDate?: string | Date;
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
          pbcRequests: data.pbcRequests,
          pbcAttachmentUrl: data.pbcAttachmentUrl,
          pbcAttachmentName: data.pbcAttachmentName,
          milestoneAttachmentUrl: data.milestoneAttachmentUrl,
          milestoneAttachmentName: data.milestoneAttachmentName,
        },
      });

      const groupMap = new Map<string, string>();
      const teamMemberMap = new Map<string, string>();
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await fs.mkdir(uploadDir, { recursive: true });

      // 2. Create Team Members (needed for procedure assignments)
      if (data.teamMembers && Array.isArray(data.teamMembers)) {
        for (const m of data.teamMembers) {
          const newMember = await tx.teamMember.create({
            data: {
              auditId: audit.id,
              name: m.name,
              role: m.role,
              email: m.email,
            }
          });
          if (m.id) teamMemberMap.set(m.id, newMember.id);
        }
      }

      // 3. Create Groups
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

      // 4. Create Procedures, Attachments, and Messages
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
              assignedToId: p.assignedToId ? teamMemberMap.get(p.assignedToId) : null,
            }
          });

          // Restore Messages (Review Notes)
          if (p.messages && Array.isArray(p.messages)) {
            for (const msg of p.messages) {
              await tx.procedureMessage.create({
                data: {
                  procedureId: newProcedure.id,
                  sender: msg.sender,
                  text: msg.text,
                  createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
                }
              });
            }
          }

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

      // Restore PBC and Milestone files from ZIP if they exist
      if (zip) {
        const filesToRestore = [
          { url: data.pbcAttachmentUrl, name: 'PBC' },
          { url: data.milestoneAttachmentUrl, name: 'Milestone' }
        ];

        for (const f of filesToRestore) {
          if (f.url) {
            const diskFilename = path.basename(f.url);
            const zipFile = zip.file(`attachments/${diskFilename}`);
            if (zipFile) {
              const fileBuffer = await zipFile.async('nodebuffer');
              await fs.writeFile(path.join(uploadDir, diskFilename), fileBuffer);
            }
          }
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
sole.error('Restore error:', error);
    const message = error instanceof Error ? error.message : 'Restore failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
