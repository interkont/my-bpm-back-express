const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');

const createUser = async (data) => {
  const { password, ...userData } = data;
  const passwordHash = await bcrypt.hash(password, 10); // 10 salt rounds
  return prisma.user.create({
    data: {
      ...userData,
      passwordHash,
    },
  });
};

const getAllUsers = () => {
  return prisma.user.findMany({
    include: {
      role: true,
    },
  });
};

const getUserById = (id) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      role: true, // Incluir la relación con el rol
    },
  });
};

const updateUser = async (id, data) => {
  const { password, ...updateData } = data;
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }
  return prisma.user.update({
    where: { id },
    data: updateData,
  });
};

const deleteUser = (id) => {
  return prisma.user.delete({
    where: { id },
  });
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
