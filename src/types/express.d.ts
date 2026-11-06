import type { AuthUser } from '../domain/types';

declare global {
  namespace Express {
    // Tipa `req.user` (passport) con la identidad autenticada.
    // La fusión de declaraciones exige una interfaz, aunque no agregue miembros.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthUser {}
  }
}
