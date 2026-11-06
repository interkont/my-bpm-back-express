import type { Transaction } from 'sequelize';
import { Role, User } from '../../models';
import { sequelize } from '../../config/database';
import { attrs } from '../../utils/pick';
import { toRoleDetailDto, toRoleDto, type RoleDetailDto, type RoleDto } from './role.mappers';
import type { RoleCreateInput, RoleUpdateInput } from './role.schemas';

export type { RoleCreateInput, RoleUpdateInput };

const crearErrorConEstado = (message: string, statusCode: number): Error =>
  Object.assign(new Error(message), { statusCode });

const memberAttrs = attrs<User>()('id', 'fullName', 'email', 'status');

export const createRole = async (data: RoleCreateInput): Promise<RoleDto> => {
  return toRoleDto(await Role.create(data));
};

export const getAllRoles = async (): Promise<RoleDto[]> => {
  const roles = await Role.findAll();
  return roles.map(toRoleDto);
};

export const getRoleById = async (id: number, t?: Transaction): Promise<RoleDetailDto | null> => {
  const role = await Role.findByPk(id, {
    include: {
      model: User,
      as: 'users',
      attributes: memberAttrs,
      through: { attributes: [] },
    },
    transaction: t,
  });
  return role ? toRoleDetailDto(role) : null;
};

export const updateRole = async (
  id: number,
  data: RoleUpdateInput,
): Promise<RoleDetailDto | null> => {
  const { userIds, ...roleData } = data;
  const role = await Role.findByPk(id);

  if (!role) {
    throw crearErrorConEstado('Role not found', 404);
  }

  // Actualizar datos básicos del rol
  await role.update(roleData);

  // Si se proporciona userIds, sincronizar la lista de miembros
  if (userIds !== undefined) {
    // Permite pasar un array vacío [] para quitar todos los usuarios
    await role.setUsers(userIds);
  }

  // Recargar y devolver el rol con los usuarios actualizados
  return getRoleById(id);
};

export const deleteRole = async (id: number): Promise<void> => {
  await sequelize.transaction(async (t) => {
    const role = await Role.findByPk(id, { transaction: t });

    if (!role) {
      throw crearErrorConEstado('Role not found', 404);
    }

    const userCount = await role.countUsers({ transaction: t });
    if (userCount > 0) {
      throw crearErrorConEstado('Cannot delete role with associated users', 409);
    }

    await role.destroy({ transaction: t });
  });
};
