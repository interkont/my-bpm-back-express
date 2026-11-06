import request from 'supertest';
import { resetDatabase } from '../../setup/db';
import { authed, loginAs } from '../../setup/http';
import { startServer, type RunningServer } from '../../setup/server-harness';

interface ErrorBody {
  message?: string;
  code?: string;
}

describe('plataforma (correcciones US3)', () => {
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

  it('JSON malformado → 400 MALFORMED_JSON', async () => {
    const res = await request(server.baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect((res.body as ErrorBody).code).toBe('MALFORMED_JSON');
  });

  it.each(['/api/users/abc', '/api/roles/abc', '/api/processes/abc', '/api/process-instances/abc'])(
    ':id no numérico en %s → 400 VALIDATION_ERROR',
    async (url) => {
      const res = await authed(server.baseUrl, adminToken).get(url);
      expect(res.status).toBe(400);
      expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
    },
  );

  it('POST /tasks/12abc/complete no se rechaza por el id', async () => {
    const res = await authed(server.baseUrl, adminToken).post('/api/tasks/12abc/complete').send({});
    const body = res.body as ErrorBody;
    expect(res.status === 400 && body.code === 'VALIDATION_ERROR').toBe(false);
  });

  it('error no controlado → 500 { message: "Internal server error" } sin stack', async () => {
    // Un body de ~150 kB supera el límite de body-parser (PayloadTooLargeError): fuera de la lista cerrada.
    const res = await request(server.baseUrl)
      .post('/api/auth/login')
      .send({ email: 'x'.repeat(150_000), password: 'x' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
  });

  it('403 de isAdmin conserva message y añade code FORBIDDEN', async () => {
    const res = await authed(server.baseUrl, requesterToken).post('/api/roles').send({ name: 'x' });
    const body = res.body as ErrorBody;
    expect(res.status).toBe(403);
    expect(typeof body.message).toBe('string');
    expect(body.code).toBe('FORBIDDEN');
  });

  it('el 401 de passport sigue siendo texto Unauthorized', async () => {
    const res = await request(server.baseUrl).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.text).toBe('Unauthorized');
  });
});
