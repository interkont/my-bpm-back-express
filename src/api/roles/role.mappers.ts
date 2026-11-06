import type { Attributes } from 'sequelize';
import type { Role, User } from '../../models';

export type RoleMemberDto = Pick<Attributes<User>, 'id' | 'fullName' | 'email' | 'status'>;

export interface RoleDto {
  id: number;
  name: string;
  description: string;
}

export interface RoleDetailDto extends RoleDto {
  users: RoleMemberDto[];
}

type RolePlain = Attributes<Role> & { users?: RoleMemberDto[] };

const toMemberDto = (u: RoleMemberDto): RoleMemberDto => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  status: u.status,
});

export const toRoleDto = (role: Role): RoleDto => {
  const r: RolePlain = role.get({ plain: true });
  return { id: r.id, name: r.name, description: r.description };
};

// Detalle con miembros (mismo orden de claves y de arreglo que antes).
export const toRoleDetailDto = (role: Role): RoleDetailDto => {
  const r: RolePlain = role.get({ plain: true });
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    users: (r.users ?? []).map(toMemberDto),
  };
};
