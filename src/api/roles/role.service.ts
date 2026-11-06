import type {
  BelongsToManyCountAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { Role, User } from '../../models';

// Métodos de asociación que Sequelize agrega en runtime vía Role.belongsToMany(User)
// y que el modelo no declara.
interface RoleConUsuarios {
  setUsers: BelongsToManySetAssociationsMixin<User, number>;
  countUsers: BelongsToManyCountAssociationsMixin;
}

export type RoleCreateInput = InferCreationAttributes<Role>;

// Datos de actualización: campos del rol más la lista opcional de miembros.
export type RoleUpdateInput = Partial<InferAttributes<Role>> & { userIds?: number[] };

const crearErrorConEstado = (message: string, statusCode: number): Error =>
  Object.assign(new Error(message), { statusCode });

export const createRole = (data: RoleCreateInput): Promise<Role> => {
  return Role.create(data);
};

export const getAllRoles = (): Promise<Role[]> => {
  return Role.findAll();
};

export const getRoleById = (id: number): Promise<Role | null> => {
  return Role.findByPk(id, {
    include: {
      model: User,
      as: 'users',
      attributes: ['id', 'fullName', 'email', 'status'],
      through: { attributes: [] },
    },
  });
};

export const updateRole = async (id: number, data: RoleUpdateInput): Promise<Role | null> => {
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
    // Aserción: Role.belongsToMany(User) garantiza setUsers en runtime (no declarado en el modelo).
    await (role as Role & RoleConUsuarios).setUsers(userIds);
  }

  // Recargar y devolver el rol con los usuarios actualizados
  return getRoleById(id);
};

export const deleteRole = async (id: number): Promise<void> => {
  const role = await Role.findByPk(id);

  if (!role) {
    throw crearErrorConEstado('Role not found', 404);
  }

  // Aserción: Role.belongsToMany(User) garantiza countUsers en runtime (no declarado en el modelo).
  const userCount = await (role as Role & RoleConUsuarios).countUsers();
  if (userCount > 0) {
    throw crearErrorConEstado('Cannot delete role with associated users', 409);
  }

  return role.destroy();
};
