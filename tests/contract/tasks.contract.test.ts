import jwt from 'jsonwebtoken';
import { query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, expectFrozenError, loginAs } from '../setup/http';
import { startServer, TEST_JWT_SECRET, type RunningServer } from '../setup/server-harness';

const snap = (value: unknown): void => {
  expect({ __normalized: true, value }).toMatchSnapshot();
};

const sign = (payload: object): string =>
  jwt.sign(payload, TEST_JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });

const taskRows = (ids: number[]) =>
  query(
    `SELECT id, status, completed_by_user_id, completion_payload, comments,
            completion_time IS NOT NULL AS has_completion_time
     FROM task_instances WHERE id = ANY($1) ORDER BY id`,
    [ids],
  );

const instanceRows = (ids: number[]) =>
  query(
    `SELECT id, status, business_data, end_time IS NOT NULL AS has_end_time
     FROM process_instances WHERE id = ANY($1) ORDER BY id`,
    [ids],
  );

const allTaskIds = () =>
  query('SELECT id, status, process_instance_id FROM task_instances ORDER BY id');

describe('tasks contract (JS baseline)', () => {
  let server: RunningServer;
  let approver: string;
  let requester: string;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    approver = await loginAs(server.baseUrl, 'approver');
    requester = await loginAs(server.baseUrl, 'requester');
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('GET /api/tasks/my-tasks', () => {
    it('[frozen] approver sees pending role-1 tasks as 9-field DTOs ordered by createdAt desc', async () => {
      expectFrozen(await authed(server.baseUrl, approver).get('/api/tasks/my-tasks'));
    });

    it('[frozen] requester (role 2, no assigned tasks) gets an empty array', async () => {
      expectFrozen(await authed(server.baseUrl, requester).get('/api/tasks/my-tasks'));
    });

    it('[frozen] token without roleIds is rejected with 401 { error }', async () => {
      const token = sign({ id: 2, systemRole: 'USER' });
      expectFrozen(await authed(server.baseUrl, token).get('/api/tasks/my-tasks'));
    });

    it('[frozen] token with empty roleIds array returns an empty list', async () => {
      const token = sign({ id: 2, roleIds: [], systemRole: 'USER' });
      expectFrozen(await authed(server.baseUrl, token).get('/api/tasks/my-tasks'));
    });
  });

  describe('GET /api/tasks/:id/form', () => {
    it('[frozen] pending task 1: falsy values 0/false/"" become null', async () => {
      expectFrozen(await authed(server.baseUrl, approver).get('/api/tasks/1/form'));
    });

    it('[frozen] task of a role the caller does not hold is still readable', async () => {
      expectFrozen(await authed(server.baseUrl, requester).get('/api/tasks/1/form'));
    });

    it('[frozen] task without form links returns empty fields', async () => {
      expectFrozen(await authed(server.baseUrl, approver).get('/api/tasks/3/form'));
    });

    it('[frozen] unknown task id', async () => {
      expectFrozenError(await authed(server.baseUrl, approver).get('/api/tasks/9999/form'));
    });

    it('[frozen] non-numeric task id', async () => {
      expectFrozenError(await authed(server.baseUrl, approver).get('/api/tasks/abc/form'));
    });

    it('[frozen] id with numeric prefix "1abc" is parsed with parseInt', async () => {
      expectFrozen(await authed(server.baseUrl, approver).get('/api/tasks/1abc/form'));
    });
  });

  describe('POST /api/tasks/:id/complete (error paths, no state change)', () => {
    it('[frozen] requester is not authorized for a role-1 task', async () => {
      const res = await authed(server.baseUrl, requester)
        .post('/api/tasks/1/complete')
        .send({ action: 'complete', formData: {}, comments: 'x' });
      expectFrozenError(res);
      snap(await taskRows([1]));
    });

    it('[frozen] unknown task id', async () => {
      expectFrozenError(
        await authed(server.baseUrl, approver).post('/api/tasks/9999/complete').send({}),
      );
    });

    it('[frozen] already COMPLETED task 2', async () => {
      const res = await authed(server.baseUrl, approver)
        .post('/api/tasks/2/complete')
        .send({ action: 'complete', formData: {}, comments: 'again' });
      expectFrozenError(res);
      snap(await taskRows([2]));
    });

    it('[frozen] non-numeric id yields NaN', async () => {
      expectFrozenError(
        await authed(server.baseUrl, approver).post('/api/tasks/abc/complete').send({}),
      );
    });

    it('[frozen] no body at all', async () => {
      expectFrozenError(await authed(server.baseUrl, approver).post('/api/tasks/1/complete'));
      snap(await taskRows([1]));
    });

    it('[frozen] token without roleIds on complete', async () => {
      const token = sign({ id: 2, systemRole: 'USER' });
      expectFrozenError(await authed(server.baseUrl, token).post('/api/tasks/1/complete').send({}));
      snap(await taskRows([1]));
    });
  });

  describe('POST /api/tasks/:id/complete (task 1 happy path)', () => {
    beforeAll(async () => {
      await resetDatabase();
    });

    it('[frozen] approver completes task 1 and the DB side effects are recorded', async () => {
      const res = await authed(server.baseUrl, approver)
        .post('/api/tasks/1/complete')
        .send({ action: 'complete', formData: { approved: true }, comments: 'ok' });
      expectFrozen(res);
      snap({
        tasks: await taskRows([1]),
        instances: await instanceRows([1]),
        allTasks: await allTaskIds(),
      });
    });

    it('[frozen] completing the same task again fails', async () => {
      const res = await authed(server.baseUrl, approver)
        .post('/api/tasks/1/complete')
        .send({ action: 'complete', formData: {}, comments: 'twice' });
      expectFrozenError(res);
      snap(await taskRows([1]));
    });

    it('[frozen] my-tasks after completion no longer lists task 1', async () => {
      expectFrozen(await authed(server.baseUrl, approver).get('/api/tasks/my-tasks'));
    });
  });

  describe('POST /api/tasks/1abc/complete (parseInt semantics)', () => {
    beforeAll(async () => {
      await resetDatabase();
    });

    it('[frozen] "1abc" completes task 1', async () => {
      const res = await authed(server.baseUrl, approver)
        .post('/api/tasks/1abc/complete')
        .send({ action: 'complete', formData: { notes: 'via 1abc' }, comments: 'parseInt' });
      expectFrozen(res);
      snap({ tasks: await taskRows([1]), instances: await instanceRows([1]) });
    });
  });
});
