import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['error', 'warn'],
  });

  // Self-healing database: Add missing columns if they don't exist
  // This is necessary for Docker environments with persistent volumes
  if (process.env.NODE_ENV !== 'production') {
    (async () => {
      try {
        // Repair Procedure table
        const procInfo: any[] = await client.$queryRawUnsafe("PRAGMA table_info(Procedure);");
        if (!procInfo.some(c => c.name === 'assignedToId')) {
          console.log('--- DATABASE AUTO-REPAIR: Adding assignedToId to Procedure ---');
          await client.$executeRawUnsafe("ALTER TABLE Procedure ADD COLUMN assignedToId TEXT;");
        }

        // Repair Audit table for PBC fields
        const auditInfo: any[] = await client.$queryRawUnsafe("PRAGMA table_info(Audit);");
        if (!auditInfo.some(c => c.name === 'pbcAttachmentUrl')) {
          console.log('--- DATABASE AUTO-REPAIR: Adding PBC columns to Audit ---');
          await client.$executeRawUnsafe("ALTER TABLE Audit ADD COLUMN pbcAttachmentUrl TEXT;");
          await client.$executeRawUnsafe("ALTER TABLE Audit ADD COLUMN pbcAttachmentName TEXT;");
          console.log('--- DATABASE AUTO-REPAIR: Success ---');
        }
      } catch (e) {
        console.error('--- DATABASE AUTO-REPAIR: Failed ---', e);
      }
    })();
  }

  return client;
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
