# Análisis de código para la migración a TypeScript

**Feature**: [spec.md](./spec.md) · **Fecha**: 2026-11-05 · **Código auditado**: commit `ca041db` (el código de `src/` es idéntico a `95e97c4`, al que apunta el blueprint)

Este documento es la entrada técnica de `/speckit-plan`. Recoge lo verificado leyendo **todos** los archivos de `src/` y los puntos de integración con `sveltekit-bpm`. No repite lo que ya documenta `blueprint.md`; lo referencia y añade lo que faltaba.

---

## 1. Inventario

| Capa | Archivos | Líneas aprox. | Notas para la migración |
|---|---|---|---|
| Bootstrap | `src/app.js` | 57 | Arranca el servidor al importarse (EXC-09). `src/index.ts` es un resto de plantilla sin uso. |
| Config | `src/config/{index,database,passport}.js` + 4 JSON | 47 | `production.json` vacío rompe `start:prod`. `JWT_SECRET` leído de `process.env` en 2 lugares. |
| Middlewares | `auth`, `admin`, `error` | 41 | El de errores crea su propio logger winston y siempre responde 500 texto. |
| Módulos API | 7 módulos, 23 archivos | ~1.560 | `processes`, `engine` y `process-instances` concentran el 60 % de la lógica. |
| Modelos | 14 modelos + `index.js` | ~690 | `sequelize.define` sin tipos; asociaciones centralizadas. |
| Utils | `catchAsync`, `expressionEngine`, `logger` | 59 | `logger` solo se importa (sin uso) en `database.js`. |
| **Total** | **48 `.js` + 1 `.ts`** | **~2.870** | 0 pruebas. |

Dependencias de runtime instaladas: express 4.21.2, sequelize 6.37.7, pg 8.16.3, passport 0.7 / passport-jwt 4.0.1, jsonwebtoken 9.0.2, bcryptjs 2.4.3, config 3.3.12, dotenv 17.2.2, helmet 7.2, cors 2.8.5, express-rate-limit 7.5.1, express-validator 7.2.1 (sin uso), expr-eval 2.0.2, winston 3.17, swagger-jsdoc / swagger-ui-express (sin uso). Dev: typescript 5.9.2, @types/node 20, jest 29.7, supertest 7.1.4, nodemon 3.1.

Tipos disponibles: express, passport, passport-jwt, jsonwebtoken, bcryptjs, cors, config necesitan `@types/*`; sequelize, helmet, express-rate-limit, express-validator, winston traen tipos propios; **expr-eval** trae `.d.ts` propio (verificar en el plan que cubre `Parser#evaluate`).

`npm audit --omit=dev` (línea base 2026-11-05): críticas `expr-eval` (sin corrección) y `proxy-addr`; altas `body-parser`, `path-to-regexp`, `jws`, `lodash`, `underscore`, `minimatch`, `brace-expansion`, `js-yaml`, `sequelize`; moderadas `qs`, `dottie`, `moment`, `uuid`. La mayoría se resuelven con parches de express 4.21.x / jsonwebtoken 9.x y retirando `swagger-jsdoc` (origen de `js-yaml`). `expr-eval` y `sequelize` quedan para features sucesoras.

---

## 2. Contrato a congelar (línea base de caracterización)

Los 32 endpoints están en `blueprint.md` §9. Para la equivalencia importan además estas **particularidades de serialización**, que hoy surgen de devolver instancias de Sequelize y que una reescritura con DTOs rompería con facilidad:

| Endpoint | Particularidad que MUST conservarse | Origen |
|---|---|---|
| `POST /auth/login` | `user` incluye `roles[]` y cada rol trae el objeto de la tabla intermedia `UserRole` (`userId`, `roleId`, `created_at`). Sin `passwordHash`. | `auth.service.js:6-9`, `:36` |
| `GET /users`, `GET /users/:id` | Igual que login: roles con `UserRole` anidado. | `user.service.js:24-42` |
| `POST /users`, `PUT /users/:id` | Roles **sin** `UserRole` (`through: { attributes: [] }`). | `user.service.js:13-21`, `:65-73` |
| `GET /roles/:id`, `PUT /roles/:id` | `users[]` con solo `id, fullName, email, status`, sin `UserRole`. | `role.service.js:11-20` |
| `POST /processes`, `PUT /processes/:id` | Devuelve la fila de la definición **con `bpmnXml` como string** y sin `elements`/`sequences`. 201 si no hay `:id`, 200 si lo hay. | `process.controller.js:10-14`, `process.service.js:170`, `:200` |
| `PATCH /processes/:id` | Fila completa, incluido `bpmnXml`. | `process.service.js:252` |
| `GET /processes`, `GET /processes/all` | Sin `bpmnXml`; orden `createdAt DESC`. | `process.service.js:256-275` |
| `GET /processes/:id` | `processElements`→`elements`, `processSequences`→`sequences`, `bpmnXml`→`diagramJson` (parseado; `{}` si vacío o inválido). | `process.service.js:287-301` |
| `DELETE /processes/:id` | 204 sin cuerpo (el mensaje del servicio se descarta). | `process.controller.js:41-45` |
| `GET /process-instances/:id` | Instancia + `processDefinition` (8 atributos) + `startedByUser` + `taskInstances[]` con 4 includes + `businessDataFields[]` añadido a nivel raíz. | `processInstance.service.js:49-125` |
| `POST /process-instances/record` | Fila cruda creada. | `processInstance.service.js:13-15` |
| `PUT /process-instances/:id` | `[n]` (array con filas afectadas). Se conserva (cambiarlo es categoría C). | `processInstance.service.js:128-132` |
| `GET /tasks/my-tasks` | DTO de 9 campos con valores por defecto `'Unnamed Task'`, `'Unknown Process'`, `'Unknown User'`. | `task.service.js:50-60` |
| `GET /tasks/:id/form`, `GET /processes/:id/start-form` | `{ taskName, fields[], actions }`; `validations` = `{...fieldDef.validations, isRequired, isReadonly, ...contextualValidations}`. Start form: `value: null`, `taskName` por defecto `'Iniciar Proceso'`, `actions: ['start']`. Task form: `actions` siempre `['complete']` (la columna `actions` no está en el modelo, EXC-10). | `process.service.js:345-366`, `task.service.js:104-127` |
| `POST /engine/decide-next-task` | `{ nextTasks: [{ bpmnElementId, name, type, assignedRoleId }] }`; 400 con clave `error`. | `decision.service.js:140-147`, `decision.controller.js:8-10` |
| Errores de passport | 401 texto `Unauthorized` (lo genera passport-jwt). Se conserva. | `auth.middleware.js` |
| `isAdmin` | 403 `{ message: 'Forbidden: Requires admin privileges.' }`. | `admin.middleware.js:10` |

Comparación en pruebas: igualdad profunda de JSON ignorando `id`, fechas y `token`; el orden de claves no es significativo, el orden de arrays sí.

---

## 3. Contrato con el frontend `sveltekit-bpm` (verificado)

- `src/lib/services/apiService.ts:20-33`: ante cualquier respuesta no `ok`, el frontend intenta `response.json()` y muestra `errorBody.message`; si el cuerpo no es JSON muestra `HTTP error! Status: <código>`. **Consecuencia**: pasar a errores JSON con `message` es compatible y mejora lo que ve el usuario.
- `apiService.ts:67-70`: **cualquier 401 con token activo cierra la sesión**. Consecuencia: ningún error de negocio de usuario autenticado puede usar 401 (spec FR-021, FR-024). Hoy `PUT /auth/profile` con contraseña anterior inválida responde 401 y expulsa al usuario: es un defecto vigente.
- Endpoints que el frontend usa: 27 de los 32 (incluido `PUT /auth/profile`, `authService.ts:151`). No usa `/engine/*`, `POST /process-instances/record` ni `PUT`/`DELETE /process-instances/:id`; esos 5 solo los pueden usar consumidores externos, por eso sus formas de respuesta se conservan aunque sean defectuosas. Llama a `GET /fields`, que no existe (404).
- Payload de guardado de procesos (`ProcessEditorView.svelte:158-200`, `process-transformer.ts:22-82`): `{ name, description, category, status, businessProcessKey, bpmnProcessId, diagramJson, elements[], sequences[] }`. **No** envía `id`, `version` ni `createdAt` de la definición (confirmado: `processDefinition.set` en `:92-98` solo copia 5 campos), por lo que la rama de nueva versión no está expuesta a colisión de `id` con el frontend actual. Cada elemento puede traer `formFields[]`, `actions[]`, `webhook_target` y `sla_definition` (en snake_case): **el backend descarta los cuatro** (no están en el modelo con esos nombres). Ver C-07.

---

## 4. Hallazgos nuevos (no documentados en el blueprint)

| ID | Hallazgo | Ubicación | Categoría |
|---|---|---|---|
| N-01 | `PUT /processes/:id` con id inexistente crea en silencio un proceso nuevo v1 (`definitionToUpdate` es `null` y cae en la rama de alta). | `process.service.js:98`, `:187-192` | B (FR-021) |
| N-02 | `POST /process-instances` responde `status: 'RUNNING'` aunque el proceso haya llegado a `END_EVENT` en el arranque: el `END_EVENT` actualiza por consulta estática y la instancia en memoria queda desactualizada. | `processEngine.service.js:122-128`, `processInstance.controller.js:15-19` | B (FR-032) |
| N-03 | Contraseña anterior inválida en perfil → 401 → el frontend cierra la sesión. | `auth.service.js:64-67` + `apiService.ts:67` | B (FR-024) |
| N-04 | El modelador envía `formFields`, `actions`, `webhook_target`, `sla_definition` por elemento y el backend los descarta; `webhookTarget`/`slaDefinition` existen en el modelo pero con otro nombre. | `process-transformer.ts:35-60`; `process-element.model.js:36-43` | C (C-07) |
| N-05 | Fork paralelo y `syncElements` lanzan consultas concurrentes con `Promise.all` sobre la misma transacción: el orden de creación de tareas hermanas y de las escrituras no es determinista. | `processEngine.service.js:51-62`; `process.service.js:56-60` | A |
| N-06 | Recorrido del grafo con N+1 consultas (una búsqueda de secuencias y otra de elemento por nodo), en ambos motores. | `processEngine.service.js:41-59`, `decision.service.js:16-34` | A |
| N-07 | `getStartForm` y `getTaskForm` lanzan `TypeError` si un form link apunta a una `FieldDefinition` inexistente o si la tarea perdió su elemento (huérfanos por EXC-04). | `process.service.js:345-347`; `task.service.js:106` | B (FR-027 / 404) |
| N-08 | `getStartForm` y `getTaskForm` duplican el mapeo de campos con diferencias sutiles (`validations` con y sin `|| {}`; `value`). | `process.service.js:345-358`; `task.service.js:106-119` | A (función pura común) |
| N-09 | Si `log.update` falla en el `catch` de `decideNextTask`, el error original se pierde. | `decision.service.js:154-158` | B (FR-027) |
| N-10 | El middleware de errores registra solo `err.stack`, sin método, ruta ni usuario (Principio VIII). | `error.middleware.js:19` | A |
| N-11 | Dos activaciones concurrentes de la misma key pueden pasar ambas la validación (no hay bloqueo ni índice único parcial). | `process.service.js:18-32`, `:214-215` | C (C-03) |
| N-12 | `deleteRole` cuenta usuarios y borra fuera de transacción. | `role.service.js:44-61` | A (envolver en transacción, sin cambio visible) |
| N-13 | `PATCH /processes/:id` con `status` arbitrario lo persiste (columna `STRING(50)` sin CHECK). | `process.service.js:231-243` | B (FR-033) |
| N-14 | `App.port` de `config` nunca se usa; la precedencia real es `PORT` → `--port` → 3000. | `app.js:40`, `config/default.json` | A (conservar precedencia) |
| N-15 | Los archivos estáticos de `public/` se sirven antes del rate limit (no se limitan). | `app.js:18-24` | Se conserva |

---

## 5. Catálogo de deuda clasificada

### 5.1 Categoría A — Refactor invisible (incluida)

| ID | Deuda | Origen | Resolución en la migración | FR |
|---|---|---|---|---|
| A-01 | Código sin tipos; `tsconfig` de plantilla (`target es5`, sin `strict`); `src/index.ts` sin uso | EXC-07 | TS estricto en todo `src/`, `tsconfig` real, borrar `index.ts` | FR-002, FR-011 |
| A-02 | Estados y tipos de nodo como literales repetidos | Convenciones de modelos | Constantes `as const` + tipos unión derivados | FR-012 |
| A-03 | Paridad motor/decisión solo por disciplina; lógica de contexto y gateway exclusivo duplicada | Principio VI, AP-20 | Tabla de semántica tipada por `ElementType` + funciones puras compartidas | FR-013 |
| A-04 | Respuestas construidas mutando entidades (`dataValues`, `delete result.x`) | `processInstance.service.js:88,120`; `process.service.js:289-299` | Mappers puros a DTO con el mismo JSON | FR-014 |
| A-05 | `try/catch` en controllers y formatos ad hoc | AP-02, EXC-11 | Todos con `catchAsync` + `AppError` | FR-015 |
| A-06 | Hash de contraseña en el controller | AP-04 | Mover a `user.service` | FR-015 |
| A-07 | Dos loggers, `console.*` (19 usos en 3 archivos), `businessData` en logs | EXC-06, AP-11, N-10 | Logger único con contexto de petición; conservar `error.log`/`combined.log` | FR-016 |
| A-08 | `JWT_SECRET` desde `process.env`; config sin validar; `production.json` vacío | EXC-12, blueprint §11.6 | Módulo de config tipado y validado al arrancar | FR-017 |
| A-09 | `app.js` arranca al importarse; scripts solo Unix | EXC-09 | `app.ts` / `server.ts`; scripts multiplataforma | FR-018 |
| A-10 | Código muerto: `count` sin uso del join, bloque DEPRECATED inalcanzable, `logger` sin uso en `database.js`, `require` perezosos, comentarios de bitácora, indentación inconsistente | AP-05, AP-06, AP-09, AP-18, AP-19 | Eliminar; formateo y lint automáticos | FR-019 |
| A-11 | `req.user` transporta `passwordHash` | blueprint §11.1 M | Tipo `AuthUser` sin hash | FR-010 |
| A-12 | Concurrencia no determinista en fork y `syncElements` | N-05 | Recorrido y escrituras secuenciales en orden de secuencias | FR-013 |
| A-13 | N+1 consultas en el recorrido del grafo | N-06 | Cargar el grafo de la definición una vez por transacción | — |
| A-14 | Mapeo de campos de formulario duplicado | N-08 | `toFormField` puro compartido conservando ambas variantes de `value` | FR-014 |
| A-15 | `deleteRole` fuera de transacción | N-12 | Transacción | — |
| A-16 | Metadatos de plantilla en `package.json`; dependencias sin uso (`swagger-*`) | EXC-07 | Limpiar; retirar dependencias sin uso | FR-019, FR-034 |
| A-17 | 0 pruebas | Principio VII | Suite de caracterización + unitarias del núcleo del motor | FR-003, FR-004 |

### 5.2 Categoría B — Corrección de defecto compatible (incluida, lista cerrada)

| ID | Defecto | Origen | FR |
|---|---|---|---|
| B-01 | Error middleware siempre 500 texto | EXC-02, blueprint §11.2 | FR-020 |
| B-02 | Errores de negocio sin `statusCode` (`new Error`) | AP-01; 19 ubicaciones (blueprint §11.2) | FR-021 |
| B-03 | `PUT /processes/:id` inexistente crea proceso | N-01 | FR-021 |
| B-04 | 401 de negocio en perfil cierra sesión | N-03 | FR-024 |
| B-05 | Claves `error` en vez de `message` | `decision.controller.js:9`, `task.controller.js:14` | FR-025 |
| B-06 | `decision-logs` pide `username` | AP-10 | FR-026 |
| B-07 | `TypeError` / recursión infinita ante grafos defectuosos; error original perdido en auditoría | AP-08, blueprint §11.4, N-07, N-09 | FR-027 |
| B-08 | Nueva versión = origen + 1 (colisión de unicidad) | blueprint §11.3 | FR-028 |
| B-09 | Mass assignment de `id`/`version`/fechas | AP-03 | FR-029 |
| B-10 | `order` dentro de `include` ignorado | AP-15 | FR-030 |
| B-11 | `|| null` convierte falsy válidos | AP-14 | FR-031 |
| B-12 | Estado `RUNNING` en respuesta de instancia completada | N-02 | FR-032 |
| B-13 | `status` arbitrario persistido en PATCH | N-13 | FR-033 |
| B-14 | Vulnerabilidades con corrección dentro de la mayor | `npm audit` | FR-034 |

### 5.3 Categoría C — Fuera de alcance (features sucesoras propuestas)

| ID | Deuda | Riesgo | Impacto frontend | Feature sucesora propuesta |
|---|---|---|---|---|
| C-01 | `expr-eval` con vulnerabilidades críticas (EXC-01) | **Crítico** | Ninguno si se conserva la sintaxis | `00x-expression-engine-replacement`: evaluador propio o alternativa mantenida, con la suite de expresiones de esta feature como red de seguridad |
| C-02 | Diseño de procesos y escritura de instancias sin `isAdmin` (EXC-05) | Alto | Ocultar acciones a no admin | `00x-process-design-authorization` |
| C-03 | Sin control de acceso por registro en instancias/tareas; activaciones concurrentes (N-11) | Alto | Filtrado de listas | `00x-record-level-access` (+ índice único parcial de ACTIVE por key) |
| C-04 | Sin FKs de dominio; borrados sin dependientes; huérfanos; `decision_logs` NOT NULL vs SET NULL (EXC-03, EXC-04) | Alto | Mensajes 409 al borrar | `00x-referential-integrity` (migración de limpieza + FKs) |
| C-05 | Permisos y `systemRole` del token (8 h); `users.status` no verificado; sin límite de login | Alto | Ninguno | `00x-auth-hardening` |
| C-06 | Semántica del motor: `AUTO_TASK`, modelo de tokens (`END_EVENT` con ramas pendientes), join frágil, primer paso de decisión sin evaluar gateway | Alto | Posibles cambios en flujos | `00x-engine-token-model` |
| C-07 | `formFields`, `actions`, `webhook_target`, `sla_definition` enviados por el modelador y descartados; columnas `actions`/`case_assignment_config` fuera del modelo (EXC-10, N-04) | Medio | Habilita funciones ya construidas en UI | `00x-element-forms-and-actions` |
| C-08 | `GET /api/fields` inexistente (LIBFORM) | Medio | Arregla el 404 actual | `00x-field-library-api` |
| C-09 | `cors()` abierto; configuración productiva (EXC-08) | Medio | Ninguno | Junto con la salida de fase |
| C-10 | `PUT /process-instances/:id` devuelve `[n]`; `DELETE /users/:id` inexistente 204; sin paginación | Bajo | Ninguno hoy | `00x-api-contract-cleanup` |
| C-11 | Activar una versión no depreca la anterior (README dice que sí) | Bajo | Flujo de activación | Decisión de producto (blueprint §14) |
| C-12 | Herramienta de migraciones (TODO MIGRATIONS_TOOL) | Medio | Ninguno | `00x-migrations-tooling` (esta feature solo crea la línea base SQL) |
| C-13 | Express 5 / Sequelize 7 / vulnerabilidad alta de sequelize sin parche en v6 | Medio | Ninguno | Actualización de mayores |

---

## 6. Patrones objetivo (afines al enfoque funcional actual)

El código ya es funcional en lo esencial: módulos que exportan funciones, sin clases de servicio, composición de middlewares y un *higher-order function* (`catchAsync`). La migración lo profundiza sin introducir paradigmas ajenos.

### 6.1 Núcleo funcional, cáscara imperativa en el motor

Hoy `processElement` mezcla recorrido del grafo, consultas y escrituras. Propuesta: separar un **núcleo puro** que, dado el grafo y el contexto, devuelve las decisiones; y una **cáscara** que carga datos y aplica efectos dentro de la transacción. Ambos motores comparten el núcleo, y la paridad pasa a ser estructural.

```ts
// engine/graph.ts — puro
export interface ProcessGraph {
  readonly elements: ReadonlyMap<string, ElementNode>;          // por bpmnElementId
  readonly outgoing: ReadonlyMap<string, readonly SequenceEdge[]>;
  readonly incoming: ReadonlyMap<string, readonly SequenceEdge[]>;
}

export type EngineEffect =
  | { readonly kind: 'CREATE_TASK'; readonly element: ElementNode }
  | { readonly kind: 'COMPLETE_INSTANCE' };

// engine/semantics.ts — el compilador exige cubrir cada tipo en ambos modos
export const NODE_SEMANTICS = {
  START_EVENT:       { execution: followAll,       decision: followAll },
  PARALLEL_GATEWAY:  { execution: followAll,       decision: followAll },
  EXCLUSIVE_GATEWAY: { execution: chooseExclusive, decision: chooseExclusive },
  USER_TASK:         { execution: createTask,      decision: block },
  END_EVENT:         { execution: completeInstance, decision: block },
  AUTO_TASK:         { execution: unsupported,     decision: block }, // diferencia vigente (FR-007)
} as const satisfies Record<ElementType, NodeSemantics>;
```

Recomendación de secuencia en el plan: primero un **port 1:1** con la suite de caracterización en verde; después la extracción del núcleo, bajo las mismas pruebas.

### 6.2 Tipos de dominio como uniones literales, no `enum`

```ts
export const PROCESS_DEFINITION_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE', 'DEPRECATED'] as const;
export type ProcessDefinitionStatus = (typeof PROCESS_DEFINITION_STATUS)[number];
```

Sin `enum` de TypeScript (no son borrables y generan código). Exhaustividad con `switch` + `assertNever` o con `satisfies Record<Union, …>`.

### 6.3 Errores como datos: `AppError` + catálogo de códigos

```ts
export type ErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'INVALID_CREDENTIALS'
  | 'INVALID_OLD_PASSWORD' | 'PROCESS_MODEL_ERROR';
export class AppError extends Error {
  constructor(readonly statusCode: 400 | 401 | 403 | 404 | 409 | 422, message: string,
              readonly code?: ErrorCode, readonly details?: unknown) { super(message); }
}
export const notFound = (msg: string) => new AppError(404, msg, 'NOT_FOUND');
```

`AppError` es la única clase de la capa de aplicación (necesaria para `instanceof` y stack). El middleware central traduce además `UniqueConstraintError`/`ForeignKeyConstraintError` → 409, `SyntaxError` de body-parser → 400, y lo demás → 500 genérico, registrando método, ruta y `userId`.

### 6.4 Handlers tipados y `req.user` sin hash

```ts
export const catchAsync = <P, ResB, ReqB>(fn: (req: Request<P, ResB, ReqB>, res: Response<ResB>) => Promise<unknown>): RequestHandler<P, ResB, ReqB> =>
  (req, res, next) => { fn(req, res).catch(next); };

declare global { namespace Express { interface User extends AuthUser {} } }
export interface AuthUser { id: number; fullName: string; email: string; status: string; systemRole: SystemRole; roleIds: number[]; }
```

### 6.5 Mappers puros y listas blancas

- Una función pura por forma de respuesta (`toInboxItem`, `toProcessDefinitionDetail`, `toFormField`, `toInstanceDetail`), sin mutar entidades. Las pruebas de la §2 garantizan el mismo JSON.
- `pick(obj, keys)` tipado para listas blancas (FR-029): los `keys` se derivan de los atributos de creación del modelo, de modo que añadir una columna obliga a decidir si es asignable.

### 6.6 Modelos Sequelize tipados

Sequelize 6 solo tipa bien con `class X extends Model<InferAttributes<X>, InferCreationAttributes<X>>` + `X.init(...)`. Es una excepción aceptada al estilo funcional: los modelos quedan como **declaraciones de datos sin lógica**. Mismos `tableName`, `field`, `timestamps`, índices y alias de asociaciones. No usar `sequelize-typescript` (librería no aprobada).

### 6.7 Configuración inmutable y validada

Un solo módulo `config` que lee `config` + entorno, valida obligatorios al arrancar y exporta un objeto `Readonly`. Nadie más lee `process.env`.

### 6.8 Transacción explícita

Toda función de servicio que participe de una transacción recibe `t: Transaction` como parámetro obligatorio (no opcional), lo que hace que el compilador detecte la consulta que olvida pasarla (AP-06).

### 6.9 Reglas de lint que codifican la constitution

`no-explicit-any`, `no-floating-promises`, `no-misused-promises`, `consistent-type-imports`, `eqeqeq`, `no-console`, `prefer-nullish-coalescing`, `switch-exhaustiveness-check`, `import/no-cycle`, y restricción de imports por capa (controllers no importan modelos).

---

## 7. Estructura objetivo

```text
src/
├── app.ts                      # Express sin listen (testeable)
├── server.ts                   # authenticate() + listen; precedencia PORT → --port → 3000
├── api/
│   ├── routes.ts
│   ├── middlewares/            auth · admin · error · validate
│   └── <modulo>/               <x>.routes.ts · <x>.controller.ts · <x>.service.ts · <x>.schemas.ts · <x>.mappers.ts
├── engine/  (o api/engine/)    graph.ts · semantics.ts · context.ts · execution.service.ts · decision.service.ts
├── domain/                     constants.ts (estados, tipos de nodo) · types.ts (DTOs) · errors.ts (AppError)
├── config/                     index.ts · database.ts · passport.ts · *.json
├── models/                     <entidad>.model.ts · index.ts (asociaciones)
└── utils/                      catchAsync.ts · expressionEngine.ts · logger.ts · pick.ts
db/migrations/000_baseline.sql  # solo documenta el esquema vigente
tests/                          contract/ · engine/ · unit/ · fixtures/
```

La ubicación de `engine/` y de `domain/` se decide en el plan; la constitution enmendada debe reflejarla (Principio I).

---

## 8. Riesgos de la migración

| Riesgo | Mitigación |
|---|---|
| Diferencias de serialización al pasar de instancias Sequelize a DTOs (p. ej. perder `UserRole` anidado) | Pruebas de contrato de la §2 grabadas antes de tocar código. |
| `NODE_CONFIG_DIR` y `public/` resueltos relativo a `src/` | `dist/` con la misma profundidad que `src/`; `config/*.json` copiados o leídos desde una ruta fija; prueba de arranque del build. |
| `parseInt` acepta `"12abc"` como 12 | La validación de ids conserva la semántica de `parseInt` (FR-023); solo se rechaza lo que hoy da `NaN`. |
| `expr-eval` y su operador de igualdad (`==`) o variables ausentes | Versión fijada exacta `2.0.2`; suite con todas las expresiones de la base. |
| Comportamiento de `Promise.all` vs. secuencial en el fork | Igual resultado final; pruebas de escenarios con varias ramas. |
| Base de pruebas distinta de la real | Esquema extraído de la base de demo (`pg_dump --schema-only`); fixtures mínimos propios. |
| Integración "big bang" (FR-002) | Rama de feature con conversión de hojas a raíz (utils → config → models → middlewares → services → controllers/routes → app/server) y la suite en verde en cada paso. |

---

## 9. Decisiones que debe cerrar `/speckit-plan`

1. **Validación**: `express-validator` (aprobada) vs. una biblioteca de esquemas que derive tipos (requiere incluirla en la enmienda FR-001). Recomendación: biblioteca de esquemas, porque elimina la duplicación entre validación y tipos de DTO.
2. **Herramientas**: ejecución en desarrollo (p. ej. `tsx`), pruebas (p. ej. `ts-jest` o `@swc/jest`), lint (`typescript-eslint` + Prettier).
3. **Formato de módulos**: mantener CommonJS en la salida (recomendado: conserva el orden de carga `dotenv` → `config` y evita cambios en `config`/jest).
4. **Base de pruebas**: Postgres en Docker con el esquema de línea base (recomendado) frente a alternativas en memoria (no soportan JSONB completo).
5. **Profundidad del refactor del motor** (§6.1): port 1:1 + extracción del núcleo dentro de esta feature (recomendado) o extracción en feature aparte.
6. **Ubicación de `engine/` y `domain/`** y redacción de la enmienda del Principio I.
