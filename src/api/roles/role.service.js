const { Role } = require('../../models'); // Corregido

const createRole = (data) => {
  return Role.create(data);
};

const getAllRoles = () => {
  return Role.findAll();
};

const getRoleById = (id) => {
  return Role.findByPk(id);
};

const updateRole = (id, data) => {
  return Role.update(data, {
    where: { id },
  });
};

const deleteRole = (id) => {
  return Role.destroy({
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
