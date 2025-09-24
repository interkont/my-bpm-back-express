const { User, Role } = require('../../models'); // Importamos desde el nuevo index de modelos
const bcrypt = require('bcryptjs');

const createUser = async (data) => {
  const { password, ...userData } = data;
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    ...userData,
    passwordHash,
  });
};

const getAllUsers = () => {
  return User.findAll({
    include: {
      model: Role,
      as: 'role', // Usamos el alias que definimos en las asociaciones
    },
  });
};

const getUserById = (id) => {
  return User.findByPk(id, {
    include: {
      model: Role,
      as: 'role',
    },
  });
};

const updateUser = async (id, data) => {
  const { password, ...updateData } = data;
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }
  return User.update(updateData, {
    where: { id },
  });
};

const deleteUser = (id) => {
  return User.destroy({
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
