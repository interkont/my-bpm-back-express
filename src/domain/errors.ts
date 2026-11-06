export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'MALFORMED_JSON'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_OLD_PASSWORD'
  | 'MISSING_AUTH_DATA'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ACTIVE_VERSION_CONFLICT'
  | 'PROCESS_MODEL_ERROR';

export type AppErrorStatus = 400 | 401 | 403 | 404 | 409 | 422;

interface AppErrorOptions {
  details?: unknown;
  legacyErrorKey?: boolean;
}

export class AppError extends Error {
  readonly statusCode: AppErrorStatus;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly legacyErrorKey?: boolean;

  constructor(
    statusCode: AppErrorStatus,
    code: ErrorCode,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.legacyErrorKey = options.legacyErrorKey;
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

export const validation = (details: unknown, message = 'Invalid input'): AppError =>
  new AppError(400, 'VALIDATION_ERROR', message, { details });

export const invalidOldPassword = (message: string): AppError =>
  new AppError(400, 'INVALID_OLD_PASSWORD', message);

export const invalidCredentials = (message: string): AppError =>
  new AppError(401, 'INVALID_CREDENTIALS', message);

// Conserva la clave `error` en el cuerpo de la respuesta (FR-025).
export const missingAuthData = (message: string): AppError =>
  new AppError(401, 'MISSING_AUTH_DATA', message, { legacyErrorKey: true });

export const forbidden = (message: string): AppError => new AppError(403, 'FORBIDDEN', message);

export const notFound = (message: string): AppError => new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string): AppError => new AppError(409, 'CONFLICT', message);

export const activeVersionConflict = (message: string): AppError =>
  new AppError(409, 'ACTIVE_VERSION_CONFLICT', message);

export const modelError = (message: string): AppError =>
  new AppError(422, 'PROCESS_MODEL_ERROR', message);
