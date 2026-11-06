import type { Role, User, UserRole } from '../../models';

export type UserRoleDto = ReturnType<typeof userRoleToDto>;

export interface RoleDto {
  id: number;
  name: string;
  description: string;
  UserRole?: UserRoleDto;
}

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  status: string;
  systemRole: User['systemRole'];
  createdAt: Date;
}

export interface LoginUserDto extends UserDto {
  roles: RoleDto[];
}

export interface LoginResponseDto {
  user: LoginUserDto;
  token: string;
  modules: string[];
}

const userRoleToDto = (userRole: UserRole) => {
  const plain = userRole.get({ plain: true });
  return { userId: plain.userId, roleId: plain.roleId, created_at: plain.created_at };
};

const roleToDto = (role: Role): RoleDto => {
  const plain = role.get({ plain: true });
  const dto: RoleDto = { id: plain.id, name: plain.name, description: plain.description };
  // `UserRole` es el objeto intermedio que Sequelize anida en cada rol del include.
  if (role.UserRole) dto.UserRole = userRoleToDto(role.UserRole);
  return dto;
};

// Usuario sin `passwordHash` (respuesta de perfil).
export const toUserDto = (user: User): UserDto => {
  const plain = user.get({ plain: true });
  return {
    id: plain.id,
    fullName: plain.fullName,
    email: plain.email,
    status: plain.status,
    systemRole: plain.systemRole,
    createdAt: plain.createdAt,
  };
};

export const toLoginResponse = (
  user: User,
  token: string,
  modules: string[],
): LoginResponseDto => ({
  user: { ...toUserDto(user), roles: (user.roles ?? []).map(roleToDto) },
  token,
  modules,
});
