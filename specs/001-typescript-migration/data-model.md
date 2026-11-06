# Data Model: Migración del backend a TypeScript

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-11-05

**Esta feature no cambia el esquema.** No se crean, renombran ni eliminan tablas, columnas, índices ni
restricciones. Lo que se modela aquí son los **contratos tipados** del esquema y del dominio que ya
existen, y el script de línea base que documenta el esquema vigente.

---

## 1. Script de línea base: `db/migrations/000_baseline.sql`

La constitución (Principio II y paso 3 del flujo) exige que `data-model.md` incluya el script de
migración. En esta feature el script es de **solo documentación**:

| Aspecto | Definición |
|---|---|
| Origen | `pg_dump --schema-only --no-owner --no-privileges` contra la base de demo, solo lectura (research R-07). |
| Contenido | Las 14 tablas reales, incluidas `process_elements.actions` y `case_assignment_config` (EXC-10), los índices, las unicidades y las únicas 3 FKs y el CHECK reales (blueprint §4.2). |
| Idempotencia | `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` (se ajusta la salida de `pg_dump`), para que el `globalSetup` de pruebas pueda reaplicarlo. |
| Rollback | Sección comentada con `DROP TABLE … CASCADE` en orden inverso, **solo para la base de pruebas**. |
| Aplicación | Solo a la base de pruebas. **MUST NOT** ejecutarse contra la base de demo, cuyo esquema ya es ese. |
| Verificación | La prueba `schema.contract.test.ts` compara las columnas de cada modelo tipado con `information_schema.columns` de la base de pruebas. Toda columna del modelo debe existir con un tipo compatible; las columnas de la base que el modelo no tiene se listan como excepción (`actions` y `case_assignment_config`, EXC-10). |

El SQL no se escribe a mano: se genera, porque una versión manual podría divergir del esquema real y
la constitución prohíbe usar `resources/*.sql` como referencia.

## 2. Valores de dominio (`src/domain/constants.ts`)

Se definen una sola vez como tuplas `as const` y se exportan con su unión derivada (FR-012, Principio X).

| Constante | Valores | Usado por |
|---|---|---|
| `PROCESS_DEFINITION_STATUS` | `DRAFT`, `ACTIVE`, `INACTIVE`, `DEPRECATED` | `ProcessDefinition.status`, validación de `PATCH` (FR-033) |
| `PROCESS_INSTANCE_STATUS` | `RUNNING`, `COMPLETED` | `ProcessInstance.status` |
| `TASK_STATUS` | `PENDING`, `COMPLETED` | `TaskInstance.status` |
| `ELEMENT_TYPE` | `START_EVENT`, `USER_TASK`, `EXCLUSIVE_GATEWAY`, `PARALLEL_GATEWAY`, `END_EVENT`, `AUTO_TASK` | `ProcessElement.type`, `NODE_SEMANTICS` |
| `SYSTEM_ROLE` | `ADMIN`, `USER` | `User.systemRole`, `SystemRoleModule.systemRole`, `isAdmin` |
| `USER_STATUS` | `ACTIVE` (único valor usado hoy; la columna es libre) | Valor por defecto de `User.status` |
| `SAVE_ACTION` | `UPDATE_IN_PLACE`, `CREATE_NEW_VERSION` | `getSaveAnalysis`, `saveProcessDefinition` |
| `DOCUMENT_STATUS` | `ACTIVE` (valor por defecto; sin uso funcional) | `DocumentInstance.status` |

**Lecturas tolerantes.** Las columnas de estado son `STRING(50)` sin CHECK (salvo `system_role`), y la
base de demo puede contener valores fuera de la unión. Al leer:

- `ProcessElement.type` se tipa con la unión. Un tipo desconocido en datos se trata en el motor como
  "tipo no soportado" (422, como `AUTO_TASK` en ejecución). Se conserva el comportamiento actual, donde
  ese caso también da error.
- Los demás estados se tipan con la unión al escribir. Al leer, se devuelven tal como están en la base,
  sin rechazar: los mappers no filtran valores.

## 3. Entidades tipadas (`src/models/*.model.ts`)

Mismo `tableName`, `field`, `timestamps`, índices y alias que hoy (research R-16). Leyenda: **CO** =
`CreationOptional` (tiene valor por defecto o la genera la base); **?** = admite `null`.

| Modelo (tabla) | Atributos tipados | Notas |
|---|---|---|
| `User` (`users`) | `id: CO<number>`, `fullName: string`, `email: string`, `passwordHash: string`, `status: CO<string>`, `systemRole: CO<SystemRole>`, `createdAt: CO<Date>` | Asociaciones `roles?: NonAttribute<Role[]>`. **Ningún DTO de salida incluye `passwordHash`.** |
| `Role` (`roles`) | `id: CO<number>`, `name: string`, `description: string` | `users?: NonAttribute<User[]>` |
| `UserRole` (`user_roles`) | `userId: number`, `roleId: number`, `created_at: CO<Date>` | Única tabla con `timestamps: true` (`createdAt: 'created_at'`, `updatedAt: false`). Aparece anidada como `UserRole` en login y en `GET /users`. |
| `SystemRoleModule` (`system_role_modules`) | `id: CO<number>`, `systemRole: SystemRole`, `moduleName: string` | Sin asociaciones. |
| `ProcessDefinition` (`process_definitions`) | `id: CO<number>`, `businessProcessKey: string`, `name: string`, `description: string?`, `version: number`, `category: string?`, `status: CO<ProcessDefinitionStatus>`, `bpmnProcessId: string`, `bpmnXml: string?`, `createdAt: CO<Date>` | `bpmnXml` guarda el JSON del diagrama como texto (AP-16, se conserva). UNIQUE(`businessProcessKey`, `version`). |
| `ProcessElement` (`process_elements`) | `id: CO<number>`, `processDefId: number`, `bpmnElementId: string`, `name: string?`, `description: string?`, `type: ElementType`, `assignedRoleId: number?`, `webhookTarget: string?`, `slaDefinition: JsonValue?` | `actions` y `case_assignment_config` **siguen fuera del modelo** (EXC-10, C-07). |
| `ProcessSequence` (`process_sequences`) | `id: CO<number>`, `processDefId: number`, `sourceElementBpmnId: string`, `targetElementBpmnId: string`, `conditionExpression: string?` | |
| `FieldDefinition` (`field_definitions`) | `id: CO<number>`, `name: string`, `label: string`, `fieldType: string`, `validations: JsonObject?` | |
| `ElementFormLink` (`element_form_links`) | `id: CO<number>`, `elementId: number`, `fieldDefId: number`, `displayOrder: number`, `isRequired: CO<boolean>`, `isReadonly: CO<boolean>`, `contextualValidations: JsonObject?` | |
| `ProcessInstance` (`process_instances`) | `id: CO<number>`, `processDefId: number`, `description: string?`, `status: ProcessInstanceStatus`, `businessData: BusinessData?`, `startedByUserId: number`, `startTime: CO<Date>`, `endTime: Date?` | |
| `TaskInstance` (`task_instances`) | `id: CO<number>`, `processInstanceId: number`, `elementDefId: number`, `status: TaskStatus`, `comments: string?`, `assignedToRoleId: number?`, `assignedToUserId: number?`, `dueDate: Date?`, `createdAt: CO<Date>`, `completedByUserId: number?`, `completionTime: Date?`, `completionPayload: JsonValue?` | |
| `DocumentInstance` (`document_instances`) | `id`, `processInstanceId`, `taskInstanceId?`, `fieldDefId`, `storageKey`, `fileName`, `version: CO<number>`, `status: CO<string>`, `uploadedByUserId`, `createdAt: CO<Date>` | Sin uso funcional; solo se tipa. |
| `CaseAssignment` (`case_assignments`) | `id`, `processInstanceId`, `roleId`, `assignedUserId` | Sin uso funcional; solo se tipa. |
| `DecisionLog` (`decision_logs`) | `id: CO<number>`, `businessProcessKey: string`, `currentBpmnElementId: string`, `requestPayload: JsonValue`, `responsePayload: JsonValue?`, `errorMessage: string?`, `executedByUserId: number`, `createdAt: CO<Date>` | `executedByUser` se proyecta con `id`, `fullName` y `email` (FR-026). |

**Relaciones.** Son las 30 asociaciones actuales de `src/models/index.js`, con el mismo `foreignKey`, `as`
y `onDelete`. Esas opciones son declarativas y no dan integridad (EXC-03, AP-13); se conservan para no
alterar los includes.

**Tipos JSON** (`src/domain/types.ts`):

```ts
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };
type BusinessData = JsonObject;   // forma libre; se estrecha antes de usar (Principio X)
```

## 4. Identidad autenticada (`AuthUser`)

`req.user` se tipa por *module augmentation* de `Express.User` (FR-010):

| Campo | Origen | Notas |
|---|---|---|
| `id`, `fullName`, `email`, `status`, `createdAt` | Fila de `users` (passport, `findByPk`) | Igual que hoy. |
| `systemRole: SystemRole` | **Payload del token** | Prevalece sobre la base, como hoy. Cambiarlo es C-05. |
| `roleIds: number[]` | **Payload del token** | Igual que hoy. |
| ~~`passwordHash`~~ | — | **Se elimina** de `req.user`; la estrategia de passport lo descarta al construir `AuthUser`. |

Un token que no trae `roleIds` produce `roleIds` ausente. `my-tasks` sigue respondiendo 401 en ese caso
(research R-11).

## 5. Error de aplicación (`src/domain/errors.ts`)

| Campo | Tipo | Regla |
|---|---|---|
| `statusCode` | `400 \| 401 \| 403 \| 404 \| 409 \| 422` | Solo códigos de la tabla de la constitución. |
| `code` | `ErrorCode` | `VALIDATION_ERROR`, `MALFORMED_JSON`, `INVALID_CREDENTIALS`, `INVALID_OLD_PASSWORD`, `MISSING_AUTH_DATA`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `ACTIVE_VERSION_CONFLICT`, `PROCESS_MODEL_ERROR`. |
| `message` | `string` | Mismo texto que hoy (FR-021). |
| `details` | `unknown?` | Solo en `VALIDATION_ERROR`: `[{ field, msg }]`. |
| `legacyErrorKey` | `boolean?` | Si es `true`, el cuerpo incluye además `error` con el mismo texto (FR-025). |

`AppError` es la única clase de la capa de aplicación; los constructores de conveniencia (`notFound`,
`conflict`, `modelError`…) son funciones. Su correspondencia con HTTP está en
[contracts/errors.md](./contracts/errors.md).

## 6. Modelo del motor (`src/api/engine/`)

### 6.1 Grafo

| Tipo | Definición | Regla |
|---|---|---|
| `ElementNode` | `{ id, bpmnElementId, name, type: ElementType, assignedRoleId }` | Se construye a partir de `ProcessElement`. |
| `SequenceEdge` | `{ id, source, target, condition: string \| null }` | Se construye a partir de `ProcessSequence`. |
| `ProcessGraph` | `{ elements: ReadonlyMap<bpmnElementId, ElementNode>, outgoing, incoming: ReadonlyMap<bpmnElementId, readonly SequenceEdge[]> }` | Se carga **una vez por operación** dentro de la transacción. Las aristas se ordenan por `id` de secuencia (R-09). |

Una arista que apunta a un `bpmnElementId` ausente de `elements` no se descarta al construir el grafo:
se reporta como error de modelado cuando se recorre. Así se conserva el momento en que hoy falla (solo
si se recorre esa ruta).

### 6.2 Contexto de evaluación

`EvaluationContext = { ...businessData, instance: InstanceView, task: TaskContext }`, el mismo que hoy y
construido por una única función compartida por ambos motores (FR-013):

- `instance`: la instancia en su forma plana actual.
- `task`: `{ bpmnElementId, action, formData, comments, completedBy: { id, roleIds } }` en ejecución, y
  `contextData.task` en decisión.

### 6.3 Semántica de nodos

`NODE_SEMANTICS satisfies Record<ElementType, NodeSemantics>`. Añadir un valor a `ELEMENT_TYPE` sin
definir su fila impide compilar (FR-013, US2-2).

| Tipo | Ejecución | Decisión |
|---|---|---|
| `START_EVENT` | Seguir todas las salidas | Seguir todas las salidas |
| `PARALLEL_GATEWAY` | Seguir todas las salidas (siempre fork; el join solo lo evalúa `completeTask`) | Seguir todas las salidas |
| `EXCLUSIVE_GATEWAY` | Primera condición verdadera, si no la ruta sin condición; si no hay ninguna → 422 | Igual |
| `USER_TASK` | Efecto `CREATE_TASK` (`PENDING`, rol del elemento); se detiene | Bloqueante: se devuelve |
| `END_EVENT` | Efecto `COMPLETE_INSTANCE` | Bloqueante: se devuelve |
| `AUTO_TASK` | **No soportado → 422** (diferencia vigente, FR-007) | Bloqueante: se devuelve |

Efectos del núcleo puro: `{ kind: 'CREATE_TASK', element } | { kind: 'COMPLETE_INSTANCE' }`. La cáscara
los aplica **en orden** dentro de la transacción.

### 6.4 Reglas que se conservan sin cambios (FR-007)

- El primer paso de `decide-next-task` toma todos los destinos del elemento actual sin evaluar
  condiciones.
- El join se evalúa solo cuando una tarea completada apunta directamente a un `PARALLEL_GATEWAY`. Cuenta
  las tareas `COMPLETED` de los elementos origen de las entradas y dispara si el conteo es `===` al
  número de entradas.
- Un `END_EVENT` completa la instancia aunque haya ramas `PENDING`.
- Una salida por tarea (`findOne`). Si hay varias, se toma la primera por `id`, lo que hoy es en la
  práctica el orden de inserción.

### 6.5 Errores de modelado detectados (FR-027)

| Condición | Detección |
|---|---|
| Secuencia hacia un elemento inexistente | Al recorrer la arista (ambos motores). |
| Ciclo sin elementos bloqueantes | Conjunto de ancestros del camino actual (research R-10); los diamantes se procesan como hoy. |
| Tarea de usuario sin salida | `completeTask`. |
| Tarea cuyo elemento ya no existe | `completeTask`, `getTaskForm` y `getStartForm` (form link a una `FieldDefinition` inexistente). |
| Gateway exclusivo sin ruta / tipo no soportado | research R-11. |

Todos responden 422 `PROCESS_MODEL_ERROR` y revierten la transacción. En `decide-next-task` el
`DecisionLog` registra el `errorMessage`. Si la actualización del log falla, se registra ese fallo y se
propaga el error original (N-09).

## 7. Transiciones de estado (sin cambios)

| Entidad | Transición | Disparador | Cambio en esta feature |
|---|---|---|---|
| Definición | `DRAFT → ACTIVE \| INACTIVE \| DEPRECATED` y entre ellos | `PATCH /processes/:id` | Se rechaza con 400 cualquier valor fuera de la unión (FR-033). Un solo `ACTIVE` por key, 409 (antes 500). |
| Definición | Guardar una `ACTIVE` o con instancias crea una versión `DRAFT` nueva | `PUT /processes/:id` | `version = max(version de la key) + 1` (FR-028). Un id inexistente da 404 en vez de crear un proceso (FR-021). |
| Instancia | `RUNNING → COMPLETED` | Llegada a un `END_EVENT` | La respuesta de inicio refleja el estado real (FR-032). |
| Tarea | `PENDING → COMPLETED` | `POST /tasks/:id/complete` | Sin cambios. |

## 8. DTOs de respuesta (`src/domain/types.ts` y `<x>.mappers.ts`)

Una función pura por forma de respuesta. Las formas exactas que deben conservarse están en
[analysis.md §2](./analysis.md) y en [contracts/http-api.md](./contracts/http-api.md).

| DTO | Mapper | Endpoints |
|---|---|---|
| `LoginResponseDto` (`user` con `roles[].UserRole`, `token`, `modules[]`) | `toLoginResponse` | `POST /auth/login` |
| `UserDto` / `UserWithRolesDto` (con o sin `UserRole`) | `toUserDto`, `toUserWithRolesDto` | `/users/*`, `PUT /auth/profile` |
| `RoleDto` / `RoleWithUsersDto` | `toRoleDto`, `toRoleWithUsersDto` | `/roles/*` |
| `ProcessDefinitionRowDto` (con `bpmnXml`) / `ProcessDefinitionListItemDto` (sin `bpmnXml`) / `ProcessDefinitionDetailDto` (`elements`, `sequences`, `diagramJson`) | `toDefinitionRow`, `toDefinitionListItem`, `toDefinitionDetail` | `/processes/*` |
| `SaveAnalysisDto` | `toSaveAnalysis` | `GET /processes/:id/save-ask` |
| `FormDto` / `FormFieldDto` | `toFormField` (compartido, con la variante de `value` de cada formulario) | `GET /processes/:id/start-form`, `GET /tasks/:id/form` |
| `StartInstanceResponseDto` | inline en el controller | `POST /process-instances` |
| `ProcessInstanceListItemDto` / `ProcessInstanceDetailDto` (con `businessDataFields[]`) / `ProcessInstanceRowDto` | `toInstanceListItem`, `toInstanceDetail`, `toInstanceRow` | `/process-instances/*` |
| `InboxItemDto` (9 campos y valores por defecto) | `toInboxItem` | `GET /tasks/my-tasks` |
| `NextTasksDto` | `toNextTask` | `POST /engine/decide-next-task` |
| `DecisionLogDto` | `toDecisionLog` | `GET /engine/decision-logs` |

## 9. Listas blancas de escritura (FR-029)

`pick(input, keys)` tipado; `keys` es un `readonly (keyof CreationAttributes<M>)[]` declarado junto al
servicio:

| Operación | Campos asignables | Siempre excluidos |
|---|---|---|
| Crear o actualizar definición | `businessProcessKey`, `name`, `description`, `category`, `status`, `bpmnProcessId`, `bpmnXml` (desde `diagramJson`) | `id`, `version` (la calcula el servicio), `createdAt` |
| Sincronizar elementos | `bpmnElementId`, `name`, `description`, `type`, `assignedRoleId`, `webhookTarget`, `slaDefinition` | `id`, `processDefId` (lo fija el servicio) |
| Sincronizar secuencias | `sourceElementBpmnId`, `targetElementBpmnId`, `conditionExpression` | `id`, `processDefId` |
| `POST /process-instances/record` | `processDefId`, `description`, `status`, `businessData`, `startTime`, `endTime` | `id`; `startedByUserId` lo fuerza el controller, como hoy |
| `PUT /process-instances/:id` | `description`, `status`, `businessData`, `endTime` | `id`, `processDefId`, `startedByUserId`, `startTime` |
| `POST /roles`, `PUT /roles/:id` | `name`, `description` (+ `userIds` como relación) | `id` |
| `POST /users`, `PUT /users/:id` | `fullName`, `email`, `systemRole`, `status` (+ `password`, `roleIds`) | `id`, `passwordHash` (solo vía hash en el servicio), `createdAt` |

Antes de cerrar cada fila, la tarea correspondiente verifica con la línea base que todo campo que hoy se
acepta y persiste siga en su lista (FR-029: "los campos que hoy se aceptan… MUST seguir aceptándose").
