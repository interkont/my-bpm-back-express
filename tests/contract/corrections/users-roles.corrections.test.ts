import { query, resetDatabase } from '../../setup/db';
import { authed, loginAs } from '../../setup/http';
import { startServer, type RunningServer } from '../../setup/server-harness';

interface IdRow {
  id: number;
}

describe('users y roles: correcciones de errores HTTP (US3)', () => {
  let server: RunningServer;
  let token: string;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    token = await loginAs(server.baseUrl, 'admin');
  });

  afterAll(async () => {
    await server.stop();
  });

  const api = () => authed(server.baseUrl, token);

  describe('users', () => {
    it('PUT /users/:id inexistente responde 404 "User not found"', async () => {
      const res = await api().put('/api/users/999').send({ fullName: 'X' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'User not found', code: 'NOT_FOUND' });
    });

    it('POST /users sin password responde 400 VALIDATION_ERROR', async () => {
      const res = await api()
        .post('/api/users')
        .send({ fullName: 'Sin Pass', email: 'sinpass@flowify.test' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
      const rows = await query<IdRow>("SELECT id FROM users WHERE email = 'sinpass@flowify.test'");
      expect(rows).toHaveLength(0);
    });

    it('GET /users/:id con id no numérico responde 400 VALIDATION_ERROR', async () => {
      const res = await api().get('/api/users/abc');
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('GET /users/:id inexistente conserva message y añade code', async () => {
      const res = await api().get('/api/users/999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'User not found', code: 'NOT_FOUND' });
    });

    it('POST /users ignora el id del body', async () => {
      const res = await api()
        .post('/api/users')
        .send({ id: 9999, fullName: 'Con Id', email: 'conid@flowify.test', password: 'Pass123!' });
      expect(res.status).toBe(201);
      expect((res.body as IdRow).id).not.toBe(9999);
      const rows = await query<IdRow>('SELECT id FROM users WHERE id = 9999');
      expect(rows).toHaveLength(0);
    });

    it('POST /users con email duplicado responde 409 CONFLICT', async () => {
      const res = await api()
        .post('/api/users')
        .send({ fullName: 'Dup', email: 'conid@flowify.test', password: 'Pass123!' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('roles', () => {
    it('POST /roles con nombre duplicado responde 409 CONFLICT', async () => {
      const body = { name: 'Auditor', description: 'Rol de auditoría' };
      expect((await api().post('/api/roles').send(body)).status).toBe(201);
      const res = await api().post('/api/roles').send(body);
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ code: 'CONFLICT' });
    });

    it('POST /roles ignora el id del body', async () => {
      const res = await api()
        .post('/api/roles')
        .send({ id: 9999, name: 'ConId', description: 'd' });
      expect(res.status).toBe(201);
      expect((res.body as IdRow).id).not.toBe(9999);
    });

    it('GET /roles/:id inexistente conserva message y añade code', async () => {
      const res = await api().get('/api/roles/999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Role not found', code: 'NOT_FOUND' });
    });

    it('PUT /roles/:id inexistente conserva message y añade code', async () => {
      const res = await api().put('/api/roles/999').send({ name: 'X' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Role not found', code: 'NOT_FOUND' });
    });

    it('DELETE /roles/:id inexistente conserva message y añade code', async () => {
      const res = await api().delete('/api/roles/999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Role not found', code: 'NOT_FOUND' });
    });

    it('DELETE /roles/:id con usuarios conserva message y añade code', async () => {
      const res = await api().delete('/api/roles/1');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        message: 'Cannot delete role with associated users',
        code: 'CONFLICT',
      });
    });

    it('GET /roles/:id con id no numérico responde 400 VALIDATION_ERROR', async () => {
      const res = await api().get('/api/roles/abc');
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });
});
