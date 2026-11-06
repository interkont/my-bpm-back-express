import { query, resetDatabase, loadSql } from '../setup/db';
import { authed, loginAs } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

interface LogRow {
  error_message: string | null;
  response_payload: unknown;
}

let server: RunningServer;
let token: string;

const decide = (key: string, from: string, contextData: unknown = { instance: {}, task: {} }) =>
  authed(server.baseUrl, token)
    .post('/api/engine/decide-next-task')
    .send({ businessProcessKey: key, currentBpmnElementId: from, contextData });

const lastLog = async (): Promise<LogRow | undefined> =>
  (
    await query<LogRow>(
      'SELECT error_message, response_payload FROM decision_logs ORDER BY id DESC LIMIT 1',
    )
  )[0];

describe('decision engine: grafos defectuosos', () => {
  beforeAll(async () => {
    server = await startServer();
    await resetDatabase();
    await loadSql('tests/fixtures/defective-graphs.sql');
    token = await loginAs(server.baseUrl, 'admin');
  });

  afterAll(async () => {
    await server.stop();
  });

  it.each([
    ['GATEWAY_CYCLE', 'Start_GC', /cycle without blocking elements at Gw_GC_A/],
    ['MISSING_TARGET', 'Start_MT', /sequence Start_MT → Ghost_MT points to a missing element/],
    ['MISSING_TARGET', 'Task_MT', /sequence Task_MT → Ghost_MT points to a missing element/],
    ['NO_ROUTE', 'Start_NR', /No valid outgoing sequence found for EXCLUSIVE_GATEWAY Gw_NR/],
  ])(
    '%s desde %s responde 422 PROCESS_MODEL_ERROR y deja error_message en el log',
    async (key, from, pattern) => {
      const res = await decide(key, from);
      expect(res.status).toBe(422);
      const body = res.body as { code: string; message: string };
      expect(body.code).toBe('PROCESS_MODEL_ERROR');
      expect(body.message).toMatch(pattern);
      const log = await lastLog();
      expect(log?.error_message).toBe(body.message);
      expect(log?.response_payload).toBeNull();
    },
  );

  it('el servidor sigue respondiendo tras los errores de modelado', async () => {
    const res = await authed(server.baseUrl, token).get('/api/engine/decision-logs');
    expect(res.status).toBe(200);
  });

  it('DIAMOND procesa el gateway compartido dos veces y no es un ciclo', async () => {
    const res = await decide('DIAMOND', 'Start_D');
    expect(res.status).toBe(200);
    const tasks = (res.body as { nextTasks: { bpmnElementId: string }[] }).nextTasks;
    expect(tasks.map((t) => t.bpmnElementId)).toEqual(['Task_D', 'Task_D']);
  });

  it('TASK_NO_OUT desde la tarea sin salida responde vacío', async () => {
    const res = await decide('TASK_NO_OUT', 'Task_TN');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ nextTasks: [] });
  });

  it('clave inexistente y elemento inexistente responden 404 NOT_FOUND', async () => {
    const noKey = await decide('NOPE', 'X');
    expect(noKey.status).toBe(404);
    expect((noKey.body as { code: string }).code).toBe('NOT_FOUND');
    const noElement = await decide('LINEAR', 'Nope');
    expect(noElement.status).toBe(404);
    expect((noElement.body as { message: string }).message).toBe(
      "Element with BPMN ID 'Nope' not found in process 'LINEAR'.",
    );
  });

  it('cuerpo incompleto responde 400 con clave error (FR-025)', async () => {
    const res = await authed(server.baseUrl, token)
      .post('/api/engine/decide-next-task')
      .send({ businessProcessKey: 'LINEAR', currentBpmnElementId: 'Task_L' });
    expect(res.status).toBe(400);
    const body = res.body as { error: string; code: string };
    expect(body.error).toBe(
      'businessProcessKey, currentBpmnElementId, and contextData are required.',
    );
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('GET /decision-logs responde 200 con executedByUser id, fullName y email (FR-026)', async () => {
    const res = await authed(server.baseUrl, token).get('/api/engine/decision-logs');
    expect(res.status).toBe(200);
    const logs = res.body as { executedByUser?: Record<string, unknown> }[];
    expect(logs.length).toBeGreaterThan(0);
    expect(Object.keys(logs[0]?.executedByUser ?? {}).sort()).toEqual(['email', 'fullName', 'id']);
  });
});
