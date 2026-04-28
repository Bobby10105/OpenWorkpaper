import type { Audit, Procedure, Attachment, TeamMember, ProcedureMessage, ProcedureGroup } from '@prisma/client';

export type ProcedureWithRelations = Procedure & { 
  displayOrder?: number,
  attachments: Attachment[],
  messages: ProcedureMessage[],
  assignedTo?: TeamMember | null
};

export type ProcedureGroupWithRelations = ProcedureGroup & {
  procedures: ProcedureWithRelations[]
};

export type AuditWithRelations = Audit & { 
  procedures: ProcedureWithRelations[],
  procedureGroups: ProcedureGroupWithRelations[],
  teamMembers: TeamMember[] 
};
