import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { validation } from '../../domain/errors';

export interface ValidationDetail {
  field: string;
  msg: string;
}

const toDetails = (error: z.ZodError): ValidationDetail[] =>
  error.issues.map((issue) => ({ field: issue.path.join('.'), msg: issue.message }));

interface ValidateOptions {
  message?: string;
  legacyErrorKey?: boolean;
}

/**
 * Valida el body con un esquema zod (FR-023: los esquemas solo rechazan lo que hoy falla).
 * No reemplaza `req.body`: el servicio sigue recibiendo lo mismo que hoy y aplica su lista blanca.
 */
export const validateBody =
  (schema: z.ZodType, options: ValidateOptions = {}): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      next();
      return;
    }
    next(
      validation(toDetails(result.error), options.message, {
        legacyErrorKey: options.legacyErrorKey,
      }),
    );
  };

const invalidId = (): Error =>
  validation([{ field: 'id', msg: 'id must be a positive integer' }], 'Invalid id parameter');

/** `:id` estrictamente numérico (research R-13). Usar solo donde hoy un id no numérico falla. */
export const idParam: RequestHandler = (req, _res, next): void => {
  if (/^\d+$/.test(req.params.id ?? '')) {
    next();
    return;
  }
  next(invalidId());
};

/** `:id` con la semántica de `parseInt` (`"12abc"` → 12): solo rechaza lo que da NaN (R-13). */
export const parseIntIdParam: RequestHandler = (req, _res, next): void => {
  if (!Number.isNaN(parseInt(req.params.id ?? '', 10))) {
    next();
    return;
  }
  next(invalidId());
};
