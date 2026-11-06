import type { Transaction } from 'sequelize';
import { Role, User } from '../../models';
import { sequelize } from '../../config/database';
import { attrs, pick } from '../../utils/pick';
import { conflict, notFound } from '../../domain/errors';
import { toRoleDetailDto, toRoleDto, type RoleDetailDto, type RoleDto } from './role.mappers';
import type { RoleCreateInput, RoleUpdateInput } from './role.schemas';

export type { RoleCreateInput, RoleUpdateInput };

// Lista blanca de escritura (data-model §9): `id` y el resto se ignoran.
const ROLE_FIELDS = ['name', 'description'] as const;

const memberAttrs = attrs<User>()('id', 'fullName', 'email', 'status');

export const createRole = async (data: RoleCreateInput): Promise<RoleDto> => {
  return toRoleDto(await Role.create({ name: data.name, description: data.description }));
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
  const { userIds } = data;
  const role = await Role.findByPk(id);

  if (!role) {
    throw notFound('Role not found');
  }

  // Actualizar datos básicos del rol
  await role.update(pick(data, ROLE_FIELDS));

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
      throw notFound('Role not found');
    }

    const userCount = await role.countUsers({ transaction: t });
    if (userCount > 0) {
      throw conflict('Cannot delete role with associated users');
    }

    await role.destroy({ transaction: t });
  });
};
