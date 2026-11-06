import request from 'supertest';
import { query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, expectFrozenError, loginAs, SEED_USERS } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

interface UserRow {
  id: number;
  full_name: string;
  email: string;
  has_hash: boolean;
}

const userRows = (): Promise<UserRow[]> =>
  query<UserRow>(
    'SELECT id, full_name, email, password_hash IS NOT NULL AS has_hash FROM users ORDER BY id',
  );

describe('auth (caracterización JS)', () => {
  let server: RunningServer;
  let requesterToken: string;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    requesterToken = await loginAs(server.baseUrl, 'requester');
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('POST /api/auth/login', () => {
    it('[frozen] login admin OK: user con roles[].UserRole, modules, sin passwordHash', async () => {
      const res = await request(server.baseUrl).post('/api/auth/login').send(SEED_USERS.admin);
      expectFrozen(res);
    });

    it('[frozen] login requester OK: modules del systemRole USER', async () => {
      const res = await request(server.baseUrl).post('/api/auth/login').send(SEED_USERS.requester);
      expectFrozen(res);
    });

    it('[frozen] password incorrecta responde 500 (hoy)', async () => {
      const res = await request(server.baseUrl)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email, password: 'wrong' });
      expectFrozenError(res);
    });

    it('[frozen] email desconocido responde 500 (hoy)', async () => {
      const res = await request(server.baseUrl)
        .post('/api/auth/login')
        .send({ email: 'nobody@flowify.test', password: 'whatever' });
      expectFrozenError(res);
    });

    it('[frozen] sin email responde (hoy)', async () => {
      const res = await request(server.baseUrl)
        .post('/api/auth/login')
        .send({ password: 'Admin123!' });
      expectFrozenError(res);
    });

    it('[frozen] sin password responde (hoy)', async () => {
      const res = await request(server.baseUrl)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email });
      expectFrozenError(res);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('[frozen] sin token responde 401 texto', async () => {
      const res = await request(server.baseUrl).put('/api/auth/profile').send({ fullName: 'X' });
      expectFrozenError(res);
    });

    it('[frozen] cambia nombre y email', async () => {
      const res = await authed(server.baseUrl, requesterToken)
        .put('/api/auth/profile')
        .send({ fullName: 'Requester Renamed', email: 'requester.new@flowify.test' });
      expectFrozen(res);
      expect({ __normalized: true, value: await userRows() }).toMatchSnapshot();
    });

    it('[frozen] newPassword sin oldPassword responde 400 (hoy)', async () => {
      const res = await authed(server.baseUrl, requesterToken)
        .put('/api/auth/profile')
        .send({ newPassword: 'Nueva123!' });
      expectFrozenError(res);
    });

    it('[frozen] oldPassword incorrecta responde 401 (hoy)', async () => {
      const res = await authed(server.baseUrl, requesterToken)
        .put('/api/auth/profile')
        .send({ oldPassword: 'bad', newPassword: 'Nueva123!' });
      expectFrozenError(res);
    });

    it('[frozen] cambio de password OK y login con la nueva funciona', async () => {
      const res = await authed(server.baseUrl, requesterToken)
        .put('/api/auth/profile')
        .send({ oldPassword: SEED_USERS.requester.password, newPassword: 'Nueva123!' });
      expectFrozen(res);

      const loginNew = await request(server.baseUrl)
        .post('/api/auth/login')
        .send({ email: 'requester.new@flowify.test', password: 'Nueva123!' });
      expectFrozen(loginNew);

      const loginOld = await request(server.baseUrl)
        .post('/api/auth/login')
        .send({ email: 'requester.new@flowify.test', password: SEED_USERS.requester.password });
      expectFrozenError(loginOld);
    });

    it('[frozen] body vacío responde 200 con el usuario sin cambios', async () => {
      const res = await authed(server.baseUrl, requesterToken).put('/api/auth/profile').send({});
      expectFrozen(res);
    });
  });
});
