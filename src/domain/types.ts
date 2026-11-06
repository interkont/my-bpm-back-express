import type { SystemRole } from './constants';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

// Datos de negocio de una instancia de proceso.
export type BusinessData = JsonObject;

// Identidad autenticada (`req.user`); nunca incluye el hash de la contraseña.
export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  status: string;
  createdAt: Date;
  systemRole: SystemRole;
  roleIds?: number[];
}
