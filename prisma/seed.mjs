import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || 'file:prisma/data/dev.db';
const sqliteInput = {
  url: dbUrl.replace(/^file:/, '')
};
const adapter = new PrismaBetterSqlite3(sqliteInput);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 10);

  await prisma.user.upsert({
    where: { username: 'it.admin' },
    update: {}, // Don't overwrite password on every restart
    create: {
      username: 'it.admin',
      password: hashedPassword,
      role: 'IT Administrator',
      mustChangePassword: true, // Force change on first login
    },
  });

  await prisma.user.upsert({
    where: { username: 'biz.ops' },
    update: {}, // Don't overwrite password on every restart
    create: {
      username: 'biz.ops',
      password: hashedPassword,
      role: 'Business Operations',
      mustChangePassword: true, // Force change on first login
    },
  });

  const userCount = await prisma.user.count();
  console.log(`Seed data created/updated successfully. Total users: ${userCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
