import type { Request, Response } from 'express';
import { Model } from 'sequelize';
import { isElementType, isProcessDefinitionStatus } from '../../src/domain/constants';
import {
  AppError,
  activeVersionConflict,
  conflict,
  forbidden,
  invalidCredentials,
  invalidOldPassword,
  isAppError,
  missingAuthData,
  modelError,
  notFound,
  validation,
} from '../../src/domain/errors';
import { catchAsync } from '../../src/utils/catchAsync';
import { attrs, pick } from '../../src/utils/pick';

describe('pick', () => {
  it('omite claves undefined y no listadas', () => {
    const source = { a: 1, b: undefined, c: 'x', d: null };
    expect(pick(source, ['a', 'b', 'd'])).toEqual({ a: 1, d: null });
  });

  it('no copia claves heredadas', () => {
    const source = Object.create({ a: 1 }) as { a?: number };
    expect(pick(source, ['a'])).toEqual({});
  });
});

describe('AppError', () => {
  it.each([
    [validation([{ field: 'x', msg: 'y' }]), 400, 'VALIDATION_ERROR'],
    [invalidOldPassword('m'), 400, 'INVALID_OLD_PASSWORD'],
    [invalidCredentials('m'), 401, 'INVALID_CREDENTIALS'],
    [missingAuthData('m'), 401, 'MISSING_AUTH_DATA'],
    [forbidden('m'), 403, 'FORBIDDEN'],
    [notFound('m'), 404, 'NOT_FOUND'],
    [conflict('m'), 409, 'CONFLICT'],
    [activeVersionConflict('m'), 409, 'ACTIVE_VERSION_CONFLICT'],
    [modelError('m'), 422, 'PROCESS_MODEL_ERROR'],
  ] as const)('%#: estado y code', (error, statusCode, code) => {
    expect(isAppError(error)).toBe(true);
    expect(error.statusCode).toBe(statusCode);
    expect(error.code).toBe(code);
  });

  it('validation usa mensaje por defecto y conserva details', () => {
    const details = [{ field: 'status', msg: 'bad' }];
    const error = validation(details);
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual(details);
  });

  it('solo missingAuthData activa legacyErrorKey', () => {
    expect(missingAuthData('m').legacyErrorKey).toBe(true);
    expect(notFound('m').legacyErrorKey).toBeUndefined();
  });

  it('es un Error con name', () => {
    const error = new AppError(404, 'NOT_FOUND', 'x');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(isAppError(new Error('x'))).toBe(false);
  });
});

describe('catchAsync', () => {
  // Stubs mínimos: el wrapper no toca req ni res.
  const req = {} as Request;
  const res = {} as Response;
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('propaga el rechazo a next', async () => {
    const failure = new Error('boom');
    const next = jest.fn<undefined, [unknown]>();
    catchAsync(() => Promise.reject(failure))(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(failure);
  });

  it('no llama a next si el handler resuelve', async () => {
    const next = jest.fn<undefined, [unknown]>();
    const handler = jest.fn(() => Promise.resolve());
    catchAsync(handler)(req, res, next);
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('constants', () => {
  it('isElementType', () => {
    expect(isElementType('USER_TASK')).toBe(true);
    expect(isElementType('user_task')).toBe(false);
    expect(isElementType(undefined)).toBe(false);
  });

  it('isProcessDefinitionStatus', () => {
    expect(isProcessDefinitionStatus('DEPRECATED')).toBe(true);
    expect(isProcessDefinitionStatus('RUNNING')).toBe(false);
  });
});

describe('attrs', () => {
  it('devuelve las claves indicadas', () => {
    class Sample extends Model<{ id: number; name: string }> {}
    expect(attrs<Sample>()('id', 'name')).toEqual(['id', 'name']);
  });
});
