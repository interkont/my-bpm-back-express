import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { InferAttributes } from 'sequelize';
import { User, Role, SystemRoleModule } from '../../models';
import { config } from '../../config';

export type UserWithoutPassword = Omit<InferAttributes<User>, 'passwordHash'>;

export interface LoginResult {
  user: UserWithoutPassword;
  token: string;
  modules: string[];
}

export interface UpdateProfileData {
  fullName?: string;
  email?: string;
  oldPassword?: string;
  newPassword?: string;
}

interface UpdateProfileFields {
  fullName?: string;
  email?: string;
  passwordHash?: string;
}

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const user = await User.findOne({
    where: { email },
    include: [{ model: Role, as: 'roles' }],
  });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Obtener los módulos permitidos para el systemRole del usuario
  const roleModules = await SystemRoleModule.findAll({
    where: { systemRole: user.systemRole },
    attributes: ['moduleName'],
  });
  const modules = roleModules.map((rm) => rm.moduleName);

  // El `include` de roles garantiza que `user.roles` está definido en esta consulta (el cast solo lo reafirma).
  const roleIds = (user.roles as Role[]).map((role) => role.id);

  const tokenPayload = {
    id: user.id,
    roleIds: roleIds,
    systemRole: user.systemRole,
  };

  const token = jwt.sign(tokenPayload, config.jwt.secret, { expiresIn: '8h' });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...userWithoutPassword } = user.get({ plain: true });

  // Añadir los módulos al objeto de respuesta
  return { user: userWithoutPassword, token, modules };
};

export const updateProfile = async (
  userId: number,
  data: UpdateProfileData,
): Promise<UserWithoutPassword> => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error: ErrorWithStatus = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const { fullName, email, oldPassword, newPassword } = data;
  const updateData: UpdateProfileFields = {};

  if (fullName) updateData.fullName = fullName;
  if (email) updateData.email = email;

  if (newPassword) {
    if (!oldPassword) {
      const error: ErrorWithStatus = new Error('Old password is required to set a new password');
      error.statusCode = 400; // Bad Request
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      const error: ErrorWithStatus = new Error('Invalid old password');
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    updateData.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await user.update(updateData);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...userWithoutPassword } = user.get({ plain: true });
  return userWithoutPassword;
};
