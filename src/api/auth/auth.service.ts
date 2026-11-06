import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role, SystemRoleModule } from '../../models';
import { config } from '../../config';
import { attrs } from '../../utils/pick';
import { invalidCredentials, invalidOldPassword, notFound, validation } from '../../domain/errors';
import type { UpdateProfileInput } from './auth.schemas';
import { toLoginResponse, toUserDto } from './auth.mappers';
import type { LoginResponseDto, UserDto } from './auth.mappers';

interface UpdateProfileFields {
  fullName?: string;
  email?: string;
  passwordHash?: string;
}

export const login = async (email: string, password: string): Promise<LoginResponseDto> => {
  const user = await User.findOne({
    where: { email },
    include: [{ model: Role, as: 'roles' }],
  });
  if (!user) {
    throw invalidCredentials('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw invalidCredentials('Invalid credentials');
  }

  // Obtener los módulos permitidos para el systemRole del usuario
  const roleModules = await SystemRoleModule.findAll({
    where: { systemRole: user.systemRole },
    attributes: attrs<SystemRoleModule>()('moduleName'),
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

  // Añadir los módulos al objeto de respuesta
  return toLoginResponse(user, token, modules);
};

export const updateProfile = async (userId: number, data: UpdateProfileInput): Promise<UserDto> => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw notFound('User not found');
  }

  const { fullName, email, oldPassword, newPassword } = data;
  const updateData: UpdateProfileFields = {};

  if (fullName) updateData.fullName = fullName;
  if (email) updateData.email = email;

  if (newPassword) {
    if (!oldPassword) {
      throw validation(
        [{ field: 'oldPassword', msg: 'Old password is required to set a new password' }],
        'Old password is required to set a new password',
      );
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw invalidOldPassword('Invalid old password');
    }

    updateData.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await user.update(updateData);

  return toUserDto(user);
};
