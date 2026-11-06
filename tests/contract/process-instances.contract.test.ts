import { query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, expectFrozenError, loginAs } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

const INSTANCE_COLS =
  'id, process_def_id, status, business_data, started_by_user_id, end_time IS NOT NULL AS has_end_time, description';

const instances = (where = 'true') =>
  query(`SELECT ${INSTANCE_COLS} FROM process_instances WHERE ${where} ORDER BY id`);

const tasks = (where = 'true') =>
  query(
    `SELECT id, process_instance_id, element_def_id, status, assigned_to_role_id, assigned_to_user_id
     FROM task_instances WHERE ${where} ORDER BY id`,
  );

describe('process-instances contract', () => {
  let server: RunningServer;
  let api: ReturnType<typeof authed>;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    api = authed(server.baseUrl, await loginAs(server.baseUrl, 'requester'));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('lecturas', () => {
    beforeAll(resetDatabase);

    it('[frozen] GET /process-instances lista con processDefinition y startedByUser, startTime DESC', async () => {
      expectFrozen(await api.get('/api/process-instances'));
    });

    it('[frozen] GET /process-instances/:id instancia 1 con businessDataFields (extraKey UNKNOWN, falsy preservados)', async () => {
      expectFrozen(await api.get('/api/process-instances/1'));
    });

    it('[frozen] GET /process-instances/:id instancia 4 con taskInstances en el orden actual', async () => {
      expectFrozen(await api.get('/api/process-instances/4'));
    });

    it('[frozen] GET /process-instances/:id instancia con businessData vacío -> businessDataFields []', async () => {
      expectFrozen(await api.get('/api/process-instances/3'));
    });

    it('[frozen] GET /process-instances/:id inexistente responde 404', async () => {
      expectFrozenError(await api.get('/api/process-instances/9999'));
    });

    it('[frozen] GET /process-instances/:id no numérico (hoy parseInt -> NaN)', async () => {
      expectFrozenError(await api.get('/api/process-instances/abc'));
    });
  });

  describe('inicio con el motor', () => {
    beforeAll(resetDatabase);

    it('[frozen] POST /process-instances inicia LINEAR (201 con processInstanceId, status, message)', async () => {
      const res = await api.post('/api/process-instances').send({
        businessProcessKey: 'LINEAR',
        businessData: { purchaseAmount: 10, approved: false },
        description: 'Caso lineal de prueba',
      });
      expectFrozen(res);
      expect(await instances('id > 4')).toMatchSnapshot('instances');
      expect(await tasks('id > 6')).toMatchSnapshot('tasks');
    });

    it('[frozen] POST /process-instances inicia END_AT_START (hoy la respuesta dice RUNNING aunque se completa)', async () => {
      const res = await api
        .post('/api/process-instances')
        .send({ businessProcessKey: 'END_AT_START', businessData: {} });
      expectFrozen(res);
      expect(await instances('id > 5')).toMatchSnapshot('instances');
      expect(await tasks('id > 7')).toMatchSnapshot('tasks');
    });

    it('[frozen] POST /process-instances sin businessData ni description (hoy)', async () => {
      const res = await api.post('/api/process-instances').send({ businessProcessKey: 'LINEAR' });
      expectFrozen(res);
      expect(await instances('id > 6')).toMatchSnapshot('instances');
    });

    it('[frozen] POST /process-instances con clave inexistente (hoy error genérico)', async () => {
      expectFrozenError(
        await api.post('/api/process-instances').send({ businessProcessKey: 'NOPE', businessData: {} }),
      );
    });

    it('[frozen] POST /process-instances sin businessProcessKey (hoy error genérico)', async () => {
      expectFrozenError(await api.post('/api/process-instances').send({ businessData: {} }));
    });

    it('[frozen] POST /process-instances con clave AUTO falla y revierte la transacción (hoy)', async () => {
      const res = await api
        .post('/api/process-instances')
        .send({ businessProcessKey: 'AUTO', businessData: {} });
      expectFrozenError(res);
      expect(await instances('id > 7')).toMatchSnapshot('instances');
      expect(await tasks('id > 8')).toMatchSnapshot('tasks');
    });

    it('[frozen] POST /process-instances con clave VERSIONED usa la versión ACTIVE (v2)', async () => {
      const res = await api
        .post('/api/process-instances')
        .send({ businessProcessKey: 'VERSIONED', businessData: {} });
      expectFrozen(res);
      expect(await instances('id > 7')).toMatchSnapshot('instances');
    });
  });

  describe('registro directo /record', () => {
    beforeAll(resetDatabase);

    it('[frozen] POST /process-instances/record crea el registro (201, fila cruda)', async () => {
      const res = await api.post('/api/process-instances/record').send({
        processDefId: 1,
        status: 'RUNNING',
        businessData: { notes: 'directo' },
        description: 'Registro directo',
      });
      expectFrozen(res);
      expect(await instances('id > 4')).toMatchSnapshot('instances');
      expect(await tasks('id > 6')).toMatchSnapshot('tasks');
    });

    it('[frozen] POST /process-instances/record con id y startedByUserId en el cuerpo (asignación masiva hoy)', async () => {
      const res = await api.post('/api/process-instances/record').send({
        id: 500,
        processDefId: 1,
        status: 'COMPLETED',
        startedByUserId: 1,
        businessData: {},
      });
      expectFrozen(res);
      expect(await instances('id > 4')).toMatchSnapshot('instances');
    });

    it('[frozen] POST /process-instances/record sin processDefId (hoy error genérico)', async () => {
      expectFrozenError(await api.post('/api/process-instances/record').send({ status: 'RUNNING' }));
    });
  });

  describe('PUT y DELETE', () => {
    beforeAll(resetDatabase);

    it('[frozen] PUT /process-instances/:id devuelve [n] y persiste los campos', async () => {
      const res = await api
        .put('/api/process-instances/3')
        .send({ status: 'CANCELLED', description: 'Cancelada', businessData: { reason: 'x' } });
      expectFrozen(res);
      expect(await instances('id = 3')).toMatchSnapshot('instances');
    });

    it('[frozen] PUT /process-instances/:id con id y processDefId en el cuerpo (asignación masiva hoy)', async () => {
      const res = await api.put('/api/process-instances/2').send({ id: 600, processDefId: 8 });
      expectFrozen(res);
      expect(await instances('id IN (2, 600)')).toMatchSnapshot('instances');
    });

    it('[frozen] PUT /process-instances/:id inexistente devuelve [0]', async () => {
      expectFrozen(await api.put('/api/process-instances/9999').send({ status: 'X' }));
    });

    it('[frozen] PUT /process-instances/:id con cuerpo vacío (hoy)', async () => {
      expectFrozen(await api.put('/api/process-instances/1').send({}));
    });

    it('[frozen] DELETE /process-instances/:id responde 204 y las tareas quedan huérfanas', async () => {
      const res = await api.delete('/api/process-instances/4');
      expectFrozen(res);
      expect(await instances('id = 4')).toMatchSnapshot('instances');
      expect(await tasks('process_instance_id = 4')).toMatchSnapshot('tasks');
    });

    it('[frozen] DELETE /process-instances/:id inexistente responde 204', async () => {
      expectFrozen(await api.delete('/api/process-instances/9999'));
    });
  });
});
