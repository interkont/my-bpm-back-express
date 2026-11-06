import { query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, expectFrozenError, loginAs } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

interface ElementInput {
  bpmnElementId: string;
  name: string;
  type: string;
  assignedRoleId?: number | null;
  [extra: string]: unknown;
}

interface SequenceInput {
  sourceElementBpmnId: string;
  targetElementBpmnId: string;
  conditionExpression: string | null;
}

// Carga útil de guardado como la envía el frontend (sin id ni version)
const buildPayload = (over: Record<string, unknown> = {}): Record<string, unknown> => {
  const elements: ElementInput[] = [
    { bpmnElementId: 'StartEvent_N', name: 'Inicio', type: 'START_EVENT', assignedRoleId: null },
    {
      bpmnElementId: 'Task_N',
      name: 'Revisar',
      type: 'USER_TASK',
      assignedRoleId: 1,
      formFields: [{ name: 'notes', label: 'Notas' }],
      actions: [{ id: 'approve', label: 'Aprobar' }],
      webhook_target: 'https://example.test/hook',
      sla_definition: { hours: 4 },
    },
    { bpmnElementId: 'EndEvent_N', name: 'Fin', type: 'END_EVENT', assignedRoleId: null },
  ];
  const sequences: SequenceInput[] = [
    { sourceElementBpmnId: 'StartEvent_N', targetElementBpmnId: 'Task_N', conditionExpression: null },
    { sourceElementBpmnId: 'Task_N', targetElementBpmnId: 'EndEvent_N', conditionExpression: null },
  ];
  return {
    name: 'Proceso nuevo',
    description: 'Descripción del proceso',
    category: 'TEST',
    status: 'DRAFT',
    businessProcessKey: 'NEWPROC',
    bpmnProcessId: 'Process_NEWPROC',
    diagramJson: { nodes: [{ id: 'StartEvent_N' }], edges: [] },
    elements,
    sequences,
    ...over,
  };
};

const DEF_COLS =
  'id, business_process_key, name, description, version, category, status, bpmn_process_id, bpmn_xml';

const defs = (where = 'true') =>
  query(`SELECT ${DEF_COLS} FROM process_definitions WHERE ${where} ORDER BY id`);
const elems = (where = 'true') =>
  query(
    `SELECT id, process_def_id, bpmn_element_id, name, description, type, assigned_role_id, webhook_target, sla_definition, actions
     FROM process_elements WHERE ${where} ORDER BY id`,
  );
const seqs = (where = 'true') =>
  query(
    `SELECT id, process_def_id, source_element_bpmn_id, target_element_bpmn_id, condition_expression
     FROM process_sequences WHERE ${where} ORDER BY id`,
  );
const links = (where = 'true') =>
  query(
    `SELECT id, element_id, field_def_id, display_order, is_required, is_readonly, contextual_validations
     FROM element_form_links WHERE ${where} ORDER BY id`,
  );

describe('processes contract', () => {
  let server: RunningServer;
  let api: ReturnType<typeof authed>;
  let nonAdmin: ReturnType<typeof authed>;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    api = authed(server.baseUrl, await loginAs(server.baseUrl, 'admin'));
    nonAdmin = authed(server.baseUrl, await loginAs(server.baseUrl, 'requester'));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('lecturas', () => {
    beforeAll(resetDatabase);

    it('[frozen] GET /processes lista solo ACTIVE, sin bpmnXml, createdAt DESC', async () => {
      expectFrozen(await api.get('/api/processes'));
    });

    it('[frozen] GET /processes/all como admin lista todas sin bpmnXml', async () => {
      expectFrozen(await api.get('/api/processes/all'));
    });

    it('[frozen] GET /processes/all como no admin responde error', async () => {
      expectFrozenError(await nonAdmin.get('/api/processes/all'));
    });

    it('[frozen] GET /processes/:id detalle con elements, sequences y diagramJson parseado', async () => {
      expectFrozen(await api.get('/api/processes/4'));
    });

    it('[frozen] GET /processes/:id con bpmn_xml inválido devuelve diagramJson {}', async () => {
      await query(`UPDATE process_definitions SET bpmn_xml = 'not-json{' WHERE id = 4`);
      expectFrozen(await api.get('/api/processes/4'));
    });

    it('[frozen] GET /processes/:id con bpmn_xml vacío devuelve diagramJson {}', async () => {
      await query(`UPDATE process_definitions SET bpmn_xml = '' WHERE id = 4`);
      expectFrozen(await api.get('/api/processes/4'));
    });

    it('[frozen] GET /processes/:id con bpmn_xml NULL devuelve diagramJson {}', async () => {
      await query(`UPDATE process_definitions SET bpmn_xml = NULL WHERE id = 4`);
      expectFrozen(await api.get('/api/processes/4'));
    });

    it('[frozen] GET /processes/:id inexistente responde 404', async () => {
      expectFrozenError(await api.get('/api/processes/9999'));
    });

    it('[frozen] GET /processes/:id no numérico (hoy parseInt -> NaN)', async () => {
      expectFrozenError(await api.get('/api/processes/abc'));
    });

    it('[frozen] GET /processes/:id/save-ask DRAFT sin instancias -> UPDATE_IN_PLACE', async () => {
      expectFrozen(await api.get('/api/processes/9/save-ask'));
    });

    it('[frozen] GET /processes/:id/save-ask ACTIVE -> CREATE_NEW_VERSION', async () => {
      expectFrozen(await api.get('/api/processes/1/save-ask'));
    });

    it('[frozen] GET /processes/:id/save-ask de DRAFT con instancias -> CREATE_NEW_VERSION', async () => {
      await query(`UPDATE process_definitions SET status = 'DRAFT' WHERE id = 1`);
      expectFrozen(await api.get('/api/processes/1/save-ask'));
    });

    it('[frozen] GET /processes/:id/save-ask inexistente (hoy error genérico)', async () => {
      expectFrozenError(await api.get('/api/processes/9999/save-ask'));
    });

    it('[frozen] GET /processes/:id/start-form EXCLUSIVE fusiona validaciones', async () => {
      expectFrozen(await api.get('/api/processes/2/start-form'));
    });

    it('[frozen] GET /processes/:id/start-form sin vínculos devuelve fields []', async () => {
      expectFrozen(await api.get('/api/processes/4/start-form'));
    });

    it('[frozen] GET /processes/:id/start-form sin START_EVENT (hoy error)', async () => {
      await query(`DELETE FROM process_elements WHERE process_def_id = 5 AND type = 'START_EVENT'`);
      expectFrozenError(await api.get('/api/processes/5/start-form'));
    });

    it('[frozen] GET /processes/:id/start-form inexistente (hoy error)', async () => {
      expectFrozenError(await api.get('/api/processes/9999/start-form'));
    });
  });

  describe('creación POST', () => {
    beforeAll(resetDatabase);

    it('[frozen] POST /processes crea (201) y devuelve la definición con bpmnXml string sin elements', async () => {
      const res = await api.post('/api/processes').send(buildPayload());
      expectFrozen(res);
      expect(await defs("business_process_key = 'NEWPROC'")).toMatchSnapshot('defs');
      expect(await elems('process_def_id = 10')).toMatchSnapshot('elements');
      expect(await seqs('process_def_id = 10')).toMatchSnapshot('sequences');
    });

    it('[frozen] POST /processes con status ACTIVE y otra ACTIVE para la clave (hoy)', async () => {
      const res = await api.post('/api/processes').send(
        buildPayload({
          businessProcessKey: 'LINEAR',
          bpmnProcessId: 'Process_LINEAR',
          status: 'ACTIVE',
        }),
      );
      expectFrozen(res);
      expect(await defs("business_process_key = 'LINEAR'")).toMatchSnapshot('defs');
    });

    it('[frozen] POST /processes con status ACTIVE sin otra ACTIVE para la clave', async () => {
      const res = await api.post('/api/processes').send(
        buildPayload({
          businessProcessKey: 'BRANDNEW',
          bpmnProcessId: 'Process_BRANDNEW',
          status: 'ACTIVE',
        }),
      );
      expectFrozen(res);
      expect(await defs("business_process_key = 'BRANDNEW'")).toMatchSnapshot('defs');
    });

    it('[frozen] POST /processes sin name (hoy error de validación)', async () => {
      const body = buildPayload();
      delete body.name;
      expectFrozenError(await api.post('/api/processes').send(body));
    });

    it('[frozen] POST /processes sin diagramJson (hoy bpmnXml queda sin valor)', async () => {
      const body = buildPayload({ businessProcessKey: 'NODIAG', bpmnProcessId: 'Process_NODIAG' });
      delete body.diagramJson;
      expectFrozen(await api.post('/api/processes').send(body));
      expect(await defs("business_process_key = 'NODIAG'")).toMatchSnapshot('defs');
    });
  });

  describe('PUT en sitio sobre DRAFT', () => {
    beforeAll(resetDatabase);

    it('[frozen] PUT /processes/:id DRAFT sin instancias actualiza en sitio, sincroniza elementos y reemplaza secuencias', async () => {
      const body = buildPayload({
        name: 'V3 editada',
        description: 'nueva',
        category: 'EDIT',
        businessProcessKey: 'VERSIONED',
        bpmnProcessId: 'Process_VERSIONED',
        diagramJson: { nodes: [], edges: [], edited: true },
        elements: [
          {
            bpmnElementId: 'StartEvent_V',
            name: 'Inicio editado',
            type: 'START_EVENT',
            assignedRoleId: null,
          },
          {
            bpmnElementId: 'Task_V',
            name: 'Tarea editada',
            type: 'USER_TASK',
            assignedRoleId: 2,
            formFields: [],
            actions: [{ id: 'x' }],
            webhook_target: 'https://example.test/h',
            sla_definition: { hours: 1 },
          },
          { bpmnElementId: 'Task_New', name: 'Nueva tarea', type: 'USER_TASK', assignedRoleId: 1 },
        ],
        sequences: [
          { sourceElementBpmnId: 'StartEvent_V', targetElementBpmnId: 'Task_V', conditionExpression: null },
          { sourceElementBpmnId: 'Task_V', targetElementBpmnId: 'Task_New', conditionExpression: 'x > 1' },
        ],
      });
      const res = await api.put('/api/processes/9').send(body);
      expectFrozen(res);
      expect(await defs('id = 9')).toMatchSnapshot('defs');
      expect(await elems('process_def_id = 9')).toMatchSnapshot('elements');
      expect(await seqs('process_def_id = 9')).toMatchSnapshot('sequences');
    });

    it('[frozen] PUT /processes/:id DRAFT a ACTIVE con otra ACTIVE para la clave (hoy)', async () => {
      const res = await api.put('/api/processes/9').send(
        buildPayload({
          businessProcessKey: 'VERSIONED',
          bpmnProcessId: 'Process_VERSIONED',
          status: 'ACTIVE',
        }),
      );
      expectFrozenError(res);
      expect(await defs('id = 9')).toMatchSnapshot('defs');
    });
  });

  describe('PUT con nueva versión', () => {
    beforeAll(resetDatabase);

    it('[frozen] PUT /processes/:id sobre ACTIVE crea versión source+1 DRAFT y copia vínculos de formulario', async () => {
      const res = await api.put('/api/processes/2').send(
        buildPayload({
          name: 'EXCLUSIVE v2',
          businessProcessKey: 'IGNORED_KEY',
          bpmnProcessId: 'Process_EXCLUSIVE',
          status: 'ACTIVE',
          elements: [
            { bpmnElementId: 'StartEvent_X', name: 'Start', type: 'START_EVENT', assignedRoleId: null },
            { bpmnElementId: 'Task_High', name: 'High', type: 'USER_TASK', assignedRoleId: 1 },
            { bpmnElementId: 'EndEvent_X', name: 'End', type: 'END_EVENT', assignedRoleId: null },
          ],
          sequences: [
            { sourceElementBpmnId: 'StartEvent_X', targetElementBpmnId: 'Task_High', conditionExpression: null },
            { sourceElementBpmnId: 'Task_High', targetElementBpmnId: 'EndEvent_X', conditionExpression: null },
          ],
        }),
      );
      expectFrozen(res);
      expect(await defs("business_process_key = 'EXCLUSIVE'")).toMatchSnapshot('defs');
      expect(await elems('process_def_id = 10')).toMatchSnapshot('elements');
      expect(await seqs('process_def_id = 10')).toMatchSnapshot('sequences');
      expect(await links('element_id > 35')).toMatchSnapshot('links');
    });

    it('[frozen] PUT /processes/:id sobre DRAFT con instancias crea nueva versión', async () => {
      await query(`UPDATE process_definitions SET status = 'DRAFT' WHERE id = 1`);
      const res = await api.put('/api/processes/1').send(
        buildPayload({
          name: 'LINEAR v2',
          businessProcessKey: 'LINEAR',
          bpmnProcessId: 'Process_LINEAR',
          elements: [
            { bpmnElementId: 'StartEvent_L', name: 'Start', type: 'START_EVENT', assignedRoleId: null },
            { bpmnElementId: 'Task_L', name: 'Linear task', type: 'USER_TASK', assignedRoleId: 1 },
          ],
          sequences: [
            { sourceElementBpmnId: 'StartEvent_L', targetElementBpmnId: 'Task_L', conditionExpression: null },
          ],
        }),
      );
      expectFrozen(res);
      expect(await defs("business_process_key = 'LINEAR'")).toMatchSnapshot('defs');
      expect(await links('element_id > 38')).toMatchSnapshot('links');
    });

    it('[frozen] PUT /processes/:id sobre VERSIONED v1 INACTIVE sin instancias con v3 existente actualiza en sitio (hoy)', async () => {
      const res = await api
        .put('/api/processes/7')
        .send(buildPayload({ businessProcessKey: 'VERSIONED', bpmnProcessId: 'Process_VERSIONED' }));
      expectFrozen(res);
      expect(await defs("business_process_key = 'VERSIONED'")).toMatchSnapshot('defs');
    });

    it('[frozen] PUT /processes/:id desde versión no última con instancias (v1 con v2 existente) -> violación de unicidad (hoy)', async () => {
      await query(
        `INSERT INTO process_instances (process_def_id, status, business_data, started_by_user_id) VALUES (7, 'RUNNING', '{}', 3)`,
      );
      const res = await api
        .put('/api/processes/7')
        .send(buildPayload({ businessProcessKey: 'VERSIONED', bpmnProcessId: 'Process_VERSIONED' }));
      expectFrozenError(res);
      expect(await defs("business_process_key = 'VERSIONED'")).toMatchSnapshot('defs');
      expect(await elems('process_def_id > 9 AND process_def_id <> 10')).toMatchSnapshot('elements');
    });
  });

  describe('PUT casos límite', () => {
    beforeAll(resetDatabase);

    it('[frozen] PUT /processes/:id inexistente crea un proceso nuevo v1 (hoy, N-01)', async () => {
      const res = await api.put('/api/processes/9999').send(buildPayload());
      expectFrozen(res);
      expect(await defs("business_process_key = 'NEWPROC'")).toMatchSnapshot('defs');
      expect(await elems('process_def_id = 10')).toMatchSnapshot('elements');
    });

    it('[frozen] PUT /processes/:id con id/version/createdAt en el cuerpo (asignación masiva hoy)', async () => {
      const res = await api.put('/api/processes/9').send(
        buildPayload({
          id: 777,
          version: 42,
          createdAt: '2020-02-02T00:00:00.000Z',
          businessProcessKey: 'VERSIONED',
          bpmnProcessId: 'Process_VERSIONED',
        }),
      );
      expectFrozen(res);
      expect(await defs("business_process_key = 'VERSIONED' OR id = 777")).toMatchSnapshot('defs');
      expect(
        await query(
          `SELECT id, created_at::text AS created_at FROM process_definitions WHERE id IN (9, 777) ORDER BY id`,
        ),
      ).toMatchSnapshot('created_at');
    });

    it('[frozen] POST /processes con id/version en el cuerpo (asignación masiva hoy)', async () => {
      const res = await api
        .post('/api/processes')
        .send(buildPayload({ id: 555, version: 9, businessProcessKey: 'MASS', bpmnProcessId: 'Process_MASS' }));
      expectFrozen(res);
      expect(await defs("business_process_key = 'MASS'")).toMatchSnapshot('defs');
    });
  });

  describe('PATCH metadatos', () => {
    beforeAll(resetDatabase);

    it('[frozen] PATCH /processes/:id actualiza metadatos permitidos e ignora el resto', async () => {
      const res = await api
        .patch('/api/processes/9')
        .send({ name: 'Renombrado', description: 'd2', category: 'C2', version: 99, businessProcessKey: 'HACK' });
      expectFrozen(res);
      expect(await defs('id = 9')).toMatchSnapshot('defs');
    });

    it('[frozen] PATCH /processes/:id status ACTIVE con otra ACTIVE para la clave (hoy)', async () => {
      const res = await api.patch('/api/processes/9').send({ status: 'ACTIVE' });
      expectFrozenError(res);
      expect(await defs("business_process_key = 'VERSIONED'")).toMatchSnapshot('defs');
    });

    it('[frozen] PATCH /processes/:id status ACTIVE sin otra ACTIVE', async () => {
      await query(`UPDATE process_definitions SET status = 'INACTIVE' WHERE id = 8`);
      const res = await api.patch('/api/processes/9').send({ status: 'ACTIVE' });
      expectFrozen(res);
      expect(await defs("business_process_key = 'VERSIONED'")).toMatchSnapshot('defs');
    });

    it("[frozen] PATCH /processes/:id status 'FOO' se persiste (hoy)", async () => {
      const res = await api.patch('/api/processes/7').send({ status: 'FOO' });
      expectFrozen(res);
      expect(await defs('id = 7')).toMatchSnapshot('defs');
    });

    it('[frozen] PATCH /processes/:id inexistente (hoy error genérico)', async () => {
      expectFrozenError(await api.patch('/api/processes/9999').send({ name: 'x' }));
    });
  });

  describe('DELETE', () => {
    beforeAll(resetDatabase);

    it('[frozen] DELETE /processes/:id responde 204 y borra elementos y secuencias', async () => {
      const res = await api.delete('/api/processes/9');
      expectFrozen(res);
      expect(await defs('id = 9')).toMatchSnapshot('defs');
      expect(await elems('process_def_id = 9')).toMatchSnapshot('elements');
      expect(await seqs('process_def_id = 9')).toMatchSnapshot('sequences');
    });

    it('[frozen] DELETE /processes/:id inexistente (hoy error genérico)', async () => {
      expectFrozenError(await api.delete('/api/processes/9999'));
    });

    it('[frozen] DELETE /processes/:id de una definición con instancias y vínculos de formulario (hoy)', async () => {
      expectFrozen(await api.delete('/api/processes/1'));
      expect(await defs('id = 1')).toMatchSnapshot('defs');
      expect(await elems('process_def_id = 1')).toMatchSnapshot('elements');
      expect(await links('true')).toMatchSnapshot('links');
      expect(
        await query('SELECT id, process_def_id, status FROM process_instances ORDER BY id'),
      ).toMatchSnapshot('instances');
    });
  });
});
