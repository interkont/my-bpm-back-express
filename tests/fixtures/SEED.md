# Seed de caracterizacion (tests/fixtures/seed.sql)

Cargar tras `TRUNCATE ... RESTART IDENTITY CASCADE` de las 14 tablas. Todos los ids son explicitos y las secuencias quedan en `max(id)` (el siguiente insert de la app continua despues). Sin filas en `case_assignments` ni `document_instances`. Fechas fijas (2026-01). Condiciones evaluadas con expr-eval; contexto = `{...businessData, instance, task}`. Seed generado por script y envuelto en BEGIN/COMMIT.

## Usuarios

| id  | email                  | password  | full_name      | systemRole | roles de negocio |
| --- | ---------------------- | --------- | -------------- | ---------- | ---------------- |
| 1   | admin@flowify.test     | Admin123! | Admin Test     | ADMIN      | 1 Aprobador      |
| 2   | approver@flowify.test  | User123!  | Approver Test  | USER       | 1 Aprobador      |
| 3   | requester@flowify.test | User123!  | Requester Test | USER       | 2 Solicitante    |

Todos status ACTIVE. El admin (1) tambien tiene el rol de negocio 1 Aprobador.

## Roles

| id  | name        | description                 |
| --- | ----------- | --------------------------- |
| 1   | Aprobador   | Rol que aprueba solicitudes |
| 2   | Solicitante | Rol que crea solicitudes    |

## system_role_modules

- ADMIN: USERS, ROLES, PROCESSES, INBOX
- USER: INBOX, PROCESSES

## field_definitions

| id  | name           | field_type | validations         |
| --- | -------------- | ---------- | ------------------- |
| 1   | purchaseAmount | NUMBER     | `{"min":0}`         |
| 2   | justification  | TEXT       | `{"maxLength":500}` |
| 3   | approved       | BOOLEAN    | NULL                |
| 4   | notes          | TEXT       | NULL                |

## Process definitions, elements, sequences

bpmn_xml = `{"nodes":[],"edges":[]}` en todas; category 'SEED'; created_at = 2026-01-01T00:0N:00Z creciente por id.

| id  | key          | version | status   | bpmn_process_id      |
| --- | ------------ | ------- | -------- | -------------------- |
| 1   | LINEAR       | 1       | ACTIVE   | Process_LINEAR       |
| 2   | EXCLUSIVE    | 1       | ACTIVE   | Process_EXCLUSIVE    |
| 3   | PARALLEL     | 1       | ACTIVE   | Process_PARALLEL     |
| 4   | END_AT_START | 1       | ACTIVE   | Process_END_AT_START |
| 5   | AUTO         | 1       | ACTIVE   | Process_AUTO         |
| 6   | APPROVAL     | 1       | ACTIVE   | Process_APPROVAL     |
| 7   | VERSIONED    | 1       | INACTIVE | Process_VERSIONED    |
| 8   | VERSIONED    | 2       | ACTIVE   | Process_VERSIONED    |
| 9   | VERSIONED    | 3       | DRAFT    | Process_VERSIONED    |

### Def 1: LINEAR v1 (ACTIVE)

Elements:

| id  | bpmnElementId | name        | type        | assigned role |
| --- | ------------- | ----------- | ----------- | ------------- |
| 1   | StartEvent_L  | Start       | START_EVENT | -             |
| 2   | Task_L        | Linear task | USER_TASK   | 1 Aprobador   |
| 3   | EndEvent_L    | End         | END_EVENT   | -             |

Sequences:

| id  | source -> target       | condition        |
| --- | ---------------------- | ---------------- |
| 1   | StartEvent_L -> Task_L | (none = default) |
| 2   | Task_L -> EndEvent_L   | (none = default) |

### Def 2: EXCLUSIVE v1 (ACTIVE)

Elements:

| id  | bpmnElementId | name               | type              | assigned role |
| --- | ------------- | ------------------ | ----------------- | ------------- |
| 4   | StartEvent_X  | Start              | START_EVENT       | -             |
| 5   | Gateway_X     | Amount gateway     | EXCLUSIVE_GATEWAY | -             |
| 6   | Task_High     | High amount review | USER_TASK         | 1 Aprobador   |
| 7   | Task_Low      | Low amount review  | USER_TASK         | 2 Solicitante |
| 8   | EndEvent_X    | End                | END_EVENT         | -             |

Sequences:

| id  | source -> target          | condition               |
| --- | ------------------------- | ----------------------- |
| 3   | StartEvent_X -> Gateway_X | (none = default)        |
| 4   | Gateway_X -> Task_High    | `purchaseAmount > 1000` |
| 5   | Gateway_X -> Task_Low     | (none = default)        |
| 6   | Task_High -> EndEvent_X   | (none = default)        |
| 7   | Task_Low -> EndEvent_X    | (none = default)        |

### Def 3: PARALLEL v1 (ACTIVE)

Elements:

| id  | bpmnElementId | name            | type             | assigned role |
| --- | ------------- | --------------- | ---------------- | ------------- |
| 9   | StartEvent_P  | Start           | START_EVENT      | -             |
| 10  | Fork          | Fork            | PARALLEL_GATEWAY | -             |
| 11  | Task_A        | Parallel task A | USER_TASK        | 1 Aprobador   |
| 12  | Task_B        | Parallel task B | USER_TASK        | 2 Solicitante |
| 13  | Join          | Join            | PARALLEL_GATEWAY | -             |
| 14  | Task_C        | Final task C    | USER_TASK        | 1 Aprobador   |
| 15  | EndEvent_P    | End             | END_EVENT        | -             |

Sequences:

| id  | source -> target     | condition        |
| --- | -------------------- | ---------------- |
| 8   | StartEvent_P -> Fork | (none = default) |
| 9   | Fork -> Task_A       | (none = default) |
| 10  | Fork -> Task_B       | (none = default) |
| 11  | Task_A -> Join       | (none = default) |
| 12  | Task_B -> Join       | (none = default) |
| 13  | Join -> Task_C       | (none = default) |
| 14  | Task_C -> EndEvent_P | (none = default) |

### Def 4: END_AT_START v1 (ACTIVE)

Elements:

| id  | bpmnElementId | name  | type        | assigned role |
| --- | ------------- | ----- | ----------- | ------------- |
| 16  | StartEvent_E  | Start | START_EVENT | -             |
| 17  | EndEvent_E    | End   | END_EVENT   | -             |

Sequences:

| id  | source -> target           | condition        |
| --- | -------------------------- | ---------------- |
| 15  | StartEvent_E -> EndEvent_E | (none = default) |

### Def 5: AUTO v1 (ACTIVE)

Elements:

| id  | bpmnElementId | name           | type        | assigned role |
| --- | ------------- | -------------- | ----------- | ------------- |
| 18  | StartEvent_A  | Start          | START_EVENT | -             |
| 19  | Auto_1        | Automatic task | AUTO_TASK   | -             |
| 20  | EndEvent_A    | End            | END_EVENT   | -             |

Sequences:

| id  | source -> target       | condition        |
| --- | ---------------------- | ---------------- |
| 16  | StartEvent_A -> Auto_1 | (none = default) |
| 17  | Auto_1 -> EndEvent_A   | (none = default) |

### Def 6: APPROVAL v1 (ACTIVE)

Elements:

| id  | bpmnElementId | name               | type              | assigned role |
| --- | ------------- | ------------------ | ----------------- | ------------- |
| 21  | StartEvent_AP | Start              | START_EVENT       | -             |
| 22  | Task_Approval | Approval task      | USER_TASK         | 1 Aprobador   |
| 23  | Gateway_AP    | Decision gateway   | EXCLUSIVE_GATEWAY | -             |
| 24  | Task_Approved | Approved follow-up | USER_TASK         | 2 Solicitante |
| 25  | Task_Rejected | Rejected follow-up | USER_TASK         | 2 Solicitante |
| 26  | EndEvent_AP   | End                | END_EVENT         | -             |

Sequences:

| id  | source -> target               | condition                  |
| --- | ------------------------------ | -------------------------- |
| 18  | StartEvent_AP -> Task_Approval | (none = default)           |
| 19  | Task_Approval -> Gateway_AP    | (none = default)           |
| 20  | Gateway_AP -> Task_Approved    | `task.action == 'APROBAR'` |
| 21  | Gateway_AP -> Task_Rejected    | (none = default)           |
| 22  | Task_Approved -> EndEvent_AP   | (none = default)           |
| 23  | Task_Rejected -> EndEvent_AP   | (none = default)           |

### Def 7: VERSIONED v1 (INACTIVE)

Elements:

| id  | bpmnElementId | name           | type        | assigned role |
| --- | ------------- | -------------- | ----------- | ------------- |
| 27  | StartEvent_V  | Start          | START_EVENT | -             |
| 28  | Task_V        | Versioned task | USER_TASK   | 1 Aprobador   |
| 29  | EndEvent_V    | End            | END_EVENT   | -             |

Sequences:

| id  | source -> target       | condition        |
| --- | ---------------------- | ---------------- |
| 24  | StartEvent_V -> Task_V | (none = default) |
| 25  | Task_V -> EndEvent_V   | (none = default) |

### Def 8: VERSIONED v2 (ACTIVE)

Elements:

| id  | bpmnElementId | name           | type        | assigned role |
| --- | ------------- | -------------- | ----------- | ------------- |
| 30  | StartEvent_V  | Start          | START_EVENT | -             |
| 31  | Task_V        | Versioned task | USER_TASK   | 1 Aprobador   |
| 32  | EndEvent_V    | End            | END_EVENT   | -             |

Sequences:

| id  | source -> target       | condition        |
| --- | ---------------------- | ---------------- |
| 26  | StartEvent_V -> Task_V | (none = default) |
| 27  | Task_V -> EndEvent_V   | (none = default) |

### Def 9: VERSIONED v3 (DRAFT)

Elements:

| id  | bpmnElementId | name           | type        | assigned role |
| --- | ------------- | -------------- | ----------- | ------------- |
| 33  | StartEvent_V  | Start          | START_EVENT | -             |
| 34  | Task_V        | Versioned task | USER_TASK   | 1 Aprobador   |
| 35  | EndEvent_V    | End            | END_EVENT   | -             |

Sequences:

| id  | source -> target       | condition        |
| --- | ---------------------- | ---------------- |
| 28  | StartEvent_V -> Task_V | (none = default) |
| 29  | Task_V -> EndEvent_V   | (none = default) |

## element_form_links

| id  | element (id bpmnId, def) | field            | display_order | required | readonly | contextual_validations |
| --- | ------------------------ | ---------------- | ------------- | -------- | -------- | ---------------------- |
| 1   | 4 StartEvent_X (def 2)   | 1 purchaseAmount | 1             | true     | false    | NULL                   |
| 2   | 4 StartEvent_X (def 2)   | 2 justification  | 2             | false    | false    | `{"maxLength":200}`    |
| 3   | 2 Task_L (def 1)         | 3 approved       | 1             | false    | false    | NULL                   |
| 4   | 2 Task_L (def 1)         | 4 notes          | 2             | false    | true     | NULL                   |

Start form of EXCLUSIVE (def 2) = purchaseAmount (required; global validations {min:0}) + justification (contextual {maxLength:200}; global {maxLength:500}). Form of Task_L (LINEAR) = approved, notes (readonly). All other elements have no links (empty form).

## process_instances

| id  | def              | status    | started_by | business_data                                                     | start_time           | end_time             |
| --- | ---------------- | --------- | ---------- | ----------------------------------------------------------------- | -------------------- | -------------------- |
| 1   | 1 (LINEAR v1)    | RUNNING   | 3          | `{"purchaseAmount":0,"approved":false,"notes":"","extraKey":"x"}` | 2026-01-10T10:00:00Z | NULL                 |
| 2   | 1 (LINEAR v1)    | COMPLETED | 3          | `{"approved":true,"notes":"ok"}`                                  | 2026-01-09T09:00:00Z | 2026-01-09T09:30:00Z |
| 3   | 8 (VERSIONED v2) | RUNNING   | 3          | `{}`                                                              | 2026-01-11T11:00:00Z | NULL                 |
| 4   | 1 (LINEAR v1)    | RUNNING   | 3          | `{"purchaseAmount":5}`                                            | 2026-01-12T12:00:00Z | NULL                 |

Instance 1: falsy values 0/false/"" on purpose (FR-031); `extraKey` has no field definition -> UNKNOWN in instance detail. Instance 3 sits on VERSIONED v2 (def 8) so "save on v2" creates a new version. Instance 4 exists for ordering (FR-030). Descriptions are in Spanish (see seed.sql).

## task_instances

| id  | instance | element (id bpmnId) | status    | role        | created_at           | completed_by | completion_time      | completion_payload                                    | comments |
| --- | -------- | ------------------- | --------- | ----------- | -------------------- | ------------ | -------------------- | ----------------------------------------------------- | -------- |
| 1   | 1        | 2 Task_L            | PENDING   | 1 Aprobador | 2026-01-10T10:00:01Z | NULL         | NULL                 | NULL                                                  | NULL     |
| 2   | 2        | 2 Task_L            | COMPLETED | 1 Aprobador | 2026-01-09T09:00:01Z | 2            | 2026-01-09T09:30:00Z | `{"action":"complete","formData":{},"comments":"ok"}` | ok       |
| 3   | 3        | 31 Task_V           | PENDING   | 1 Aprobador | 2026-01-11T11:00:01Z | NULL         | NULL                 | NULL                                                  | NULL     |
| 4   | 4        | 2 Task_L            | PENDING   | 1 Aprobador | 2026-01-12T12:30:00Z | NULL         | NULL                 | NULL                                                  | NULL     |
| 5   | 4        | 2 Task_L            | PENDING   | 1 Aprobador | 2026-01-12T12:10:00Z | NULL         | NULL                 | NULL                                                  | NULL     |
| 6   | 4        | 2 Task_L            | PENDING   | 1 Aprobador | 2026-01-12T12:20:00Z | NULL         | NULL                 | NULL                                                  | NULL     |

Ordering trap (instance 4): id order 4,5,6 but created_at order is 5 (12:10), 6 (12:20), 4 (12:30). created_at ASC => [5,6,4]; id ASC => [4,5,6]; created_at DESC => [4,6,5]. Instance detail uses createdAt ASC; getMyTasks uses createdAt DESC.

## getMyTasks expectations (role-based, status PENDING)

- approver (id 2, role 1) and admin (id 1, role 1): tasks 1, 3, 4, 5, 6 (task 2 is COMPLETED); DESC by created_at: 4 (12:30), 6, 5, 3 (Jan 11), 1 (Jan 10) -> order [4,6,5,3,1] by created_at.
- requester (id 3, role 2): none. No task has assigned_to_user_id.

## decision_logs

id 1, key EXCLUSIVE, current_bpmn_element_id StartEvent_X, request_payload `{businessProcessKey:EXCLUSIVE,currentBpmnElementId:StartEvent_X,contextData:{instance:{businessData:{purchaseAmount:2000}},task:{}}}`, response_payload nextTasks=[Task_High, USER_TASK, role 1], error_message NULL, executed_by 1, created_at 2026-01-05T08:00:00Z. Note: getDecisionLogs includes User attributes id/username/email but users has no username column (watch for this in characterization).

## Scenario expectations (one line each)

- LINEAR: start creates RUNNING instance + 1 PENDING task on Task_L (role 1); completing it -> instance COMPLETED with end_time.
- EXCLUSIVE: start with purchaseAmount 2000 -> PENDING Task_High (role 1); with 500, 1000 or missing purchaseAmount -> Task_Low (role 2) (default route; a condition that errors evaluates to false). Completing either -> COMPLETED.
- PARALLEL: start creates 2 PENDING tasks (Task_A role 1, Task_B role 2); completing only one creates nothing; completing the second fires Join and creates Task_C (role 1); completing Task_C -> COMPLETED. Task_A and Task_B each have exactly one outgoing sequence, to Join.
- END_AT_START: start creates an instance immediately COMPLETED (end_time set) with zero tasks.
- AUTO: start fails with "Unsupported element type: AUTO_TASK" (transaction rolled back, no instance persists); the decision engine instead returns Auto_1 (AUTO_TASK) as a blocking element.
- APPROVAL: start creates PENDING Task_Approval (role 1); completing with action 'APROBAR' -> Task_Approved (role 2); any other/missing action -> Task_Rejected (role 2).
- VERSIONED: starting key VERSIONED uses the ACTIVE v2 (def 8); v1 INACTIVE and v3 DRAFT are ignored. All share bpmn_process_id Process_VERSIONED; unique (key, version).
- Decision engine (from currentBpmnElementId, first step then traversal): EXCLUSIVE from StartEvent_X with contextData.instance.businessData.purchaseAmount > 1000 -> [Task_High], else [Task_Low]; PARALLEL from StartEvent_P -> [Task_A, Task_B]; from Task_A -> [Task_C]... (traverses Join, which follows all outgoing) ; END_AT_START from StartEvent_E -> [EndEvent_E]; unknown key/element -> error stored in decision_logs.error_message and rethrown.
- Existing task 1 (instance 1) completed by approver with formData merges into business_data (falsy values preserved) -> instance 1 COMPLETED.
- Task 1 form (Task_L): approved (BOOLEAN), notes (TEXT, readonly).
