import request from 'supertest';

export const SEED_USERS = {
  admin: { email: 'admin@flowify.test', password: 'Admin123!' },
  approver: { email: 'approver@flowify.test', password: 'User123!' },
  requester: { email: 'requester@flowify.test', password: 'User123!' },
} as const;

export type SeedUser = keyof typeof SEED_USERS;

export const loginAs = async (baseUrl: string, who: SeedUser): Promise<string> => {
  const res = await request(baseUrl).post('/api/auth/login').send(SEED_USERS[who]);
  const token = (res.body as { token?: string }).token;
  if (res.status !== 200 || !token) {
    throw new Error(`Login fallido para ${who}: status ${res.status}`);
  }
  return token;
};

// Pequeño envoltorio de supertest con el encabezado Bearer ya puesto
export const authed = (baseUrl: string, token: string) => {
  const auth = { Authorization: `Bearer ${token}` };
  return {
    get: (url: string) => request(baseUrl).get(url).set(auth),
    post: (url: string) => request(baseUrl).post(url).set(auth),
    put: (url: string) => request(baseUrl).put(url).set(auth),
    patch: (url: string) => request(baseUrl).patch(url).set(auth),
    delete: (url: string) => request(baseUrl).delete(url).set(auth),
  };
};

const bodyKeys = (res: request.Response): string[] =>
  res.body && typeof res.body === 'object' ? Object.keys(res.body as object).sort() : [];

// Congela estado + cuerpo; si no hay cuerpo JSON (text/plain) se captura `res.text`
export const expectFrozen = (res: request.Response): void => {
  const hasJson = bodyKeys(res).length > 0;
  expect({
    __normalized: true,
    value: { status: res.status, body: res.body, text: hasJson ? undefined : res.text },
  }).toMatchSnapshot();
};

// Congela estado + mensaje + claves del cuerpo
// R-12: code es aditivo
export const expectFrozenError = (res: request.Response): void => {
  const body = res.body as { message?: string } | undefined;
  expect({
    __normalized: true,
    value: {
      status: res.status,
      message: body?.message ?? res.text,
      keys: bodyKeys(res),
    },
  }).toMatchSnapshot();
};
