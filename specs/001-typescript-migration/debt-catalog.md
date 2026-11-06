# Catálogo de deuda: migración a TypeScript del backend Flowify BPM

**Feature**: [spec.md](./spec.md) · **Rama**: `001-typescript-migration` · **Entrada**: [analysis.md](./analysis.md) §4 y §5 · **Tarea**: T092

Audiencia: equipo backend y product owner (planificación de la salida de la fase piloto). Convención de estado: **resuelto** (con evidencia citada), **parcial**, **pendiente** (con feature sucesora) y **verificar** (no se encontró evidencia concluyente en el repositorio; requiere confirmación humana).

Referencias de commits de la rama: `bdcf92c` setup, arnés y módulos base (T010-T023) · `f53ad7a` línea base de caracterización sobre JS (T024-T026) · `6c8a1c6` config, modelos, expressionEngine (T027-T032) · `b59bd00` port 1:1, US1 (T033-T045) · `532b292` formFields y build por carril · `012c801` contratos tipados y motor con paridad, US2 (T046-T062) · `ee1a692` errores y validación (T068-T070) · `4e2c04c` US3, US4, US5 (T063-T090) · `dd3df99` dependencias y audit (T095).

---

## 1. Resumen

**Estado de la feature**: US1 a US5 implementadas y verificadas; US6 (documentación) en curso con este catálogo. El contrato de camino correcto se conserva (suites `frozen` en verde sin actualizar snapshots) y las correcciones de categoría B están cubiertas por pruebas propias. No se requieren cambios en `sveltekit-bpm`.

**Puerta final (verificada por el supervisor)**:

- 29 suites, 351 pruebas y 278 snapshots en verde y deterministas (2 ejecuciones consecutivas con `--ci`).
- `tsc --noEmit` y ESLint sin errores ni advertencias; 0 archivos `.js` en `src/`.
- `npm audit --omit=dev`: de 14 vulnerabilidades (2 críticas, 8 altas) a 3 (sección 5).

**Pendientes**:

| Tarea | Estado | Qué falta |
|---|---|---|
| T091 (puerta US5) | Parcial | Windows verificado con `tsx` y con `dist`; falta la ejecución manual en Linux (quickstart §5). |
| T093, T094, T096, T097 | Pendientes (US6/cierre) | `blueprint.md`, enmienda PATCH de la constitution, `README.md`; T097 está cubierta por la puerta final de arriba (registrar en el PR). |
| T098 | Pendiente | Quickstart completo con el frontend real sin cambios; su resultado se registra aquí (sección 7). |
| T099 | Pendiente | Apertura y revisión del PR. |

---

## 2. Deuda resuelta (categorías A y B)

Evidencia: ruta de prueba o tarea/commit. Las suites de contrato `tests/contract/*.contract.test.ts` (8 archivos de snapshots, línea base grabada sobre JS en `f53ad7a`) prueban de forma transversal que el camino correcto no cambió.

### 2.1 Categoría A (refactor invisible)

| ID | Estado | Evidencia |
|---|---|---|
| A-01 | Resuelto | `tsconfig.json` con `strict` y `noUncheckedIndexedAccess`; `tsc --noEmit` limpio; 0 `.js` en `src/`; `src/index.ts` borrado (T009). `tests/types/contracts.typecheck.ts` (4 `@ts-expect-error`: estado inválido, falta fila `AUTO_TASK`, atributo `username`, falta `taskName`). Commits `11ce471`, `b59bd00`. |
| A-02 | Resuelto | `src/domain/constants.ts` (tuplas `as const` y uniones, T015); `tests/unit/foundation.test.ts` (guardas `isElementType`, `isProcessDefinitionStatus`). |
| A-03 | Resuelto | `src/api/engine/{graph,context,semantics,traversal}.ts` con `NODE_SEMANTICS satisfies Record<ElementType, …>`. `tests/unit/engine/{semantics,context,graph,traversal}.test.ts`; escenarios `tests/engine/{execution,decision}.scenarios.test.ts`. Commit `012c801`. |
| A-04 | Resuelto | `src/api/*/*.mappers.ts` (T056-T061). Snapshots `tests/contract/__snapshots__/*` sin cambios en éxito (T062, T076). |
| A-05 | Resuelto | Controllers con `catchAsync` + `AppError` (T036-T042, T071-T075); `tests/unit/foundation.test.ts` (`catchAsync`, `AppError`), `tests/contract/corrections/platform.corrections.test.ts`. Quedan dos `try` legítimos que no traducen errores HTTP: auditoría en `decision.service.ts` y parseo de `diagramJson` en `process.mappers.ts`. |
| A-06 | Resuelto | Hash movido a `user.service.ts` (T057); `tests/contract/users.contract.test.ts` y `corrections/users-roles.corrections.test.ts`. |
| A-07 | Resuelto | Logger único `src/utils/logger.ts` (T020); `grep "console\." src` vacío; `tests/contract/logs.sentinel.test.ts` (un flujo completo con `businessData` centinela no deja secretos en `error.log`, `combined.log` ni salida). `4e2c04c`. |
| A-08 | Resuelto | `src/config/index.ts` validado y congelado (T027, T089); `tests/unit/config.test.ts` (falla nombrando `JWT_SECRET`/`DATABASE_URL` sin filtrar valores; objeto congelado) y `tests/contract/startup.test.ts`. `production.json` contiene `{}` parseable. |
| A-09 | Parcial | `src/app.ts` sin `listen` y `src/server.ts` (T043-T044); scripts con `cross-env`; `tests/contract/startup.test.ts` (código 1 sin `JWT_SECRET`; precedencia `PORT` → `--port` → 3000). Verificado en Windows (`tsx` y `dist`); **Linux pendiente (T091)**. |
| A-10 | Resuelto | Bloque DEPRECATED inalcanzable eliminado (comentario AP-05 en `process.service.ts`); `count` del join conserva consulta viva y ahora con `transaction: t` (`execution.service.ts`); sin comentarios de bitácora ni `require` perezosos en `src/`; `.prettierrc` + ESLint sin advertencias. |
| A-11 | Resuelto | `AuthUser` sin `passwordHash`, construido en `src/config/passport.ts` (T033) con `user.get({ plain: true })`. Evidencia por tipo y revisión de código; no hay una prueba de ejecución dedicada que afirme la ausencia del hash en `req.user`. |
| A-12 | Resuelto | Recorrido y escrituras secuenciales (`execution.service.ts`, comentario en la línea del fork); `Promise.all` solo en dos lecturas independientes de `decision.service.ts`. Escenarios `PARALLEL` en `tests/engine/execution.scenarios.test.ts`; determinismo comprobado con 2 ejecuciones `--ci`. |
| A-13 | Resuelto | `loadGraph` carga elementos y secuencias una vez por transacción (`execution.service.ts`); `tests/unit/engine/graph.test.ts` y escenarios del motor sin cambios. |
| A-14 | Resuelto | `src/utils/formFields.ts` `toFormField` (T052) con ambas variantes de `validations` y `value`; snapshots de `tasks.contract` y `processes.contract`. |
| A-15 | Resuelto | `deleteRole` en `sequelize.transaction` (`role.service.ts`, T058); `tests/contract/roles.contract.test.ts` y `corrections/users-roles.corrections.test.ts` (DELETE inexistente y con usuarios). |
| A-16 | Resuelto | `package.json` con `name: flowify-bpm-backend`, sin `main`; retiradas `express-validator`, `swagger-jsdoc`, `swagger-ui-express`, `nodemon`; `nodemon.json` borrado (T095, `dd3df99`). |
| A-17 | Resuelto | 29 suites / 351 pruebas: contrato (`tests/contract`), motor (`tests/engine`), unitarias (`tests/unit`), tipos (`tests/types`). T024-T026 en `f53ad7a`. |

### 2.2 Categoría B (corrección de defecto compatible)

| ID | FR | Estado | Evidencia |
|---|---|---|---|
| B-01 | FR-020 | Resuelto | `error.middleware.ts` único formateador (T068); `corrections/platform.corrections.test.ts`: JSON malformado → 400 `MALFORMED_JSON`, error no controlado → 500 `{ message: "Internal server error" }` sin stack, 403 con `code FORBIDDEN`, 401 de passport conserva texto. |
| B-02 | FR-021 | Resuelto | `corrections/auth` (401/`INVALID_CREDENTIALS`), `users-roles` (404, 409 `CONFLICT`, 400 `VALIDATION_ERROR`), `processes` (404 `NOT_FOUND`, 409 `ACTIVE_VERSION_CONFLICT` por PATCH, PUT y POST), `engine` (404 clave/versión/tarea). |
| B-03 | FR-021 | Resuelto | `processes.corrections.test.ts` "PUT inexistente (N-01)": 404 y ninguna fila creada. |
| B-04 | FR-024 | Resuelto | `auth.corrections.test.ts`: oldPassword errónea → 400 `INVALID_OLD_PASSWORD` y el token sigue válido; `engine.corrections`: tarea ajena → 404, nunca 401. |
| B-05 | FR-025 | Resuelto | `engine.corrections` (decide-next-task 400 `{ error, message, code }`), `instances-tasks.corrections` (my-tasks 401 con `error`, `message`, `MISSING_AUTH_DATA`), `defective-graphs.decision` (cuerpo incompleto). |
| B-06 | FR-026 | Resuelto | `engine.corrections.test.ts` y `defective-graphs.decision.test.ts`: `GET /decision-logs` 200 con `executedByUser { id, fullName, email }`; `tests/types` impide `username`. |
| B-07 | FR-027 | Resuelto | `tests/engine/defective-graphs.{execution,decision}.test.ts` (422 `PROCESS_MODEL_ERROR`, rollback sin filas, servidor sigue respondiendo), `tests/unit/engine/traversal.test.ts` (ciclo por ancestros; `DIAMOND` no es ciclo), `tests/unit/engine/decision.service.test.ts` (N-09: error original relanzado si falla `log.update`), `instances-tasks.corrections` (tarea sin elemento → 422), `processes.corrections` (start-form con campo inexistente → 422). |
| B-08 | FR-028 | Resuelto | `processes.corrections.test.ts` "versionado": desde versión no última crea `max + 1`. |
| B-09 | FR-029 | Resuelto | `processes.corrections` (PUT/POST ignoran `id`, `version`, fechas), `instances-tasks.corrections` (`/record` y PUT con lista blanca), `users-roles.corrections` (POST ignora `id`). |
| B-10 | FR-030 | Resuelto | `instances-tasks.corrections.test.ts`: `taskInstances` por `createdAt` ASC; `order` de nivel superior en `processInstance.service.ts`. |
| B-11 | FR-031 | Resuelto | `instances-tasks.corrections.test.ts`: `0`, `false` y `""` visibles; ausente sigue `null`. |
| B-12 | FR-032 | Resuelto | `engine.corrections.test.ts` "END_AT_START": respuesta con `COMPLETED`. |
| B-13 | FR-033 | Resuelto | `processes.corrections.test.ts`: `status 'FOO'` → 400 sin persistir; `DRAFT`, `INACTIVE`, `DEPRECATED` válidos. |
| B-14 | FR-034 | Resuelto (acotado) | T095 (`dd3df99`): `npm audit --omit=dev` de 14 a 3 sin `--force`; el resto en sección 5. |

---

## 3. Deuda no resuelta (categoría C)

Fuera de alcance de esta feature. Fuente: [analysis.md §5.3](./analysis.md). Prioridad sugerida: C-01 primero (siguiente feature), después C-02/C-03/C-04/C-05 antes de cualquier ambiente QA o producción (criterios de salida de fase de la constitution).

| ID | Deuda | Riesgo | Impacto en frontend | Feature sucesora propuesta |
|---|---|---|---|---|
| C-01 | `expr-eval` 2.0.2 con 3 avisos sin corrección (EXC-01) | **Crítico** | Ninguno si se conserva la sintaxis | **Siguiente feature** `00x-expression-engine-replacement` (FR-042). **Criterio de aceptación**: `tests/unit/expressionEngine.test.ts` con la batería de 24 casos de `tests/fixtures/expressions.json` (extraídos de la base de demo, T008) en verde sin modificar snapshots, más los escenarios del motor. |
| C-02 | Diseño de procesos y escritura de instancias sin `isAdmin` (EXC-05) | Alto | Ocultar acciones a no admin | `00x-process-design-authorization` |
| C-03 | Sin control de acceso por registro; activaciones concurrentes (N-11) | Alto | Filtrado de listas | `00x-record-level-access` (+ índice único parcial de ACTIVE por key) |
| C-04 | Sin FKs de dominio; borrados sin dependientes; huérfanos; `decision_logs` NOT NULL vs SET NULL (EXC-03, EXC-04) | Alto | Mensajes 409 al borrar | `00x-referential-integrity` (migración de limpieza + FKs) |
| C-05 | Permisos y `systemRole` del token (8 h); `users.status` sin verificar; sin límite de login | Alto | Ninguno | `00x-auth-hardening` |
| C-06 | Semántica del motor: `AUTO_TASK`, modelo de tokens, join frágil, primer paso de decisión sin evaluar gateway | Alto | Posibles cambios en flujos | `00x-engine-token-model` |
| ~~C-07~~ | **Resuelto** al incorporar `api-formdata` (sección 8): `formFields` y `actions` se persisten, `actions`/`case_assignment_config` tienen modelo (EXC-10 cerrada) | — | — | — |
| ~~C-08~~ | **Resuelto** al incorporar `api-formdata` (sección 8): `/api/fields` existe | — | — | — |
| C-09 | `cors()` abierto; configuración productiva (EXC-08) | Medio | Ninguno | Junto con la salida de fase |
| C-10 | `PUT /process-instances/:id` devuelve `[n]`; `DELETE /users/:id` inexistente 204; sin paginación | Bajo | Ninguno hoy | `00x-api-contract-cleanup` |
| C-11 | Activar una versión no depreca la anterior (README dice que sí) | Bajo | Flujo de activación | Decisión de producto (blueprint §14) |
| C-12 | Sin herramienta de migraciones (esta feature solo crea `db/migrations/000_baseline.sql`) | Medio | Ninguno | `00x-migrations-tooling` |
| C-13 | Express 5 / Sequelize 7; vulnerabilidades de `sequelize` y `uuid` sin parche en v6 | Medio | Ninguno | Actualización de mayores |

---

## 4. Matriz de excepciones, anti-patrones y blueprint §11

### 4.1 Excepciones de la constitution (EXC)

| ID | Estado | Referencia |
|---|---|---|
| EXC-01 `expr-eval` | Pendiente (riesgo aceptado) | C-01, FR-042; sección 5 |
| EXC-02 errores HTTP | Resuelto (retirada en constitución 2.0.1) | Formateador central y códigos (B-01, B-02; `corrections/*`). Lo que queda fuera es contrato aparte, no esta excepción: 401 de passport en texto (se conserva a propósito) y `DELETE /users/:id` inexistente 204 (C-10). |
| EXC-03 FKs de dominio | Pendiente | C-04 |
| EXC-04 borrados sin dependientes | Pendiente | C-04 |
| EXC-05 autorización | Pendiente | C-02, C-03 |
| EXC-06 loggers y `console` | Resuelto | A-07; `logs.sentinel.test.ts` |
| EXC-07 restos de plantilla | Resuelto | A-01, A-16; T009, T095 |
| EXC-08 `cors()` abierto | Pendiente | C-09 (`src/app.ts` sigue con `cors()`) |
| EXC-09 arranque y producción | Resuelto (retirada en 2.0.1) | A-09: `app.ts`/`server.ts`, `production.json` = `{}`, scripts con `cross-env`; arranque verificado en Windows (`tsx` y `dist`). Pendiente solo la verificación manual en Linux (T091). Configuración productiva real: C-09. |
| EXC-10 columnas fuera del modelo | Resuelto | Sección 8; `schema.contract.test.ts` exige ahora que ninguna columna carezca de modelo |
| EXC-11 `try/catch` en controllers | Resuelto | A-05 |
| EXC-12 `JWT_SECRET` | Resuelto | A-08; `config.test.ts`; `process.env` solo en `src/config/{env,index,environment}.ts` |
| EXC-13 documentos legados | Pendiente | `resources/`, `GEMINI.md`, `.idx/airules.md` siguen en el árbol; README marcado como legado y actualizado en T096 |

### 4.2 Anti-patrones (AP)

| ID | Estado | Evidencia o referencia |
|---|---|---|
| AP-01 `new Error` sin código | Resuelto | B-02; `corrections/*` |
| AP-02 `try/catch` en controllers | Resuelto | A-05 |
| AP-03 `req.body` completo | Resuelto | B-09 |
| AP-04 hash en controller | Resuelto | A-06 |
| AP-05 código inalcanzable | Resuelto | A-10 |
| AP-06 consultas sin `transaction` o sin uso | Resuelto | A-10, A-15; el `count` muerto fuera de transacción se eliminó en T054; el `count` vigente del join usa `transaction: t` |
| AP-07 `findOne` con cardinalidad no validada | Pendiente | `execution.service.ts` sigue usando `findOne` para START_EVENT; se conserva el comportamiento (verificar si se documenta en C-06) |
| AP-08 recursión sin protección | Resuelto | B-07; `traversal.test.ts`, `defective-graphs.*` |
| AP-09 imports perezosos | Resuelto | A-10 (0 `require(` en `src/`) |
| AP-10 atributos inexistentes | Resuelto | B-06; `tests/types/contracts.typecheck.ts` |
| AP-11 `console.log` con datos | Resuelto | A-07; `logs.sentinel.test.ts` |
| AP-12 resultados crudos de Sequelize | Parcial | `PUT /process-instances/:id` y `DELETE /users/:id` se conservan por contrato (C-10); 404 en el resto (B-02) |
| AP-13 confiar en `onDelete: CASCADE` | Pendiente | C-04 |
| AP-14 `\|\| null` | Resuelto | B-11 (`task.mappers.ts` usa `??`) |
| AP-15 `order` en `include` | Resuelto | B-10 |
| AP-16 nombres de columna engañosos (`bpmn_xml`) | Pendiente | Se conserva (contrato); sin feature sucesora asignada: asignar a `00x-migrations-tooling` o a `00x-api-contract-cleanup` |
| AP-17 autorización solo con token | Pendiente | C-05 |
| AP-18 comentarios de bitácora | Resuelto | A-10 |
| AP-19 estilo inconsistente | Resuelto | A-10; Prettier + ESLint limpios |
| AP-20 paridad motor/decisión | Resuelto | A-03; `semantics.test.ts` (la diferencia vigente de `AUTO_TASK` queda explícita y probada; su resolución es C-06) |
| AP-21 `any`, `as`, `!` | Prevención activa | ESLint `strictTypeChecked` limpio (T004) |
| AP-22 `enum` / literales repetidos | Prevención activa | A-02; `constants.ts` |
| AP-23 `Promise.all` con efectos | Prevención activa | A-12 (único `Promise.all`: dos lecturas) |
| AP-24 mutar entidades del ORM | Prevención activa | A-04 |
| AP-25 tipo duplicado en dos sitios | Prevención activa | Esquemas zod por módulo (`*.schemas.ts`) con tipos derivados |

### 4.3 Blueprint §11

| Sección | Estado | Detalle |
|---|---|---|
| 11.1 Seguridad | Parcial | Resueltos: mass assignment (B-09), `passwordHash` en `req.user` (A-11), datos de negocio en logs (A-07), validación de entrada (zod, FR-023). Pendientes: `expr-eval` (C-01), `isAdmin` y acceso por registro (C-02, C-03), token y `users.status` (C-05), CORS (C-09), límite de login (C-05). |
| 11.2 Errores y códigos | Parcial | Resueltos B-01, B-02, B-05. Pendiente C-10 (`DELETE /users/:id` 204, `[n]`). |
| 11.3 Integridad de datos | Parcial | Resuelto B-08 y lista blanca de `id` en elementos/secuencias (`processes.corrections`). Pendientes C-04, C-07; `bpmnXml` con JSON se conserva (AP-16). |
| 11.4 Motor | Parcial | Resueltos: ciclos y `nextElement` nulo (B-07), `decision-logs` (B-06), `count` muerto (A-10), falsy (B-11). Pendientes (C-06): `AUTO_TASK`, modelo de tokens, join frágil, primer paso sin evaluar gateway. |
| 11.5 Funcionalidad faltante | Parcial | C-07 y C-08 resueltos (sección 8). Pendiente C-11. |
| 11.6 Proyecto y tooling | Parcial | Resueltos: `start:prod`/`start:dev` (A-09, Linux pendiente), pruebas (A-17), loggers (A-07), `JWT_SECRET` y config (A-08), `index.ts`, `swagger` y metadatos (A-16). README actualizado (T096). Pendientes: documentos legados (EXC-13), migraciones (C-12). |

---

## 5. Vulnerabilidades restantes (`npm audit --omit=dev`)

Línea base: 14 vulnerabilidades (2 críticas, 8 altas). Tras T095 (`dd3df99`, actualización dentro de las mayores y retiro de dependencias sin uso, sin `--force`): **3**.

| Paquete | Severidad | Aviso | Corrección | Decisión | Feature sucesora |
|---|---|---|---|---|---|
| `expr-eval` 2.0.2 | Crítica | GHSA-8gw3-rxh4-v6jx, GHSA-jc85-fpwf-qm7x, GHSA-q9v2-7m5w-4693 | No existe | Riesgo aceptado (fase piloto, FR-042; versión fijada exacta) | C-01, siguiente feature |
| `uuid` (transitiva de `sequelize` 6) | Moderada | GHSA-w5hq-g745-h8pq | Solo vía mayor | Aceptado | C-13 |
| `sequelize` 6.37.8 | Moderada (solo por depender de `uuid`) | vía `uuid` | Solo vía mayor | Aceptado | C-13 |

**SC-008**: 0 críticas o altas con corrección disponible sin cambio de mayor; las restantes están listadas con su feature sucesora. Salida de `npm audit --omit=dev --json` tras T095 (resumen literal): `expr-eval` critical, sin corrección; `sequelize` moderate vía `uuid`, corrección solo con cambio de mayor; `uuid` moderate (GHSA-w5hq-g745-h8pq), corrección solo con cambio de mayor. Total: 3 (1 crítica, 2 moderadas).

---

## 6. Desviaciones respecto del plan

| Desviación | Justificación |
|---|---|
| `jest.config.js` en lugar de `.ts` | Un `jest.config.ts` exigiría `ts-node`; CommonJS evita una dependencia (ya previsto en T005). |
| Se añadió `@types/pg` | Tipado de `pg` para el modo estricto. |
| `.build/<carril>` + `CHARACTERIZATION_ENTRY` + base de pruebas por carril | Verificación en paralelo sin interferencia entre ejecuciones (`tests/setup/server-harness.ts`; commit `532b292`). |
| `auth.contract` ordena `modules` | La consulta no tiene `ORDER BY`; se verificó que el JS devuelve el mismo orden que TS, así que la comparación no depende de un orden no garantizado. |
| `Promise.all` solo en dos lecturas independientes de `decision.service.ts` | AP-23 prohíbe `Promise.all` con efectos; dos lecturas independientes no tienen orden observable. |
| El motor de decisión trata una secuencia SEGUIDA hacia un elemento inexistente como 422 (FR-027) | Antes la descartaba en silencio; es un error de modelado y la regla es la misma que en ejecución. |
| `GET /tasks/:id/form` conserva semántica `parseInt` (`1abc` funciona) | FR-023: no rechazar nada que hoy se procesa con éxito (`instances-tasks.corrections`, `platform.corrections`). |
| `processes` GET, save-ask, start-form, PATCH y DELETE usan `parseInt`; PUT es estricto | Los primeros aceptan `9abc` como 9 hoy; PUT con `9abc` hoy falla en Postgres (`processes.corrections`, R-13). |

---

## 7. Registro de verificación manual (T091 Linux, T098)

Pendiente. Completar tras ejecutar el arranque en Linux (quickstart §5) y el quickstart completo con el frontend real sin cambios (T098).

---

## 8. Incorporación de `api-formdata` (2026-11-06)

El frontend (`sveltekit-bpm`) ya consumía la funcionalidad de la rama `api-formdata`, que no estaba en `main`. Se fusionó en `main` (JS, `c0105fa`) y se portó a TypeScript al fusionar `main` en `main-ts`.

**Método.** La referencia es el JS de `main` fusionado (worktree `.build/jsbase`; `CHARACTERIZATION_JS_ROOT` en `server-harness.ts`).
- `tests/contract/formdata.contract.test.ts` (fixture `tests/fixtures/formdata.sql`, ids ≥ 200) se grabó contra ese JS: 32 pruebas `[frozen]` que TS reproduce y 16 correcciones solo TS.
- En `processes.contract` y `process-instances.contract`, las pruebas en que JS y TS difieren son exactamente las mismas 17 que ya diferían antes de la fusión (correcciones aprobadas de 001). La fusión no introduce diferencias nuevas.

**Funcionalidad portada.**
- `/api/fields`: CRUD y `GET /types`, solo ADMIN.
- `/api/formdata-elements/:elementId/form-fields`: alta, lista, actualización en bloque, y actualización y baja de un vínculo; solo ADMIN.
- `GET /api/processes/:id`: cada elemento incluye `formFields`, `actions` y `caseAssignmentConfig`.
- Guardado de procesos: sincroniza los `formFields` del payload. Una versión nueva toma los vínculos solo del payload; ya no los copia de la versión origen.
- Borrado de procesos: elimina antes los vínculos de los elementos.
- Valor enriquecido de SELECT (`{label, value}`) en el formulario de tarea y en el detalle de instancia, que además expone `validations`.
- Asignación de casos:
  - `caseAssignmentData` en el formulario de tarea.
  - `caseAssignments` al completar una tarea (upsert).
  - El motor asigna al usuario elegido las tareas de ese rol en la instancia.

**Correcciones aplicadas (mismas reglas que 001).** Todos estos casos daban 500 en JS:
- Error 404 con `code`: field o vínculo inexistente en PUT o DELETE.
- Error 400: falta `name`, `label` o `fieldType` al crear un field.
- Error 400: un vínculo sin `fieldDefId` o `displayOrder`, también dentro de `elements[].formFields` al guardar un proceso.
- Error 400: el cuerpo de la actualización en bloque no es un arreglo.
- Error 400: una entrada de `caseAssignments` sin `roleId` o `userId`.
- Error 409: `name` de field duplicado.

Además, los ids no numéricos devuelven 400, se aplican listas blancas de escritura (FR-029) y los listados sin orden garantizado ahora tienen orden fijo.

**Se conserva.**
- Un vínculo a un `fieldDefId` inexistente se acepta (201), porque la base no tiene FKs (C-04). El vínculo roto da 422 al leer el formulario (FR-027).
- El `elementId` de la ruta no se verifica al actualizar o borrar un vínculo por su id.
