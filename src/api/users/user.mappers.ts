import type { User } from '../../models';
import type { SystemRole } from '../../domain/constants';

// Fila de la tabla intermedia que Sequelize anida como `UserRole` en las consultas con include.
export interface UserRoleLinkDto {
  userId: number;
  roleId: number;
  created_at: Date;
}

export interface UserRoleDto {
  id: number;
  name: string;
  description: string;
  UserRole?: UserRoleLinkDto;
}

export interface UserWithRolesDto {
  id: number;
  fullName: string;
  email: string;
  status: string;
  systemRole: SystemRole;
  createdAt: Date;
  roles: UserRoleDto[];
}

type RoleInstance = NonNullable<User['roles']>[number];

const toUserRoleDto = (role: RoleInstance): UserRoleDto => {
  const dto: UserRoleDto = { id: role.id, name: role.name, description: role.description };
  // Solo presente cuando la consulta no excluye la tabla intermedia.
  if (role.UserRole) {
    dto.UserRole = {
      userId: role.UserRole.userId,
      roleId: role.UserRole.roleId,
      created_at: role.UserRole.created_at,
    };
  }
  return dto;
};

export const toUserWithRolesDto = (user: User): UserWithRolesDto => {
  const plain = user.get({ plain: true });
  return {
    id: plain.id,
    fullName: plain.fullName,
    email: plain.email,
    status: plain.status,
    systemRole: plain.systemRole,
    createdAt: plain.createdAt,
    roles: (user.roles ?? []).map(toUserRoleDto),
  };
};
