import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { REPO_ROOT, resetDatabase } from '../setup/db';
import { authed, SEED_USERS } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

const SENTINEL = 'SENTINEL_BD_9f3a';
const logFiles = ['error.log', 'combined.log'].map((f) => path.join(REPO_ROOT, f));

const sizeOf = (file: string): number => (fs.existsSync(file) ? fs.statSync(file).size : 0);

// Lee solo los bytes añadidos desde `from` (los logs se comparten entre ejecuciones).
const readFrom = (file: string, from: number): string =>
  fs.existsSync(file) ? fs.readFileSync(file).subarray(from).toString('utf8') : '';

describe('logs sentinel (SC-011, FR-016)', () => {
  let server: RunningServer;
  const sizes: number[] = [];

  beforeAll(async () => {
    await resetDatabase();
    for (const f of logFiles) sizes.push(sizeOf(f));
    server = await startServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('un flujo completo no deja secretos en logs ni en la salida', async () => {
    const { email, password } = SEED_USERS.approver;
    const login = await request(server.baseUrl).post('/api/auth/login').send({ email, password });
    const token = (login.body as { token: string }).token;
    expect(token).toBeTruthy();
    const api = authed(server.baseUrl, token);

    const started = await api.post('/api/process-instances').send({
      businessProcessKey: 'LINEAR',
      businessData: { purchaseAmount: 10, note: SENTINEL },
      description: 'Flujo centinela',
    });
    expect(started.status).toBe(201);

    // Solo importa el logging, no el resultado de estas llamadas.
    await api
      .post('/api/tasks/1/complete')
      .send({ action: 'complete', formData: { note: SENTINEL }, comments: SENTINEL });

    await api.post('/api/engine/decide-next-task').send({
      businessProcessKey: 'EXCLUSIVE',
      currentBpmnElementId: 'StartEvent_X',
      contextData: {
        instance: { businessData: { purchaseAmount: 2000, note: SENTINEL } },
        task: {},
      },
    });
    // Rutas de error: login fallido y clave de proceso inexistente.
    await request(server.baseUrl)
      .post('/api/auth/login')
      .send({ email, password: `${password}-mala` });
    await api
      .post('/api/process-instances')
      .send({ businessProcessKey: 'NOPE', businessData: { note: SENTINEL } });

    await server.stop();

    const haystacks = [server.output(), ...logFiles.map((f, i) => readFrom(f, sizes[i] ?? 0))];
    for (const text of haystacks) {
      expect(text).not.toContain(SENTINEL);
      expect(text).not.toContain(password);
      expect(text).not.toContain(token);
      expect(text).not.toMatch(/\$2[aby]\$/);
    }
  });
});
