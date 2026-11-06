import request from 'supertest';
import { query, resetDatabase } from '../../setup/db';
import { authed, loginAs } from '../../setup/http';
import { startServer, type RunningServer } from '../../setup/server-harness';

describe('correcciones del motor (US4)', () => {
  let server: RunningServer;
  let admin: string;
  let approver: string;
  let requester: string;

  const start = (token: string, key: string) =>
    authed(server.baseUrl, token)
      .post('/api/process-instances')
      .send({ businessProcessKey: key, businessData: {}, description: 'correcciones' });
  const complete = (token: string, taskId: number) =>
    authed(server.baseUrl, token)
      .post(`/api/tasks/${taskId}/complete`)
      .send({ action: 'complete' });
  const decide = (token: string, body: object) =>
    authed(server.baseUrl, token).post('/api/engine/decide-next-task').send(body);

  beforeAll(async () => {
    server = await startServer();
  });

  beforeEach(async () => {
    await resetDatabase();
    admin = await loginAs(server.baseUrl, 'admin');
    approver = await loginAs(server.baseUrl, 'approver');
    requester = await loginAs(server.baseUrl, 'requester');
  });

  afterAll(async () => {
    await server.stop();
  });

  it('END_AT_START: la respuesta de inicio trae status COMPLETED (FR-032)', async () => {
    const res = await start(requester, 'END_AT_START');
    expect(res.status).toBe(201);
    expect((res.body as { status: string }).status).toBe('COMPLETED');
  });

  it('clave desconocida -> 404', async () => {
    const res = await start(requester, 'NOPE');
    expect(res.status).toBe(404);
    expect((res.body as { code: string }).code).toBe('NOT_FOUND');
  });

  it('clave sin versión ACTIVE -> 404', async () => {
    await query(
      `UPDATE process_definitions SET status = 'INACTIVE' WHERE business_process_key = 'LINEAR'`,
    );
    const res = await start(requester, 'LINEAR');
    expect(res.status).toBe(404);
  });

  it('completar tarea inexistente, ajena o no PENDING -> 404 (nunca 401)', async () => {
    expect((await complete(approver, 999999)).status).toBe(404);

    const started = await start(requester, 'LINEAR');
    expect(started.status).toBe(201);
    const [task] = await query<{ id: number }>(
      `SELECT id FROM task_instances WHERE process_instance_id = $1`,
      [(started.body as { processInstanceId: number }).processInstanceId],
    );
    const taskId = task?.id ?? -1;

    // Ajena: Task_L es del rol Aprobador, el solicitante no puede completarla
    expect((await complete(requester, taskId)).status).toBe(404);
    expect((await complete(approver, taskId)).status).toBe(200);
    // Ya no está PENDING
    expect((await complete(approver, taskId)).status).toBe(404);
  });

  it('decide-next-task sin campos -> 400 { error, message, code }', async () => {
    const res = await decide(approver, {});
    expect(res.status).toBe(400);
    const body = res.body as Record<string, unknown>;
    expect(typeof body.error).toBe('string');
    expect(typeof body.message).toBe('string');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('decide-next-task con clave o elemento inexistente -> 404', async () => {
    const badKey = await decide(approver, {
      businessProcessKey: 'NOPE',
      currentBpmnElementId: 'x',
      contextData: {},
    });
    expect(badKey.status).toBe(404);
    const badElement = await decide(approver, {
      businessProcessKey: 'LINEAR',
      currentBpmnElementId: 'NoExiste',
      contextData: {},
    });
    expect(badElement.status).toBe(404);
  });

  it('GET /engine/decision-logs -> 200 con executedByUser { id, fullName, email } (FR-026)', async () => {
    await decide(approver, {
      businessProcessKey: 'LINEAR',
      currentBpmnElementId: 'StartEvent_L',
      contextData: {},
    });
    const res = await authed(server.baseUrl, admin).get('/api/engine/decision-logs');
    expect(res.status).toBe(200);
    const logs = res.body as { executedByUser?: Record<string, unknown> }[];
    const withUser = logs.find((l) => l.executedByUser !== undefined);
    expect(withUser?.executedByUser).toEqual({
      id: expect.any(Number),
      fullName: expect.any(String),
      email: expect.any(String),
    });
    expect((await request(server.baseUrl).get('/')).status).toBe(200);
  });
});
