import { query, resetDatabase } from '../setup/db';
import { authed, loginAs, type SeedUser } from '../setup/http';
import { normalize } from '../setup/normalize';
import { startServer, type RunningServer } from '../setup/server-harness';

interface Step {
  complete: string; // bpmnElementId de la tarea PENDING a completar
  as: SeedUser;
  payload: Record<string, unknown>;
}

interface Scenario {
  key: string;
  businessData: Record<string, unknown>;
  steps: Step[];
}

interface HttpRecord {
  status: number;
  body: unknown;
  text?: string;
}

interface InstanceRow {
  id: number;
  status: string;
  business_data: unknown;
  ended: boolean;
}

interface TaskRow {
  element: string;
  status: string;
  assigned_to_role_id: number | null;
  completed_by_user_id: number | null;
  completion_payload: unknown;
}

interface Outcome {
  start: HttpRecord;
  completes: HttpRecord[];
  timeline: { label: string; instances: unknown[]; tasks: unknown[] }[];
}

// Cuerpo vacío (p. ej. text/plain): se captura el texto
const record = (res: { status: number; body: unknown; text: string }): HttpRecord => ({
  status: res.status,
  body: res.body,
  text: Object.keys(res.body ?? {}).length > 0 ? undefined : res.text,
});

let server: RunningServer;
const tokens = {} as Record<SeedUser, string>;

// Ejecuta un escenario completo sobre una base recién sembrada y devuelve una vista normalizada
const runScenario = async (sc: Scenario): Promise<Outcome> => {
  await resetDatabase();
  const start = await authed(server.baseUrl, tokens.requester)
    .post('/api/process-instances')
    .send({
      businessProcessKey: sc.key,
      businessData: sc.businessData,
      description: `scn ${sc.key}`,
    });
  const startRecord = record(start);

  const instanceRows = await query<InstanceRow>(
    `SELECT id, status, business_data, end_time IS NOT NULL AS ended
     FROM process_instances WHERE id > 4 ORDER BY id`,
  );
  const instanceId = instanceRows[0]?.id;

  const timeline: Outcome['timeline'] = [];
  const snapshotState = async (label: string): Promise<void> => {
    const instances = await query<Omit<InstanceRow, 'id'>>(
      `SELECT status, business_data, end_time IS NOT NULL AS ended
       FROM process_instances WHERE id > 4 ORDER BY id`,
    );
    const tasks = await query<TaskRow>(
      `SELECT e.bpmn_element_id AS element, t.status, t.assigned_to_role_id,
              t.completed_by_user_id, t.completion_payload
       FROM task_instances t JOIN process_elements e ON e.id = t.element_def_id
       WHERE t.process_instance_id > 4 ORDER BY e.bpmn_element_id, t.id`,
    );
    timeline.push({ label, instances, tasks });
  };
  await snapshotState('after-start');

  const completes: HttpRecord[] = [];
  for (const step of sc.steps) {
    const pending = await query<{ id: number }>(
      `SELECT t.id FROM task_instances t JOIN process_elements e ON e.id = t.element_def_id
       WHERE t.process_instance_id = $1 AND t.status = 'PENDING' AND e.bpmn_element_id = $2
       ORDER BY t.id`,
      [instanceId, step.complete],
    );
    const taskId = pending[0]?.id;
    if (taskId === undefined) throw new Error(`No hay tarea pendiente ${step.complete}`);
    const res = await authed(server.baseUrl, tokens[step.as])
      .post(`/api/tasks/${taskId}/complete`)
      .send(step.payload);
    completes.push(record(res));
    await snapshotState(`after-complete-${step.complete}`);
  }
  return { start: startRecord, completes, timeline };
};

// Dos ejecuciones deben producir exactamente el mismo resultado (determinismo); se congela la primera
const checkScenario = async (sc: Scenario): Promise<void> => {
  const first = normalize(await runScenario(sc));
  const second = normalize(await runScenario(sc));
  expect(second).toEqual(first);
  expect({ __normalized: true, value: first }).toMatchSnapshot();
};

describe('engine execution scenarios', () => {
  beforeAll(async () => {
    server = await startServer();
    await resetDatabase();
    for (const who of ['admin', 'approver', 'requester'] as const) {
      tokens[who] = await loginAs(server.baseUrl, who);
    }
  });

  afterAll(async () => {
    await server.stop();
  });

  it('LINEAR: start, complete, COMPLETED', async () => {
    await checkScenario({
      key: 'LINEAR',
      businessData: { notes: 'n' },
      steps: [
        {
          complete: 'Task_L',
          as: 'approver',
          payload: { action: 'complete', formData: { approved: true }, comments: 'ok' },
        },
      ],
    });
  });

  it('EXCLUSIVE: purchaseAmount 5000 takes the condition branch', async () => {
    await checkScenario({
      key: 'EXCLUSIVE',
      businessData: { purchaseAmount: 5000 },
      steps: [{ complete: 'Task_High', as: 'approver', payload: { action: 'complete' } }],
    });
  });

  it('EXCLUSIVE: purchaseAmount 10 takes the default branch', async () => {
    await checkScenario({
      key: 'EXCLUSIVE',
      businessData: { purchaseAmount: 10 },
      steps: [{ complete: 'Task_Low', as: 'requester', payload: { action: 'complete' } }],
    });
  });

  it('APPROVAL: action APROBAR goes to Task_Approved', async () => {
    await checkScenario({
      key: 'APPROVAL',
      businessData: {},
      steps: [
        { complete: 'Task_Approval', as: 'approver', payload: { action: 'APROBAR' } },
        { complete: 'Task_Approved', as: 'requester', payload: { action: 'complete' } },
      ],
    });
  });

  it('APPROVAL: any other action goes to Task_Rejected', async () => {
    await checkScenario({
      key: 'APPROVAL',
      businessData: {},
      steps: [
        { complete: 'Task_Approval', as: 'approver', payload: { action: 'RECHAZAR' } },
        { complete: 'Task_Rejected', as: 'requester', payload: { action: 'complete' } },
      ],
    });
  });

  it('PARALLEL: Task_A then Task_B, join fires, finishes COMPLETED', async () => {
    await checkScenario({
      key: 'PARALLEL',
      businessData: {},
      steps: [
        { complete: 'Task_A', as: 'approver', payload: { action: 'complete' } },
        { complete: 'Task_B', as: 'requester', payload: { action: 'complete' } },
        { complete: 'Task_C', as: 'approver', payload: { action: 'complete' } },
      ],
    });
  });

  it('PARALLEL: Task_B then Task_A, join fires, finishes COMPLETED', async () => {
    await checkScenario({
      key: 'PARALLEL',
      businessData: {},
      steps: [
        { complete: 'Task_B', as: 'requester', payload: { action: 'complete' } },
        { complete: 'Task_A', as: 'approver', payload: { action: 'complete' } },
        { complete: 'Task_C', as: 'approver', payload: { action: 'complete' } },
      ],
    });
  });

  it('END_AT_START: instance completes at start', async () => {
    await checkScenario({ key: 'END_AT_START', businessData: {}, steps: [] });
  });

  it('AUTO: start fails and the transaction rolls back', async () => {
    const outcome = await runScenario({ key: 'AUTO', businessData: {}, steps: [] });
    expect(outcome.timeline[0]?.instances).toEqual([]);
    expect(outcome.timeline[0]?.tasks).toEqual([]);
    await checkScenario({ key: 'AUTO', businessData: {}, steps: [] });
  });
});
