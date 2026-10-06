import 'dotenv/config';
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
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!seedPassword && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_SEED_PASSWORD environment variable must be set in production');
  }
  const passwordToUse = seedPassword || 'admin';
  const hashedPassword = await bcrypt.hash(passwordToUse, 10);

  const admins = [
    { username: 'it.admin', role: 'IT Administrator', fullName: 'IT Admin', email: 'it.admin@example.com' },
    { username: 'biz.ops', role: 'Business Operations', fullName: 'Biz Ops', email: 'biz.ops@example.com' }
  ];

  const forceReset = process.env.RESET_ADMIN_CREDENTIALS === 'true';

  for (const admin of admins) {
    const existing = await prisma.user.findUnique({
      where: { username: admin.username },
    });

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          username: admin.username,
          password: hashedPassword,
          role: admin.role,
          mustChangePassword: true,
        },
      });
      console.log(`Created user: ${user.username} | Role: ${user.role}`);
    } else {
      const isMatch = existing.password ? await bcrypt.compare(passwordToUse, existing.password) : false;
      const hasPasswordChangeLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'USER',
          entityId: existing.id,
          action: 'UPDATE',
          details: { contains: 'password' },
        },
      });

      if (!isMatch && (existing.mustChangePassword || !hasPasswordChangeLog || forceReset)) {
        const user = await prisma.user.update({
          where: { username: admin.username },
          data: {
            password: hashedPassword,
            mustChangePassword: true,
          },
        });
        console.log(`Updated user credentials: ${user.username} | Role: ${user.role}`);
      } else {
        console.log(`Ensured user: ${existing.username} (password already customized)`);
      }
    }
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
