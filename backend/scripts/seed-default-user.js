/**
 * Creates a default admin user if no users exist (e.g. after first deploy).
 * Used in production: set ADMIN_EMAIL and ADMIN_PASSWORD in Render env, or use defaults below.
 * Run from app root: node scripts/seed-default-user.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'ChangeMe123!';

async function main() {
  const email = process.env.ADMIN_EMAIL || DEFAULT_EMAIL;
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Users already exist, skipping default user creation.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      role: 'ADMIN',
    },
  });
  console.log('Default admin created:', email, '| Password:', password === DEFAULT_PASSWORD ? '(default: ChangeMe123!)' : '(from ADMIN_PASSWORD)');
}

main()
  .catch((e) => {
    console.error('seed-default-user failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
