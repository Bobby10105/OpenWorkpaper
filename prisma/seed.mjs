import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/data/dev.db';
const dbPath = dbUrl.replace(/^file:/, '');
const sqliteInput = {
  url: path.resolve(process.cwd(), dbPath)
};
const adapter = new PrismaBetterSqlite3(sqliteInput);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Running safe admin seed...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admins = [
    { username: 'it.admin', role: 'IT Administrator', fullName: 'IT Admin', email: 'it.admin@example.com' },
    { username: 'biz.ops', role: 'Business Operations', fullName: 'Biz Ops', email: 'biz.ops@example.com' }
  ];

  for (const admin of admins) {
    const user = await prisma.user.upsert({
      where: { username: admin.username },
      update: {},
      create: {
        username: admin.username,
        password: hashedPassword,
        role: admin.role,
        mustChangePassword: false,
      }
    });
    console.log(`Ensured user: ${user.username} | Role: ${user.role}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
