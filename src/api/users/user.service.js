const { User, Role } = require('../../models');
const bcrypt = require('bcryptjs');

const createUser = async (userData) => {
  const { roleIds, ...userPayload } = userData;
  const user = await User.create(userPayload);

  if (roleIds && roleIds.length > 0) {
    await user.setRoles(roleIds);
  }

  // Recargamos el usuario para devolverlo con los roles asociados
  return User.findByPk(user.id, {
    include: {
      model: Role,
      as: 'roles',
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      through: { attributes: [] } // No incluir datos de la tabla intermedia
    },
    attributes: { exclude: ['passwordHash'] }
  });
};

const getAllUsers = () => {
  return User.findAll({
    attributes: { exclude: ['passwordHash'] },
    include: {
      model: Role,
      as: 'roles',
    },
  });
};

const getUserById = (id) => {
  return User.findByPk(id, {
    attributes: { exclude: ['passwordHash'] },
    include: {
      model: Role,
      as: 'roles',
    },
  });
};

const updateUser = async (id, data) => {
  const { roleIds, password, ...updateData } = data;
  const user = await User.findByPk(id);

  if (!user) {
    throw new Error('User not found');
  }

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  // Actualizar datos del usuario
  await user.update(updateData);

  // Actualizar roles si se proporcionan
  if (roleIds) {
    await user.setRoles(roleIds);
  }

  // Recargamos el usuario para devolverlo con los roles actualizados
  return User.findByPk(id, {
    include: {
      model: Role,
      as: 'roles',
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      through: { attributes: [] }
    },
    attributes: { exclude: ['passwordHash'] }
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
