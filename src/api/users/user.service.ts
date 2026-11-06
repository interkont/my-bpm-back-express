import bcrypt from 'bcryptjs';
import { User, Role } from '../../models';
import { attrs } from '../../utils/pick';
import { toUserWithRolesDto, type UserWithRolesDto } from './user.mappers';
import type { CreateUserInput, UpdateUserInput } from './user.schemas';

const BCRYPT_ROUNDS = 10;

const userAttrs = attrs<User>()('id', 'fullName', 'email', 'status', 'systemRole', 'createdAt');

export const createUser = async (input: CreateUserInput): Promise<UserWithRolesDto | null> => {
  const { password, roleIds, ...userData } = input;
  // Si falta la contraseña bcrypt lanza y el endpoint responde 500 (comportamiento actual).
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ ...userData, passwordHash });

  if (roleIds && roleIds.length > 0) {
    await user.setRoles(roleIds);
  }

  // Recargamos el usuario para devolverlo con los roles asociados
  const reloaded = await User.findByPk(user.id, {
    include: {
      model: Role,
      as: 'roles',
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      through: { attributes: [] }, // No incluir datos de la tabla intermedia
    },
    attributes: userAttrs,
  });
  return reloaded ? toUserWithRolesDto(reloaded) : null;
};

export const getAllUsers = async (): Promise<UserWithRolesDto[]> => {
  const users = await User.findAll({
    attributes: userAttrs,
    include: {
      model: Role,
      as: 'roles',
    },
  });
  return users.map(toUserWithRolesDto);
};

export const getUserById = async (id: number): Promise<UserWithRolesDto | null> => {
  const user = await User.findByPk(id, {
    attributes: userAttrs,
    include: {
      model: Role,
      as: 'roles',
    },
  });
  return user ? toUserWithRolesDto(user) : null;
};

export const updateUser = async (
  id: number,
  data: UpdateUserInput,
): Promise<UserWithRolesDto | null> => {
  const { roleIds, password, ...updateData } = data;
  const user = await User.findByPk(id);

  if (!user) {
    throw new Error('User not found');
  }

  const fields = password
    ? { ...updateData, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) }
    : updateData;

  // Actualizar datos del usuario
  await user.update(fields);

  // Actualizar roles si se proporcionan
  if (roleIds) {
    await user.setRoles(roleIds);
  }

  // Recargamos el usuario para devolverlo con los roles actualizados
  const reloaded = await User.findByPk(id, {
    include: {
      model: Role,
      as: 'roles',
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      through: { attributes: [] },
    },
    attributes: userAttrs,
  });
  return reloaded ? toUserWithRolesDto(reloaded) : null;
};

export const deleteUser = (id: number): Promise<number> => {
  return User.destroy({
    where: { id },
  });
};
