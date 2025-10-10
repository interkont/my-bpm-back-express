const { Role, User } = require('../../models');

const createRole = (data) => {
  return Role.create(data);
};

const getAllRoles = () => {
  return Role.findAll();
};

const getRoleById = (id) => {
  return Role.findByPk(id, {
    include: {
      model: User,
      as: 'users',
      attributes: ['id', 'fullName', 'email', 'status'], // Atributos corregidos
      through: { attributes: [] }
    }
  });
};

const updateRole = async (id, data) => {
  const { userIds, ...roleData } = data;
  const role = await Role.findByPk(id);

  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  // Actualizar datos básicos del rol
  await role.update(roleData);

  // Si se proporciona userIds, sincronizar la lista de miembros
  if (userIds !== undefined) { // Permite pasar un array vacío [] para quitar todos los usuarios
    await role.setUsers(userIds);
  }

  // Recargar y devolver el rol con los usuarios actualizados
  return getRoleById(id);
};

const deleteRole = async (id) => {
  const role = await Role.findByPk(id);

  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  const userCount = await role.countUsers();
  if (userCount > 0) {
    const error = new Error('Cannot delete role with associated users');
    error.statusCode = 409; // Conflict
    throw error;
  }

  return role.destroy();
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
};
