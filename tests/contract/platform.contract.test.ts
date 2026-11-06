import jwt from 'jsonwebtoken';
import request from 'supertest';
import { resetDatabase } from '../setup/db';
import { authed, expectFrozen, expectFrozenError, loginAs } from '../setup/http';
import { startServer, TEST_JWT_SECRET, type RunningServer } from '../setup/server-harness';

const snap = (value: unknown): void => {
  expect({ __normalized: true, value }).toMatchSnapshot();
};

const sign = (payload: object, secret = TEST_JWT_SECRET, expiresIn: number | string = '8h') =>
  jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn } as jwt.SignOptions);

describe('platform contract (JS baseline)', () => {
  let server: RunningServer;
  let userToken: string;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    userToken = await loginAs(server.baseUrl, 'approver');
  });

  afterAll(async () => {
    await server.stop();
  });

  it('[frozen] GET / serves the static index.html', async () => {
    const res = await request(server.baseUrl).get('/');
    snap({
      status: res.status,
      contentType: res.headers['content-type'],
      hasHtmlTag: res.text.includes('<html'),
      hasDoctype: res.text.toLowerCase().includes('<!doctype html'),
    });
  });

  it('[frozen] GET /index.html serves the same static file', async () => {
    const res = await request(server.baseUrl).get('/index.html');
    snap({ status: res.status, contentType: res.headers['content-type'] });
  });

  it('[frozen] unknown route /api/nope returns the default 404', async () => {
    const res = await request(server.baseUrl).get('/api/nope');
    snap({ status: res.status, contentType: res.headers['content-type'], text: res.text });
  });

  it('[frozen] unknown POST route returns the default 404', async () => {
    const res = await request(server.baseUrl).post('/nowhere').send({});
    snap({ status: res.status, text: res.text });
  });

  it('[frozen] protected route without token -> 401 Unauthorized', async () => {
    expectFrozen(await request(server.baseUrl).get('/api/tasks/my-tasks'));
  });

  it('[frozen] protected route with malformed token -> 401', async () => {
    expectFrozen(await authed(server.baseUrl, 'not-a-jwt').get('/api/tasks/my-tasks'));
  });

  it('[frozen] protected route with wrong auth scheme -> 401', async () => {
    const res = await request(server.baseUrl)
      .get('/api/tasks/my-tasks')
      .set('Authorization', `Basic ${userToken}`);
    expectFrozen(res);
  });

  it('[frozen] token signed with a different secret -> 401', async () => {
    const token = sign({ id: 2, roleIds: [1], systemRole: 'USER' }, 'other-secret');
    expectFrozen(await authed(server.baseUrl, token).get('/api/tasks/my-tasks'));
  });

  it('[frozen] expired token -> 401', async () => {
    const token = sign({ id: 2, roleIds: [1], systemRole: 'USER' }, TEST_JWT_SECRET, -60);
    expectFrozen(await authed(server.baseUrl, token).get('/api/tasks/my-tasks'));
  });

  it('[frozen] token of a non-existent user (id 999) -> 401', async () => {
    const token = sign({ id: 999, roleIds: [1], systemRole: 'USER' });
    expectFrozen(await authed(server.baseUrl, token).get('/api/tasks/my-tasks'));
  });

  it('[frozen] admin route as USER -> 403 body', async () => {
    expectFrozen(await authed(server.baseUrl, userToken).get('/api/users'));
  });

  it('[frozen] token claiming ADMIN for a non-admin user is trusted (payload systemRole)', async () => {
    const token = sign({ id: 2, roleIds: [1], systemRole: 'ADMIN' });
    const res = await authed(server.baseUrl, token).get('/api/users');
    snap({ status: res.status, isArray: Array.isArray(res.body) });
  });

  it('[frozen] malformed JSON body on POST /api/auth/login -> 500 text', async () => {
    const res = await request(server.baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@b.c", ');
    snap({ status: res.status, contentType: res.headers['content-type'], text: res.text });
  });

  it('[frozen] body larger than 100kb on POST /api/auth/login', async () => {
    const res = await request(server.baseUrl)
      .post('/api/auth/login')
      .send({ email: 'a@b.c', password: 'x'.repeat(120 * 1024) });
    snap({ status: res.status, contentType: res.headers['content-type'], text: res.text });
  });

  it('[frozen] response header names (helmet, rate limit, cors)', async () => {
    const res = await request(server.baseUrl).get('/api/nope').set('Origin', 'http://example.test');
    const candidates = [
      'x-content-type-options',
      'x-frame-options',
      'x-dns-prefetch-control',
      'x-download-options',
      'x-permitted-cross-domain-policies',
      'x-xss-protection',
      'x-powered-by',
      'strict-transport-security',
      'content-security-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'cross-origin-embedder-policy',
      'origin-agent-cluster',
      'referrer-policy',
      'access-control-allow-origin',
      'ratelimit',
      'ratelimit-limit',
      'ratelimit-remaining',
      'ratelimit-reset',
      'ratelimit-policy',
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'retry-after',
    ];
    snap({
      present: candidates.filter((h) => h in res.headers),
      absent: candidates.filter((h) => !(h in res.headers)),
      ratelimitLimitValue: res.headers['ratelimit-limit'] ?? res.headers['x-ratelimit-limit'],
    });
  });

  it('[frozen] CORS preflight status and allow-origin', async () => {
    const res = await request(server.baseUrl)
      .options('/api/tasks/my-tasks')
      .set('Origin', 'http://example.test')
      .set('Access-Control-Request-Method', 'GET');
    snap({
      status: res.status,
      allowOrigin: res.headers['access-control-allow-origin'],
      hasAllowMethods: 'access-control-allow-methods' in res.headers,
    });
  });

  it('[frozen] error responses keep the plain-text shape', async () => {
    const res = await request(server.baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expectFrozenError(res);
  });
});
