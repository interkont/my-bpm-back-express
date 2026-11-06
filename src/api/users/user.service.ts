import bcrypt from 'bcryptjs';
import { User, Role } from '../../models';
import type { SystemRole } from '../../domain/constants';

export interface CreateUserData {
  fullName: string;
  email: string;
  passwordHash: string;
  status?: string;
  systemRole?: SystemRole;
  roleIds?: number[];
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  status?: string;
  systemRole?: SystemRole;
  password?: string;
  roleIds?: number[];
}

interface UpdateUserFields {
  fullName?: string;
  email?: string;
  status?: string;
  systemRole?: SystemRole;
  passwordHash?: string;
}

// El mixin `setRoles` lo genera Sequelize por la asociación belongsToMany y no está declarado en el modelo.
type UserWithSetRoles = User & { setRoles(roleIds: number[]): Promise<void> };

export const createUser = async (userData: CreateUserData): Promise<User | null> => {
  const { roleIds, ...userPayload } = userData;
  const user = await User.create(userPayload);

  if (roleIds && roleIds.length > 0) {
    // Invariante: la asociación `roles` (belongsToMany) siempre define `setRoles` en runtime.
    await (user as UserWithSetRoles).setRoles(roleIds);
  }

  // Recargamos el usuario para devolverlo con los roles asociados
  return User.findByPk(user.id, {
    include: {
      model: Role,
      as: 'roles',
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      through: { attributes: [] }, // No incluir datos de la tabla intermedia
    },
    attributes: { exclude: ['passwordHash'] },
  });
};

export const getAllUsers = (): Promise<User[]> => {
  return User.findAll({
    attributes: { exclude: ['passwordHash'] },
    include: {
      model: Role,
      as: 'roles',
    },
  });
};

export const getUserById = (id: number): Promise<User | null> => {
  return User.findByPk(id, {
    attributes: { exclude: ['passwordHash'] },
    include: {
      model: Role,
      as: 'roles',
    },
  });
};

export const updateUser = async (id: number, data: UpdateUserData): Promise<User | null> => {
  const { roleIds, password, ...rest } = data;
  const updateData: UpdateUserFields = rest;
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
    // Invariante: la asociación `roles` (belongsToMany) siempre define `setRoles` en runtime.
    await (user as UserWithSetRoles).setRoles(roleIds);
  }

  // Recargamos el usuario para devolverlo con los roles actualizados
  return User.findByPk(id, {
    include: {
      model: Role,
      as: 'roles',
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      through: { attributes: [] },
    },
    attributes: { exclude: ['passwordHash'] },
  });
};

export const deleteUser = (id: number): Promise<number> => {
  return User.destroy({
    where: { id },
  });
};
