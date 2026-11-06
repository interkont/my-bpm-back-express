import type { NextFunction, Request, Response } from 'express';
import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { isAppError, malformedJson, type AppError } from '../../domain/errors';
import { logger } from '../../utils/logger';

const CONFLICT_MESSAGE = 'The request conflicts with existing data.';

// body-parser marca así un JSON mal formado (FR-021: hoy 500, pasa a 400).
const isMalformedJson = (err: unknown): boolean =>
  err instanceof SyntaxError &&
  (err as SyntaxError & { type?: string }).type === 'entity.parse.failed';

const toBody = (error: AppError): Record<string, unknown> => ({
  message: error.message,
  code: error.code,
  ...(error.details === undefined ? {} : { details: error.details }),
  ...(error.legacyErrorKey ? { error: error.message } : {}),
});

/**
 * Único formateador de errores (Principio V, contracts/errors.md). Los 500 nunca exponen detalles
 * internos; el detalle completo va al log con el contexto de la petición (N-10), sin el body.
 */
export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const appError = isMalformedJson(err) ? malformedJson() : isAppError(err) ? err : null;
  if (appError) {
    res.status(appError.statusCode).json(toBody(appError));
    return;
  }

  if (err instanceof UniqueConstraintError || err instanceof ForeignKeyConstraintError) {
    res.status(409).json({ message: CONFLICT_MESSAGE, code: 'CONFLICT' });
    return;
  }

  const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
  logger.error(stack, { method: req.method, url: req.originalUrl, userId: req.user?.id });
  res.status(500).json({ message: 'Internal server error' });
};
