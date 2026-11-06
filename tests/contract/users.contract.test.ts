import { query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, expectFrozenError, loginAs } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

interface UserRow {
  id: number;
  full_name: string;
  email: string;
  has_hash: boolean;
}
interface UserRoleRow {
  user_id: number;
  role_id: number;
}

const userRows = (): Promise<UserRow[]> =>
  query<UserRow>(
    'SELECT id, full_name, email, password_hash IS NOT NULL AS has_hash FROM users ORDER BY id',
  );
const memberships = (): Promise<UserRoleRow[]> =>
  query<UserRoleRow>('SELECT user_id, role_id FROM user_roles ORDER BY user_id, role_id');

const newUser = {
  fullName: 'Nuevo Usuario',
  email: 'nuevo@flowify.test',
  password: 'Nuevo123!',
  systemRole: 'USER',
  roleIds: [1, 2],
};

describe('users (caracterización JS)', () => {
  let server: RunningServer;
  let adminToken: string;
  let approverToken: string;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    adminToken = await loginAs(server.baseUrl, 'admin');
    approverToken = await loginAs(server.baseUrl, 'approver');
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('GET /api/users', () => {
    it('[frozen] lista usuarios con roles[].UserRole y sin passwordHash', async () => {
      expectFrozen(await authed(server.baseUrl, adminToken).get('/api/users'));
    });

    it('[frozen] no admin responde 403', async () => {
      expectFrozenError(await authed(server.baseUrl, approverToken).get('/api/users'));
    });
  });

  describe('GET /api/users/:id', () => {
    it('[frozen] usuario existente', async () => {
      expectFrozen(await authed(server.baseUrl, adminToken).get('/api/users/2'));
    });

    it('[frozen] inexistente responde 404', async () => {
      expectFrozenError(await authed(server.baseUrl, adminToken).get('/api/users/999'));
    });

    it('[frozen] id no numérico responde (hoy)', async () => {
      expectFrozenError(await authed(server.baseUrl, adminToken).get('/api/users/abc'));
    });

    it('[frozen] no admin responde 403', async () => {
      expectFrozenError(await authed(server.baseUrl, approverToken).get('/api/users/1'));
    });
  });

  describe('mutaciones', () => {
    it('[frozen] POST crea usuario (201, roles sin UserRole)', async () => {
      const res = await authed(server.baseUrl, adminToken).post('/api/users').send(newUser);
      expectFrozen(res);
      expect({ __normalized: true, value: await userRows() }).toMatchSnapshot();
      expect({ __normalized: true, value: await memberships() }).toMatchSnapshot();
    });

    it('[frozen] POST email duplicado responde (hoy)', async () => {
      const res = await authed(server.baseUrl, adminToken).post('/api/users').send(newUser);
      expectFrozenError(res);
    });

    it('[frozen] POST sin password responde (hoy)', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .post('/api/users')
        .send({ fullName: 'Sin Pass', email: 'sinpass@flowify.test', systemRole: 'USER' });
      expectFrozenError(res);
    });

    it('[frozen] POST no admin responde 403', async () => {
      const res = await authed(server.baseUrl, approverToken)
        .post('/api/users')
        .send({ ...newUser, email: 'otro@flowify.test' });
      expectFrozenError(res);
    });

    it('[frozen] PUT actualiza datos y reemplaza roles vía roleIds', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .put('/api/users/4')
        .send({ fullName: 'Nuevo Editado', roleIds: [2] });
      expectFrozen(res);
      expect({ __normalized: true, value: await userRows() }).toMatchSnapshot();
      expect({ __normalized: true, value: await memberships() }).toMatchSnapshot();
    });

    it('[frozen] PUT con password actualiza el hash', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .put('/api/users/4')
        .send({ password: 'Cambiada123!' });
      expectFrozen(res);
    });

    it('[frozen] PUT inexistente responde 500 (hoy)', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .put('/api/users/999')
        .send({ fullName: 'X' });
      expectFrozenError(res);
    });

    it('[frozen] PUT no admin responde 403', async () => {
      const res = await authed(server.baseUrl, approverToken)
        .put('/api/users/4')
        .send({ fullName: 'X' });
      expectFrozenError(res);
    });

    it('[frozen] DELETE existente responde 204', async () => {
      const res = await authed(server.baseUrl, adminToken).delete('/api/users/4');
      expectFrozen(res);
      expect({ __normalized: true, value: await userRows() }).toMatchSnapshot();
      expect({ __normalized: true, value: await memberships() }).toMatchSnapshot();
    });

    it('[frozen] DELETE inexistente responde 204 (hoy)', async () => {
      expectFrozen(await authed(server.baseUrl, adminToken).delete('/api/users/999'));
    });

    it('[frozen] DELETE no admin responde 403', async () => {
      expectFrozenError(await authed(server.baseUrl, approverToken).delete('/api/users/3'));
    });
  });
});
