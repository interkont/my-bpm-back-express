import type { NextFunction, Request, Response } from 'express';
import { forbidden } from '../../domain/errors';

export const isAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  // Passport adjunta el usuario autenticado; systemRole viene del token (C-05).
  if (req.user && req.user.systemRole === 'ADMIN') {
    next();
    return;
  }
  next(forbidden('Forbidden: Requires admin privileges.'));
};
