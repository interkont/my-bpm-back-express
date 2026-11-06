import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../utils/logger';

// Express reconoce el manejador de errores por tener 4 parámetros: `_next` debe conservarse aunque no se use.
export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,

  _next: NextFunction,
): void => {
  logger.error(err.stack ?? String(err));
  res.status(500).send('Something broke!');
};
