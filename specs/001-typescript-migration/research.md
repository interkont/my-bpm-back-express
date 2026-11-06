# Research: Migración del backend a TypeScript

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-11-05

Cierra las 6 decisiones de [analysis.md §9](./analysis.md) y las incógnitas técnicas del plan. Versiones
verificadas contra el registro npm el 2026-11-05. Entorno local: Node 20.20.2, Docker 29.0.1.

---

## R-01 · Biblioteca de validación

- **Decisión**: `zod` `^4.6` como única biblioteca de validación. Se retira `express-validator` de
  `package.json` (hoy instalada y sin uso).
- **Justificación**:
  - El tipo de entrada de cada endpoint se deriva del esquema (`z.infer`), como exige el Principio X
    (fuente única) y AP-25. Con `express-validator` habría que declarar a mano un tipo paralelo.
  - La validación no es la parte delicada de esta feature. FR-023 obliga a que sea **permisiva**: solo
    rechaza lo que hoy termina en error. `zod` lo permite con objetos abiertos (`z.looseObject`) y
    refinamientos que replican la semántica actual (comprobaciones de "valor verdadero").
  - zod 4 declara soporte para Node ≥ 18 y no tiene dependencias.
- **Alternativas consideradas**:
  - `express-validator` 7: ya estaba aprobada, pero obliga a duplicar tipos y su API está acoplada a `req`.
  - `valibot`: no está aprobada por la constitución y su ecosistema es menor.
- **Reglas de uso** (vinculantes para el diseño):
  - Los esquemas de body son abiertos: se aceptan las claves desconocidas, y la lista blanca de FR-029
    la aplica el servicio con `pick`, no el esquema. Así no cambia lo que hoy se acepta.
  - Solo se valida lo que hoy falla. El catálogo exacto está en [contracts/errors.md](./contracts/errors.md).
  - El middleware `validate` responde 400 `{ message, code: 'VALIDATION_ERROR', details: [{ field, msg }] }`.

## R-02 · Versión de TypeScript y configuración del compilador

- **Decisión**: `typescript` `~5.9.2` (la ya instalada). Configuración:
  - `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes: false`.
  - `target: ES2022`, `module: node16`, `moduleResolution: node16`. Sin `"type": "module"` en
    `package.json`, lo que produce salida CommonJS.
  - `esModuleInterop`, `resolveJsonModule`, `sourceMap`, `outDir: dist`, `rootDir: src`.
  - Dos archivos: `tsconfig.json` (src + tests, `noEmit`) y `tsconfig.build.json` (solo `src`, emite).
- **Justificación**:
  - TypeScript 7.0 ya está publicado, pero `typescript-eslint` 8 exige `<6.1` y `ts-jest` exige `<7`.
    Quedarse en 5.9 mantiene compatible toda la cadena de herramientas.
  - `node16` hace que el compilador aplique la resolución real de Node al emitir CommonJS.
  - `exactOptionalPropertyTypes` se deja desactivado: con los tipos de Sequelize 6 genera fricción sin
    beneficio para esta feature.
- **Alternativas**:
  - TS 7: incompatible con lint y pruebas hoy.
  - `module: commonjs` con `moduleResolution: node10`: más laxo y oculta errores de resolución.

## R-03 · Formato de módulos y orden de carga

- **Decisión**: la salida es CommonJS y el primer import de `server.ts` y de `app.ts` es
  `src/config/env.ts`. Ese módulo:
  1. Ejecuta `dotenv.config()`.
  2. Fija `process.env.NODE_CONFIG_DIR ??= <raíz>/src/config`, calculado con `path.resolve(__dirname, '../../src/config')`.
     La ruta es válida desde `src/config` y desde `dist/config` porque ambas carpetas tienen la misma
     profundidad.
  3. Solo después se importa `config`.
- **Justificación**:
  - Hoy `require('dotenv').config()` es la primera línea de `app.js` y `passport.js` lee
    `process.env.JWT_SECRET` al cargarse, así que el orden importa.
  - Como TypeScript emite los `require` en el orden de los `import`, aislar el efecto en `env.ts`
    garantiza ese orden.
  - El valor por defecto de `NODE_CONFIG_DIR` elimina la necesidad de fijarlo en los scripts, que era la
    causa del fallo en Windows. Si la variable ya viene definida, se respeta.
  - Los JSON de configuración no se copian a `dist/`: se leen siempre de `src/config`.
  - `public/` se resuelve con `path.join(__dirname, '../public')`, que también es válido desde `src/` y
    desde `dist/`.
- **Alternativas**:
  - ESM: lo prohíbe la constitución sin enmienda y rompe el orden de carga de `config`.
  - Copiar los JSON a `dist/`: añade un paso de build multiplataforma sin aportar nada.

## R-04 · Ejecución en desarrollo y scripts multiplataforma

- **Decisión**:
  - `tsx` `^4.23` para desarrollo (`tsx watch src/server.ts`). Reemplaza a `nodemon` y se borra
    `nodemon.json`.
  - `cross-env` `^10.1` para fijar `NODE_ENV` en los scripts.
- **Scripts** (contrato en [contracts/runtime.md](./contracts/runtime.md)):

  | Script | Comando | Hoy |
  |---|---|---|
  | `start:dev` | `cross-env NODE_ENV=development tsx watch src/server.ts` | `NODE_CONFIG_DIR=… NODE_ENV=development nodemon` (solo Unix) |
  | `build` | `tsc -p tsconfig.build.json` | — |
  | `start:prod` | `cross-env NODE_ENV=production node dist/server.js` | Roto (`production.json` vacío) |
  | `typecheck` | `tsc --noEmit` | — |
  | `lint` / `format` | `eslint .` / `prettier --write .` | — |
  | `test` | `jest` | `jest` (0 pruebas) |
  | `test:baseline` | Graba la línea base contra el código JS (R-09) | — |
  | `db:test:up` / `db:test:down` | `docker compose -f docker-compose.test.yml up -d --wait` / `down -v` | — |

- **Justificación**:
  - `NODE_ENV` cambia la configuración que se carga y el nivel de log, así que debe seguir fijándose de
    forma explícita por script, como hoy.
  - `cross-env` 10 exige Node ≥ 20 y es la opción que la constitución menciona expresamente
    ("`cross-env` previa aprobación en el plan"). Su aprobación queda registrada en *Complexity Tracking*.
  - `tsx` arranca sin compilar y es la herramienta aprobada por la constitución 2.0.0.
- **Alternativas**:
  - `node --env-file`: no fija `NODE_ENV` por script.
  - `ts-node`: más lento y con problemas conocidos de resolución `node16`.

## R-05 · Pruebas: transformación y organización

- **Decisión**: `ts-jest` `^29.4` en modo solo transpilación (`isolatedModules`), con `@types/jest`
  `^29.5`. Jest se mantiene en 29.7. El chequeo de tipos de las pruebas lo hace `npm run typecheck`.
- **Proyectos de Jest**:
  - `unit`: núcleo del motor, mappers, `pick`, `expressionEngine` y config. No necesita base de datos.
  - `contract`: HTTP por caja negra contra el servidor y la base de pruebas.
  - `engine`: escenarios de grafo de extremo a extremo por HTTP.
- **Justificación**:
  - `ts-jest` usa el mismo compilador que el build. En una migración cuyo objetivo es la equivalencia,
    se descarta así una diferencia de emisión entre lo que se prueba y lo que se despliega.
  - `@swc/jest` es más rápido, pero añade un binario nativo (`@swc/core`) y un segundo compilador.
- **Alternativa**: `@swc/jest` + `@swc/core`. Se descarta por ese segundo compilador; el volumen de
  pruebas (cientos, no miles) no justifica la ganancia de velocidad.

## R-06 · Lint y formato

- **Decisión**: `eslint` `^9.39` con configuración plana, `typescript-eslint` `^8.72` (preset
  `strictTypeChecked`), `eslint-plugin-import-x` `^4.17`, `eslint-config-prettier` `^10.1` y
  `prettier` `^3.9`.
- **Reglas que codifican la constitución**:

  | Regla | Codifica |
  |---|---|
  | `@typescript-eslint/no-explicit-any`, `no-unsafe-*` | Principio X, AP-21 |
  | `@typescript-eslint/no-floating-promises`, `no-misused-promises` | Principio X, AP-23 |
  | `@typescript-eslint/switch-exhaustiveness-check` | Principios VI y X |
  | `@typescript-eslint/prefer-nullish-coalescing` | AP-14 |
  | `@typescript-eslint/consistent-type-imports` | Separar tipos y valores al emitir CommonJS |
  | `@typescript-eslint/ban-ts-comment` (`ts-expect-error` solo con descripción) | Principio X |
  | `no-restricted-syntax` sobre `TSEnumDeclaration` | AP-22 |
  | `no-console` | Principio VIII, CC-12 |
  | `eqeqeq` | Estilo |
  | `import-x/no-cycle` | Arquitectura (sin dependencias circulares) |
  | `no-restricted-imports` por glob de capa | Principio I: los controllers no importan `models`, `sequelize` ni `bcryptjs`; `src/domain/**` no importa nada de `src/`; el núcleo del motor no importa `models` |

- **Justificación**:
  - ESLint 10 existe, pero la constitución aprueba la 9.x, que typescript-eslint 8 soporta.
  - `import-x` es el único plugin mantenido con `no-cycle` compatible con la configuración plana.
  - `eslint-config-prettier` evita que ESLint y Prettier se contradigan.
  - Estos dos últimos se registran en *Complexity Tracking* como dependencias de lint no listadas en la
    constitución.
- **Alternativa**: `eslint-plugin-import` (el original): sigue sin soporte completo de configuración
  plana y tiene problemas de rendimiento con TypeScript.

## R-07 · Base de pruebas

- **Decisión**:
  - Postgres en Docker con `docker-compose.test.yml`, usando la misma versión mayor que el servidor de
    demo (se lee con `SHOW server_version` en la tarea de línea base) y un puerto local no estándar.
  - El `globalSetup` de Jest aplica `db/migrations/000_baseline.sql` con `pg`, que ya es dependencia.
  - Cada archivo de prueba reinicia los datos con `TRUNCATE … RESTART IDENTITY CASCADE` y fixtures
    deterministas en `tests/fixtures/seed.sql`.
  - `TEST_DATABASE_URL` permite apuntar a otro Postgres de pruebas, por ejemplo uno local sin Docker.
  - El `globalSetup` se niega a ejecutar si la URL coincide con la `DATABASE_URL` del `.env`. Esto aplica
    el Principio VII: nunca contra la base compartida.
- **`000_baseline.sql`**: se genera con
  `pg_dump --schema-only --no-owner --no-privileges` contra la base de demo, en solo lectura. Documenta el
  esquema vigente, incluidas las columnas `actions` y `case_assignment_config` que el modelo no mapea, y
  las FKs reales. No se aplica a la base de demo.
- **Justificación**:
  - Las alternativas en memoria (pg-mem, SQLite) no soportan JSONB ni el comportamiento de `RETURNING` de
    Postgres con fidelidad suficiente para caracterizar.
  - Docker está disponible en la máquina del equipo.
- **Alternativa**: `@testcontainers/postgresql`.
  - La versión 12 exige Node ≥ 22.22, incompatible con el runtime.
  - La 11.x funciona, pero añade unas 15 dependencias transitivas para algo que resuelve un archivo
    compose.

## R-08 · Línea base de caracterización (FR-003)

- **Decisión**: pruebas de caja negra por HTTP, comunes a ambas versiones.
  - El arnés arranca el servidor como proceso hijo, contra la base de pruebas y en un puerto libre, con
    `CHARACTERIZATION_TARGET=js` (`node src/app.js`) o `=ts` (por defecto, `node dist/server.js`).
    Después usa `supertest(baseUrl)`.
  - Como el `app.js` actual arranca al importarse, la caja negra es la única forma de probar el código JS
    sin tocarlo.
  - **Normalización**: los ids se renumeran por orden de aparición; las fechas ISO se reemplazan por
    `<date>` y el `token` por `<jwt>`. El orden de las claves se ignora y el de los arrays se respeta.
  - Las respuestas se graban como snapshots de Jest (`tests/contract/__snapshots__`).
- **Dos clases de caso**:
  - **`frozen`**: el snapshot grabado con JS debe coincidir con TS. Cubre todos los caminos correctos y
    los errores de FR-022, de los que se comparan estado y `message` (ver R-12).
  - **`corrected`** (FR-020…FR-034): el snapshot JS queda como evidencia del "hoy" y la versión TS se
    verifica con aserciones explícitas del "tras la migración" de la spec.
- **Escenarios del motor** (FR-003 b), todos por HTTP: inicio a tarea; gateway exclusivo por condición y
  por ruta por defecto; fork/join paralelo completando en los dos órdenes posibles; fin en el arranque;
  `decide-next-task` desde inicio, desde una tarea y desde un gateway; `AUTO_TASK` en ambos motores.
  Se verifican tareas creadas, estados, `businessData` y estado final consultando
  `GET /process-instances/:id`.
- **Batería de expresiones** (FR-003 c):
  - Se extrae en solo lectura `SELECT DISTINCT condition_expression FROM process_sequences` de la base
    de demo y se guarda en `tests/fixtures/expressions.json`, junto con contextos representativos:
    número por encima y por debajo del umbral, acción en mayúsculas y en minúsculas, variable ausente,
    expresión vacía.
  - La prueba unitaria evalúa cada par (expresión, contexto) con el `expressionEngine` del objetivo y
    compara con el resultado grabado desde JS.
  - Esta batería es también el criterio de aceptación de la feature sucesora que reemplazará `expr-eval`
    (FR-042).
- **Orden obligatorio**: la línea base se graba sobre el commit JS antes del primer cambio de código de
  aplicación. Solo se añaden herramientas, pruebas y archivos de base de datos.

## R-09 · Profundidad del refactor del motor (FR-013)

- **Decisión**: en esta feature, primero un port 1:1 y después la extracción del núcleo, con la suite en
  verde entre ambos pasos.
  1. **Port 1:1**: `processEngine.service.ts` y `decision.service.ts` tipados, con la misma estructura.
  2. **Extracción**:
     - `graph.ts`: construye `ProcessGraph` desde las filas de la definición.
     - `semantics.ts`: tabla `NODE_SEMANTICS` exhaustiva por `ElementType`.
     - `context.ts`: contexto de evaluación y elección de ruta del gateway exclusivo.
     - `execution.service.ts` y `decision.service.ts` quedan como cáscaras.
  3. **Carga del grafo**: se carga una vez por operación dentro de la transacción. Elimina las N+1
     consultas (A-13); el grafo no cambia durante la transacción.
- **Justificación**: FR-013 exige paridad por construcción, así que la extracción no puede quedar fuera.
  Hacerla después del port aísla los riesgos: un fallo de tipos no se confunde con un fallo de
  semántica.
- **Determinismo** (A-12): el fork y `syncElements` pasan de `Promise.all` a iteración secuencial en
  orden de `id` de secuencia. Hoy la consulta no tiene `ORDER BY`, y Postgres devuelve en la práctica el
  orden de inserción, así que el resultado observable no cambia.

## R-10 · Detección de ciclos sin cambiar la semántica de los diamantes (FR-027)

- **Decisión**: el ciclo se detecta **por camino**, con el conjunto de ancestros de la recursión actual
  y no con un conjunto global de visitados. Volver a un elemento no bloqueante que ya está en el camino
  actual es un error de modelado (422, `PROCESS_MODEL_ERROR`) que nombra el elemento.
- **Justificación**: con un conjunto global de visitados, un diamante (fork → A y B → mismo gateway X)
  dejaría de procesar X la segunda vez. Hoy X se procesa dos veces, y FR-007 prohíbe cambiar la
  semántica del motor. La detección por camino solo rechaza los grafos que hoy agotan la pila
  (decisión) o recursan sin fin (ejecución).
- **Alternativa**: límite de profundidad. Es arbitrario y se descarta.

## R-11 · Clasificación de los errores existentes

Los 19 `throw new Error` del código actual se asignan así (catálogo completo en
[contracts/errors.md](./contracts/errors.md)):

| Ubicación actual | Mensaje (se conserva) | Destino |
|---|---|---|
| `auth.service.js:11,16` | `Invalid credentials` | 401 `INVALID_CREDENTIALS` |
| `auth.service.js:66` | contraseña anterior inválida | **400** `INVALID_OLD_PASSWORD` (FR-024) |
| `user.service.js:49` | `User not found` | 404 `NOT_FOUND` |
| `process.service.js:30` | `An active version already exists…` | 409 `ACTIVE_VERSION_CONFLICT` |
| `process.service.js:76,211,248,309` | `Process definition not found.` | 404 `NOT_FOUND` |
| `process.service.js:342` | `Start form definition not found…` | 404 `NOT_FOUND` |
| `task.service.js:101` | `Task not found` | 404 `NOT_FOUND` |
| `processEngine.service.js:151` | sin versión ACTIVE para la key | 404 `NOT_FOUND` |
| `processEngine.service.js:195` | `Task not found, not pending, or not authorized.` | 404 `NOT_FOUND` |
| `decision.service.js:104,112` | key no activa / elemento inexistente | 404 `NOT_FOUND` |
| `processEngine.service.js:172` | `Process is invalid: No START_EVENT found.` | 422 `PROCESS_MODEL_ERROR` |
| `processEngine.service.js:236,249` | tarea sin salida / siguiente elemento inexistente | 422 `PROCESS_MODEL_ERROR` |
| `processEngine.service.js:112`, `decision.service.js:68` | gateway exclusivo sin ruta válida | 422 `PROCESS_MODEL_ERROR` |
| `processEngine.service.js:132`, `decision.service.js:73` | tipo de elemento no soportado | 422 `PROCESS_MODEL_ERROR` |

- **Interpretación registrada**:
  - El "gateway sin ruta válida" (no hay condición verdadera ni ruta por defecto) y el "tipo no
    soportado" (por ejemplo `AUTO_TASK` en ejecución) se tratan como errores de modelado de la fila
    FR-021 "Error de modelado del proceso". Ambos se deben a un modelo que el motor no puede recorrer.
  - El tipo `AUTO_TASK` **sigue siendo no soportado** (FR-007); solo cambia el código de respuesta, de
    500 a 422.
- **`my-tasks` sin `roleIds` en el token**: se conserva el 401. Es un fallo de autenticación (el token no
  trae los datos de identidad), no un error de negocio, así que es compatible con el Principio V. El
  cuerpo pasa a `{ error, message }` (FR-025).

## R-12 · Forma del cuerpo de error para los códigos ya correctos (FR-022)

- **Decisión**: todos los errores de `AppError` incluyen `code`. Para los errores que FR-022 conserva
  (por ejemplo 404 `{ message: 'Role not found' }`), "mismo cuerpo" significa mismo estado, mismo
  `message` y ninguna clave eliminada. La clave `code` es **aditiva**.
- **Justificación**:
  - El Principio V (constitución 2.0.0) exige `code` en los errores de dominio.
  - El frontend solo lee `message` (`apiService.ts:20-33`).
  - FR-025 ya establece el precedente de añadir claves conservando las existentes.
  - La prueba `frozen` de estos casos compara estado y `message`, y verifica que no falte ninguna clave
    del snapshot JS.
- **Excepciones intactas**:
  - El 401 de passport-jwt sigue siendo texto `Unauthorized`, porque lo genera la librería.
  - El 403 de `isAdmin` conserva su `message` y añade `code: 'FORBIDDEN'`.

## R-13 · Validación de ids de ruta

- **Decisión**:
  - Los parámetros `:id` se validan con `^\d+$` y se convierten a `number`; lo que no cumple el patrón
    recibe 400 `VALIDATION_ERROR`.
  - **Excepción** `POST /tasks/:id/complete`: hoy usa `parseInt`, que acepta `"12abc"` como 12 y responde
    200. Para no rechazar una petición que hoy funciona (FR-023), este endpoint conserva la semántica de
    `parseInt` y solo rechaza lo que da `NaN`.
- **Justificación**: en el resto de endpoints un id no numérico llega hoy a Postgres como texto y termina
  en 500 (`invalid input syntax for type integer`), por lo que rechazarlo con 400 es una corrección B
  permitida.

## R-14 · Logging unificado

- **Decisión**: un solo logger winston en `src/utils/logger.ts`, con tres transportes:
  - Consola: formato `colorize` + `simple`; nivel `debug` fuera de producción e `info` en producción.
  - `error.log`: nivel `error`, JSON.
  - `combined.log`: nivel `info`, JSON.

  El middleware de errores registra `method`, `url`, `userId` y el stack. El motor registra en `debug`
  solo identificadores (instancia, tarea, `bpmnElementId`, resultado de la condición), nunca
  `businessData` ni el contexto.
- **Efecto observable**: `combined.log` pasa de recibir solo los errores del middleware a recibir también
  los eventos `info` de negocio. Los logs no son contrato de la API, y FR-016 solo exige que los dos
  archivos sigan generándose.
- **Alternativa**: `pino`. No está aprobado y no aporta nada a esta feature.

## R-15 · Mappers y equivalencia de serialización

- **Decisión**: los mappers trabajan sobre `entity.get({ plain: true })`, tipado con los atributos del
  modelo y los includes de la consulta, y nunca mutan la entidad.
  - Las formas con anidamientos generados por Sequelize (el `UserRole` dentro de cada rol en login y en
    `GET /users`) se copian tal cual desde el objeto plano. Así se conserva exactamente lo que hoy
    produce `toJSON()`.
  - Las fechas siguen siendo `Date` hasta `res.json` y se serializan igual que hoy, en ISO.
- **Justificación**: es el riesgo n.º 1 de [analysis.md §8](./analysis.md). Las pruebas `frozen` lo
  verifican para los 32 endpoints.

## R-16 · Modelos tipados

- **Decisión**: `class X extends Model<InferAttributes<X>, InferCreationAttributes<X>>`, con `declare`
  para cada atributo, `CreationOptional` en `id` y en las columnas con valor por defecto, y
  `NonAttribute` para las asociaciones incluidas.
  - Se conservan exactamente las opciones actuales: `tableName`, `field`, `timestamps: false` y, en
    `UserRole`, `timestamps: true`, `createdAt: 'created_at'`, `updatedAt: false`.
  - Los JSONB se tipan como `JsonValue` (`src/domain/types.ts`) o `unknown`.
  - Las columnas de estado se tipan con la unión de dominio.
- **Justificación**: es la única forma tipada de Sequelize 6 sin añadir `sequelize-typescript`, que no
  está aprobada. Los modelos quedan como declaraciones de datos sin lógica.

## R-17 · Dependencias: altas, bajas y auditoría (FR-034)

| Acción | Paquetes |
|---|---|
| **Alta (runtime)** | `zod` |
| **Alta (dev)** | `tsx`, `ts-jest`, `@types/jest@29`, `@types/express@4`, `@types/passport`, `@types/passport-jwt`, `@types/jsonwebtoken`, `@types/bcryptjs@2`, `@types/cors`, `@types/config`, `@types/supertest`, `eslint@9`, `typescript-eslint`, `eslint-plugin-import-x`, `eslint-config-prettier`, `prettier`, `cross-env` |
| **Baja** | `express-validator` (sustituida por zod), `swagger-jsdoc` y `swagger-ui-express` (sin uso; `swagger-jsdoc` trae la vulnerabilidad de `js-yaml`), `nodemon` (sustituido por tsx) |
| **Actualización dentro de la mayor** | `npm update` + `npm audit fix` sin `--force` (express 4.21.x, jsonwebtoken 9.x, etc.) |
| **Se mantienen fijadas** | `expr-eval@2.0.2` exacta (FR-042, EXC-01); `sequelize` 6 (su vulnerabilidad alta no tiene parche en la v6, queda en C-13) |

- `@types/express@4` y `@types/bcryptjs@2` se fijan a la mayor del paquete que tipan. Las versiones
  `@types/express@5` y `@types/bcryptjs@3` son para otras versiones mayores de esas librerías.
- `expr-eval` trae su propio `.d.ts`. Si no tipa `Parser#evaluate` con el contexto como objeto, se
  declara un módulo local mínimo en `src/types/expr-eval.d.ts`.
- El informe final lista las vulnerabilidades que quedan y la feature sucesora de cada una (SC-008).

## R-18 · Secuencia de implementación

La conversión va de las hojas a la raíz, con la suite en verde en cada paso
([analysis.md §8](./analysis.md)). Este orden alimenta `/speckit-tasks`:

1. **Herramientas y arnés, sin tocar `src/`**:
   - `tsconfig`, ESLint, Prettier y Jest.
   - Base de pruebas, `000_baseline.sql`, fixtures y extracción de expresiones.
   - Suites de contrato, motor y expresiones grabadas contra JS (`test:baseline`).
2. **Port 1:1 a TypeScript**, en este orden: `domain` → `utils` → `config` (con `env.ts`) → `models` →
   middlewares → servicios → controllers y rutas → `app.ts`/`server.ts`. Sin cambios de comportamiento:
   las pruebas `frozen` deben pasar al terminar el paso.
3. **Refactors de categoría A**:
   - Mappers, `pick` y transacción explícita.
   - Logger único y config validada.
   - Extracción del núcleo del motor (R-09) y determinismo.
4. **Correcciones de categoría B**, una por FR, cada una con su prueba `corrected`.
5. **Limpieza y cierre**:
   - Dependencias y `npm audit`.
   - Borrar `src/index.ts`, `nodemon.json` y los metadatos de plantilla.
   - Actualizar `blueprint.md`.
   - Catálogo C y retirada de excepciones de la constitución (PATCH).
