import { query, resetDatabase } from '../../setup/db';
import { authed, loginAs } from '../../setup/http';
import { startServer, type RunningServer } from '../../setup/server-harness';

// Correcciones categoría B del módulo processes (US3): FR-021, FR-027, FR-028, FR-029, FR-033, N-01.

const NOT_FOUND = 'Process definition not found.';

const buildPayload = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  name: 'Proceso corregido',
  description: 'Descripción',
  category: 'TEST',
  status: 'DRAFT',
  businessProcessKey: 'VERSIONED',
  bpmnProcessId: 'Process_VERSIONED',
  diagramJson: { nodes: [], edges: [] },
  elements: [
    { bpmnElementId: 'StartEvent_N', name: 'Inicio', type: 'START_EVENT', assignedRoleId: null },
    { bpmnElementId: 'EndEvent_N', name: 'Fin', type: 'END_EVENT', assignedRoleId: null },
  ],
  sequences: [
    {
      sourceElementBpmnId: 'StartEvent_N',
      targetElementBpmnId: 'EndEvent_N',
      conditionExpression: null,
    },
  ],
  ...over,
});

describe('processes corrections', () => {
  let server: RunningServer;
  let api: ReturnType<typeof authed>;

  beforeAll(async () => {
    await resetDatabase();
    server = await startServer();
    api = authed(server.baseUrl, await loginAs(server.baseUrl, 'admin'));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('404 con AppError (FR-021)', () => {
    beforeAll(resetDatabase);

    it('save-ask inexistente -> 404 NOT_FOUND', async () => {
      const res = await api.get('/api/processes/9999/save-ask');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: NOT_FOUND, code: 'NOT_FOUND' });
    });

    it('PATCH inexistente -> 404 NOT_FOUND', async () => {
      const res = await api.patch('/api/processes/9999').send({ name: 'x' });
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: NOT_FOUND, code: 'NOT_FOUND' });
    });

    it('DELETE inexistente -> 404 NOT_FOUND', async () => {
      const res = await api.delete('/api/processes/9999');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: NOT_FOUND, code: 'NOT_FOUND' });
    });

    it('start-form inexistente -> 404 NOT_FOUND', async () => {
      const res = await api.get('/api/processes/9999/start-form');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        message: 'Start form definition not found for this process.',
        code: 'NOT_FOUND',
      });
    });

    it('GET detalle inexistente conserva el mensaje y añade code', async () => {
      const res = await api.get('/api/processes/9999');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        message: 'Process definition not found',
        code: 'NOT_FOUND',
      });
    });
  });

  describe('ids de ruta (R-13)', () => {
    beforeAll(resetDatabase);

    it.each([
      ['get', '/api/processes/abc'],
      ['get', '/api/processes/abc/save-ask'],
      ['get', '/api/processes/abc/start-form'],
      ['patch', '/api/processes/abc'],
      ['put', '/api/processes/abc'],
      ['delete', '/api/processes/abc'],
    ] as const)('%s %s con id no numérico -> 400 VALIDATION_ERROR', async (method, url) => {
      const res = await api[method](url);
      expect(res.status).toBe(400);
      expect((res.body as { code: string }).code).toBe('VALIDATION_ERROR');
    });

    it('PUT con id "9abc" también se rechaza (hoy falla en Postgres)', async () => {
      const res = await api.put('/api/processes/9abc').send(buildPayload());
      expect(res.status).toBe(400);
    });

    it('GET con "1abc" se sigue aceptando (hoy parseInt -> 1; FR-023)', async () => {
      const res = await api.get('/api/processes/1abc');
      expect(res.status).toBe(200);
      expect((res.body as { id: number }).id).toBe(1);
    });
  });

  describe('PUT inexistente (N-01)', () => {
    beforeAll(resetDatabase);

    it('responde 404 y no crea ninguna fila', async () => {
      const before = await query('SELECT count(*)::int AS n FROM process_definitions');
      const res = await api
        .put('/api/processes/9999')
        .send(buildPayload({ businessProcessKey: 'GHOST' }));
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: NOT_FOUND, code: 'NOT_FOUND' });
      expect(await query('SELECT count(*)::int AS n FROM process_definitions')).toEqual(before);
      expect(
        await query(`SELECT id FROM process_definitions WHERE business_process_key = 'GHOST'`),
      ).toEqual([]);
      expect(
        await query('SELECT id FROM process_elements WHERE bpmn_element_id = $1', ['StartEvent_N']),
      ).toEqual([]);
    });
  });

  describe('ACTIVE_VERSION_CONFLICT', () => {
    beforeAll(resetDatabase);

    it('segunda ACTIVE por PATCH -> 409 con el mensaje actual y la base sin cambios', async () => {
      const before = await query('SELECT id, status FROM process_definitions ORDER BY id');
      const res = await api.patch('/api/processes/9').send({ status: 'ACTIVE' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        code: 'ACTIVE_VERSION_CONFLICT',
        message:
          'An active version already exists for this process (Version: 2, ID: 8). Please deactivate it before activating another one.',
      });
      expect(await query('SELECT id, status FROM process_definitions ORDER BY id')).toEqual(before);
    });

    it('segunda ACTIVE por PUT en sitio -> 409', async () => {
      const res = await api.put('/api/processes/9').send(buildPayload({ status: 'ACTIVE' }));
      expect(res.status).toBe(409);
      expect((res.body as { code: string }).code).toBe('ACTIVE_VERSION_CONFLICT');
    });

    it('segunda ACTIVE por POST -> 409', async () => {
      const res = await api.post('/api/processes').send(buildPayload({ status: 'ACTIVE' }));
      expect(res.status).toBe(409);
      expect((res.body as { code: string }).code).toBe('ACTIVE_VERSION_CONFLICT');
    });
  });

  describe('versionado (FR-028)', () => {
    beforeAll(resetDatabase);

    it('versionar desde una versión no última crea version = max + 1', async () => {
      await query(
        `INSERT INTO process_instances (process_def_id, status, business_data, started_by_user_id) VALUES (7, 'RUNNING', '{}', 3)`,
      );
      const res = await api.put('/api/processes/7').send(buildPayload());
      expect(res.status).toBe(200);
      const created = res.body as { id: number; version: number; status: string };
      expect(created.version).toBe(4);
      expect(created.status).toBe('DRAFT');
      const rows = await query(
        `SELECT version FROM process_definitions WHERE business_process_key = 'VERSIONED' ORDER BY version`,
      );
      expect(rows.map((r) => r.version as number)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('lista blanca (FR-029)', () => {
    beforeAll(resetDatabase);

    it('PUT en sitio ignora id, version y createdAt (definición) e id/processDefId (elementos)', async () => {
      const res = await api.put('/api/processes/9').send(
        buildPayload({
          id: 777,
          version: 42,
          createdAt: '2020-02-02T00:00:00.000Z',
          elements: [
            {
              bpmnElementId: 'StartEvent_N',
              name: 'Inicio',
              type: 'START_EVENT',
              id: 888,
              processDefId: 1,
            },
            {
              bpmnElementId: 'EndEvent_N',
              name: 'Fin',
              type: 'END_EVENT',
              id: 889,
              processDefId: 1,
            },
          ],
        }),
      );
      expect(res.status).toBe(200);
      expect(await query('SELECT id FROM process_definitions WHERE id = 777')).toEqual([]);
      const [row] = await query(
        `SELECT id, version, created_at::text AS created_at, name, category FROM process_definitions WHERE id = 9`,
      );
      expect(row).toMatchObject({ id: 9, version: 3, name: 'Proceso corregido', category: 'TEST' });
      expect(row?.created_at).not.toContain('2020-02-02');
      const els = await query(
        'SELECT id, process_def_id FROM process_elements WHERE process_def_id = 9',
      );
      expect(els).toHaveLength(2);
      expect(await query('SELECT id FROM process_elements WHERE id IN (888, 889)')).toEqual([]);
    });

    it('POST ignora id y version del cuerpo', async () => {
      const res = await api.post('/api/processes').send(
        buildPayload({
          id: 555,
          version: 9,
          businessProcessKey: 'MASS',
          bpmnProcessId: 'Process_MASS',
        }),
      );
      expect(res.status).toBe(201);
      const body = res.body as { id: number; version: number };
      expect(body.id).not.toBe(555);
      expect(body.version).toBe(1);
      expect(await query('SELECT id FROM process_definitions WHERE id = 555')).toEqual([]);
    });
  });

  describe('PATCH status (FR-033)', () => {
    beforeAll(resetDatabase);

    it("status 'FOO' -> 400 VALIDATION_ERROR y no se persiste", async () => {
      const res = await api.patch('/api/processes/7').send({ status: 'FOO' });
      expect(res.status).toBe(400);
      expect((res.body as { code: string }).code).toBe('VALIDATION_ERROR');
      const [row] = await query('SELECT status FROM process_definitions WHERE id = 7');
      expect(row?.status).toBe('INACTIVE');
    });

    it.each(['DRAFT', 'INACTIVE', 'DEPRECATED'])('status %s válido se persiste', async (status) => {
      const res = await api.patch('/api/processes/7').send({ status });
      expect(res.status).toBe(200);
      expect((res.body as { status: string }).status).toBe(status);
    });
  });

  describe('start-form con FieldDefinition inexistente (FR-027)', () => {
    beforeAll(resetDatabase);

    it('responde 422 PROCESS_MODEL_ERROR', async () => {
      // Se desactivan los triggers de FK solo en esa sesión para sembrar el vínculo huérfano.
      await query(
        `SET session_replication_role = replica;
         INSERT INTO element_form_links (element_id, field_def_id, display_order, is_required, is_readonly)
         VALUES (4, 9999, 3, false, false);`,
      );
      const res = await api.get('/api/processes/2/start-form');
      expect(res.status).toBe(422);
      expect((res.body as { code: string }).code).toBe('PROCESS_MODEL_ERROR');
    });
  });
});
