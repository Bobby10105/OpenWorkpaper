const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/data/dev.db';
const pathOnly = dbUrl.replace(/^file:/, '');
const adapter = new PrismaBetterSqlite3({ url: pathOnly });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 10);
  
  // Create IT Administrator (Identity Management)
  // We now update the password on upsert to ensure default credentials work
  const itAdmin = await prisma.user.upsert({
    where: { username: 'it.admin' },
    update: { 
      role: 'IT Administrator',
      password: hashedPassword,
      mustChangePassword: true
    },
    create: {
      username: 'it.admin',
      password: hashedPassword,
      role: 'IT Administrator',
      mustChangePassword: true,
    },
  });

  // Create Business Operations (Data Management)
  const bizOps = await prisma.user.upsert({
    where: { username: 'biz.ops' },
    update: { 
      role: 'Business Operations',
      password: hashedPassword,
      mustChangePassword: true
    },
    create: {
      username: 'biz.ops',
      password: hashedPassword,
      role: 'Business Operations',
      mustChangePassword: true,
    },
  });

  console.log('Seed successful: Roles separated and security hardened.');
  console.log('IT Administrator: it.admin / admin (Password reset)');
  console.log('Business Operations: biz.ops / admin (Password reset)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
