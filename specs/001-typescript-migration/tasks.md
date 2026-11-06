---

description: "Lista de tareas de la migración del backend a TypeScript"
---

# Tasks: Migración del backend a TypeScript con equivalencia funcional y saneamiento de deuda

**Input**: Documentos de diseño de `specs/001-typescript-migration/`: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [analysis.md](./analysis.md)

**Prerequisites**: constitución v2.0.0 aprobada (FR-001) · plan con Constitution Check en PASS

**Tests**: **Incluidas.** La spec las exige: línea base de caracterización (FR-003, FR-004), SC-010 y el
Principio VII. Las pruebas de cada historia se escriben **antes** que su implementación y deben fallar
primero, salvo los casos `frozen`, que se graban contra el código JS.

**Organization**: tareas agrupadas por historia de usuario y, dentro de cada fase, en **oleadas
paralelas**. Las tareas de una misma oleada marcadas `[P]` tocan archivos distintos y no dependen entre
sí, así que se pueden lanzar a la vez.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Se puede ejecutar en paralelo con las demás `[P]` de su oleada (archivos distintos, sin
  dependencias pendientes).
- **[Story]**: Historia a la que pertenece (US1…US6).
- Rutas relativas a la raíz del repositorio `my-bpm-back-express/`.

## Path Conventions

Proyecto único: `src/`, `tests/`, `db/` en la raíz. Estructura destino en [plan.md](./plan.md#source-code-repository-root).

## Reglas transversales (aplican a TODAS las tareas)

- **R-A · Equivalencia.** Ninguna tarea cambia una respuesta de camino correcto, salvo las
  correcciones B (FR-020…FR-034) asignadas explícitamente. Si una prueba `frozen` falla, la tarea no
  está terminada.
- **R-B · Principio X.** Prohibidos `any`, `enum` y `@ts-ignore`. Los `as` y `!` solo con un comentario
  que explique la invariante. Los JSONB se tipan como `JsonValue`/`unknown`.
- **R-C · Principio VIII.** Prohibido `console.*`. Los logs nunca incluyen contraseñas, tokens,
  hashes, `businessData` ni el contexto de evaluación.
- **R-D · AP-18.** Prohibidos los comentarios de bitácora ("CAMBIO QUIRÚRGICO", "MODIFICADO",
  "Corregido"). Al portar un archivo, se eliminan los existentes.
- **R-E · Constitución.** Los imports van al inicio del archivo (AP-09). Los controllers no importan
  `models`, `sequelize` ni `bcryptjs`. `src/domain/**` no importa nada de `src/`.
- **R-F · Base compartida.** Ninguna tarea ejecuta escrituras contra la base de demo. Las únicas
  lecturas permitidas son las de T006, T007 y T008.
- **R-G · Portar.** Portar un archivo significa crear el `.ts`, borrar el `.js` equivalente en la misma
  tarea y conservar la lógica línea por línea, salvo que la tarea diga otra cosa.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Herramientas, base de pruebas y artefactos de línea base **sin tocar el código de
aplicación**.

### Oleada 1.1 (secuencial)

- [X] T001 Crear la rama `001-typescript-migration` desde `main` en el repositorio `my-bpm-back-express` y commitear en ella la constitución 2.0.0 (`.specify/memory/constitution.md`) y `specs/001-typescript-migration/`.
- [X] T002 Actualizar `package.json` (solo altas y scripts nuevos; **no** cambiar todavía `start:dev`/`start:prod`):
  - `dependencies`: añadir `zod@^4.6`; fijar `"expr-eval": "2.0.2"` sin `^` (FR-042).
  - `devDependencies`: `typescript@~5.9.2`, `tsx@^4.23`, `ts-jest@^29.4`, `@types/jest@^29.5`, `@types/express@^4.17`, `@types/passport`, `@types/passport-jwt`, `@types/jsonwebtoken`, `@types/bcryptjs@^2.4`, `@types/cors`, `@types/config`, `@types/supertest`, `eslint@^9.39`, `typescript-eslint@^8.72`, `eslint-plugin-import-x@^4.17`, `eslint-config-prettier@^10.1`, `prettier@^3.9`, `cross-env@^10.1` (research R-17).
  - Scripts nuevos: `build`, `typecheck`, `lint`, `format`, `test:baseline`, `db:test:up` y `db:test:down`, según [contracts/runtime.md](./contracts/runtime.md).
  - Ejecutar `npm install` y commitear `package-lock.json`.

### Oleada 1.2 (todas en paralelo, tras T002)

- [X] T003 [P] Crear `tsconfig.json` (src + tests, `noEmit`) y `tsconfig.build.json` (solo `src`, `outDir: dist`, `rootDir: src`):
  - `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes: false`.
  - `target: ES2022`, `module: node16`, `moduleResolution: node16`.
  - `esModuleInterop`, `resolveJsonModule`, `sourceMap`.
  - Excluir `src/**/*.js` mientras dure la convivencia (research R-02).
- [X] T004 [P] Crear `eslint.config.mjs` (configuración plana: `typescript-eslint` `strictTypeChecked`, `import-x`, `eslint-config-prettier`), con las reglas de research R-06:
  - `no-explicit-any`, `no-unsafe-*`, `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`, `prefer-nullish-coalescing`, `consistent-type-imports`.
  - `ban-ts-comment` con `ts-expect-error: allow-with-description`.
  - `no-restricted-syntax` sobre `TSEnumDeclaration`, `no-console`, `eqeqeq`, `import-x/no-cycle`.
  - `no-restricted-imports` por glob de capa (`**/*.controller.ts` no importa `models`/`sequelize`/`bcryptjs`; `src/domain/**` no importa `src/`; `src/api/engine/{graph,semantics,context}.ts` no importa `models`/`sequelize`).
  - Ignorar `dist/` y `src/**/*.js`.
  - Crear también `.prettierrc` (2 espacios, comillas simples, punto y coma, `printWidth` 100) y `.prettierignore`.
- [X] T005 [P] Crear `jest.config.js` (CommonJS: un `jest.config.ts` exigiría `ts-node`):
  - Proyectos `unit` (`tests/unit/**/*.test.ts`), `contract` (`tests/contract/**/*.test.ts`) y `engine` (`tests/engine/**/*.test.ts`).
  - Transformador `ts-jest` con `isolatedModules: true`.
  - `globalSetup`/`globalTeardown` en `tests/setup/` para `contract` y `engine`; `snapshotSerializers` con `tests/setup/normalize.ts`; `testTimeout` 30000 (research R-05, R-08).
- [X] T006 [P] Ejecutar en solo lectura `SHOW server_version` contra la base de demo (`DATABASE_URL` de `.env`, sin imprimir la URL). Con esa versión, crear `docker-compose.test.yml`:
  - Servicio `postgres-test` con imagen `postgres:<misma mayor>` y puerto local `55432`.
  - Base, usuario y clave **de prueba**, explícitos en el compose (no son secretos).
  - `healthcheck` con `pg_isready`.
  - Volumen efímero (research R-07).
- [X] T007 [P] Generar `db/migrations/000_baseline.sql` con `pg_dump --schema-only --no-owner --no-privileges` contra la base de demo (solo lectura):
  - Hacerlo idempotente con `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`.
  - Añadir una cabecera que diga "solo documentación y base de pruebas; MUST NOT aplicarse a la base de demo".
  - Añadir la sección de rollback comentada (`DROP TABLE … CASCADE` en orden inverso).
  - Verificar que incluye `process_elements.actions`, `process_elements.case_assignment_config`, las 3 FKs reales y el CHECK de `users.system_role` ([data-model.md §1](./data-model.md)).
- [X] T008 [P] Extraer en solo lectura `SELECT DISTINCT condition_expression FROM process_sequences WHERE condition_expression IS NOT NULL` y crear `tests/fixtures/expressions.json` con pares `{ expression, context, label }`:
  - Para cada expresión, como mínimo: valor por encima y por debajo del umbral, acción en mayúsculas y en minúsculas, variable ausente y contexto vacío.
  - Añadir los casos sintéticos `""` y `null` (expresión vacía → `false`) (research R-08).
- [X] T009 [P] Añadir `dist/` y `coverage/` a `.gitignore`. Borrar `src/index.ts` (resto de plantilla, A-01).

**Checkpoint**: `npm run typecheck` y `npm run lint` se ejecutan (aún sin archivos TS de aplicación);
`npm run db:test:up` deja el contenedor `healthy`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: (A) el arnés de caracterización y la **línea base grabada sobre el código JS**, y (B) los
módulos TS hoja de los que dependen todas las historias. Los bloques A y B tocan archivos distintos y
avanzan **en paralelo**.

**⚠️ CRITICAL**: ninguna tarea de US1 en adelante empieza hasta que **T026** (línea base commiteada)
esté hecha.

### Oleada 2.1 (bloques A y B en paralelo)

**Bloque A: arnés**

- [ ] T010 [P] Crear `tests/setup/global-setup.ts` y `tests/setup/global-teardown.ts`:
  - Leer `TEST_DATABASE_URL` (por defecto, el Postgres de `docker-compose.test.yml`).
  - **Abortar** si coincide con `DATABASE_URL` (R-F, research R-07).
  - Aplicar `db/migrations/000_baseline.sql` con `pg`.
- [ ] T011 [P] Crear `tests/fixtures/seed.sql` determinista:
  - Usuarios: 1 `ADMIN` y 2 `USER` con contraseñas conocidas (hash bcrypt de 10 rondas precalculado), `UserRole` asignados y `system_role_modules` de ambos roles.
  - 2 roles y `field_definitions` con `validations`.
  - Definiciones de proceso para los escenarios de research R-08:
    - `LINEAR` (start → user task → end).
    - `EXCLUSIVE` (gateway con condición `purchaseAmount > 1000` y ruta por defecto).
    - `PARALLEL` (fork → 2 tareas → join → tarea → end).
    - `END_AT_START` (start → end).
    - `AUTO` (contiene `AUTO_TASK`).
    - Versiones `DRAFT`, `ACTIVE` e `INACTIVE` de una misma key.
  - `element_form_links` con `contextualValidations`.
  - Una instancia con `businessData` que contenga `0`, `false` y `""` (para FR-031).
- [ ] T012 [P] Crear `tests/setup/db.ts` con `resetDatabase()`: `TRUNCATE … RESTART IDENTITY CASCADE` de las 14 tablas y carga de `tests/fixtures/seed.sql`; y `loadSql(path)` para fixtures extra.
- [ ] T013 [P] Crear `tests/setup/server-harness.ts`:
  - `startServer()` lanza un proceso hijo según `CHARACTERIZATION_TARGET`: `js` → `node src/app.js`; `ts` (por defecto) → `node dist/server.js`.
  - Usa un `PORT` libre, `DATABASE_URL=TEST_DATABASE_URL` y un `JWT_SECRET` de prueba fijo.
  - Espera a "Server is running" y devuelve `baseUrl`; `stopServer()`.
- [ ] T014 [P] Crear `tests/setup/normalize.ts` (serializador de snapshots: ids renumerados por orden de aparición, fechas ISO → `<date>`, `token` → `<jwt>`, orden de claves ignorado y de arrays respetado) y `tests/setup/http.ts`:
  - `loginAs(role)` devuelve el token.
  - `expectFrozen(res)`: snapshot de estado + cuerpo.
  - `expectFrozenError(res)`: snapshot de estado + `message` y comprobación de que no falta ninguna clave del snapshot (research R-12).

**Bloque B: módulos TS hoja (nuevos archivos; el código JS no los usa todavía)**

- [ ] T015 [P] Crear `src/domain/constants.ts` con tuplas `as const` y uniones derivadas ([data-model.md §2](./data-model.md)):
  - `PROCESS_DEFINITION_STATUS` = "`DRAFT`, `ACTIVE`, `INACTIVE`, `DEPRECATED`".
  - `PROCESS_INSTANCE_STATUS` = "`RUNNING`, `COMPLETED`".
  - `TASK_STATUS` = "`PENDING`, `COMPLETED`".
  - `ELEMENT_TYPE` = "`START_EVENT`, `USER_TASK`, `EXCLUSIVE_GATEWAY`, `PARALLEL_GATEWAY`, `END_EVENT`, `AUTO_TASK`".
  - `SYSTEM_ROLE` = "`ADMIN`, `USER`".
  - `USER_STATUS` = "`ACTIVE`"; `SAVE_ACTION` = "`UPDATE_IN_PLACE`, `CREATE_NEW_VERSION`"; `DOCUMENT_STATUS` = "`ACTIVE`".
  - Guardas `isElementType(value)` e `isProcessDefinitionStatus(value)`.
- [ ] T016 [P] Crear `src/domain/types.ts` con `JsonPrimitive`, `JsonValue`, `JsonObject` y `BusinessData = JsonObject`, y `AuthUser` = `{ id: number; fullName: string; email: string; status: string; createdAt: Date; systemRole: SystemRole; roleIds?: number[] }` (**sin `passwordHash`**, [data-model.md §4](./data-model.md)).
- [ ] T017 [P] Crear `src/domain/errors.ts`:
  - `AppError extends Error` con `statusCode: 400 | 401 | 403 | 404 | 409 | 422`, `code: ErrorCode`, `details?: unknown` y `legacyErrorKey?: boolean`.
  - `ErrorCode` = `VALIDATION_ERROR | MALFORMED_JSON | INVALID_CREDENTIALS | INVALID_OLD_PASSWORD | MISSING_AUTH_DATA | FORBIDDEN | NOT_FOUND | CONFLICT | ACTIVE_VERSION_CONFLICT | PROCESS_MODEL_ERROR`.
  - Funciones `validation()`, `invalidCredentials()`, `notFound()`, `conflict()`, `activeVersionConflict()`, `forbidden()`, `missingAuthData()`, `invalidOldPassword()`, `modelError()` ([data-model.md §5](./data-model.md)).
- [ ] T018 [P] Crear `src/utils/catchAsync.ts` tipado (genéricos `P`, `ResB`, `ReqB`), equivalente a `src/utils/catchAsync.js` (no borrar el `.js` todavía: lo usa el código JS).
- [ ] T019 [P] Crear `src/utils/pick.ts`:
  - `pick<T, K extends keyof T>(obj, keys: readonly K[])`: solo copia claves presentes y no `undefined`, para conservar la semántica de `set`/`create` de Sequelize.
  - `attrs<M extends Model>()(...keys: (keyof Attributes<M>)[])`: proyecciones `attributes` verificadas por el compilador (US2-3).
- [ ] T020 [P] Crear `src/utils/logger.ts` como único logger winston (research R-14):
  - Consola `colorize` + `simple`, nivel `debug` (no producción) o `info` (producción).
  - `File error.log` (nivel `error`, JSON) y `File combined.log` (nivel `info`, JSON).
  - Leer el nivel desde el `NODE_ENV` que fija `src/config/env.ts`.
- [ ] T021 [P] Crear `src/types/express.d.ts` (*module augmentation*: `Express.User extends AuthUser`). Verificar que `node_modules/expr-eval/parser.d.ts` tipa `Parser#evaluate(expr: string, values?: object)`; si no lo hace, crear `src/types/expr-eval.d.ts` mínimo.
- [ ] T022 [P] Crear `src/config/env.ts` (research R-03): `dotenv.config()` y `process.env.NODE_CONFIG_DIR ??= path.resolve(__dirname, '../../src/config')`. Sin exports de valor y sin otros imports.
- [ ] T023 [P] Crear `tests/unit/foundation.test.ts`: `pick` (omite `undefined` y claves no listadas), `AppError` y sus funciones (estado y `code`), `catchAsync` (propaga el rechazo a `next`), guardas de `constants`.

### Oleada 2.2 (suites de caracterización en paralelo, tras T010–T014)

Cada suite cubre los caminos correctos con `expectFrozen` y los errores con `expectFrozenError`
(ambos sirven para la línea base). Las formas a congelar están en [analysis.md §2](./analysis.md) y
[contracts/http-api.md](./contracts/http-api.md).

- [ ] T024 [P] Crear las suites de contrato:

  | Archivo | Endpoints |
  |---|---|
  | `tests/contract/auth.contract.test.ts` | Login correcto (`user.roles[].UserRole` anidado, `modules[]`) e incorrecto; `PUT /auth/profile` (datos, cambio de contraseña, falta `oldPassword` 400, `oldPassword` errónea) |
  | `tests/contract/users.contract.test.ts` | Los 5 endpoints `/users` (roles con y sin `UserRole`), 404 de `GET /:id` y `DELETE` inexistente 204 |
  | `tests/contract/roles.contract.test.ts` | Los 5 endpoints `/roles`, 404 y 409 de borrado con usuarios |
  | `tests/contract/processes.contract.test.ts` | Los 9 endpoints `/processes`: guardado en sitio y con nueva versión, `bpmnXml` string en POST/PUT/PATCH, listas sin `bpmnXml`, detalle con `diagramJson`, `save-ask`, `start-form`, `DELETE` 204 |
  | `tests/contract/process-instances.contract.test.ts` | Los 6 endpoints, incluidos `/record` y `PUT` → `[n]` |
  | `tests/contract/tasks.contract.test.ts` | `my-tasks` (9 campos y valores por defecto), formulario y completar |
  | `tests/contract/engine.contract.test.ts` | `decide-next-task` (camino correcto y 400 `{ error }`) y `decision-logs` (se graba el 500 actual como evidencia del "hoy") |
  | `tests/contract/platform.contract.test.ts` | `GET /`, ruta inexistente, 401 `Unauthorized` de passport, 403 de `isAdmin` y JSON malformado (500 actual) |

- [ ] T025 [P] Crear las suites del motor y de expresiones:
  - `tests/engine/execution.scenarios.test.ts`: escenarios `LINEAR`, `EXCLUSIVE` (condición y ruta por defecto), `PARALLEL` (completando las ramas en los dos órdenes) y `END_AT_START`. Comparar tareas creadas, estados, `businessData` y estado final vía `GET /process-instances/:id`.
  - `tests/engine/decision.scenarios.test.ts`: `decide-next-task` desde inicio, desde una tarea y desde un gateway, y `AUTO_TASK` como bloqueante.
  - `tests/unit/expressionEngine.test.ts`: evalúa `tests/fixtures/expressions.json` con `src/utils/expressionEngine` (resuelve `.js` o `.ts` según exista) y graba los resultados por snapshot.

### Oleada 2.3 (secuencial)

- [ ] T026 Grabar la línea base **sobre el código JS sin modificar**:
  1. `npm run db:test:up`.
  2. `npm run test:baseline` (`CHARACTERIZATION_TARGET=js`, `jest -u --selectProjects contract engine unit`).
  3. Revisar a mano que los snapshots no contengan secretos ni hashes.
  4. Commitear `tests/**/__snapshots__/` con el mensaje "test: línea base de caracterización sobre JS".

  Desde este commit, los snapshots **solo** se actualizan en las tareas B que lo indiquen.

**Checkpoint**: línea base versionada y módulos hoja TS listos. Pueden empezar US1 y la preparación de
pruebas de las demás historias.

---

## Phase 3: User Story 1 - El sistema se comporta exactamente igual tras la migración (Priority: P1) 🎯 MVP

**Goal**: todo `src/` en TypeScript con port 1:1: cero `.js`, misma lógica y mismas respuestas
(FR-002, FR-005…FR-010).

**Independent Test**: `npm run build && npm test` con `CHARACTERIZATION_TARGET=ts`. Todos los casos
`frozen` y la batería de expresiones coinciden con la línea base de T026. Un token emitido por la
versión JS sigue siendo aceptado (US1-4).

### Oleada 3.1

- [ ] T027 [US1] Crear `src/config/index.ts` (primer import: `./env`) con el mismo contenido que hoy (`App`, `db.databaseUrl`), **más** `jwt.secret` leído de `JWT_SECRET` vía `custom-environment-variables.json` (EXC-12; todavía sin validar). Crear también `src/config/database.ts` (mismo `new Sequelize(url, { dialect: 'postgres', logging: false })`, sin el import de logger sin uso). Escribir `{}` en `src/config/production.json`. Borrar `src/config/index.js` y `src/config/database.js`.

### Oleada 3.2 (modelos en paralelo, tras T027)

Restricciones citadas literalmente de [data-model.md §3](./data-model.md). Mismo `tableName`, `field`,
`timestamps`, `indexes` y `unique` que el `.js` (research R-16).

- [ ] T028 [P] [US1] Portar los modelos de seguridad a `src/models/{user,role,userRole,system-role-module}.model.ts`:
  - `User`: "`id: CO<number>`, `fullName: string`, `email: string`, `passwordHash: string`, `status: CO<string>`, `systemRole: CO<SystemRole>`, `createdAt: CO<Date>`".
  - `Role`: "`id: CO<number>`, `name: string`, `description: string`".
  - `UserRole`: "`userId: number`, `roleId: number`, `created_at: CO<Date>`" con "`timestamps: true` (`createdAt: 'created_at'`, `updatedAt: false`)".
  - `SystemRoleModule`: "`id: CO<number>`, `systemRole: SystemRole`, `moduleName: string`".
- [ ] T029 [P] [US1] Portar los modelos de definición a `src/models/{process-definition,process-element,process-sequence,field-definition,element-form-link}.model.ts`:
  - `ProcessDefinition`: "`id: CO<number>`, `businessProcessKey: string`, `name: string`, `description: string?`, `version: number`, `category: string?`, `status: CO<ProcessDefinitionStatus>`, `bpmnProcessId: string`, `bpmnXml: string?`, `createdAt: CO<Date>`" con UNIQUE(`businessProcessKey`, `version`).
  - `ProcessElement`: "`id: CO<number>`, `processDefId: number`, `bpmnElementId: string`, `name: string?`, `description: string?`, `type: ElementType`, `assignedRoleId: number?`, `webhookTarget: string?`, `slaDefinition: JsonValue?`" (**sin** `actions` ni `case_assignment_config`, EXC-10).
  - `ProcessSequence`: "`id: CO<number>`, `processDefId: number`, `sourceElementBpmnId: string`, `targetElementBpmnId: string`, `conditionExpression: string?`".
  - `FieldDefinition`: "`id: CO<number>`, `name: string`, `label: string`, `fieldType: string`, `validations: JsonObject?`".
  - `ElementFormLink`: "`id: CO<number>`, `elementId: number`, `fieldDefId: number`, `displayOrder: number`, `isRequired: CO<boolean>`, `isReadonly: CO<boolean>`, `contextualValidations: JsonObject?`".
- [ ] T030 [P] [US1] Portar los modelos de ejecución a `src/models/{process-instance,task-instance,document-instance,case-assignment,decision-log}.model.ts`:
  - `ProcessInstance`: "`id: CO<number>`, `processDefId: number`, `description: string?`, `status: ProcessInstanceStatus`, `businessData: BusinessData?`, `startedByUserId: number`, `startTime: CO<Date>`, `endTime: Date?`".
  - `TaskInstance`: "`id: CO<number>`, `processInstanceId: number`, `elementDefId: number`, `status: TaskStatus`, `comments: string?`, `assignedToRoleId: number?`, `assignedToUserId: number?`, `dueDate: Date?`, `createdAt: CO<Date>`, `completedByUserId: number?`, `completionTime: Date?`, `completionPayload: JsonValue?`".
  - `DocumentInstance` y `CaseAssignment`: tal como están hoy.
  - `DecisionLog`: "`id: CO<number>`, `businessProcessKey: string`, `currentBpmnElementId: string`, `requestPayload: JsonValue`, `responsePayload: JsonValue?`, `errorMessage: string?`, `executedByUserId: number`, `createdAt: CO<Date>`".
- [ ] T031 [P] [US1] Portar `src/utils/expressionEngine.ts`. Mantener sin cambios `if (!expression) return false`, `!!new Parser().evaluate(expression, context)` y `catch → false`. Sustituir los `console.*` por `logger.debug` (expresión y resultado) y `logger.warn` (expresión y mensaje de error), **sin** el contexto (R-C). Borrar `src/utils/expressionEngine.js`, `src/utils/catchAsync.js` y `src/utils/logger.js` (sustituidos por T018 y T020).

### Oleada 3.3 (tras T028–T030)

- [ ] T032 [US1] Crear `src/models/index.ts` con las 30 asociaciones de `src/models/index.js`, idénticas (`foreignKey`, `as`, `onDelete`, `through`, `otherKey`), y la exportación nombrada de los 14 modelos y `sequelize`. Declarar en cada clase sus asociaciones `NonAttribute`. Borrar los 15 `.js` de `src/models/`.

### Oleada 3.4 (todas en paralelo, tras T032)

- [ ] T033 [P] [US1] Portar `src/config/passport.ts`. La estrategia construye `AuthUser` desde `user.get({ plain: true })` **descartando `passwordHash`** (FR-010) y añade `roleIds` y `systemRole` del payload (prevalecen, como hoy). `secretOrKey` se lee de `config.jwt.secret`. Borrar `src/config/passport.js`.
- [ ] T034 [P] [US1] Portar `src/api/middlewares/auth.middleware.ts` y `admin.middleware.ts` 1:1 (403 `{ message: 'Forbidden: Requires admin privileges.' }` respondido directamente). Borrar los `.js`.
- [ ] T035 [P] [US1] Portar `src/api/middlewares/error.middleware.ts` 1:1 (sigue respondiendo 500 `Something broke!` en texto). Usa el logger único de T020 en vez de crear su propio winston. Borrar el `.js`.
- [ ] T036 [P] [US1] Portar el módulo auth a `src/api/auth/auth.{routes,controller,service}.ts`, conservando el `try/catch` de `updateProfile` y los `statusCode` actuales. El secreto JWT sale de `config.jwt.secret` (EXC-12). Borrar los `.js`.
- [ ] T037 [P] [US1] Portar el módulo users a `src/api/users/user.{routes,controller,service}.ts` 1:1, incluidos el hash en el controller y su `try/catch` (se corrigen en US2 y US3). Borrar los `.js`.
- [ ] T038 [P] [US1] Portar el módulo roles a `src/api/roles/role.{routes,controller,service}.ts` 1:1. Borrar los `.js`.
- [ ] T039 [P] [US1] Portar el módulo processes a `src/api/processes/{processes.routes,process.controller,process.service}.ts` 1:1, incluidos `syncElements` y `syncSequences` y el bloque DEPRECATED inalcanzable (se elimina en US3). Borrar los `.js`.
- [ ] T040 [P] [US1] Portar el módulo process-instances a `src/api/process-instances/{processInstances.routes,processInstance.controller,processInstance.service}.ts` 1:1. Borrar los `.js`.
- [ ] T041 [P] [US1] Portar el módulo tasks a `src/api/tasks/{tasks.routes,task.controller,task.service}.ts` 1:1 (incluido el `|| null` que se corrige en US3). Borrar los `.js`.
- [ ] T042 [P] [US1] Portar el motor a `src/api/engine/{processEngine.service,decision.service,decision.controller,decision.routes}.ts` 1:1, con `Promise.all` y el `count` muerto incluidos (se corrigen en US2 y US4). Los 11 `console.*` pasan a `logger.debug`/`info` **solo con identificadores**: instancia, tarea, `bpmnElementId`, key (R-C). Los `require` perezosos de `decision.service.js:33,130,167` pasan a imports al inicio (AP-09). Borrar los `.js`.

### Oleada 3.5 (tras T033–T042)

- [ ] T043 [US1] Crear `src/api/routes.ts` (mismo montaje que `routes.js`); `src/app.ts` (mismo orden de middlewares que `app.js`: `express.json`, `helmet`, `cors`, `static(public)`, `rateLimit` 100/15 min, `passport.initialize`, `/api`, error middleware; **sin** `listen`, exportado); y `src/server.ts` (`import './config/env'` primero, `sequelize.authenticate()`, `listen` con precedencia `PORT` → `--port` → 3000, mensajes `logger.info` "Database connection has been established successfully." y "Server is running on port N", `process.exit(1)` si falla). Borrar `src/app.js` y `src/api/routes.js`.
- [ ] T044 [US1] Cambiar en `package.json` `start:dev` → `cross-env NODE_ENV=development tsx watch src/server.ts` y `start:prod` → `cross-env NODE_ENV=production node dist/server.js` ([contracts/runtime.md](./contracts/runtime.md)). Quitar el `.js` del `exclude` de `tsconfig.json` y del `ignores` de `eslint.config.mjs`.
- [ ] T045 [US1] Puerta de US1:
  - `git ls-files "src/*.js" "src/**/*.js"` vacío.
  - `npm run typecheck` y `npm run lint` sin errores.
  - `npm run build`.
  - `npm test` con `CHARACTERIZATION_TARGET=ts`: **todos** los snapshots de T026 coinciden sin `-u`.
  - Añadir a `tests/contract/auth.contract.test.ts` el caso "token firmado como la versión JS sigue siendo válido" (mismo `JWT_SECRET` de prueba y payload `{ id, roleIds, systemRole }`, 8 h).

**Checkpoint (MVP)**: backend 100 % TS, equivalente a la línea base. Desplegable en demo.

---

## Phase 4: User Story 2 - El equipo trabaja sobre contratos de dominio verificados (Priority: P1)

**Goal**: contratos verificados por construcción: uniones de dominio, entradas y salidas tipadas
(zod + mappers), paridad del motor por tabla exhaustiva, transacción explícita, sin N+1 y con
determinismo (FR-011…FR-014, A-02…A-04, A-06, A-12…A-15).

**Independent Test**: `tests/types/contracts.typecheck.ts` compila **solo** gracias a sus
`@ts-expect-error` (US2-1…US2-3). La prueba de contrato de forma detecta un campo omitido (US2-4). Los
casos `frozen` siguen en verde.

### Oleada 4.1: pruebas primero (todas en paralelo)

- [ ] T046 [P] [US2] Crear `tests/unit/engine/graph.test.ts` (construcción de `ProcessGraph` desde filas; `outgoing` ordenado por `id` de secuencia; una arista hacia un elemento ausente se conserva hasta recorrerla) y `tests/unit/engine/context.test.ts` (contexto `{ ...businessData, instance, task }`; el gateway exclusivo elige la primera condición verdadera, si no la ruta sin condición, y si no hay ninguna devuelve "sin ruta").
- [ ] T047 [P] [US2] Crear `tests/unit/engine/semantics.test.ts`: tabla de paridad por tipo según [data-model.md §6.3](./data-model.md), incluida la diferencia vigente "`AUTO_TASK` | **No soportado** (ejecución) | Bloqueante (decisión)".
- [ ] T048 [P] [US2] Crear `tests/contract/schema.contract.test.ts`: cada atributo de los 14 modelos existe en `information_schema.columns` de la base de pruebas con un tipo compatible. Las columnas de la base ausentes del modelo se limitan a `process_elements.actions` y `process_elements.case_assignment_config` (EXC-10).
- [ ] T049 [P] [US2] Crear `tests/types/contracts.typecheck.ts` (incluido por `tsconfig.json`, no por el build), con un `@ts-expect-error` descriptivo en cada caso:
  - Estado `'ACTIV'` asignado a `ProcessDefinitionStatus`.
  - Objeto de semántica sin la fila `AUTO_TASK` con `satisfies Record<ElementType, NodeSemantics>`.
  - `attrs<User>()('username')`.
  - DTO `InboxItemDto` sin `taskName`.

### Oleada 4.2: núcleo del motor y utilidades compartidas (en paralelo)

- [ ] T050 [P] [US2] Crear `src/api/engine/graph.ts` (puro, sin `models`/`sequelize`): tipos `ElementNode`, `SequenceEdge` y `ProcessGraph` de [data-model.md §6.1](./data-model.md), y `buildGraph(elements, sequences)` con aristas ordenadas por `id`.
- [ ] T051 [P] [US2] Crear `src/api/engine/context.ts` (puro): `buildEvaluationContext(businessData, instance, task)` y `chooseExclusiveRoute(edges, context)` usando `evaluateExpression` (FR-013).
- [ ] T052 [P] [US2] Crear `src/utils/formFields.ts` con `toFormField(link, fieldDef, value)` puro, compartido por start-form y task-form. Conserva las dos variantes actuales de `validations` y `value` (N-08, A-14): `validations = {...fieldDef.validations, isRequired, isReadonly, ...contextualValidations}`.

### Oleada 4.3 (tras T050–T051)

- [ ] T053 [US2] Crear `src/api/engine/semantics.ts` (puro): `NODE_SEMANTICS satisfies Record<ElementType, NodeSemantics>` con modos `execution` y `decision` según [data-model.md §6.3](./data-model.md), y efectos `{ kind: 'CREATE_TASK', element } | { kind: 'COMPLETE_INSTANCE' }`.

### Oleada 4.4: cáscaras del motor y módulos (en paralelo, tras T052 y T053)

- [ ] T054 [P] [US2] Renombrar `src/api/engine/processEngine.service.ts` → `src/api/engine/execution.service.ts` y reescribirlo como cáscara (research R-09):
  - Carga el grafo una vez por operación con `t`.
  - Aplica `NODE_SEMANTICS.execution` y los efectos **en orden secuencial** (sin `Promise.all`, A-12).
  - Todas las funciones internas reciben `t: Transaction` obligatorio.
  - Conserva las reglas de [data-model.md §6.4](./data-model.md) (join `===`, `END_EVENT` con ramas pendientes, una salida por tarea, la primera por `id`).
  - Actualizar los imports en `src/api/tasks/task.controller.ts` y `src/api/process-instances/processInstance.controller.ts`.
- [ ] T055 [P] [US2] Reescribir `src/api/engine/decision.service.ts` sobre `graph`, `context` y `NODE_SEMANTICS.decision` (el primer paso conserva "todas las salidas sin evaluar"). Crear `src/api/engine/decision.schemas.ts` (tipo de la entrada de `decide-next-task`; la regla 400 actual se mantiene en el controller hasta US4) y `src/api/engine/decision.mappers.ts` (`toNextTask`, `toDecisionLog`).
- [ ] T056 [P] [US2] Módulo auth: crear `src/api/auth/auth.schemas.ts` (zod, objetos abiertos, tipos `LoginInput` y `UpdateProfileInput`) y `src/api/auth/auth.mappers.ts` (`toLoginResponse` sobre `get({ plain: true })`, que conserva `roles[].UserRole`; `toUserDto` sin `passwordHash`). Adaptar `auth.service.ts` para devolver DTOs.
- [ ] T057 [P] [US2] Módulo users: crear `user.schemas.ts` y `user.mappers.ts` (`toUserWithRolesDto` con y sin `UserRole`, según el endpoint, como en [analysis.md §2](./analysis.md)). **Mover el hash bcrypt del controller a `user.service.ts`** (AP-04, A-06). Proyecciones con `attrs<…>()`.
- [ ] T058 [P] [US2] Módulo roles: crear `role.schemas.ts` y `role.mappers.ts` (`users[]` con "`id`, `fullName`, `email`, `status`"). **Envolver `deleteRole` (conteo + borrado) en `sequelize.transaction`** (A-15, N-12).
- [ ] T059 [P] [US2] Módulo processes: crear `process.schemas.ts` y `process.mappers.ts`:
  - `toDefinitionRow` con `bpmnXml`; `toDefinitionListItem` sin `bpmnXml`; `toDefinitionDetail` con `elements`, `sequences` y `diagramJson`, que es `{}` si está vacío o es inválido; `toSaveAnalysis`.
  - `getStartForm` usa `toFormField` de T052.
  - `syncElements` pasa a ser secuencial (A-12). `t: Transaction` explícito. Sin mutar entidades (A-04).
- [ ] T060 [P] [US2] Módulo process-instances: crear `processInstance.schemas.ts` y `processInstance.mappers.ts` (`toInstanceListItem`; `toInstanceDetail` con `businessDataFields[]` y valores de respaldo `label` = clave / `fieldType` = `UNKNOWN`; `toInstanceRow`), sin mutar `dataValues` (A-04).
- [ ] T061 [P] [US2] Módulo tasks: crear `task.schemas.ts` y `task.mappers.ts` (`toInboxItem` con los 9 campos y los valores por defecto `'Unnamed Task'`, `'Unknown Process'`, `'Unknown User'`). `getTaskForm` usa `toFormField` de T052, todavía con `|| null` (FR-031 va en US3).

### Oleada 4.5

- [ ] T062 [US2] Puerta de US2: `npm run typecheck` (incluido T049), `npm run lint`, `npm test` (casos `frozen` y suites unitarias de T046–T048 en verde, **sin** actualizar snapshots) y `grep -rn "Promise.all" src/api/engine src/api/processes` vacío.

**Checkpoint**: contratos verificados por el compilador; motor con paridad por construcción.

---

## Phase 5: User Story 3 - Los errores son comprensibles y usan el código HTTP correcto (Priority: P2)

**Goal**: manejo de errores centralizado y correcciones B fuera del motor: FR-020…FR-026 (salvo las
partes del motor), FR-028…FR-031 y FR-033, según [contracts/errors.md](./contracts/errors.md) y
[contracts/http-api.md](./contracts/http-api.md).

**Independent Test**: las suites `tests/contract/corrections/*.test.ts` verifican estado, `message` y
`code` de cada fila no relacionada con el motor de la tabla FR-021, además de FR-022 (sin perder
claves), FR-024, FR-028…FR-031 y FR-033. Los casos `frozen` de éxito siguen en verde.

> **Puede ejecutarse en paralelo con US4 y US5** tras US2: toca módulos, middlewares y pruebas
> distintos (ver *Dependencies*).

### Oleada 5.1: pruebas primero (todas en paralelo)

- [ ] T063 [P] [US3] Crear `tests/contract/corrections/auth.corrections.test.ts`:
  - Login con credenciales inválidas → 401 `INVALID_CREDENTIALS` "Invalid credentials".
  - Login sin `email` o sin `password` → 400 `VALIDATION_ERROR`.
  - Perfil con `oldPassword` errónea → **400** `INVALID_OLD_PASSWORD` y la sesión sigue válida: una petición posterior con el mismo token da 200 (FR-024).
- [ ] T064 [P] [US3] Crear `tests/contract/corrections/users-roles.corrections.test.ts`:
  - `PUT /users/:id` inexistente → 404 "User not found".
  - `POST /users` sin `password` → 400.
  - Email o nombre de rol duplicado → 409 `CONFLICT`.
  - Los 404 y 409 de roles mantienen `message` y añaden `code` (FR-022, research R-12).
- [ ] T065 [P] [US3] Crear `tests/contract/corrections/processes.corrections.test.ts`:
  - `save-ask`, `PATCH`, `DELETE` y `start-form` con id inexistente → 404 "Process definition not found." / "Start form definition not found for this process.".
  - `PUT /processes/:id` inexistente → 404 **y no se crea ninguna fila** (N-01).
  - Segunda ACTIVE → 409 `ACTIVE_VERSION_CONFLICT` con el mensaje actual y la base sin cambios.
  - Versionar desde una versión no última → `version = max + 1` (FR-028).
  - Body con `id`, `version` y `createdAt` (en la definición) e `id` y `processDefId` (en los elementos): se ignoran (FR-029).
  - `PATCH` con `status: 'FOO'` → 400 (FR-033).
  - `start-form` con un link a una `FieldDefinition` inexistente → 422 `PROCESS_MODEL_ERROR` (FR-027).
- [ ] T066 [P] [US3] Crear `tests/contract/corrections/instances-tasks.corrections.test.ts`:
  - `/record` y `PUT /process-instances/:id` ignoran `id`, `processDefId`, `startedByUserId` y `startTime` según la lista blanca (FR-029); los demás campos que hoy se persisten se siguen persistiendo.
  - `taskInstances` de `GET /process-instances/:id` ordenadas por `createdAt` ASC (FR-030).
  - El formulario de tarea muestra `0`, `false` y `""` (FR-031).
  - `GET /tasks/:id/form` inexistente → 404 "Task not found"; tarea con elemento borrado → 422.
  - `my-tasks` con un token sin `roleIds` → 401 `{ error, message, code: 'MISSING_AUTH_DATA' }` (FR-025).
- [ ] T067 [P] [US3] Crear `tests/contract/corrections/platform.corrections.test.ts`:
  - JSON malformado → 400 `MALFORMED_JSON`.
  - `:id` no numérico en `/users`, `/roles`, `/processes` y `/process-instances` → 400.
  - `POST /tasks/12abc/complete` **no** se rechaza por el id (research R-13).
  - Error no controlado (forzado con una ruta de prueba o un mock) → 500 `{ message: 'Internal server error' }` sin stack.
  - 403 de `isAdmin` con el mismo `message` y `code: 'FORBIDDEN'`.
  - El 401 de passport sigue siendo texto `Unauthorized`.

### Oleada 5.2: middlewares (en paralelo)

- [ ] T068 [P] [US3] Reescribir `src/api/middlewares/error.middleware.ts` como único formateador ([contracts/errors.md](./contracts/errors.md)):
  - `AppError` → `{ message, code, details? }` (+ `error` si `legacyErrorKey`).
  - `UniqueConstraintError` y `ForeignKeyConstraintError` → 409 `CONFLICT`.
  - `type === 'entity.parse.failed'` → 400 `MALFORMED_JSON`.
  - Lo demás → 500 `{ message: 'Internal server error' }`.
  - Registra con el logger `method`, `url`, `userId` y el stack (N-10), sin el body.
- [ ] T069 [P] [US3] Crear `src/api/middlewares/validate.middleware.ts`:
  - `validateBody(schema)` y `validateParams(schema)`: con zod; fallo → `next(validation(details))`, con `details = [{ field, msg }]`.
  - `idParam`: `^\d+$` convertido a `number`.
  - `parseIntIdParam`: semántica de `parseInt`, solo rechaza `NaN` (research R-13).
- [ ] T070 [P] [US3] Cambiar `src/api/middlewares/admin.middleware.ts` a `next(forbidden())`, con el mismo `message`.

### Oleada 5.3: módulos (todas en paralelo, tras T068–T070)

En cada tarea, el controller pasa a `catchAsync` sin `try/catch` (A-05, EXC-11) y el servicio lanza
`AppError` (AP-01).

- [ ] T071 [P] [US3] Módulo auth (`auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.schemas.ts`):
  - Login con `validateBody` (`email` y `password` presentes como string) e `invalidCredentials()` en las dos ramas.
  - `updateProfile`: `oldPassword` errónea → `invalidOldPassword()` (**400**, FR-024); falta de `oldPassword` → 400 (mismo mensaje); usuario inexistente → 404 (mismo mensaje).
- [ ] T072 [P] [US3] Módulos users y roles (`src/api/users/*.ts`, `src/api/roles/*.ts`):
  - `idParam` en rutas con `:id`; `POST /users` exige `password`.
  - `updateUser` inexistente → `notFound('User not found')`.
  - Escrituras con `pick` según [data-model.md §9](./data-model.md): users "`fullName`, `email`, `systemRole`, `status` (+ `password`, `roleIds`)"; roles "`name`, `description` (+ `userIds` como relación)".
  - Los 404 y 409 actuales de roles pasan a `AppError` con el mismo `message`.
- [ ] T073 [P] [US3] Módulo processes (`src/api/processes/*.ts`):
  - `idParam` en rutas con `:id`.
  - Los 4 "Process definition not found." y el de start-form → `notFound`.
  - `PUT` con id inexistente → `notFound` **antes** de entrar a la rama de alta (N-01).
  - `validateSingleActiveVersion` → `activeVersionConflict` (409).
  - Nueva versión con `version = (MAX(version) WHERE businessProcessKey) + 1`, calculado dentro de `t` (FR-028).
  - `pick` (FR-029): definición "`businessProcessKey`, `name`, `description`, `category`, `status`, `bpmnProcessId`, `bpmnXml` (desde `diagramJson`)"; elementos "`bpmnElementId`, `name`, `description`, `type`, `assignedRoleId`, `webhookTarget`, `slaDefinition`"; secuencias "`sourceElementBpmnId`, `targetElementBpmnId`, `conditionExpression`".
  - `PATCH` valida `status` contra `PROCESS_DEFINITION_STATUS` (400, FR-033) y **elimina el bloque DEPRECATED inalcanzable** (AP-05).
  - `getStartForm` con una `FieldDefinition` inexistente → `modelError` (FR-027).
- [ ] T074 [P] [US3] Módulo process-instances (`src/api/process-instances/*.ts`):
  - `idParam`; 404 del detalle vía `notFound` (mismo mensaje).
  - `pick` (FR-029): `/record` "`processDefId`, `description`, `status`, `businessData`, `startTime`, `endTime`" (`startedByUserId` lo fuerza el controller); `PUT` "`description`, `status`, `businessData`, `endTime`" (sigue devolviendo `[n]`).
  - `order: [[{ model: TaskInstance, as: 'taskInstances' }, 'createdAt', 'ASC']]` en el nivel superior (FR-030, AP-15).
- [ ] T075 [P] [US3] Módulo tasks y formularios (`src/api/tasks/task.routes.ts`, `task.controller.ts`, `task.service.ts`, `src/utils/formFields.ts`):
  - `idParam` en `/:id/form` y `parseIntIdParam` en `/:id/complete`.
  - `my-tasks` sin `roleIds` → `missingAuthData()` con `legacyErrorKey: true` (FR-025).
  - `getTaskForm` inexistente → `notFound('Task not found')`; elemento o campo inexistente → `modelError` (FR-027).
  - `value: businessData[name] ?? null` (FR-031, AP-14).

### Oleada 5.4

- [ ] T076 [US3] Puerta de US3: suites `corrections` de T063–T067 en verde. Actualizar con `-u` **solo** los snapshots de error que esas correcciones cambian; revisar el diff y confirmar que ningún snapshot de éxito cambió. `typecheck`, `lint` y `npm test` completos en verde.

**Checkpoint**: el frontend muestra el mensaje real de cada error y la sesión no se cierra por errores
de negocio.

---

## Phase 6: User Story 4 - El motor falla de forma explícita ante modelos defectuosos (Priority: P2)

**Goal**: errores del motor con códigos correctos (research R-11), detección por camino de ciclos y
referencias rotas (FR-027, research R-10), estado real al iniciar (FR-032), `decide-next-task`
(FR-025) y `decision-logs` (FR-026).

**Independent Test**: `tests/engine/defective-graphs.*.test.ts`: cada grafo defectuoso responde 422
`PROCESS_MODEL_ERROR` nombrando el elemento, sin filas parciales, con el servidor respondiendo después
y, en decisión, con el error auditado. Los escenarios correctos y los diamantes se comportan como en la
línea base.

> **Puede ejecutarse en paralelo con US3 y US5** tras US2. La implementación (T082–T084) no comparte
> archivos con US3, pero las pruebas HTTP de 422/404 necesitan T068 y T069 (middleware de errores y de
> validación) para pasar.

### Oleada 6.1: pruebas primero (todas en paralelo)

- [ ] T077 [P] [US4] Crear `tests/fixtures/defective-graphs.sql`: grafos `MISSING_TARGET` (secuencia hacia un `bpmnElementId` inexistente), `GATEWAY_CYCLE` (dos gateways exclusivos en ciclo sin tareas), `TASK_NO_OUT` (user task sin salida), `ORPHAN_TASK` (tarea `PENDING` cuyo `element_def_id` no existe), `NO_ROUTE` (gateway exclusivo sin condición verdadera ni ruta por defecto) y `DIAMOND` (fork → A y B → mismo gateway exclusivo → tarea).
- [ ] T078 [P] [US4] Crear `tests/unit/engine/traversal.test.ts`: el `DIAMOND` procesa el gateway compartido dos veces, igual que hoy; el `GATEWAY_CYCLE` se detecta por el conjunto de ancestros y nombra el elemento (research R-10).
- [ ] T079 [P] [US4] Crear `tests/engine/defective-graphs.execution.test.ts`: iniciar y completar sobre cada grafo defectuoso → 422 `PROCESS_MODEL_ERROR`; ninguna fila nueva en `process_instances` ni en `task_instances` (rollback); `GET /` responde después; `AUTO` → 422 "Unsupported element type: AUTO_TASK".
- [ ] T080 [P] [US4] Crear `tests/engine/defective-graphs.decision.test.ts`: `decide-next-task` sobre `GATEWAY_CYCLE`, `MISSING_TARGET` y `NO_ROUTE` → 422; `decision_logs` con `errorMessage`; si falla la actualización del log (mock), se propaga el error original (N-09).
- [ ] T081 [P] [US4] Crear `tests/contract/corrections/engine.corrections.test.ts`:
  - `POST /process-instances` en `END_AT_START` → `status: 'COMPLETED'` (FR-032).
  - Key sin ACTIVE → 404.
  - Completar una tarea ajena, inexistente o no `PENDING` → **404** (nunca 401).
  - `decide-next-task` sin campos → 400 `{ error, message, code }`; key o elemento inexistente → 404.
  - `GET /engine/decision-logs` → 200 con `executedByUser` = "`id`, `fullName` y `email`" (FR-026).

### Oleada 6.2

- [ ] T082 [US4] En `src/api/engine/semantics.ts` y `src/api/engine/graph.ts`, implementar el recorrido con conjunto de **ancestros del camino actual**. Al revisitar un nodo no bloqueante del camino → `modelError` "cycle without blocking elements at <bpmnElementId>". Una arista hacia un elemento ausente → `modelError` que nombra la secuencia. Gateway sin ruta y tipo no soportado → `modelError` con el mensaje actual ([contracts/errors.md](./contracts/errors.md)).

### Oleada 6.3 (en paralelo, tras T082)

- [ ] T083 [P] [US4] Actualizar `src/api/engine/execution.service.ts`:
  - Sin ACTIVE → `notFound`. Tarea inexistente, ajena o no `PENDING` → `notFound` con el mismo mensaje.
  - Sin `START_EVENT`, tarea sin salida o siguiente elemento inexistente → `modelError` (textos actuales).
  - Tarea cuyo elemento no existe → `modelError`.
  - **Eliminar el `count` muerto fuera de transacción** del join (AP-06).
  - `startProcess` devuelve la instancia **recargada dentro de `t`** antes del commit, para que el controller devuelva el estado real (FR-032), sin tocar `processInstance.controller.ts`.
- [ ] T084 [P] [US4] Actualizar `src/api/engine/decision.service.ts`, `decision.controller.ts` y `decision.routes.ts`:
  - `validateBody` con un refinamiento que replica "los tres campos con valor verdadero" y responde 400 con `legacyErrorKey: true` y el mensaje actual (FR-025).
  - Key o elemento inexistente → `notFound`.
  - En el `catch`, actualizar el log con `errorMessage` dentro de su propio `try` y relanzar **siempre** el error original (N-09).
  - `getDecisionLogs` con `attrs<User>()('id', 'fullName', 'email')` (FR-026, AP-10).

### Oleada 6.4

- [ ] T085 [US4] Puerta de US4: T077–T081 en verde; los escenarios de T025 siguen coincidiendo con la línea base; actualizar con `-u` **solo** los snapshots de error del motor que cambian, revisando el diff. `typecheck`, `lint` y `npm test` en verde.

**Checkpoint**: ningún grafo defectuoso tumba el servidor ni deja datos parciales.

---

## Phase 7: User Story 5 - El servicio se construye, arranca y opera de forma predecible (Priority: P3)

**Goal**: configuración validada, arranque multiplataforma y logs seguros (FR-016…FR-018).

**Independent Test**: `npm test` incluye arranque sin `JWT_SECRET` (código 1 con un mensaje que nombra
la variable), precedencia del puerto y centinelas en los logs. [quickstart.md §5](./quickstart.md) se
cumple en Windows y Linux.

> **Puede ejecutarse en paralelo con US3 y US4** tras US2: toca solo `src/config/`, `src/server.ts`,
> `src/utils/logger.ts` y sus pruebas.

### Oleada 7.1: pruebas primero (todas en paralelo)

- [ ] T086 [P] [US5] Crear `tests/unit/config.test.ts`: sin `DATABASE_URL` o sin `JWT_SECRET` → error "Missing required configuration: <VAR>" que no contiene ningún valor de entorno; el objeto exportado está congelado (`Object.isFrozen`).
- [ ] T087 [P] [US5] Crear `tests/contract/startup.test.ts`: el proceso sin `JWT_SECRET` termina con código 1 y el mensaje esperado; `--port 4000` sin `PORT` escucha en 4000; `PORT` prevalece sobre `--port`.
- [ ] T088 [P] [US5] Crear `tests/contract/logs.sentinel.test.ts`: un flujo completo (login, iniciar instancia con `businessData` centinela, completar tarea, decisión) **no** deja en `error.log`, `combined.log` ni la salida del proceso la contraseña, el token, el hash ni el valor centinela (SC-011, FR-016).

### Oleada 7.2 (en paralelo)

- [ ] T089 [P] [US5] Completar `src/config/index.ts`:
  - Esquema zod de la configuración: `DATABASE_URL` y `JWT_SECRET` obligatorios y no vacíos; `PORT` opcional.
  - Error con el nombre de la variable y sin valores.
  - `Object.freeze` y tipo exportado `AppConfig`.
  - Método `resolvePort(argv)` con la precedencia `PORT` → `--port` → 3000 (N-14).
  - Quitar `App.port` de `src/config/default.json` y de `custom-environment-variables.json` si deja de usarse.
  - Comprobar que ningún archivo fuera de `src/config/` lee `process.env` (`grep`).
- [ ] T090 [P] [US5] Ajustar `src/server.ts`: usar `config.resolvePort(process.argv)`; ante un error de configuración o de conexión, `logger.error` con el mensaje (sin la URL) y `process.exit(1)`.

### Oleada 7.3

- [ ] T091 [US5] Puerta de US5: T086–T088 en verde y ejecutar a mano [quickstart.md §5](./quickstart.md) (5.1–5.7) en Windows y en Linux, anotando los tiempos (SC-007).

**Checkpoint**: arranque y operación predecibles en ambas plataformas.

---

## Phase 8: User Story 6 - La deuda que no se resuelve queda catalogada y priorizada (Priority: P3)

**Goal**: catálogo de deuda C y trazabilidad de lo resuelto (FR-040, FR-041, SC-009).

**Independent Test**: cada EXC-01…13, AP-01…20 y punto del blueprint §11 aparece en
`debt-catalog.md` como resuelto (con su prueba) o asignado a una feature sucesora.

### Oleada 8.1 (en paralelo, tras US3, US4 y US5)

- [ ] T092 [P] [US6] Crear `specs/001-typescript-migration/debt-catalog.md`:
  - Tabla de resueltos (A-01…A-17, B-01…B-14), cada uno con su prueba o tarea.
  - Tabla C-01…C-13 con riesgo, impacto en el frontend y feature sucesora ([analysis.md §5.3](./analysis.md)). C-01 (reemplazo de `expr-eval`) va marcada como **siguiente feature** con la batería de T025 como criterio de aceptación (FR-042).
  - Matriz EXC-xx / AP-xx / blueprint §11 → estado.
  - Informe de `npm audit` restante (de T095).
- [ ] T093 [P] [US6] Actualizar `blueprint.md` (FR-041):
  - §3 y la estructura de carpetas TS.
  - §6 y §7 con los errores de modelado 422 y la detección de ciclos.
  - §9: códigos de error por endpoint según [contracts/http-api.md](./contracts/http-api.md).
  - §11: marcar lo resuelto.
  - §12: comandos de [contracts/runtime.md](./contracts/runtime.md).
  - Cambiar las referencias `ruta:línea` a los `.ts`, o indicar que corresponden a `95e97c4`.
- [ ] T094 [P] [US6] Proponer, con `/speckit-constitution`, la enmienda PATCH de `.specify/memory/constitution.md`: retirar EXC-06, 07, 09, 11 y 12; dejar en EXC-02 solo lo pendiente; resolver `TODO(EXC_RETIREMENT_001)`. Se hace en un PR aparte y lo revisa otra persona del equipo backend.

**Checkpoint**: la deuda queda trazada y priorizada para planificar la salida de la fase piloto.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T095 Limpiar dependencias en `package.json` (FR-034, research R-17):
  - Quitar `express-validator`, `swagger-jsdoc`, `swagger-ui-express` y `nodemon`; borrar `nodemon.json`.
  - Sustituir los metadatos de plantilla (`name` → `flowify-bpm-backend`, `description`, `author`; quitar `main`).
  - `npm update` y `npm audit fix` **sin** `--force`; `expr-eval` debe seguir en `2.0.2` exacta.
  - Guardar la salida de `npm audit --omit=dev` para T092.
- [ ] T096 [P] Actualizar los comandos de arranque y pruebas en `README.md`, sin valores de entorno.
- [ ] T097 Puerta final (SC-004, SC-010):
  - `git ls-files "src/*.js" "src/**/*.js"` vacío.
  - `npm run typecheck` con 0 errores y `npm run lint` con 0 errores y 0 advertencias.
  - `npm run build` y `npm test` completos sin la base compartida.
  - `grep -rn "console\." src` vacío.
- [ ] T098 Ejecutar [quickstart.md](./quickstart.md) completo (§2.4 pruebas negativas, §4 verificación manual con el frontend sin cambios, §6 cierre) y registrar el resultado en `debt-catalog.md`.
- [ ] T099 Abrir el PR de `001-typescript-migration` → `main`: resumen por historia, tabla de correcciones B con sus pruebas, riesgos aceptados (`expr-eval` 2.0.2, `sequelize` 6) y enlace a `debt-catalog.md`. Termina con la línea de atribución indicada por el entorno. Lo revisa otra persona del equipo backend.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup (T001–T009)
   └─► Foundational: bloque A (T010–T014) ∥ bloque B (T015–T023)
          └─► suites de caracterización (T024–T025) ─► T026 línea base JS ◄── BLOQUEA TODO LO SIGUIENTE
                 └─► US1 port 1:1 (T027–T045)  🎯 MVP
                        └─► US2 contratos tipados (T046–T062)
                               ├─► US3 errores HTTP      (T063–T076) ┐
                               ├─► US4 errores de motor  (T077–T085) ├─ en paralelo
                               └─► US5 operación         (T086–T091) ┘
                                      └─► US6 catálogo (T092–T094) ─► Polish (T095–T099)
```

### User Story Dependencies

- **US1 (P1)**: tras Foundational (T026). Sin dependencias de otras historias.
- **US2 (P1)**: tras US1. Reescribe los mismos archivos de servicio que US1 portó.
- **US3 (P2)**: tras US2.
- **US4 (P2)**: tras US2. Sus pruebas HTTP dependen de T068 y T069 (US3) para el formato 422/404/400; la implementación (T082–T084) no comparte archivos con US3.
- **US5 (P3)**: tras US2. Independiente de US3 y US4 (archivos distintos).
- **US6 (P3)**: tras US3, US4 y US5. T092 necesita además la salida de T095.

### Within Each User Story

- Las pruebas (`corrections`, unit, typecheck) se escriben primero y deben **fallar** antes de implementar.
- En el motor: núcleo puro → cáscaras.
- Middlewares → módulos.
- La puerta de cada historia (T045, T062, T076, T085, T091) es obligatoria antes del checkpoint.

### Archivos compartidos (motivo de los NO `[P]`)

| Archivo | Tareas que lo tocan (en orden) |
|---|---|
| `package.json` | T002 → T044 → T095 |
| `src/api/engine/execution.service.ts` (antes `processEngine.service.ts`) | T042 → T054 → T083 |
| `src/api/engine/decision.service.ts` | T042 → T055 → T084 |
| `src/api/engine/semantics.ts`, `graph.ts` | T050/T053 → T082 |
| `src/utils/formFields.ts` | T052 → T075 |
| `src/config/index.ts` | T027 → T089 |
| `src/server.ts` | T043 → T090 |
| `src/api/middlewares/error.middleware.ts` | T035 → T068 |
| Módulos `src/api/<m>/` | T036–T041 → T056–T061 → T071–T075 (uno por módulo en cada fase) |

---

## Bloques de ejecución paralela (resumen operativo)

Cada fila es una oleada; dentro de ella se pueden lanzar a la vez todas las tareas listadas.

| Oleada | Tareas en paralelo | Ancho |
|---|---|---|
| 1.2 | T003, T004, T005, T006, T007, T008, T009 | 7 |
| 2.1 | T010, T011, T012, T013, T014 ∥ T015, T016, T017, T018, T019, T020, T021, T022, T023 | 14 |
| 2.2 | T024 (8 archivos de suite, divisibles), T025 (3 suites) | 2 tareas / 11 archivos |
| 3.2 | T028, T029, T030, T031 | 4 |
| 3.4 | T033, T034, T035, T036, T037, T038, T039, T040, T041, T042 | 10 |
| 4.1 + 4.2 | T046, T047, T048, T049 ∥ T050, T051, T052 | 7 |
| 4.4 | T054, T055, T056, T057, T058, T059, T060, T061 | 8 |
| US3 ∥ US4 ∥ US5 (pruebas) | T063–T067 ∥ T077–T081 ∥ T086–T088 | 13 |
| US3 ∥ US4 ∥ US5 (impl.) | T068, T069, T070 → T071–T075 ∥ T082 → T083, T084 ∥ T089, T090 | hasta 8 a la vez |
| 8.1 | T092, T093, T094 | 3 |

**Camino crítico** (no paralelizable):
T002 → T026 → T027 → T032 → T043 → T045 → T053 → T054 → T062 → T082 → T083 → T085 → T092 → T097 → T099.

## Parallel Example: User Story 1 (oleada 3.4)

```bash
# Tras T032, lanzar a la vez (un agente o persona por tarea):
Task: "T033 Portar src/config/passport.ts (AuthUser sin passwordHash)"
Task: "T034 Portar auth.middleware.ts y admin.middleware.ts"
Task: "T035 Portar error.middleware.ts 1:1 con el logger único"
Task: "T036 Portar módulo auth"        Task: "T037 Portar módulo users"
Task: "T038 Portar módulo roles"       Task: "T039 Portar módulo processes"
Task: "T040 Portar módulo process-instances"
Task: "T041 Portar módulo tasks"       Task: "T042 Portar motor (processEngine + decision)"
```

## Parallel Example: US3 ∥ US4 ∥ US5 (tras T062)

```bash
# Pruebas primero, las tres historias a la vez:
Task: "T063…T067 suites corrections (auth, users-roles, processes, instances-tasks, platform)"
Task: "T077…T081 fixtures, traversal, defective-graphs y engine.corrections"
Task: "T086…T088 config, startup y logs.sentinel"
# Luego la implementación:
Task: "T068 error.middleware" + "T069 validate.middleware" + "T070 admin.middleware"   # US3
Task: "T082 recorrido con ancestros"                                                  # US4
Task: "T089 config validada" + "T090 server.ts"                                       # US5
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational, hasta T026 (línea base JS commiteada).
2. US1 (T027–T045): backend 100 % TS y equivalente.
3. **STOP and VALIDATE**: `npm test` contra la línea base y recorrido del frontend. **Ya se puede
   desplegar en demo** (sin correcciones B, con exactamente el mismo comportamiento).

### Incremental Delivery

1. MVP (US1) → demo.
2. US2 → contratos verificados (sin cambio observable) → demo.
3. US3 ∥ US4 ∥ US5 → errores correctos, motor robusto y operación predecible → demo.
4. US6 + Polish → PR final a `main`, de una vez (FR-002: `main` nunca recibe JS mezclado).

> Las entregas "a demo" son despliegues desde la rama de la feature. La integración a `main` es una
> sola (T099).

### Parallel Team Strategy

- **Hasta T026**: una persona en el bloque A (arnés y suites) y otra en el bloque B (módulos hoja).
  Las suites de T024 se reparten por módulo.
- **US1 oleada 3.4**: hasta 10 personas o agentes, uno por módulo o middleware.
- **US2 oleada 4.4**: hasta 8, uno por módulo y uno por cáscara del motor.
- **Tras US2**: tres frentes simultáneos (US3, US4, US5).

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes dentro de la oleada.
- `[USx]` = trazabilidad a la historia de [spec.md](./spec.md).
- Commit al cerrar cada tarea o grupo lógico. Nunca se commitean `.env` ni valores de secretos.
- Los snapshots de la línea base solo se actualizan en T076 y T085, con revisión del diff.
- Las interpretaciones R-11 (422 para gateway sin ruta y tipo no soportado) y R-12 (`code` aditivo) se
  aplican tal como están en [research.md](./research.md). Si se revisan, solo cambian T068, T073, T082
  y T083.
