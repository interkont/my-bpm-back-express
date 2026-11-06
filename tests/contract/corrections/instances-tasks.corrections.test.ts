import jwt from 'jsonwebtoken';
import { query, resetDatabase } from '../../setup/db';
import { authed, loginAs } from '../../setup/http';
import { startServer, TEST_JWT_SECRET, type RunningServer } from '../../setup/server-harness';

interface FormBody {
  fields: { name: string; value: unknown }[];
}

interface DetailBody {
  taskInstances: { id: number }[];
}

interface ErrorBody {
  message: string;
  code: string;
  error?: string;
}

describe('instances + tasks corrections (US3: FR-025, FR-027, FR-029, FR-030, FR-031)', () => {
  let server: RunningServer;
  let api: ReturnType<typeof authed>;
  let approver: ReturnType<typeof authed>;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    api = authed(server.baseUrl, await loginAs(server.baseUrl, 'requester'));
    approver = authed(server.baseUrl, await loginAs(server.baseUrl, 'approver'));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('FR-029: lista blanca en /record y PUT', () => {
    it('POST /record ignora id y startedByUserId del cuerpo y persiste el resto', async () => {
      const res = await api.post('/api/process-instances/record').send({
        id: 500,
        processDefId: 1,
        status: 'COMPLETED',
        startedByUserId: 1,
        description: 'Registro',
        businessData: { notes: 'x' },
      });
      expect(res.status).toBe(201);
      const body = res.body as { id: number; startedByUserId: number };
      expect(body.id).not.toBe(500);
      expect(body.startedByUserId).toBe(3);
      const rows = await query<{ status: string; description: string; started_by_user_id: number }>(
        'SELECT status, description, started_by_user_id FROM process_instances WHERE id = $1',
        [body.id],
      );
      expect(rows).toEqual([
        { status: 'COMPLETED', description: 'Registro', started_by_user_id: 3 },
      ]);
      expect(await query('SELECT id FROM process_instances WHERE id = 500')).toEqual([]);
    });

    it('PUT ignora id, processDefId, startedByUserId y startTime; persiste los permitidos', async () => {
      const before = await query<{ start_time: Date }>(
        'SELECT start_time FROM process_instances WHERE id = 2',
      );
      const res = await api.put('/api/process-instances/2').send({
        id: 600,
        processDefId: 8,
        startedByUserId: 1,
        startTime: '2030-01-01T00:00:00Z',
        description: 'Editada',
        status: 'CANCELLED',
        businessData: { a: 1 },
        endTime: '2026-02-01T00:00:00Z',
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([1]);
      const rows = await query<{
        id: number;
        process_def_id: number;
        started_by_user_id: number;
        start_time: Date;
        description: string;
        status: string;
        business_data: unknown;
        end_time: Date;
      }>('SELECT * FROM process_instances WHERE id IN (2, 600)');
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row?.id).toBe(2);
      expect(row?.process_def_id).toBe(1);
      expect(row?.started_by_user_id).toBe(3);
      expect(row?.start_time).toEqual(before[0]?.start_time);
      expect(row?.description).toBe('Editada');
      expect(row?.status).toBe('CANCELLED');
      expect(row?.business_data).toEqual({ a: 1 });
      expect(row?.end_time.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    });
  });

  describe('detalle de instancia', () => {
    it('FR-030: taskInstances ordenadas por createdAt ASC', async () => {
      const res = await api.get('/api/process-instances/4');
      expect(res.status).toBe(200);
      expect((res.body as DetailBody).taskInstances.map((t) => t.id)).toEqual([5, 6, 4]);
    });

    it('inexistente responde 404 con el mismo mensaje y code NOT_FOUND', async () => {
      const res = await api.get('/api/process-instances/9999');
      expect(res.status).toBe(404);
      expect(res.body as ErrorBody).toMatchObject({
        message: 'Process instance not found',
        code: 'NOT_FOUND',
      });
    });

    it('id no numérico responde 400 VALIDATION_ERROR (antes 500)', async () => {
      const res = await api.get('/api/process-instances/abc');
      expect(res.status).toBe(400);
      expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
    });
  });

  describe('formulario de tarea', () => {
    it('FR-031: muestra 0, false y "" en lugar de null', async () => {
      const res = await approver.get('/api/tasks/1/form');
      expect(res.status).toBe(200);
      const values = Object.fromEntries(
        (res.body as FormBody).fields.map((f) => [f.name, f.value]),
      );
      expect(values).toEqual({ approved: false, notes: '' });
    });

    it('un dato de negocio ausente sigue siendo null', async () => {
      // La tarea 4 (instancia 4) usa Task_L; su businessData no tiene approved ni notes.
      const res = await approver.get('/api/tasks/4/form');
      expect(res.status).toBe(200);
      const values = Object.fromEntries(
        (res.body as FormBody).fields.map((f) => [f.name, f.value]),
      );
      expect(values).toEqual({ approved: null, notes: null });
    });

    it('tarea inexistente responde 404 "Task not found"', async () => {
      const res = await approver.get('/api/tasks/9999/form');
      expect(res.status).toBe(404);
      expect(res.body as ErrorBody).toMatchObject({ message: 'Task not found', code: 'NOT_FOUND' });
    });

    it('id no numérico responde 400; "1abc" sigue funcionando (parseInt)', async () => {
      expect((await approver.get('/api/tasks/abc/form')).status).toBe(400);
      expect((await approver.get('/api/tasks/1abc/form')).status).toBe(200);
    });

    it('FR-027: tarea cuyo elemento fue borrado responde 422 PROCESS_MODEL_ERROR', async () => {
      await query(
        'SET session_replication_role = replica; DELETE FROM process_elements WHERE id = 31',
      );
      const res = await approver.get('/api/tasks/3/form');
      expect(res.status).toBe(422);
      expect((res.body as ErrorBody).code).toBe('PROCESS_MODEL_ERROR');
    });
  });

  describe('FR-025: my-tasks sin roleIds', () => {
    it('401 con error, message y code MISSING_AUTH_DATA', async () => {
      const token = jwt.sign({ id: 2, systemRole: 'USER' }, TEST_JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '8h',
      });
      const res = await authed(server.baseUrl, token).get('/api/tasks/my-tasks');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'User authentication data is missing.',
        message: 'User authentication data is missing.',
        code: 'MISSING_AUTH_DATA',
      });
    });
  });
});
