import { prisma } from '@/lib/prisma';

export interface SessionUserLike {
  id: string;
  role: string;
}

export function hasGlobalAuditAccess(user: SessionUserLike): boolean {
  return user.role === 'Business Operations';
}

export async function canAccessAudit(user: SessionUserLike, auditId: string): Promise<boolean> {
  if (hasGlobalAuditAccess(user)) return true;
  const membership = await prisma.teamMember.findFirst({
    where: {
      auditId,
      userId: user.id,
    },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function canAccessProcedure(user: SessionUserLike, procedureId: string): Promise<boolean> {
  const procedure = await prisma.procedure.findUnique({
    where: { id: procedureId },
    select: { auditId: true },
  });
  if (!procedure) return false;
  return canAccessAudit(user, procedure.auditId);
}

export async function canAccessAttachment(user: SessionUserLike, attachmentId: string): Promise<boolean> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      procedure: {
        select: { auditId: true },
      },
    },
  });
  if (!attachment?.procedure?.auditId) return false;
  return canAccessAudit(user, attachment.procedure.auditId);
}
