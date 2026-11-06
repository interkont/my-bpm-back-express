import { query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, loginAs } from '../setup/http';
import { normalize } from '../setup/normalize';
import { startServer, type RunningServer } from '../setup/server-harness';

interface DecisionCase {
  name: string;
  key: string;
  from: string;
  contextData: unknown;
}

interface LogRow {
  business_process_key: string;
  current_bpmn_element_id: string;
  request_payload: unknown;
  response_payload: unknown;
  error_message: string | null;
  executed_by_user_id: number;
}

const empty = { task: {}, instance: { businessData: {} } };

const amount = (purchaseAmount: number): unknown => ({
  task: {},
  instance: { businessData: { purchaseAmount } },
});

const action = (a: string): unknown => ({ task: { action: a }, instance: { businessData: {} } });

const CASES: DecisionCase[] = [
  {
    name: 'EXCLUSIVE from StartEvent_X (amount 5000)',
    key: 'EXCLUSIVE',
    from: 'StartEvent_X',
    contextData: amount(5000),
  },
  {
    name: 'EXCLUSIVE from StartEvent_X (amount 10)',
    key: 'EXCLUSIVE',
    from: 'StartEvent_X',
    contextData: amount(10),
  },
  {
    name: 'EXCLUSIVE from StartEvent_X (top-level amount is not flattened)',
    key: 'EXCLUSIVE',
    from: 'StartEvent_X',
    contextData: { purchaseAmount: 5000, task: {} },
  },
  {
    name: 'EXCLUSIVE from Gateway_X directly (all outgoing)',
    key: 'EXCLUSIVE',
    from: 'Gateway_X',
    contextData: amount(5000),
  },
  { name: 'LINEAR from Task_L (USER_TASK)', key: 'LINEAR', from: 'Task_L', contextData: empty },
  {
    name: 'PARALLEL from StartEvent_P (fork)',
    key: 'PARALLEL',
    from: 'StartEvent_P',
    contextData: empty,
  },
  {
    name: 'PARALLEL from Task_A (traverses join)',
    key: 'PARALLEL',
    from: 'Task_A',
    contextData: empty,
  },
  {
    name: 'APPROVAL from Task_Approval with action APROBAR',
    key: 'APPROVAL',
    from: 'Task_Approval',
    contextData: action('APROBAR'),
  },
  {
    name: 'APPROVAL from Task_Approval with action RECHAZAR',
    key: 'APPROVAL',
    from: 'Task_Approval',
    contextData: action('RECHAZAR'),
  },
  {
    name: 'AUTO from StartEvent_A (AUTO_TASK blocking)',
    key: 'AUTO',
    from: 'StartEvent_A',
    contextData: empty,
  },
  {
    name: 'END_AT_START from StartEvent_E',
    key: 'END_AT_START',
    from: 'StartEvent_E',
    contextData: empty,
  },
  {
    name: 'end event has no outgoing (empty nextTasks)',
    key: 'LINEAR',
    from: 'EndEvent_L',
    contextData: empty,
  },
  {
    name: 'unknown element (error stored in log)',
    key: 'LINEAR',
    from: 'Nope',
    contextData: empty,
  },
  {
    name: 'unknown process key (error stored in log)',
    key: 'NOPE',
    from: 'StartEvent_L',
    contextData: empty,
  },
];

let server: RunningServer;
let token: string;

describe('decision engine scenarios', () => {
  beforeAll(async () => {
    server = await startServer();
    await resetDatabase();
    token = await loginAs(server.baseUrl, 'admin');
  });

  afterAll(async () => {
    await server.stop();
  });

  it.each(CASES.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
    await resetDatabase();
    const send = () =>
      authed(server.baseUrl, token).post('/api/engine/decide-next-task').send({
        businessProcessKey: c.key,
        currentBpmnElementId: c.from,
        contextData: c.contextData,
      });
    const res = await send();
    expectFrozen(res);
    const logs = await query<LogRow>(
      `SELECT business_process_key, current_bpmn_element_id, request_payload, response_payload,
              error_message, executed_by_user_id
       FROM decision_logs WHERE id > 1 ORDER BY id`,
    );
    expect({ __normalized: true, value: logs }).toMatchSnapshot();

    // Determinismo: repetir la llamada devuelve lo mismo
    const again = await send();
    expect(normalize({ status: again.status, body: again.body })).toEqual(
      normalize({ status: res.status, body: res.body }),
    );
  });

  it('missing contextData is rejected before logging', async () => {
    await resetDatabase();
    const res = await authed(server.baseUrl, token)
      .post('/api/engine/decide-next-task')
      .send({ businessProcessKey: 'LINEAR', currentBpmnElementId: 'Task_L' });
    expectFrozen(res);
    const logs = await query('SELECT id FROM decision_logs WHERE id > 1');
    expect(logs).toEqual([]);
  });
});
