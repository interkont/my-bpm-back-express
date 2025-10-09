const { User, Role } = require('../../models');
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
    // --- INICIO DE LA CORRECCIÓN QUIRÚRGICA ---
    attributes: { exclude: ['passwordHash'] },
    // --- FIN DE LA CORRECCIÓN QUIRÚRGICA ---
    include: {
      model: Role,
      as: 'roles',
    },
  });
};

const getUserById = (id) => {
  return User.findByPk(id, {
    // --- INICIO DE LA CORRECCIÓN QUIRÚRGICA ---
    attributes: { exclude: ['passwordHash'] },
    // --- FIN DE LA CORRECCIÓN QUIRÚRGICA ---
    include: {
      model: Role,
      as: 'roles',
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
