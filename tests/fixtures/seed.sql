-- =============================================================================
-- seed.sql - Seed determinista para la suite de caracterizacion (T011)
-- Ejecutar DESPUES de: TRUNCATE ... RESTART IDENTITY CASCADE (14 tablas).
-- Ver tests/fixtures/SEED.md para la referencia completa.
-- Passwords: admin Admin123! ; resto User123! (bcrypt, 10 rondas).
-- =============================================================================
BEGIN;
INSERT INTO users (id, full_name, email, password_hash, status, created_at, system_role) VALUES
  (1, 'Admin Test', 'admin@flowify.test', '$2a$10$z.cGi3DRTeNJSs7FRxZdIOBMtBX.3f/QoUdTkpLAWOyZPJUXuxdN2', 'ACTIVE', '2026-01-01T00:00:00Z', 'ADMIN'),
  (2, 'Approver Test', 'approver@flowify.test', '$2a$10$KtdwxuNPkZ9xTj0k8TFTkO4aI3AlvBcPTI7fpN1xBaNvrSKb4A7KW', 'ACTIVE', '2026-01-01T00:00:00Z', 'USER'),
  (3, 'Requester Test', 'requester@flowify.test', '$2a$10$KtdwxuNPkZ9xTj0k8TFTkO4aI3AlvBcPTI7fpN1xBaNvrSKb4A7KW', 'ACTIVE', '2026-01-01T00:00:00Z', 'USER');
INSERT INTO roles (id, name, description) VALUES
  (1, 'Aprobador', 'Rol que aprueba solicitudes'),
  (2, 'Solicitante', 'Rol que crea solicitudes');
INSERT INTO user_roles (user_id, role_id, created_at) VALUES
  (1, 1, '2026-01-01T00:00:00Z'),
  (2, 1, '2026-01-01T00:00:00Z'),
  (3, 2, '2026-01-01T00:00:00Z');
INSERT INTO system_role_modules (id, system_role, module_name) VALUES
  (1, 'ADMIN', 'USERS'),
  (2, 'ADMIN', 'ROLES'),
  (3, 'ADMIN', 'PROCESSES'),
  (4, 'ADMIN', 'INBOX'),
  (5, 'USER', 'INBOX'),
  (6, 'USER', 'PROCESSES');
INSERT INTO field_definitions (id, name, label, field_type, validations) VALUES
  (1, 'purchaseAmount', 'Monto de compra', 'NUMBER', '{"min":0}'::jsonb),
  (2, 'justification', 'Justificacion', 'TEXT', '{"maxLength":500}'::jsonb),
  (3, 'approved', 'Aprobado', 'BOOLEAN', NULL),
  (4, 'notes', 'Notas', 'TEXT', NULL);
INSERT INTO process_definitions (id, business_process_key, name, description, version, category, status, bpmn_process_id, created_at, bpmn_xml) VALUES
  (1, 'LINEAR', 'Linear process', 'Seed LINEAR v1', 1, 'SEED', 'ACTIVE', 'Process_LINEAR', '2026-01-01T00:00:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (2, 'EXCLUSIVE', 'Exclusive process', 'Seed EXCLUSIVE v1', 1, 'SEED', 'ACTIVE', 'Process_EXCLUSIVE', '2026-01-01T00:01:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (3, 'PARALLEL', 'Parallel process', 'Seed PARALLEL v1', 1, 'SEED', 'ACTIVE', 'Process_PARALLEL', '2026-01-01T00:02:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (4, 'END_AT_START', 'End at start process', 'Seed END_AT_START v1', 1, 'SEED', 'ACTIVE', 'Process_END_AT_START', '2026-01-01T00:03:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (5, 'AUTO', 'Auto task process', 'Seed AUTO v1', 1, 'SEED', 'ACTIVE', 'Process_AUTO', '2026-01-01T00:04:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (6, 'APPROVAL', 'Approval process', 'Seed APPROVAL v1', 1, 'SEED', 'ACTIVE', 'Process_APPROVAL', '2026-01-01T00:05:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (7, 'VERSIONED', 'Versioned process', 'Seed VERSIONED v1', 1, 'SEED', 'INACTIVE', 'Process_VERSIONED', '2026-01-01T00:06:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (8, 'VERSIONED', 'Versioned process', 'Seed VERSIONED v2', 2, 'SEED', 'ACTIVE', 'Process_VERSIONED', '2026-01-01T00:07:00Z'::timestamptz, '{"nodes":[],"edges":[]}'),
  (9, 'VERSIONED', 'Versioned process', 'Seed VERSIONED v3', 3, 'SEED', 'DRAFT', 'Process_VERSIONED', '2026-01-01T00:08:00Z'::timestamptz, '{"nodes":[],"edges":[]}');
INSERT INTO process_elements (id, process_def_id, bpmn_element_id, name, type, assigned_role_id) VALUES
  (1, 1, 'StartEvent_L', 'Start', 'START_EVENT', NULL),
  (2, 1, 'Task_L', 'Linear task', 'USER_TASK', 1),
  (3, 1, 'EndEvent_L', 'End', 'END_EVENT', NULL),
  (4, 2, 'StartEvent_X', 'Start', 'START_EVENT', NULL),
  (5, 2, 'Gateway_X', 'Amount gateway', 'EXCLUSIVE_GATEWAY', NULL),
  (6, 2, 'Task_High', 'High amount review', 'USER_TASK', 1),
  (7, 2, 'Task_Low', 'Low amount review', 'USER_TASK', 2),
  (8, 2, 'EndEvent_X', 'End', 'END_EVENT', NULL),
  (9, 3, 'StartEvent_P', 'Start', 'START_EVENT', NULL),
  (10, 3, 'Fork', 'Fork', 'PARALLEL_GATEWAY', NULL),
  (11, 3, 'Task_A', 'Parallel task A', 'USER_TASK', 1),
  (12, 3, 'Task_B', 'Parallel task B', 'USER_TASK', 2),
  (13, 3, 'Join', 'Join', 'PARALLEL_GATEWAY', NULL),
  (14, 3, 'Task_C', 'Final task C', 'USER_TASK', 1),
  (15, 3, 'EndEvent_P', 'End', 'END_EVENT', NULL),
  (16, 4, 'StartEvent_E', 'Start', 'START_EVENT', NULL),
  (17, 4, 'EndEvent_E', 'End', 'END_EVENT', NULL),
  (18, 5, 'StartEvent_A', 'Start', 'START_EVENT', NULL),
  (19, 5, 'Auto_1', 'Automatic task', 'AUTO_TASK', NULL),
  (20, 5, 'EndEvent_A', 'End', 'END_EVENT', NULL),
  (21, 6, 'StartEvent_AP', 'Start', 'START_EVENT', NULL),
  (22, 6, 'Task_Approval', 'Approval task', 'USER_TASK', 1),
  (23, 6, 'Gateway_AP', 'Decision gateway', 'EXCLUSIVE_GATEWAY', NULL),
  (24, 6, 'Task_Approved', 'Approved follow-up', 'USER_TASK', 2),
  (25, 6, 'Task_Rejected', 'Rejected follow-up', 'USER_TASK', 2),
  (26, 6, 'EndEvent_AP', 'End', 'END_EVENT', NULL),
  (27, 7, 'StartEvent_V', 'Start', 'START_EVENT', NULL),
  (28, 7, 'Task_V', 'Versioned task', 'USER_TASK', 1),
  (29, 7, 'EndEvent_V', 'End', 'END_EVENT', NULL),
  (30, 8, 'StartEvent_V', 'Start', 'START_EVENT', NULL),
  (31, 8, 'Task_V', 'Versioned task', 'USER_TASK', 1),
  (32, 8, 'EndEvent_V', 'End', 'END_EVENT', NULL),
  (33, 9, 'StartEvent_V', 'Start', 'START_EVENT', NULL),
  (34, 9, 'Task_V', 'Versioned task', 'USER_TASK', 1),
  (35, 9, 'EndEvent_V', 'End', 'END_EVENT', NULL);
INSERT INTO process_sequences (id, process_def_id, source_element_bpmn_id, target_element_bpmn_id, condition_expression) VALUES
  (1, 1, 'StartEvent_L', 'Task_L', NULL),
  (2, 1, 'Task_L', 'EndEvent_L', NULL),
  (3, 2, 'StartEvent_X', 'Gateway_X', NULL),
  (4, 2, 'Gateway_X', 'Task_High', 'purchaseAmount > 1000'),
  (5, 2, 'Gateway_X', 'Task_Low', NULL),
  (6, 2, 'Task_High', 'EndEvent_X', NULL),
  (7, 2, 'Task_Low', 'EndEvent_X', NULL),
  (8, 3, 'StartEvent_P', 'Fork', NULL),
  (9, 3, 'Fork', 'Task_A', NULL),
  (10, 3, 'Fork', 'Task_B', NULL),
  (11, 3, 'Task_A', 'Join', NULL),
  (12, 3, 'Task_B', 'Join', NULL),
  (13, 3, 'Join', 'Task_C', NULL),
  (14, 3, 'Task_C', 'EndEvent_P', NULL),
  (15, 4, 'StartEvent_E', 'EndEvent_E', NULL),
  (16, 5, 'StartEvent_A', 'Auto_1', NULL),
  (17, 5, 'Auto_1', 'EndEvent_A', NULL),
  (18, 6, 'StartEvent_AP', 'Task_Approval', NULL),
  (19, 6, 'Task_Approval', 'Gateway_AP', NULL),
  (20, 6, 'Gateway_AP', 'Task_Approved', 'task.action == ''APROBAR'''),
  (21, 6, 'Gateway_AP', 'Task_Rejected', NULL),
  (22, 6, 'Task_Approved', 'EndEvent_AP', NULL),
  (23, 6, 'Task_Rejected', 'EndEvent_AP', NULL),
  (24, 7, 'StartEvent_V', 'Task_V', NULL),
  (25, 7, 'Task_V', 'EndEvent_V', NULL),
  (26, 8, 'StartEvent_V', 'Task_V', NULL),
  (27, 8, 'Task_V', 'EndEvent_V', NULL),
  (28, 9, 'StartEvent_V', 'Task_V', NULL),
  (29, 9, 'Task_V', 'EndEvent_V', NULL);
INSERT INTO element_form_links (id, element_id, field_def_id, display_order, is_required, is_readonly, contextual_validations) VALUES
  (1, 4, 1, 1, true, false, NULL),
  (2, 4, 2, 2, false, false, '{"maxLength":200}'::jsonb),
  (3, 2, 3, 1, false, false, NULL),
  (4, 2, 4, 2, false, true, NULL);
INSERT INTO process_instances (id, process_def_id, status, business_data, started_by_user_id, start_time, end_time, description) VALUES
  (1, 1, 'RUNNING', '{"purchaseAmount":0,"approved":false,"notes":"","extraKey":"x"}'::jsonb, 3, '2026-01-10T10:00:00Z'::timestamptz, NULL, 'Instancia LINEAR en curso (valores falsy)'),
  (2, 1, 'COMPLETED', '{"approved":true,"notes":"ok"}'::jsonb, 3, '2026-01-09T09:00:00Z'::timestamptz, '2026-01-09T09:30:00Z'::timestamptz, 'Instancia LINEAR completada'),
  (3, 8, 'RUNNING', '{}'::jsonb, 3, '2026-01-11T11:00:00Z'::timestamptz, NULL, 'Instancia VERSIONED v2 en curso'),
  (4, 1, 'RUNNING', '{"purchaseAmount":5}'::jsonb, 3, '2026-01-12T12:00:00Z'::timestamptz, NULL, 'Instancia LINEAR para orden de tareas (FR-030)');
INSERT INTO task_instances (id, process_instance_id, element_def_id, status, assigned_to_role_id, created_at, completed_by_user_id, completion_time, completion_payload, comments) VALUES
  (1, 1, 2, 'PENDING', 1, '2026-01-10T10:00:01Z'::timestamptz, NULL, NULL, NULL, NULL),
  (2, 2, 2, 'COMPLETED', 1, '2026-01-09T09:00:01Z'::timestamptz, 2, '2026-01-09T09:30:00Z'::timestamptz, '{"action":"complete","formData":{},"comments":"ok"}'::jsonb, 'ok'),
  (3, 3, 31, 'PENDING', 1, '2026-01-11T11:00:01Z'::timestamptz, NULL, NULL, NULL, NULL),
  (4, 4, 2, 'PENDING', 1, '2026-01-12T12:30:00Z'::timestamptz, NULL, NULL, NULL, NULL),
  (5, 4, 2, 'PENDING', 1, '2026-01-12T12:10:00Z'::timestamptz, NULL, NULL, NULL, NULL),
  (6, 4, 2, 'PENDING', 1, '2026-01-12T12:20:00Z'::timestamptz, NULL, NULL, NULL, NULL);
INSERT INTO decision_logs (id, business_process_key, current_bpmn_element_id, request_payload, response_payload, error_message, executed_by_user_id, created_at) VALUES
  (1, 'EXCLUSIVE', 'StartEvent_X', '{"businessProcessKey":"EXCLUSIVE","currentBpmnElementId":"StartEvent_X","contextData":{"instance":{"businessData":{"purchaseAmount":2000}},"task":{}}}'::jsonb, '{"nextTasks":[{"bpmnElementId":"Task_High","name":"High amount review","type":"USER_TASK","assignedRoleId":1}]}'::jsonb, NULL, 1, '2026-01-05T08:00:00Z'::timestamptz);

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT max(id) FROM roles));
SELECT setval(pg_get_serial_sequence('system_role_modules', 'id'), (SELECT max(id) FROM system_role_modules));
SELECT setval(pg_get_serial_sequence('field_definitions', 'id'), (SELECT max(id) FROM field_definitions));
SELECT setval(pg_get_serial_sequence('process_definitions', 'id'), (SELECT max(id) FROM process_definitions));
SELECT setval(pg_get_serial_sequence('process_elements', 'id'), (SELECT max(id) FROM process_elements));
SELECT setval(pg_get_serial_sequence('process_sequences', 'id'), (SELECT max(id) FROM process_sequences));
SELECT setval(pg_get_serial_sequence('element_form_links', 'id'), (SELECT max(id) FROM element_form_links));
SELECT setval(pg_get_serial_sequence('process_instances', 'id'), (SELECT max(id) FROM process_instances));
SELECT setval(pg_get_serial_sequence('task_instances', 'id'), (SELECT max(id) FROM task_instances));
SELECT setval(pg_get_serial_sequence('decision_logs', 'id'), (SELECT max(id) FROM decision_logs));
COMMIT;
