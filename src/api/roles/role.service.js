const prisma = require('../../utils/prisma'); // Corregido

const createRole = (data) => {
  return prisma.role.create({
    data,
  });
};

const getAllRoles = () => {
  return prisma.role.findMany();
};

const getRoleById = (id) => {
  return prisma.role.findUnique({
    where: { id },
  });
};

const updateRole = (id, data) => {
  return prisma.role.update({
    where: { id },
    data,
  });
};

const deleteRole = (id) => {
  return prisma.role.delete({
    where: { id },
  });
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
};
