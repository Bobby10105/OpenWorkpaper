import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    // 1. Read audit data
    const auditDataFile = zip.file('audit_data.json');
    if (!auditDataFile) {
      return NextResponse.json({ error: 'Invalid backup: audit_data.json missing' }, { status: 400 });
    }

    const auditData = JSON.parse(await auditDataFile.async('string'));
    
    // 2. Prepare for restoration (generate new IDs to avoid collisions)
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Restore Milestone File if exists
      let newMilestoneUrl = null;
      if (auditData.milestoneAttachmentUrl) {
        const diskFilename = path.basename(auditData.milestoneAttachmentUrl);
        const zipPath = `attachments/${diskFilename}`;
        const zipFile = zip.file(zipPath);
        if (zipFile) {
          const fileContent = await zipFile.async('nodebuffer');
          const newFilepath = path.join(uploadsDir, diskFilename);
          try {
            await fs.writeFile(newFilepath, fileContent);
            newMilestoneUrl = `/uploads/${diskFilename}`;
          } catch (e) {
            console.error(`Failed to write restored milestone file: ${newFilepath}`, e);
          }
        }
      }

      // Create new Audit
      const newAudit = await tx.audit.create({
        data: {
          title: `RESTORED: ${auditData.title}`,
          description: auditData.description,
          category: auditData.category,
          auditNumber: auditData.auditNumber,
          objective: auditData.objective,
          status: auditData.status,
          fieldworkStartDate: auditData.fieldworkStartDate ? new Date(auditData.fieldworkStartDate) : null,
          fieldworkEndDate: auditData.fieldworkEndDate ? new Date(auditData.fieldworkEndDate) : null,
          reportIssuedDate: auditData.reportIssuedDate ? new Date(auditData.reportIssuedDate) : null,
          milestoneAttachmentUrl: newMilestoneUrl,
          milestoneAttachmentName: auditData.milestoneAttachmentName,
        }
      });

      // Restore Team Members
      if (auditData.teamMembers && Array.isArray(auditData.teamMembers)) {
        for (const member of auditData.teamMembers) {
          await tx.teamMember.create({
            data: {
              auditId: newAudit.id,
              userId: member.userId,
              name: member.name,
              role: member.role,
              email: member.email,
            }
          });
        }
      }

      // Map old group IDs to new ones
      const groupMap: Record<string, string> = {};

      // Restore Procedure Groups
      if (auditData.procedureGroups && Array.isArray(auditData.procedureGroups)) {
        for (const group of auditData.procedureGroups) {
          const newGroup = await tx.procedureGroup.create({
            data: {
              auditId: newAudit.id,
              phase: group.phase,
              title: group.title,
              displayOrder: group.displayOrder,
            }
          });
          groupMap[group.id] = newGroup.id;
        }
      }

      // Restore Procedures and Attachments
      const procedures = auditData.procedures || [];
      for (const proc of procedures) {
        const newProc = await tx.procedure.create({
          data: {
            auditId: newAudit.id,
            groupId: proc.groupId ? groupMap[proc.groupId] : null,
            phase: proc.phase,
            title: proc.title,
            purpose: proc.purpose,
            source: proc.source,
            scope: proc.scope,
            methodology: proc.methodology,
            results: proc.results,
            conclusions: proc.conclusions,
            preparedBy: proc.preparedBy,
            preparedDate: proc.preparedDate ? new Date(proc.preparedDate) : null,
            reviewedBy: proc.reviewedBy,
            reviewedDate: proc.reviewedDate ? new Date(proc.reviewedDate) : null,
          }
        });

        // Restore Attachments for this procedure
        if (proc.attachments && Array.isArray(proc.attachments)) {
          for (const att of proc.attachments) {
            const diskFilename = path.basename(att.filepath);
            const zipPath = `attachments/${diskFilename}`;
            const zipFile = zip.file(zipPath);

            if (zipFile) {
              const fileContent = await zipFile.async('nodebuffer');
              const newFilepath = path.join(uploadsDir, diskFilename);
              
              // Only write if doesn't exist to avoid duplicates if restoring same backup twice
              // though IDs are new, files might still be there
              try {
                await fs.writeFile(newFilepath, fileContent);
              } catch (e) {
                console.error(`Failed to write restored file: ${newFilepath}`, e);
              }

              await tx.attachment.create({
                data: {
                  procedureId: newProc.id,
                  filename: att.filename,
                  filepath: `/uploads/${diskFilename}`,
                  mimetype: att.mimetype,
                  size: att.size,
                  displayOrder: att.displayOrder,
                  preparedBy: att.preparedBy,
                  preparedDate: att.preparedDate ? new Date(att.preparedDate) : null,
                  reviewedBy: att.reviewedBy,
                  reviewedDate: att.reviewedDate ? new Date(att.reviewedDate) : null,
                }
              });
            }
          }
        }
      }

      return newAudit;
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'AUDIT',
        entityId: result.id,
        details: `Restored audit from backup: ${auditData.title}`,
        performedBy: session.user.username,
      }
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Restore failed', details: error.message }, { status: 500 });
  }
}
