const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Crear Roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      description: 'Administrador del sistema',
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'User',
      description: 'Usuario regular del sistema',
    },
  });

  console.log('Roles created:', adminRole, userRole);

  // Crear Usuarios
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const adminUser = await prisma.user.create({
    data: {
      fullName: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      roleId: adminRole.id,
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      fullName: 'Regular User',
      email: 'user@example.com',
      passwordHash: userPassword,
      roleId: userRole.id,
    },
  });

  console.log('Users created:', adminUser, regularUser);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
