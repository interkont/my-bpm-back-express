import request from 'supertest';
import { loadSql, query, resetDatabase } from '../setup/db';
import { authed, expectFrozen, loginAs } from '../setup/http';
import { startServer, type RunningServer } from '../setup/server-harness';

const snap = (value: unknown): void => {
  expect({ __normalized: true, value }).toMatchSnapshot();
};

const describeTs = process.env.CHARACTERIZATION_TARGET === 'js' ? describe.skip : describe;

const reset = async (): Promise<void> => {
  await resetDatabase();
  await loadSql('tests/fixtures/formdata.sql');
};

const links = (where = 'true') =>
  query(
    `SELECT id, element_id, field_def_id, display_order, is_required, is_readonly, contextual_validations
     FROM element_form_links WHERE ${where} ORDER BY id`,
  );
const fieldRows = () =>
  query('SELECT id, name, label, field_type, validations FROM field_definitions ORDER BY id');
const caseAssignments = () =>
  query(
    `SELECT id, process_instance_id, role_id, assigned_user_id
     FROM case_assignments ORDER BY process_instance_id, role_id`,
  );
const tasksOf = (instanceId: number) =>
  query(
    `SELECT id, element_def_id, status, assigned_to_role_id, assigned_to_user_id
     FROM task_instances WHERE process_instance_id = $1 ORDER BY id`,
    [instanceId],
  );
const elementRows = (defId: number) =>
  query(
    `SELECT id, bpmn_element_id, name, type, assigned_role_id, actions, case_assignment_config
     FROM process_elements WHERE process_def_id = $1 ORDER BY id`,
    [defId],
  );

interface Body {
  [k: string]: unknown;
}

// Ordena por una clave numérica (los arrays de Sequelize sin ORDER BY no tienen orden garantizado)
const sortBy = <T extends Body>(arr: T[], key: string): T[] =>
  [...arr].sort((a, b) => (a[key] as number) - (b[key] as number));

// processSequences se incluye sin ORDER BY: se ordena por id para que el snapshot sea determinista
const processSnap = (res: request.Response): void => {
  const body = res.body as Body;
  snap({
    status: res.status,
    body: { ...body, sequences: sortBy(body.sequences as Body[], 'id') },
  });
};

describe('formdata contract (JS baseline)', () => {
  let server: RunningServer;
  let api: ReturnType<typeof authed>;
  let approver: ReturnType<typeof authed>;
  let requester: ReturnType<typeof authed>;

  beforeAll(async () => {
    await reset();
    server = await startServer();
    api = authed(server.baseUrl, await loginAs(server.baseUrl, 'admin'));
    approver = authed(server.baseUrl, await loginAs(server.baseUrl, 'approver'));
    requester = authed(server.baseUrl, await loginAs(server.baseUrl, 'requester'));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('acceso a /api/fields', () => {
    it('[frozen] GET /api/fields sin token -> 401', async () => {
      expectFrozen(await request(server.baseUrl).get('/api/fields'));
    });

    it('[frozen] GET /api/fields con usuario no admin -> 403', async () => {
      expectFrozen(await requester.get('/api/fields'));
    });

    it('[frozen] POST /api/fields con usuario no admin -> 403 y sin cambios', async () => {
      expectFrozen(
        await approver.post('/api/fields').send({ name: 'x', label: 'X', fieldType: 'TEXT' }),
      );
      snap(await fieldRows());
    });
  });

  describe('/api/fields (admin)', () => {
    beforeAll(reset);

    it('[frozen] GET /api/fields/types devuelve el catálogo estático', async () => {
      expectFrozen(await api.get('/api/fields/types'));
    });

    it('[frozen] POST /api/fields crea (201)', async () => {
      const res = await api.post('/api/fields').send({
        name: 'priority',
        label: 'Prioridad',
        fieldType: 'SELECT',
        validations: { options: [{ label: 'Alta', value: 'high' }] },
      });
      expectFrozen(res);
      snap(await fieldRows());
    });

    it('[frozen] GET /api/fields lista (ordenada por id en el test)', async () => {
      const res = await api.get('/api/fields');
      // findAll sin ORDER BY: se ordena por id para que el snapshot sea determinista
      snap({ status: res.status, body: sortBy(res.body as Body[], 'id') });
    });

    it('[frozen] GET /api/fields/:id', async () => {
      expectFrozen(await api.get('/api/fields/200'));
    });

    it('[frozen] PUT /api/fields/:id actualiza (200)', async () => {
      const res = await api.put('/api/fields/4').send({ label: 'Notas actualizadas' });
      expectFrozen(res);
      snap(await fieldRows());
    });

    it('[frozen] DELETE /api/fields/:id sin vínculos -> 204', async () => {
      const res = await api.delete('/api/fields/201');
      expectFrozen(res);
      snap(await fieldRows());
    });

    // R-12: el `code` se añade a los errores que ya eran correctos.
    it('[frozen] GET /api/fields/:id inexistente -> 404', async () => {
      expectFrozen(await api.get('/api/fields/999999'));
    });
  });

  describe('/api/formdata-elements/:elementId/form-fields', () => {
    beforeAll(reset);

    it('[frozen] GET lista los vínculos con fieldDefinition ordenados por displayOrder', async () => {
      expectFrozen(await api.get('/api/formdata-elements/201/form-fields'));
    });

    it('[frozen] GET de elemento sin vínculos -> []', async () => {
      expectFrozen(await api.get('/api/formdata-elements/202/form-fields'));
    });

    it('[frozen] POST agrega un vínculo (201)', async () => {
      const res = await api.post('/api/formdata-elements/202/form-fields').send({
        fieldDefId: 1,
        displayOrder: 1,
        isRequired: true,
        isReadonly: false,
        contextualValidations: { min: 5 },
      });
      expectFrozen(res);
      snap(await links('element_id = 202'));
    });

    it('[frozen] PUT /:linkId actualiza un vínculo (200)', async () => {
      const id = ((await links('element_id = 202'))[0] as { id: number }).id;
      const res = await api
        .put(`/api/formdata-elements/202/form-fields/${String(id)}`)
        .send({ displayOrder: 7, isReadonly: true });
      expectFrozen(res);
      snap(await links('element_id = 202'));
    });

    it('[frozen] DELETE /:linkId elimina el vínculo (204)', async () => {
      const id = ((await links('element_id = 202'))[0] as { id: number }).id;
      const res = await api.delete(`/api/formdata-elements/202/form-fields/${String(id)}`);
      expectFrozen(res);
      snap(await links('element_id = 202'));
    });

    it('[frozen] PUT bulk crea, actualiza y elimina para igualar el payload', async () => {
      // Elemento 201: vínculos 200 (color), 201 (size), 202 (notes). Se conserva y modifica el 200,
      // se eliminan 201 y 202 y se crea uno nuevo.
      const res = await api.put('/api/formdata-elements/201/form-fields').send([
        { id: 200, fieldDefId: 200, displayOrder: 2, isRequired: false, isReadonly: true },
        { fieldDefId: 1, displayOrder: 1, isRequired: true, isReadonly: false },
      ]);
      expectFrozen(res);
      snap(await links('element_id = 201'));
    });

    it('[frozen] PUT bulk con [] elimina todos los vínculos', async () => {
      expectFrozen(await api.put('/api/formdata-elements/201/form-fields').send([]));
      snap(await links('element_id = 201'));
    });
  });

  describe('GET /api/processes/:id con formFields, actions y caseAssignmentConfig', () => {
    beforeAll(reset);

    it('[frozen] proceso CASEFLOW (201)', async () => {
      processSnap(await api.get('/api/processes/201'));
    });

    it('[frozen] proceso seed LINEAR (1) con formFields y sin actions', async () => {
      processSnap(await api.get('/api/processes/1'));
    });
  });

  describe('PUT/POST/DELETE /api/processes con formFields como vínculos', () => {
    const payload = (formFields: unknown[], over: Body = {}): Body => ({
      name: 'FormFields proceso',
      description: 'desc',
      category: 'FORMDATA',
      status: 'DRAFT',
      businessProcessKey: 'VERSIONED',
      bpmnProcessId: 'Process_VERSIONED',
      diagramJson: { nodes: [], edges: [] },
      elements: [
        { bpmnElementId: 'StartEvent_V', name: 'Start', type: 'START_EVENT' },
        {
          bpmnElementId: 'Task_V',
          name: 'Versioned task',
          type: 'USER_TASK',
          assignedRoleId: 1,
          actions: ['approve', 'reject'],
          caseAssignmentConfig: { isCaseAssignment: true, assignableRoles: [1] },
          formFields,
        },
        { bpmnElementId: 'EndEvent_V', name: 'End', type: 'END_EVENT' },
      ],
      sequences: [
        {
          sourceElementBpmnId: 'StartEvent_V',
          targetElementBpmnId: 'Task_V',
          conditionExpression: null,
        },
        {
          sourceElementBpmnId: 'Task_V',
          targetElementBpmnId: 'EndEvent_V',
          conditionExpression: null,
        },
      ],
      ...over,
    });

    describe('guardado en sitio (DRAFT sin instancias, def 9)', () => {
      beforeAll(reset);

      it('[frozen] primer PUT crea los vínculos desde el payload y persiste actions', async () => {
        const res = await api.put('/api/processes/9').send(
          payload([
            { fieldDefId: 1, displayOrder: 1, isRequired: true, isReadonly: false },
            {
              fieldDefId: 2,
              displayOrder: 2,
              isRequired: false,
              isReadonly: true,
              contextualValidations: { maxLength: 10 },
            },
          ]),
        );
        expectFrozen(res);
        snap(await elementRows(9));
        snap(await links('element_id IN (33, 34, 35)'));
      });

      it('[frozen] segundo PUT con ids sincroniza: actualiza uno, borra otro y crea uno', async () => {
        const existing = await links('element_id = 34');
        const keep = existing[0] as { id: number };
        const res = await api.put('/api/processes/9').send(
          payload([
            { id: keep.id, fieldDefId: 1, displayOrder: 5, isRequired: false, isReadonly: true },
            { fieldDefId: 3, displayOrder: 6, isRequired: true, isReadonly: false },
          ]),
        );
        expectFrozen(res);
        snap(await links('element_id IN (33, 34, 35)'));
      });

      it('[frozen] GET /api/processes/9 refleja los vínculos y las acciones guardadas', async () => {
        processSnap(await api.get('/api/processes/9'));
      });
    });

    describe('nueva versión (def 1 ACTIVE)', () => {
      beforeAll(reset);

      it('[frozen] PUT sobre ACTIVE crea la versión +1 con vínculos solo desde el payload', async () => {
        const res = await api.put('/api/processes/1').send(
          payload([{ fieldDefId: 4, displayOrder: 1, isRequired: false, isReadonly: false }], {
            businessProcessKey: 'LINEAR',
            bpmnProcessId: 'Process_LINEAR',
          }),
        );
        expectFrozen(res);
        snap(
          await query(
            `SELECT id, business_process_key, version, status FROM process_definitions
             WHERE business_process_key = 'LINEAR' ORDER BY id`,
          ),
        );
        snap(await elementRows(202));
        snap(await links('element_id > 203 OR element_id = 2'));
      });
    });

    describe('creación POST', () => {
      beforeAll(reset);

      it('[frozen] POST /api/processes crea con vínculos desde formFields (201)', async () => {
        const res = await api.post('/api/processes').send(
          payload([{ fieldDefId: 3, displayOrder: 1, isRequired: true, isReadonly: false }], {
            businessProcessKey: 'BRANDNEW',
            bpmnProcessId: 'Process_BRANDNEW',
          }),
        );
        expectFrozen(res);
        snap(await elementRows(202));
        snap(await links('element_id > 203'));
      });
    });

    describe('DELETE', () => {
      beforeAll(reset);

      it('[frozen] DELETE /api/processes/:id borra primero los vínculos (204)', async () => {
        const res = await api.delete('/api/processes/2');
        expectFrozen(res);
        snap(await links());
        snap(await elementRows(2));
      });
    });
  });

  describe('enriquecimiento de valores SELECT', () => {
    beforeAll(reset);

    it('[frozen] GET /api/tasks/:id/form sustituye el valor SELECT por la opción completa', async () => {
      const res = await approver.get('/api/tasks/200/form');
      const body = res.body as Body;
      // caseAssignmentData: roles y usuarios sin ORDER BY; se ordenan por id
      const cad = body.caseAssignmentData as { assignableRoles: Body[] } | undefined;
      snap({
        status: res.status,
        body: {
          ...body,
          caseAssignmentData: cad && {
            assignableRoles: sortBy(cad.assignableRoles, 'roleId').map((r) => ({
              ...r,
              users: sortBy(r.users as Body[], 'userId'),
            })),
          },
        },
      });
    });

    it('[frozen] GET /api/process-instances/:id incluye validations y enriquece SELECT', async () => {
      expectFrozen(await approver.get('/api/process-instances/200'));
    });

    it('[frozen] GET /api/process-instances/:id con claves desconocidas -> UNKNOWN', async () => {
      expectFrozen(await approver.get('/api/process-instances/1'));
    });
  });

  describe('asignación de casos', () => {
    beforeEach(reset);

    it('[frozen] la tarea sin acciones ni configuración devuelve actions por defecto y sin caseAssignmentData', async () => {
      expectFrozen(await requester.get('/api/tasks/201/form'));
    });

    it('[frozen] completar con caseAssignments inserta la fila y la tarea siguiente nace asignada al usuario', async () => {
      const res = await approver.post('/api/tasks/200/complete').send({
        action: 'approve',
        formData: { color: 'blue' },
        comments: 'ok',
        caseAssignments: [{ roleId: 2, userId: 3 }],
      });
      expectFrozen(res);
      snap(await caseAssignments());
      snap(await tasksOf(200));
    });

    it('[frozen] completar sin caseAssignments deja la tarea siguiente sin usuario', async () => {
      const res = await approver
        .post('/api/tasks/200/complete')
        .send({ action: 'approve', formData: {}, comments: 'ok' });
      expectFrozen(res);
      snap(await caseAssignments());
      snap(await tasksOf(200));
    });

    it('[frozen] una asignación previa del mismo rol se reemplaza (upsert)', async () => {
      await query(
        'INSERT INTO case_assignments (process_instance_id, role_id, assigned_user_id) VALUES (200, 2, 1)',
      );
      const res = await approver
        .post('/api/tasks/200/complete')
        .send({ action: 'approve', formData: {}, caseAssignments: [{ roleId: 2, userId: 3 }] });
      expectFrozen(res);
      snap(await caseAssignments());
      snap(await tasksOf(200));
    });
  });

  describeTs('correcciones (solo TS)', () => {
    beforeAll(reset);

    const notFound = { message: 'Field definition not found', code: 'NOT_FOUND' };
    const linkNotFound = { message: 'Element form link not found', code: 'NOT_FOUND' };

    it.each([['get'], ['put'], ['delete']] as const)(
      '%s /api/fields/999999 -> 404 NOT_FOUND',
      async (method) => {
        const res = await api[method]('/api/fields/999999').send({ label: 'x' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual(notFound);
      },
    );

    it.each([
      [{ label: 'L', fieldType: 'TEXT' }],
      [{ name: 'n', fieldType: 'TEXT' }],
      [{ name: 'n', label: 'L' }],
    ])('POST /api/fields con campos obligatorios ausentes -> 400', async (body) => {
      const res = await api.post('/api/fields').send(body);
      expect(res.status).toBe(400);
      expect((res.body as Body).code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/fields con name duplicado -> 409 CONFLICT', async () => {
      const res = await api
        .post('/api/fields')
        .send({ name: 'notes', label: 'Dup', fieldType: 'TEXT' });
      expect(res.status).toBe(409);
      expect((res.body as Body).code).toBe('CONFLICT');
    });

    it('GET /api/fields/abc -> 400 VALIDATION_ERROR', async () => {
      const res = await api.get('/api/fields/abc');
      expect(res.status).toBe(400);
      expect((res.body as Body).code).toBe('VALIDATION_ERROR');
    });

    it.each([['put'], ['delete']] as const)(
      '%s /:elementId/form-fields/999999 -> 404 NOT_FOUND',
      async (method) => {
        const res = await api[method]('/api/formdata-elements/201/form-fields/999999').send({
          displayOrder: 1,
        });
        expect(res.status).toBe(404);
        expect(res.body).toEqual(linkNotFound);
      },
    );

    it('POST /:elementId/form-fields sin fieldDefId -> 400', async () => {
      const res = await api
        .post('/api/formdata-elements/202/form-fields')
        .send({ displayOrder: 1 });
      expect(res.status).toBe(400);
      expect((res.body as Body).code).toBe('VALIDATION_ERROR');
    });

    // La base no tiene FK en element_form_links: hoy se acepta y se conserva (FR-023). El vínculo
    // roto se detecta al leer el formulario (FR-027, 422).
    it('POST /:elementId/form-fields con fieldDefId inexistente -> 201 (sin FK en la base)', async () => {
      const res = await api
        .post('/api/formdata-elements/202/form-fields')
        .send({ fieldDefId: 999999, displayOrder: 1 });
      expect(res.status).toBe(201);
    });

    it('PUT bulk con cuerpo que no es array -> 400', async () => {
      const res = await api
        .put('/api/formdata-elements/202/form-fields')
        .send({ fieldDefId: 1, displayOrder: 1 });
      expect(res.status).toBe(400);
      expect((res.body as Body).code).toBe('VALIDATION_ERROR');
    });

    it('PUT bulk con un ítem sin fieldDefId -> 400', async () => {
      const res = await api
        .put('/api/formdata-elements/202/form-fields')
        .send([{ displayOrder: 1 }]);
      expect(res.status).toBe(400);
      expect((res.body as Body).code).toBe('VALIDATION_ERROR');
    });

    it('PUT /api/processes/:id con formFields de forma antigua -> 400', async () => {
      const res = await api.put('/api/processes/9').send({
        name: 'Old shape',
        status: 'DRAFT',
        diagramJson: {},
        elements: [
          {
            bpmnElementId: 'Task_V',
            name: 'Versioned task',
            type: 'USER_TASK',
            formFields: [{ name: 'x' }],
          },
        ],
        sequences: [],
      });
      expect(res.status).toBe(400);
      expect((res.body as Body).code).toBe('VALIDATION_ERROR');
    });

    it('completar tarea con caseAssignments sin userId -> 400', async () => {
      const res = await approver
        .post('/api/tasks/200/complete')
        .send({ action: 'approve', caseAssignments: [{ roleId: 1 }] });
      expect(res.status).toBe(400);
      expect((res.body as Body).code).toBe('VALIDATION_ERROR');
    });
  });
});
