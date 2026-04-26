const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 10);
  
  // Create IT Administrator (Identity Management)
  // mustChangePassword is now set to true for improved security
  const itAdmin = await prisma.user.upsert({
    where: { username: 'it.admin' },
    update: { role: 'IT Administrator', mustChangePassword: true },
    create: {
      username: 'it.admin',
      password: hashedPassword,
      role: 'IT Administrator',
      mustChangePassword: true,
    },
  });

  // Create Business Operations (Data Management)
  // mustChangePassword is now set to true for improved security
  const bizOps = await prisma.user.upsert({
    where: { username: 'biz.ops' },
    update: { role: 'Business Operations', mustChangePassword: true },
    create: {
      username: 'biz.ops',
      password: hashedPassword,
      role: 'Business Operations',
      mustChangePassword: true,
    },
  });

  console.log('Seed successful: Roles separated and security hardened.');
  console.log('IT Administrator: it.admin / admin (Password change required)');
  console.log('Business Operations: biz.ops / admin (Password change required)');
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
