const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 10);
  
  // Create IT Administrator (Identity Management)
  const itAdmin = await prisma.user.upsert({
    where: { username: 'it.admin' },
    update: { role: 'IT Administrator', mustChangePassword: false },
    create: {
      username: 'it.admin',
      password: hashedPassword,
      role: 'IT Administrator',
      mustChangePassword: false,
    },
  });

  // Create Business Operations (Data Management)
  const bizOps = await prisma.user.upsert({
    where: { username: 'biz.ops' },
    update: { role: 'Business Operations', mustChangePassword: false },
    create: {
      username: 'biz.ops',
      password: hashedPassword,
      role: 'Business Operations',
      mustChangePassword: false,
    },
  });

  console.log('Seed successful: Roles separated.');
  console.log('IT Administrator: it.admin / admin');
  console.log('Business Operations: biz.ops / admin');
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
