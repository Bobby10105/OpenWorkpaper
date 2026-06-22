import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL || 'file:dev.db';
  
  const sqliteInput = {
    url: dbUrl.replace(/^file:/, ''),
    timeout: 5000 // Configures SQLite busy_timeout for concurrency
  };
  
  // Note: Prisma and the driver adapter automatically handle WAL mode 
  // and foreign_keys pragmas internally when connecting.
  const adapter = new PrismaBetterSqlite3(sqliteInput);
  
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return client;
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
