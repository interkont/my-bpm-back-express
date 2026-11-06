import request from 'supertest';
import { resetDatabase } from '../../setup/db';
import { authed, loginAs, SEED_USERS } from '../../setup/http';
import { startServer, type RunningServer } from '../../setup/server-harness';

interface ErrorBody {
  message?: string;
  code?: string;
  details?: unknown;
}

describe('auth (correcciones US3)', () => {
  let server: RunningServer;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('login con contraseña inválida → 401 INVALID_CREDENTIALS', async () => {
    const res = await request(server.baseUrl)
      .post('/api/auth/login')
      .send({ email: SEED_USERS.admin.email, password: 'incorrecta' });
    const body = res.body as ErrorBody;
    expect(res.status).toBe(401);
    expect(body.message).toBe('Invalid credentials');
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('login con email inexistente → 401 INVALID_CREDENTIALS', async () => {
    const res = await request(server.baseUrl)
      .post('/api/auth/login')
      .send({ email: 'nadie@flowify.test', password: 'x' });
    const body = res.body as ErrorBody;
    expect(res.status).toBe(401);
    expect(body.message).toBe('Invalid credentials');
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('login con contraseña vacía sigue siendo 401 (no 400)', async () => {
    const res = await request(server.baseUrl)
      .post('/api/auth/login')
      .send({ email: SEED_USERS.admin.email, password: '' });
    expect(res.status).toBe(401);
  });

  it.each([
    ['sin email', { password: 'x' }],
    ['sin password', { email: SEED_USERS.admin.email }],
  ])('login %s → 400 VALIDATION_ERROR', async (_name, payload) => {
    const res = await request(server.baseUrl).post('/api/auth/login').send(payload);
    const body = res.body as ErrorBody;
    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('perfil con oldPassword errónea → 400 INVALID_OLD_PASSWORD y el token sigue válido', async () => {
    const token = await loginAs(server.baseUrl, 'requester');
    const res = await authed(server.baseUrl, token)
      .put('/api/auth/profile')
      .send({ oldPassword: 'incorrecta', newPassword: 'Nueva123!' });
    const body = res.body as ErrorBody;
    expect(res.status).toBe(400);
    expect(body.message).toBe('Invalid old password');
    expect(body.code).toBe('INVALID_OLD_PASSWORD');

    // La sesión sigue válida: el mismo token responde 200 en una petición posterior.
    const after = await authed(server.baseUrl, token)
      .put('/api/auth/profile')
      .send({ fullName: 'Requester Test' });
    expect(after.status).toBe(200);
  });

  it('perfil con newPassword sin oldPassword → 400 con el mismo mensaje', async () => {
    const token = await loginAs(server.baseUrl, 'requester');
    const res = await authed(server.baseUrl, token)
      .put('/api/auth/profile')
      .send({ newPassword: 'Nueva123!' });
    const body = res.body as ErrorBody;
    expect(res.status).toBe(400);
    expect(body.message).toBe('Old password is required to set a new password');
  });
});
