import { PrismaClient } from 'generated/prisma';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@example.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const password = 'Admin123!';
    const hash = await argon2.hash(password);
    await prisma.user.create({
      data: { email: adminEmail, name: 'Administrator', password: hash, role: 'ADMIN' },
    });
    console.log(`Seeded admin user: ${adminEmail} / ${password}`);
  } else {
    console.log('Admin user already exists, skipping');
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
