import request from 'supertest';
import { query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, expectFrozenError, loginAs } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

interface UserRoleRow {
  user_id: number;
  role_id: number;
}

const memberships = (): Promise<UserRoleRow[]> =>
  query<UserRoleRow>('SELECT user_id, role_id FROM user_roles ORDER BY user_id, role_id');

describe('roles (caracterización JS)', () => {
  let server: RunningServer;
  let adminToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    adminToken = await loginAs(server.baseUrl, 'admin');
    requesterToken = await loginAs(server.baseUrl, 'requester');
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('GET /api/roles', () => {
    it('[frozen] lista roles', async () => {
      expectFrozen(await authed(server.baseUrl, adminToken).get('/api/roles'));
    });

    it('[frozen] no admin responde 403', async () => {
      expectFrozenError(await authed(server.baseUrl, requesterToken).get('/api/roles'));
    });

    it('[frozen] sin token responde 401', async () => {
      expectFrozenError(await request(server.baseUrl).get('/api/roles'));
    });
  });

  describe('GET /api/roles/:id', () => {
    it('[frozen] rol con users[] (id, fullName, email, status)', async () => {
      expectFrozen(await authed(server.baseUrl, adminToken).get('/api/roles/1'));
    });

    it('[frozen] inexistente responde 404', async () => {
      expectFrozenError(await authed(server.baseUrl, adminToken).get('/api/roles/999'));
    });

    it('[frozen] id no numérico responde (hoy)', async () => {
      expectFrozenError(await authed(server.baseUrl, adminToken).get('/api/roles/abc'));
    });
  });

  describe('mutaciones', () => {
    it('[frozen] POST crea rol (201)', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .post('/api/roles')
        .send({ name: 'Auditor', description: 'Rol de auditoría' });
      expectFrozen(res);
    });

    it('[frozen] POST nombre duplicado responde (hoy)', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .post('/api/roles')
        .send({ name: 'Auditor', description: 'Otra' });
      expectFrozenError(res);
    });

    it('[frozen] POST sin name responde (hoy)', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .post('/api/roles')
        .send({ description: 'sin nombre' });
      expectFrozenError(res);
    });

    it('[frozen] POST no admin responde 403', async () => {
      const res = await authed(server.baseUrl, requesterToken)
        .post('/api/roles')
        .send({ name: 'Nope', description: 'x' });
      expectFrozenError(res);
    });

    it('[frozen] PUT con userIds reemplaza miembros', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .put('/api/roles/3')
        .send({ name: 'Auditor 2', description: 'Editado', userIds: [2, 3] });
      expectFrozen(res);
      expect({ __normalized: true, value: await memberships() }).toMatchSnapshot();
    });

    it('[frozen] PUT sin userIds conserva miembros', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .put('/api/roles/3')
        .send({ description: 'Solo descripción' });
      expectFrozen(res);
    });

    it('[frozen] PUT con userIds [] quita todos los miembros', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .put('/api/roles/3')
        .send({ userIds: [] });
      expectFrozen(res);
      expect({ __normalized: true, value: await memberships() }).toMatchSnapshot();
    });

    it('[frozen] PUT inexistente responde 404', async () => {
      const res = await authed(server.baseUrl, adminToken)
        .put('/api/roles/999')
        .send({ name: 'X' });
      expectFrozenError(res);
    });

    it('[frozen] PUT no admin responde 403', async () => {
      const res = await authed(server.baseUrl, requesterToken)
        .put('/api/roles/3')
        .send({ name: 'X' });
      expectFrozenError(res);
    });

    it('[frozen] DELETE rol con usuarios responde 409', async () => {
      expectFrozenError(await authed(server.baseUrl, adminToken).delete('/api/roles/1'));
    });

    it('[frozen] DELETE rol sin usuarios responde 204', async () => {
      const res = await authed(server.baseUrl, adminToken).delete('/api/roles/3');
      expectFrozen(res);
      const rows = await query<{ id: number; name: string }>(
        'SELECT id, name FROM roles ORDER BY id',
      );
      expect({ __normalized: true, value: rows }).toMatchSnapshot();
    });

    it('[frozen] DELETE inexistente responde 404', async () => {
      expectFrozenError(await authed(server.baseUrl, adminToken).delete('/api/roles/999'));
    });

    it('[frozen] DELETE no admin responde 403', async () => {
      expectFrozenError(await authed(server.baseUrl, requesterToken).delete('/api/roles/2'));
    });
  });
});
