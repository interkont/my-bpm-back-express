import request from 'supertest';
import { loadSql, query, resetDatabase } from '../setup/db';
import { authed, loginAs } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

interface Counts {
  instances: number;
  tasks: number;
}

const counts = async (): Promise<Counts> => {
  const [i] = await query<{ n: string }>('SELECT count(*) AS n FROM process_instances');
  const [t] = await query<{ n: string }>('SELECT count(*) AS n FROM task_instances');
  return { instances: Number(i?.n), tasks: Number(t?.n) };
};

describe('motor de ejecución sobre grafos defectuosos (US4)', () => {
  let server: RunningServer;
  let approver: string;

  const start = (key: string) =>
    authed(server.baseUrl, approver)
      .post('/api/process-instances')
      .send({ businessProcessKey: key, businessData: {}, description: 'defectuoso' });
  const complete = (taskId: number) =>
    authed(server.baseUrl, approver)
      .post(`/api/tasks/${taskId}/complete`)
      .send({ action: 'complete' });

  beforeAll(async () => {
    server = await startServer();
  });

  beforeEach(async () => {
    await resetDatabase();
    await loadSql('tests/fixtures/defective-graphs.sql');
    approver = await loginAs(server.baseUrl, 'approver');
  });

  afterAll(async () => {
    await server.stop();
  });

  const expectModelError = (res: request.Response, messagePart: string): void => {
    expect(res.status).toBe(422);
    const body = res.body as { code: string; message: string };
    expect(body.code).toBe('PROCESS_MODEL_ERROR');
    expect(body.message).toContain(messagePart);
  };

  describe.each([
    ['MISSING_TARGET', 'points to a missing element'],
    ['GATEWAY_CYCLE', 'cycle without blocking elements'],
  ])('iniciar %s', (key, messagePart) => {
    it('responde 422 PROCESS_MODEL_ERROR y no deja filas (rollback)', async () => {
      const before = await counts();
      expectModelError(await start(key), messagePart);
      expect(await counts()).toEqual(before);
      expect((await request(server.baseUrl).get('/')).status).toBe(200);
    });
  });

  describe.each([
    ['MISSING_TARGET', 101, 'Next element not found'],
    ['TASK_NO_OUT', 103, 'No outgoing sequence'],
    ['ORPHAN_TASK', 104, 'no longer exists'],
    ['NO_ROUTE', 105, 'No valid outgoing sequence'],
  ])('completar tarea de %s', (_key, taskId, messagePart) => {
    it('responde 422 PROCESS_MODEL_ERROR y revierte la tarea', async () => {
      const before = await counts();
      expectModelError(await complete(taskId), messagePart);
      expect(await counts()).toEqual(before);
      const [task] = await query<{ status: string }>(
        'SELECT status FROM task_instances WHERE id = $1',
        [taskId],
      );
      expect(task?.status).toBe('PENDING');
      expect((await request(server.baseUrl).get('/')).status).toBe(200);
    });
  });

  it('AUTO_TASK -> 422 "Unsupported element type: AUTO_TASK" sin filas nuevas', async () => {
    const before = await counts();
    expectModelError(await start('AUTO'), 'Unsupported element type: AUTO_TASK');
    expect(await counts()).toEqual(before);
  });

  it('sin START_EVENT -> 422 "No START_EVENT found" sin filas nuevas', async () => {
    await query('DELETE FROM process_sequences WHERE process_def_id = 103');
    await query('DELETE FROM task_instances WHERE id = 103');
    await query('DELETE FROM process_elements WHERE id = 106');
    const before = await counts();
    expectModelError(await start('TASK_NO_OUT'), 'No START_EVENT found');
    expect(await counts()).toEqual(before);
  });

  it('DIAMOND no es un ciclo: el gateway compartido se procesa dos veces', async () => {
    const res = await start('DIAMOND');
    expect(res.status).toBe(201);
    const tasks = await query<{ element: string; status: string }>(
      `SELECT e.bpmn_element_id AS element, t.status
       FROM task_instances t JOIN process_elements e ON e.id = t.element_def_id
       WHERE t.process_instance_id = $1 ORDER BY t.id`,
      [(res.body as { processInstanceId: number }).processInstanceId],
    );
    expect(tasks).toEqual([
      { element: 'Task_D', status: 'PENDING' },
      { element: 'Task_D', status: 'PENDING' },
    ]);
  });
});
