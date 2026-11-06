import request from 'supertest';
import { query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, expectFrozenError, loginAs } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

const snap = (value: unknown): void => {
  expect({ __normalized: true, value }).toMatchSnapshot();
};

const logs = () =>
  query(
    `SELECT id, business_process_key, current_bpmn_element_id, request_payload, response_payload,
            error_message, executed_by_user_id
     FROM decision_logs WHERE id > 1 ORDER BY id`,
  );

describe('engine contract (JS baseline)', () => {
  let server: RunningServer;
  let admin: string;
  let approver: string;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    admin = await loginAs(server.baseUrl, 'admin');
    approver = await loginAs(server.baseUrl, 'approver');
  });

  afterAll(async () => {
    await server.stop();
  });

  const decide = (token: string, body?: object) => {
    const req = authed(server.baseUrl, token).post('/api/engine/decide-next-task');
    return body === undefined ? req : req.send(body);
  };

  describe('POST /api/engine/decide-next-task', () => {
    it('[frozen] EXCLUSIVE start with condition true (purchaseAmount 2000)', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'EXCLUSIVE',
          currentBpmnElementId: 'StartEvent_X',
          contextData: { instance: { businessData: { purchaseAmount: 2000 } }, task: {} },
        }),
      );
    });

    it('[frozen] EXCLUSIVE start with condition false (purchaseAmount 500)', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'EXCLUSIVE',
          currentBpmnElementId: 'StartEvent_X',
          contextData: { instance: { businessData: { purchaseAmount: 500 } }, task: {} },
        }),
      );
    });

    it('[frozen] EXCLUSIVE start with condition on a missing value', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'EXCLUSIVE',
          currentBpmnElementId: 'StartEvent_X',
          contextData: { instance: { businessData: {} }, task: {} },
        }),
      );
    });

    it('[frozen] LINEAR from USER_TASK Task_L', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'LINEAR',
          currentBpmnElementId: 'Task_L',
          contextData: {},
        }),
      );
    });

    it('[frozen] LINEAR from StartEvent_L', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'LINEAR',
          currentBpmnElementId: 'StartEvent_L',
          contextData: {},
        }),
      );
    });

    it('[frozen] EXCLUSIVE from the gateway takes all outgoing targets without evaluating conditions', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'EXCLUSIVE',
          currentBpmnElementId: 'Gateway_X',
          contextData: { instance: { businessData: { purchaseAmount: 2000 } }, task: {} },
        }),
      );
    });

    it('[frozen] PARALLEL from StartEvent_P returns both branches', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'PARALLEL',
          currentBpmnElementId: 'StartEvent_P',
          contextData: {},
        }),
      );
    });

    it('[frozen] PARALLEL from Task_A traverses the join', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'PARALLEL',
          currentBpmnElementId: 'Task_A',
          contextData: {},
        }),
      );
    });

    it('[frozen] END_AT_START from StartEvent_E returns the end event', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'END_AT_START',
          currentBpmnElementId: 'StartEvent_E',
          contextData: {},
        }),
      );
    });

    it('[frozen] AUTO process returns AUTO_TASK as a blocking element', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'AUTO',
          currentBpmnElementId: 'StartEvent_A',
          contextData: {},
        }),
      );
    });

    it('[frozen] APPROVAL from the gateway', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'APPROVAL',
          currentBpmnElementId: 'Gateway_AP',
          contextData: { task: { action: 'APROBAR' } },
        }),
      );
    });

    it('[frozen] decision_logs rows created by the successful decisions', async () => {
      snap(await logs());
    });
  });

  describe('POST /api/engine/decide-next-task (validation and failures)', () => {
    beforeAll(async () => {
      await resetDatabase();
    });

    it('[frozen] missing businessProcessKey -> 400 { error }', async () => {
      expectFrozen(
        await decide(approver, { currentBpmnElementId: 'StartEvent_X', contextData: {} }),
      );
    });

    it('[frozen] missing currentBpmnElementId -> 400 { error }', async () => {
      expectFrozen(await decide(approver, { businessProcessKey: 'EXCLUSIVE', contextData: {} }));
    });

    it('[frozen] missing contextData -> 400 { error }', async () => {
      expectFrozen(
        await decide(approver, {
          businessProcessKey: 'EXCLUSIVE',
          currentBpmnElementId: 'StartEvent_X',
        }),
      );
    });

    it('[frozen] no body at all -> 400 { error }', async () => {
      expectFrozen(await decide(approver));
    });

    it('[frozen] no validation failure writes to decision_logs', async () => {
      snap(await logs());
    });

    it('[frozen] unknown process key', async () => {
      expectFrozenError(
        await decide(approver, {
          businessProcessKey: 'NOPE',
          currentBpmnElementId: 'StartEvent_X',
          contextData: {},
        }),
      );
    });

    it('[frozen] unknown element in a known process', async () => {
      expectFrozenError(
        await decide(approver, {
          businessProcessKey: 'LINEAR',
          currentBpmnElementId: 'Nope_Element',
          contextData: {},
        }),
      );
    });

    it('[frozen] decision_logs rows created by the failed decisions', async () => {
      snap(await logs());
    });

    it('[frozen] without token -> 401', async () => {
      const res = await request(server.baseUrl)
        .post('/api/engine/decide-next-task')
        .send({ businessProcessKey: 'LINEAR', currentBpmnElementId: 'Task_L', contextData: {} });
      expectFrozen(res);
    });
  });

  describe('GET /api/engine/decision-logs', () => {
    it('[frozen] admin result (users has no username column)', async () => {
      expectFrozen(await authed(server.baseUrl, admin).get('/api/engine/decision-logs'));
    });

    it('[frozen] non-admin -> 403', async () => {
      expectFrozen(await authed(server.baseUrl, approver).get('/api/engine/decision-logs'));
    });

    it('[frozen] unknown key error shape', async () => {
      expectFrozenError(
        await decide(approver, {
          businessProcessKey: 'NOPE',
          currentBpmnElementId: 'x',
          contextData: {},
        }),
      );
    });
  });
});
