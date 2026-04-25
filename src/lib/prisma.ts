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
        const info: any[] = await client.$queryRawUnsafe("PRAGMA table_info(Procedure);");
        const hasColumn = info.some(c => c.name === 'assignedToId');
        if (!hasColumn) {
          console.log('--- DATABASE AUTO-REPAIR: Adding assignedToId to Procedure ---');
          await client.$executeRawUnsafe("ALTER TABLE Procedure ADD COLUMN assignedToId TEXT;");
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
