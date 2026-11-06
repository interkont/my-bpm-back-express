-- =============================================================================
-- Fixtures de formdata / asignacion de casos (tests/contract/formdata.contract.test.ts).
-- Cargar DESPUES de resetDatabase(). Todos los ids son explicitos y >= 200.
--   field_definitions 200 color (SELECT con opciones), 201 size (SELECT con opciones)
--   Definicion 201 CASEFLOW v1 ACTIVE:
--     Start_CF (200) -> Task_CF_A (201, rol 1, actions + case_assignment_config) -> Task_CF_B (202, rol 2) -> End_CF (203)
--     Task_CF_A tiene links a color(200), size(201), notes(4)
--   Instancia 200 (CASEFLOW, RUNNING, business_data color=red, size=XL, notes=hi) con tarea PENDING 200 en Task_CF_A.
--   Instancia 201 (CASEFLOW, RUNNING, business_data {}) con tarea PENDING 201 en Task_CF_B (rol 2, sin actions ni config).
-- =============================================================================
BEGIN;
INSERT INTO field_definitions (id, name, label, field_type, validations) VALUES
  (200, 'color', 'Color', 'SELECT', '{"options":[{"label":"Rojo","value":"red"},{"label":"Azul","value":"blue"}]}'::jsonb),
  (201, 'size', 'Talla', 'SELECT', '{"options":[{"label":"Pequena","value":"S"},{"label":"Mediana","value":"M"}]}'::jsonb);
INSERT INTO process_definitions (id, business_process_key, name, description, version, category, status, bpmn_process_id, created_at, bpmn_xml) VALUES
  (201, 'CASEFLOW', 'Case flow process', 'Fixture de asignacion de casos', 1, 'FORMDATA', 'ACTIVE', 'Process_CASEFLOW', '2026-03-01T00:00:00Z'::timestamptz, '{"nodes":[],"edges":[]}');
INSERT INTO process_elements (id, process_def_id, bpmn_element_id, name, type, assigned_role_id, actions, case_assignment_config) VALUES
  (200, 201, 'Start_CF', 'Start', 'START_EVENT', NULL, NULL, NULL),
  (201, 201, 'Task_CF_A', 'Case task A', 'USER_TASK', 1, '["approve","reject"]'::jsonb, '{"isCaseAssignment":true,"assignableRoles":[1,2]}'::jsonb),
  (202, 201, 'Task_CF_B', 'Case task B', 'USER_TASK', 2, NULL, NULL),
  (203, 201, 'End_CF', 'End', 'END_EVENT', NULL, NULL, NULL);
INSERT INTO process_sequences (id, process_def_id, source_element_bpmn_id, target_element_bpmn_id, condition_expression) VALUES
  (200, 201, 'Start_CF', 'Task_CF_A', NULL),
  (201, 201, 'Task_CF_A', 'Task_CF_B', NULL),
  (202, 201, 'Task_CF_B', 'End_CF', NULL);
INSERT INTO element_form_links (id, element_id, field_def_id, display_order, is_required, is_readonly, contextual_validations) VALUES
  (200, 201, 200, 1, true, false, NULL),
  (201, 201, 201, 2, false, false, '{"note":"ctx"}'::jsonb),
  (202, 201, 4, 3, false, true, NULL);
INSERT INTO process_instances (id, process_def_id, status, business_data, started_by_user_id, start_time, end_time, description) VALUES
  (200, 201, 'RUNNING', '{"color":"red","size":"XL","notes":"hi"}'::jsonb, 3, '2026-03-02T10:00:00Z'::timestamptz, NULL, 'Instancia CASEFLOW A'),
  (201, 201, 'RUNNING', '{}'::jsonb, 3, '2026-03-02T11:00:00Z'::timestamptz, NULL, 'Instancia CASEFLOW B');
INSERT INTO task_instances (id, process_instance_id, element_def_id, status, assigned_to_role_id, created_at) VALUES
  (200, 200, 201, 'PENDING', 1, '2026-03-02T10:00:01Z'::timestamptz),
  (201, 201, 202, 'PENDING', 2, '2026-03-02T11:00:01Z'::timestamptz);
SELECT setval(pg_get_serial_sequence('field_definitions', 'id'), (SELECT max(id) FROM field_definitions));
SELECT setval(pg_get_serial_sequence('process_definitions', 'id'), (SELECT max(id) FROM process_definitions));
SELECT setval(pg_get_serial_sequence('process_elements', 'id'), (SELECT max(id) FROM process_elements));
SELECT setval(pg_get_serial_sequence('process_sequences', 'id'), (SELECT max(id) FROM process_sequences));
SELECT setval(pg_get_serial_sequence('element_form_links', 'id'), (SELECT max(id) FROM element_form_links));
SELECT setval(pg_get_serial_sequence('process_instances', 'id'), (SELECT max(id) FROM process_instances));
SELECT setval(pg_get_serial_sequence('task_instances', 'id'), (SELECT max(id) FROM task_instances));
COMMIT;
