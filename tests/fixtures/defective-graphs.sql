-- =============================================================================
-- Grafos defectuosos para las pruebas de US4 (el motor falla de forma explicita).
-- Cargar DESPUES de resetDatabase() (necesita los usuarios y roles de seed.sql):
--   await loadSql('tests/fixtures/defective-graphs.sql');
-- Todos los ids son explicitos y >= 100 para no chocar con seed.sql; las secuencias
-- quedan en max(id). Todas las definiciones son ACTIVE, version 1. Las tareas de usuario
-- se asignan al rol 1 (Aprobador), que tienen admin y approver.
--
-- Definicion 101 MISSING_TARGET
--   Start_MT -> Task_MT ; Start_MT -> Ghost_MT (Ghost_MT NO existe) ; Task_MT -> Ghost_MT
--   Iniciar: error de modelado (la salida del inicio apunta a un elemento ausente).
--   Decision desde Start_MT o Task_MT: error de modelado.
--   Instancia 101 con tarea PENDING 101 en Task_MT (completarla falla).
-- Definicion 102 GATEWAY_CYCLE
--   Start_GC -> Gw_GC_A -> Gw_GC_B -> Gw_GC_A (dos gateways exclusivos en ciclo, sin tareas)
--   Iniciar y decidir: error de modelado "cycle without blocking elements".
-- Definicion 103 TASK_NO_OUT
--   Start_TN -> Task_TN (USER_TASK sin salidas).
--   Instancia 103 con tarea PENDING 103 en Task_TN.
--   Completar la tarea: error de modelado en ejecucion. En decision, desde Task_TN: respuesta vacia.
-- Definicion 104 ORPHAN_TASK
--   Start_OT -> Task_OT -> End_OT. Instancia 104 con tarea PENDING 104 cuyo element_def_id
--   (9999) NO existe en process_elements; asignada al rol 1.
-- Definicion 105 NO_ROUTE
--   Start_NR -> Gw_NR ; Task_NR -> Gw_NR ; Gw_NR -> Task_NR_X (amount > 100) ;
--   Gw_NR -> Task_NR_Y (amount > 200). Sin condicion verdadera ni ruta por defecto
--   (si no hay `amount`, las condiciones son falsas).
--   Instancia 105 con tarea PENDING 105 en Task_NR (completarla falla).
-- Definicion 106 DIAMOND
--   Start_D -> Fork_D (paralelo) -> Par_DA y Par_DB (paralelos) -> Gw_D (exclusivo) -> Task_D.
--   Gw_D tiene una sola salida por defecto. NO es un ciclo: el gateway compartido se
--   procesa dos veces (una por rama), igual que hoy.
-- =============================================================================
BEGIN;
INSERT INTO process_definitions (id, business_process_key, name, description, version, category, status, bpmn_process_id, created_at, bpmn_xml) VALUES
  (101, 'MISSING_TARGET', 'Missing target process', 'Defectuoso: secuencia hacia elemento inexistente', 1, 'DEFECTIVE', 'ACTIVE', 'Process_MISSING_TARGET', '2026-02-01T00:01:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (102, 'GATEWAY_CYCLE', 'Gateway cycle process', 'Defectuoso: ciclo de gateways sin tareas', 1, 'DEFECTIVE', 'ACTIVE', 'Process_GATEWAY_CYCLE', '2026-02-01T00:02:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (103, 'TASK_NO_OUT', 'Task without outgoing process', 'Defectuoso: tarea de usuario sin salida', 1, 'DEFECTIVE', 'ACTIVE', 'Process_TASK_NO_OUT', '2026-02-01T00:03:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (104, 'ORPHAN_TASK', 'Orphan task process', 'Defectuoso: tarea pendiente con elemento inexistente', 1, 'DEFECTIVE', 'ACTIVE', 'Process_ORPHAN_TASK', '2026-02-01T00:04:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (105, 'NO_ROUTE', 'No route process', 'Defectuoso: gateway exclusivo sin ruta valida', 1, 'DEFECTIVE', 'ACTIVE', 'Process_NO_ROUTE', '2026-02-01T00:05:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (106, 'DIAMOND', 'Diamond process', 'Valido: diamante, no es un ciclo', 1, 'DEFECTIVE', 'ACTIVE', 'Process_DIAMOND', '2026-02-01T00:06:00Z'::timestamptz, '{"nodes":[],"edges":[]}');
INSERT INTO process_elements (id, process_def_id, bpmn_element_id, name, type, assigned_role_id) VALUES
  (101, 101, 'Start_MT', 'Start', 'START_EVENT', NULL),
  (102, 101, 'Task_MT', 'Task before ghost', 'USER_TASK', 1),
  (103, 102, 'Start_GC', 'Start', 'START_EVENT', NULL),
  (104, 102, 'Gw_GC_A', 'Gateway A', 'EXCLUSIVE_GATEWAY', NULL),
  (105, 102, 'Gw_GC_B', 'Gateway B', 'EXCLUSIVE_GATEWAY', NULL),
  (106, 103, 'Start_TN', 'Start', 'START_EVENT', NULL),
  (107, 103, 'Task_TN', 'Task without outgoing', 'USER_TASK', 1),
  (108, 104, 'Start_OT', 'Start', 'START_EVENT', NULL),
  (109, 104, 'Task_OT', 'Orphan task', 'USER_TASK', 1),
  (110, 104, 'End_OT', 'End', 'END_EVENT', NULL),
  (111, 105, 'Start_NR', 'Start', 'START_EVENT', NULL),
  (112, 105, 'Task_NR', 'Task before gateway', 'USER_TASK', 1),
  (113, 105, 'Gw_NR', 'Gateway without route', 'EXCLUSIVE_GATEWAY', NULL),
  (114, 105, 'Task_NR_X', 'Task X', 'USER_TASK', 1),
  (115, 105, 'Task_NR_Y', 'Task Y', 'USER_TASK', 1),
  (116, 106, 'Start_D', 'Start', 'START_EVENT', NULL),
  (117, 106, 'Fork_D', 'Fork', 'PARALLEL_GATEWAY', NULL),
  (118, 106, 'Par_DA', 'Branch A', 'PARALLEL_GATEWAY', NULL),
  (119, 106, 'Par_DB', 'Branch B', 'PARALLEL_GATEWAY', NULL),
  (120, 106, 'Gw_D', 'Shared gateway', 'EXCLUSIVE_GATEWAY', NULL),
  (121, 106, 'Task_D', 'Final task', 'USER_TASK', 1);
INSERT INTO process_sequences (id, process_def_id, source_element_bpmn_id, target_element_bpmn_id, condition_expression) VALUES
  (101, 101, 'Start_MT', 'Task_MT', NULL),
  (102, 101, 'Start_MT', 'Ghost_MT', NULL),
  (103, 101, 'Task_MT', 'Ghost_MT', NULL),
  (104, 102, 'Start_GC', 'Gw_GC_A', NULL),
  (105, 102, 'Gw_GC_A', 'Gw_GC_B', NULL),
  (106, 102, 'Gw_GC_B', 'Gw_GC_A', NULL),
  (107, 103, 'Start_TN', 'Task_TN', NULL),
  (108, 104, 'Start_OT', 'Task_OT', NULL),
  (109, 104, 'Task_OT', 'End_OT', NULL),
  (110, 105, 'Start_NR', 'Gw_NR', NULL),
  (111, 105, 'Task_NR', 'Gw_NR', NULL),
  (112, 105, 'Gw_NR', 'Task_NR_X', 'amount > 100'),
  (113, 105, 'Gw_NR', 'Task_NR_Y', 'amount > 200'),
  (114, 106, 'Start_D', 'Fork_D', NULL),
  (115, 106, 'Fork_D', 'Par_DA', NULL),
  (116, 106, 'Fork_D', 'Par_DB', NULL),
  (117, 106, 'Par_DA', 'Gw_D', NULL),
  (118, 106, 'Par_DB', 'Gw_D', NULL),
  (119, 106, 'Gw_D', 'Task_D', NULL);
INSERT INTO process_instances (id, process_def_id, status, business_data, started_by_user_id, start_time, end_time, description) VALUES
  (101, 101, 'RUNNING', '{}'::jsonb, 3, '2026-02-02T10:01:00Z'::timestamptz, NULL, 'Instancia MISSING_TARGET en curso'),
  (103, 103, 'RUNNING', '{}'::jsonb, 3, '2026-02-02T10:03:00Z'::timestamptz, NULL, 'Instancia TASK_NO_OUT en curso'),
  (104, 104, 'RUNNING', '{}'::jsonb, 3, '2026-02-02T10:04:00Z'::timestamptz, NULL, 'Instancia ORPHAN_TASK en curso'),
  (105, 105, 'RUNNING', '{}'::jsonb, 3, '2026-02-02T10:05:00Z'::timestamptz, NULL, 'Instancia NO_ROUTE en curso');
INSERT INTO task_instances (id, process_instance_id, element_def_id, status, assigned_to_role_id, created_at) VALUES
  (101, 101, 102, 'PENDING', 1, '2026-02-02T10:01:01Z'::timestamptz),
  (103, 103, 107, 'PENDING', 1, '2026-02-02T10:03:01Z'::timestamptz),
  (104, 104, 9999, 'PENDING', 1, '2026-02-02T10:04:01Z'::timestamptz),
  (105, 105, 112, 'PENDING', 1, '2026-02-02T10:05:01Z'::timestamptz);
SELECT setval(pg_get_serial_sequence('process_definitions', 'id'), (SELECT max(id) FROM process_definitions));
SELECT setval(pg_get_serial_sequence('process_elements', 'id'), (SELECT max(id) FROM process_elements));
SELECT setval(pg_get_serial_sequence('process_sequences', 'id'), (SELECT max(id) FROM process_sequences));
SELECT setval(pg_get_serial_sequence('process_instances', 'id'), (SELECT max(id) FROM process_instances));
SELECT setval(pg_get_serial_sequence('task_instances', 'id'), (SELECT max(id) FROM task_instances));
COMMIT;
