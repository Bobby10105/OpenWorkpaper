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
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  await prisma.user.upsert({
    where: { username: 'itadmin' },
    update: {},
    create: {
      username: 'itadmin',
      password: hashedPassword,
      role: 'IT Administrator',
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      password: hashedPassword,
      role: 'Business Operations',
      mustChangePassword: false,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
