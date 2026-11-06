import type { NextFunction, Request, Response } from 'express';

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // Passport ya adjuntó el usuario autenticado a req.user, que incluye { id, roleIds, systemRole }.
  if (req.user && req.user.systemRole === 'ADMIN') {
    next();
    return;
  }

  // Si no es administrador, responde 403 Forbidden.
  res.status(403).json({ message: 'Forbidden: Requires admin privileges.' });
};
