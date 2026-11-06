<!--
SYNC IMPACT REPORT
==================
Cambio de versión: 1.0.0 → 2.0.0 (MAJOR)

Motivo del bump MAJOR: se redefine de forma incompatible la regla del Stack que prohibía TypeScript y
el Principio I (extensiones de archivo normadas, capa de dominio nueva). Todo el código existente en
JavaScript pasa a ser deuda a migrar (feature 001-typescript-migration, FR-001/FR-002).

Principios modificados:
  I.    Arquitectura en capas por módulo → idem (archivos `.ts`, `<x>.schemas.ts`, `<x>.mappers.ts`,
        nueva capa `src/domain/`, organización interna del motor)
  II.   Integridad transaccional → idem (+ transacción como parámetro tipado explícito)
  IV.   Seguridad y autorización → idem (validación con la biblioteca aprobada única; prohibido 401
        en errores de negocio de usuarios autenticados)
  V.    Errores explícitos y centralizados → idem (`AppError` en `src/domain/errors.ts`, `code`
        obligatorio en errores de dominio, 422 `PROCESS_MODEL_ERROR`, compatibilidad de la clave `error`)
  VI.   Motor determinista → idem (paridad por construcción: semántica de nodos exhaustiva por tipo)
  VIII. Observabilidad → idem (rutas `.ts`)
  (nuevo) X. Tipado estricto y fuente única de tipos

Secciones modificadas:
  - Fase del proyecto (tabla: validación con la biblioteca aprobada)
  - Stack tecnológico (TypeScript aprobado; herramientas de compilación, ejecución, lint y pruebas;
    salida CommonJS; candidatos de validación y de transformación de Jest a elegir en el plan)
  - Arquitectura, capas y reglas de dependencia (+ capa Dominio)
  - Estructura de carpetas y plantilla de módulo (reescrita en TypeScript)
  - Patrones de diseño (+ núcleo funcional del motor, uniones literales, mappers, config validada)
  - Convenciones de modelos (`Model.init` tipado, constantes en `src/domain/constants.ts`)
  - Manejo de errores y códigos HTTP (+ 422, regla de 401)
  - Logging y configuración (config validada al arrancar)
  - Testing (`*.test.ts`, typecheck)
  - Excepciones (EXC-01 riesgo renovado; resolución planificada en 001 para EXC-02/06/07/09/11/12)
  - Anti-patrones (+ AP-21…AP-25)
  - Quality gates (+ CC-15; CC-06, CC-08 y gates de cierre actualizados)

Secciones eliminadas: ninguna.

Plantillas revisadas:
  ✅ .specify/templates/plan-template.md — "Constitution Check" se alimenta de CC-01..CC-15; sin cambios.
  ✅ .specify/templates/spec-template.md — compatible; sin cambios.
  ✅ .specify/templates/tasks-template.md — compatible; sin cambios.
  ✅ .specify/templates/checklist-template.md — compatible; sin cambios.
  ⚠ specs/001-typescript-migration/analysis.md §9 — las decisiones 2 (herramientas) y 6 (ubicación
     de engine/domain) quedan acotadas por esta enmienda; la 1 (validación) sigue abierta entre los
     dos candidatos aprobados.

TODOs diferidos:
  - TODO(MIGRATIONS_TOOL): elegir herramienta de migraciones (umzug / sequelize-cli) mediante enmienda;
    mientras tanto rige el procedimiento de scripts SQL versionados del Principio II.
  - TODO(EXPR_EVAL_REPLACEMENT): reemplazo de expr-eval como feature inmediatamente sucesora de 001
    (spec 001, FR-042), con la misma sintaxis y los mismos resultados.
  - TODO(EXC_RETIREMENT_001): al integrarse 001, retirar con enmienda PATCH las excepciones que resuelva.

Documento de referencia funcional: /blueprint.md (raíz del repositorio).
-->

# Flowify BPM Backend Constitution

Esta constitution rige el desarrollo del backend `my-bpm-back-express` de Flowify BPMS
(Node 20 + TypeScript + Express 4 + Sequelize 6 + PostgreSQL, autenticación JWT con passport-jwt y motor
BPM propio). Toda especificación, plan, lista de tareas e implementación generada con Spec Kit DEBE
cumplirla. El comportamiento funcional actual del sistema está documentado en `blueprint.md`.

Las referencias `ruta:línea` con extensión `.js` corresponden al commit `95e97c4` (línea base JavaScript
previa a la migración) y se conservan como referencia histórica de la deuda; tras la migración, el
archivo equivalente es el `.ts` homónimo.

Convenciones normativas: **MUST / DEBE** = obligatorio; **MUST NOT / NO DEBE** = prohibido;
**SHOULD / DEBERÍA** = obligatorio salvo justificación escrita en el plan (sección Complexity Tracking).

## Fase del proyecto: construcción y piloto / demo

Flowify está en **fase de construcción, piloto y demo**. No existen ambientes de QA ni de producción, y no
los habrá hasta que el producto esté lo suficientemente armado para entrar en la dinámica de producto
oficial. La base remota contiene **datos de demo**, no datos reales de clientes.

Por eso, en esta fase la prioridad es **completar y estabilizar la funcionalidad**, no endurecer el sistema.
Las brechas de seguridad, los datos mock y la falta de pruebas que documenta `blueprint.md` §11 son
**conocidas y aceptadas** mientras dure la fase, y no bloquean el trabajo.

**Lo que se relaja en esta fase (pasa de MUST a SHOULD):**

| Regla | Dónde | En fase piloto |
|---|---|---|
| `isAdmin` en operaciones de diseño y control de acceso por registro | Principio IV, CC-05 | SHOULD. Las rutas existentes sin `isAdmin` se mantienen (EXC-05). |
| Validación de entrada con la biblioteca aprobada y lista blanca de campos | Principio IV, CC-06 | SHOULD. Se recomienda en endpoints nuevos, pero no bloquea. |
| `npm audit` sin críticas/altas nuevas; reemplazo de `expr-eval` | Principio IV, CC-11, EXC-01 | SHOULD. Las dependencias nuevas igual se justifican en el plan. |
| Pruebas Jest/Supertest | Principio VII, CC-10 | SHOULD. Si no hay pruebas, la verificación manual MUST quedar en `quickstart.md`. |
| `cors()` abierto, config productiva | EXC-08, EXC-09 | Se mantiene así. |
| Datos de demo, seeds o mocks en la base y el código | — | Permitidos, sin marcado especial: en esta fase todo el sistema es demo. |

**Lo que sigue siendo MUST también en esta fase**, porque son baratos de cumplir y caros de corregir después:
capas y estructura (I); transacciones y migraciones versionadas (II); versionado de procesos (III); todas
las rutas detrás de `protect` salvo login; nunca devolver `passwordHash`; bcrypt para contraseñas; `.env`
y secretos fuera del repositorio; errores centralizados en código nuevo (V); motor determinista (VI);
contrato API estable (IX); tipado estricto (X).

**Criterios de salida de fase.** Antes de crear el primer ambiente de QA o producción MUST:
1. Hacer una enmienda (MINOR) que elimine esta sección y devuelva a MUST todas las reglas de la tabla.
2. Resolver o aceptar por escrito: EXC-01 (`expr-eval`), EXC-02 (códigos HTTP), EXC-03/04 (integridad),
   EXC-05 (autorización), EXC-08 (CORS), EXC-09 (arranque productivo), y los hallazgos C/A de
   `blueprint.md` §11.1.
3. Revisar los datos de demo de la base que se vaya a usar y los mocks del código, y decidir qué se
   retira o reemplaza.

## Principios núcleo (Core Principles)

### I. Arquitectura en capas por módulo

- Cada recurso de API MUST vivir en `src/api/<modulo>/` con, como mínimo, `<x>.routes.ts`,
  `<x>.controller.ts` y `<x>.service.ts`, montarse en `src/api/routes.ts` y, cuando el módulo recibe
  entrada o proyecta respuestas, `<x>.schemas.ts` (validación y tipos de entrada) y `<x>.mappers.ts`
  (proyecciones de salida puras).
- Flujo de dependencias MUST ser unidireccional: `routes → (middlewares) → controller → service → models`.
  Un controller MUST NOT importar modelos ni librerías de dominio (p. ej. `bcryptjs`); un service MUST NOT
  leer `req`/`res` ni responder HTTP.
- Las reglas de negocio MUST estar en servicios. La lógica de ejecución y decisión de procesos MUST
  permanecer en `src/api/engine/` y ser reutilizada (no duplicada) por otros módulos. Dentro del motor,
  la semántica del grafo (lectura del grafo, semántica de nodos, construcción del contexto de evaluación)
  MUST vivir en archivos puros sin acceso a base de datos, y los servicios de ejecución y decisión MUST
  ser la única cáscara que consulta y persiste.
- Los valores, tipos y errores de dominio compartidos (estados, tipos de nodo, `systemRole`, acciones de
  guardado, DTOs, `AppError`) MUST vivir en `src/domain/`, que MUST NOT depender de Express, Sequelize ni
  de ningún otro directorio de `src/`.
- Utilidades transversales MUST ir en `src/utils/`; configuración en `src/config/`; middlewares en
  `src/api/middlewares/`.

*Justificación*: es la estructura que el código ya sigue de forma consistente (7 módulos) y es la que
permite razonar, probar y revisar cambios de forma aislada. La capa de dominio sin dependencias evita
que los tipos compartidos arrastren infraestructura.

### II. Integridad transaccional y del modelo de datos

- Toda operación que escriba en más de una tabla, o que lea y luego escriba en función de lo leído,
  MUST ejecutarse dentro de `sequelize.transaction(async (t) => ...)` y MUST pasar `{ transaction: t }`
  a **todas** las consultas internas (incluidas lecturas y `count`).
- Las funciones que participan en una transacción iniciada por otra MUST recibirla como parámetro
  explícito y obligatorio de tipo `Transaction`; MUST NOT usarse transacciones implícitas (CLS).
- Los modelos Sequelize en `src/models/` MUST reflejar exactamente las columnas reales de la base;
  toda columna nueva MUST añadirse al modelo en el mismo cambio.
- Todo cambio de esquema MUST entregarse como script SQL versionado e idempotente en
  `db/migrations/NNN_descripcion.sql` (con sección de rollback comentada) junto con la actualización del
  modelo. MUST NOT modificarse el esquema directamente en la base sin script. MUST NOT usarse
  `sequelize.sync()` contra bases compartidas.
- Las tablas nuevas MUST declarar claves foráneas físicas con regla `ON DELETE` explícita y coherente
  con la nulabilidad de la columna. Los borrados de entidades con dependientes MUST tratar
  explícitamente a los dependientes (borrado en cascada dentro de la transacción o rechazo con 409).
- `resources/SQL Create flowifybpm test.sql` y `resources/old-prisma-scheme.prisma` MUST NOT usarse como
  referencia de esquema.

*Justificación*: el motor (`processEngine.service.js:144`, `:181`) y el versionado
(`process.service.js:97`) ya son atómicos y eso es lo que mantiene coherentes instancias y tareas. La
base actual carece de FKs de dominio y ya contiene tareas huérfanas; no se debe ampliar ese problema. El
parámetro tipado hace que el compilador detecte una consulta que olvida la transacción.

### III. Versiones de proceso inmutables en uso

- Una definición de proceso `ACTIVE` o con al menos una instancia MUST NOT modificarse en su grafo
  (elementos, secuencias, formularios); cualquier cambio MUST producir una nueva versión `DRAFT`.
- MUST existir como máximo una versión `ACTIVE` por `businessProcessKey`; toda nueva ruta que cambie
  `status` MUST reutilizar `validateSingleActiveVersion` o un equivalente transaccional.
- Las instancias MUST permanecer ligadas a la versión con la que se iniciaron (`process_def_id`).
- Los estados válidos de definición son `DRAFT`, `ACTIVE`, `INACTIVE`, `DEPRECATED`; nuevas rutas MUST
  validar contra esa lista. Los estados de instancia (`RUNNING`, `COMPLETED`) y de tarea
  (`PENDING`, `COMPLETED`) MUST ampliarse solo mediante spec y enmienda del blueprint.
- La creación de versión nueva MUST calcular `version` como el máximo existente para la key + 1.

*Justificación*: reglas ya implementadas en `process.service.js:18-32` y `:107-170` que protegen la
trazabilidad de los casos en curso.

### IV. Seguridad y autorización por defecto

- Toda ruta MUST montarse detrás de `protect` (passport-jwt), salvo las explícitamente públicas
  (hoy solo `POST /api/auth/login`), que MUST declararse como tales en la spec.
- Toda operación administrativa o de diseño (usuarios, roles, definiciones de proceso, catálogos,
  logs, escritura directa de instancias) MUST exigir `isAdmin`.
- Toda lectura o escritura sobre instancias y tareas MUST verificar acceso a nivel de registro
  (iniciador, asignado, rol asignado o ADMIN).
- Toda entrada (body, params, query) de endpoints nuevos o modificados MUST validarse en la capa de
  rutas con la biblioteca de validación aprobada (una sola en todo el proyecto, ver *Stack*) y MUST
  aplicarse lista blanca de campos antes de `create`/`update` (prohibido pasar `req.body` completo a
  Sequelize).
- Las respuestas MUST NOT incluir `passwordHash` ni secretos. La identidad autenticada disponible en
  `req.user` MUST tiparse como un usuario sin hash. Contraseñas MUST hashearse con `bcryptjs`
  (≥ 10 rondas) en la capa de servicio.
- Secretos MUST leerse de variables de entorno a través de `src/config/`; `.env` MUST NOT versionarse,
  imprimirse ni documentarse.
- Dependencias nuevas MUST pasar `npm audit` sin vulnerabilidades críticas/altas nuevas.

*Justificación*: hoy cualquier usuario autenticado puede borrar procesos e instancias (blueprint §8.3);
este principio impide que nuevas funcionalidades repitan esa brecha.

*Aplicación por fase*: en la fase piloto / demo, las reglas de `isAdmin`, acceso por registro, validación
de entrada y `npm audit` se aplican como SHOULD (ver "Fase del proyecto"). Las demás reglas de este
principio son MUST desde ya.

### V. Errores explícitos y centralizados

- Los controllers MUST envolverse con `catchAsync` y MUST NOT contener `try/catch` para traducir errores.
- Los servicios MUST lanzar errores de negocio con `AppError` (`src/domain/errors.ts`), que lleva
  `statusCode` y un `code` estable en mayúsculas (p. ej. `PROCESS_MODEL_ERROR`); nunca `new Error()`
  desnudo para condiciones esperadas.
- El middleware central MUST ser el único lugar que formatea errores, con cuerpo JSON
  `{ "message": string, "code"?: string, "details"?: unknown }` y el `statusCode` del error (500 solo
  para errores no controlados, sin filtrar stack al cliente).
- Un error de negocio sobre un usuario ya autenticado MUST NOT responder 401: el frontend
  `sveltekit-bpm` cierra la sesión ante cualquier 401 con token activo. 401 queda reservado a
  autenticación (sin token, token inválido o vencido, credenciales de login inválidas).
- Las respuestas de error que hoy exponen la clave `error` MUST conservarla junto a `message` mientras
  existan consumidores que la lean.

*Justificación*: el patrón `catchAsync` + middleware central ya existe (`src/utils/catchAsync.js`,
`src/api/middlewares/error.middleware.js`) pero hoy todo termina en 500 (blueprint §11.2). La regla de
401 nace de un defecto real: el cambio de contraseña con clave anterior errónea expulsa al usuario.

### VI. Motor de procesos determinista y verificable

- La semántica de nodos (`START_EVENT`, `USER_TASK`, `EXCLUSIVE_GATEWAY`, `PARALLEL_GATEWAY`,
  `END_EVENT`) MUST ser idéntica en el motor de ejecución y en el motor de decisión. MUST garantizarse
  por construcción: una tabla de semántica indexada por el tipo de nodo, verificada como exhaustiva por
  el compilador, y lógica compartida para el contexto de evaluación y la elección de ruta del gateway
  exclusivo. Todo tipo de nodo nuevo MUST implementarse en ambos o rechazarse al guardar la definición.
- Las diferencias de semántica existentes documentadas en `blueprint.md` (p. ej. `AUTO_TASK`) MUST
  conservarse hasta que una spec las cambie, y MUST quedar explícitas en la tabla de semántica.
- Las condiciones MUST evaluarse exclusivamente mediante `src/utils/expressionEngine.ts` y sobre el
  contexto estándar `{ ...businessData, instance, task }`. Una expresión vacía o que falla MUST evaluarse
  como falsa.
- Toda recorrida recursiva del grafo MUST protegerse contra ciclos (conjunto de visitados o límite de
  profundidad) y contra referencias a elementos inexistentes; esas condiciones MUST reportarse como
  error de modelado (`AppError` 422, `code: PROCESS_MODEL_ERROR`) revirtiendo la transacción.
- Cambios en el motor MUST acompañarse de pruebas de escenarios de grafo (Principio VII).
- Toda decisión expuesta como servicio MUST auditarse en `decision_logs`, también cuando falla.

*Justificación*: el motor es el núcleo del producto; hoy ya existen divergencias (`AUTO_TASK`) y
fragilidades (join paralelo) documentadas en el blueprint §6 y §11.4. La exhaustividad verificada por
el compilador convierte la paridad en una propiedad del tipo y no de la disciplina.

### VII. Pruebas proporcionales al riesgo

- Toda feature nueva MUST incluir pruebas automáticas con Jest:
  - Servicios con reglas de negocio, motor o versionado: pruebas unitarias/integración MUST.
  - Endpoints nuevos o modificados: prueba de contrato con Supertest MUST (status, forma de respuesta,
    401/403 de autorización).
- Corrección de bugs SHOULD incluir una prueba que reproduzca el bug.
- Las pruebas MUST NOT ejecutarse contra la base compartida remota; MUST usar una base Postgres de
  prueba dedicada (variable `DATABASE_URL` de test) o mocks del modelo.
- El núcleo puro del motor (Principio I) SHOULD probarse sin base de datos.

*Justificación*: el repositorio tiene Jest y Supertest instalados pero cero pruebas; el riesgo de
regresión en el motor es alto.

*Aplicación por fase*: en la fase piloto / demo este principio es SHOULD. Si una feature no trae pruebas,
la verificación manual MUST documentarse en `quickstart.md`. Se recomienda empezar por el motor, que es
donde una regresión cuesta más.

### VIII. Observabilidad sin fuga de datos

- Todo log MUST emitirse a través de un único logger winston (`src/utils/logger.ts`); `console.*` MUST NOT
  usarse (regla de lint).
- Los logs MUST NOT contener contraseñas, tokens, hashes ni el contenido completo de `businessData` o del
  contexto de evaluación; se registran identificadores (instancia, tarea, elemento, usuario) y resultados.
- Errores no controlados MUST registrarse con stack y contexto de la petición (método, ruta, userId).

*Justificación*: hoy coexisten dos loggers y `console.log` que imprime datos de negocio
(`expressionEngine.js:15-17`).

### IX. Contrato API estable y cambios quirúrgicos

- Rutas y formas de respuesta consumidas por el frontend `sveltekit-bpm` MUST NOT cambiar de forma
  incompatible sin una spec que lo declare y un plan de coordinación con el frontend.
- Las convenciones existentes MUST respetarse: prefijo `/api`, recursos en plural y kebab-case,
  JSON en camelCase, ids numéricos en params.
- Los cambios SHOULD ser quirúrgicos: modificar solo lo necesario para la feature, sin refactors no
  solicitados en el mismo cambio (regla heredada de `GEMINI.md`, sección 5). Las correcciones de deuda
  se planifican como features propias.

*Justificación*: el backend y el frontend evolucionan en repositorios distintos y ya hay contratos
rotos (`GET /api/fields` → 404).

### X. Tipado estricto y fuente única de tipos

- Todo código de aplicación y de pruebas MUST ser TypeScript compilado con `strict: true`,
  `noUncheckedIndexedAccess: true` y `noImplicitOverride: true`, y MUST pasar `tsc --noEmit` y el lint
  sin errores.
- `any` MUST NOT usarse. Los datos de forma libre (`businessData`, `diagramJson`, `validations`,
  `completionPayload`) y los bordes con librerías sin tipos MUST tratarse como `unknown` (o un tipo
  JSON explícito) y estrecharse con validación o guardas de tipo antes de usarse.
- Las aserciones `as` y `!` MUST NOT usarse para silenciar al compilador; se permiten solo con un
  comentario que explique por qué la invariante se cumple. `@ts-ignore` está prohibido;
  `@ts-expect-error` solo con comentario.
- Los valores de dominio MUST definirse una sola vez como uniones literales derivadas de constantes
  `as const` en `src/domain/`; MUST NOT usarse `enum`.
- Los tipos de entrada de cada endpoint MUST derivarse de su esquema de validación o declararse junto a
  él en `<x>.schemas.ts`; los tipos de salida MUST ser los de retorno de sus mappers. MUST NOT
  mantenerse dos definiciones manuales de la misma forma.
- Las promesas MUST esperarse o devolverse (sin promesas flotantes), y los `switch` sobre uniones de
  dominio MUST ser exhaustivos.

*Justificación*: la migración a TypeScript solo reduce defectos si el compilador no tiene vías de
escape; las reglas reflejan los fallos reales encontrados en la línea base (atributos inexistentes en
proyecciones, valores de estado repetidos como literales, promesas concurrentes sin orden).

## Stack tecnológico y librerías aprobadas

| Librería | Versión | Uso aprobado |
|---|---|---|
| Node.js | 20.x | Runtime. |
| typescript | 5.x | Lenguaje de todo `src/` y `tests/`. Salida CommonJS (`module: commonjs`) en `dist/`. |
| @types/node y `@types/*` de las librerías usadas | mayor alineada con la librería | Tipos de librerías sin tipos propios (express, passport, passport-jwt, jsonwebtoken, bcryptjs, cors, config, supertest, jest). |
| tsx | 4.x | Ejecución de TypeScript en desarrollo (`tsx watch`). Reemplaza a nodemon. |
| eslint + typescript-eslint | 9.x / 8.x | Lint con reglas que codifican esta constitution (ver Principio X y AP-21…AP-25). |
| prettier | 3.x | Formato uniforme (resuelve AP-19). |
| express | 4.21.x (`^4.19.2`) | Servidor HTTP y routers por módulo. |
| sequelize | 6.37.x | ORM y transacciones. Único mecanismo de acceso a datos. |
| pg / pg-hstore | 8.16.x / 2.3.x | Driver Postgres para Sequelize. |
| passport / passport-jwt | 0.7.0 / 4.0.1 | Autenticación Bearer JWT (`src/config/passport.ts`). |
| jsonwebtoken | 9.0.x | Firma de tokens (HS256, 8 h). |
| bcryptjs | 2.4.x | Hash de contraseñas. |
| helmet | 7.2.x | Cabeceras de seguridad. |
| cors | 2.8.x | CORS (MUST restringirse a orígenes configurados en nuevas configuraciones). |
| express-rate-limit | 7.5.x | Rate limiting global y por ruta sensible. |
| **Validación** (candidatos) | express-validator 7.x **o** zod (mayor fijada en el plan) | Validación de entrada. El plan de 001 MUST elegir **uno** para todo el proyecto, justificarlo y retirar el otro de `package.json`. |
| expr-eval | 2.0.2 exacta | Evaluación de condiciones de gateways, solo vía `utils/expressionEngine.ts` (ver EXC-01). |
| winston | 3.17.x | Logging (único logger, `utils/logger.ts`). |
| config + dotenv | 3.3.x / 17.2.x | Configuración por entorno (`src/config/*.json`) y carga de `.env`. |
| jest / supertest | 29.7.x / 7.1.x | Pruebas unitarias, integración y contrato. |
| **Transformación de Jest** (candidatos) | ts-jest 29.x **o** @swc/jest | El plan de 001 MUST elegir uno; el chequeo de tipos de las pruebas lo da `tsc --noEmit` en ambos casos. |
| swagger-jsdoc / swagger-ui-express | 6.2.x / 5.0.x | Aprobadas para documentar la API; hoy sin montar. Si se usan, MUST montarse solo fuera de producción o tras `isAdmin`. |

Reglas:

- MUST NOT añadirse otro ORM/query builder (Prisma, Knex, TypeORM), otro framework HTTP, otra librería
  de autenticación ni más de una librería de validación sin enmienda.
- MUST NOT convivir JavaScript y TypeScript en el código de aplicación de la rama principal: la
  migración se integra completa en un único cambio (spec 001, FR-002). Durante el trabajo en la rama
  de la feature la convivencia es temporal y admitida.
- MUST NOT introducirse ESM en la salida compilada sin enmienda (el orden de carga `dotenv` → `config`
  depende de CommonJS).
- Toda dependencia nueva MUST justificarse en el plan (qué problema resuelve, por qué no alcanza el
  stack actual), fijarse con `^` a una versión mayor concreta y pasar `npm audit`. Excepción:
  `expr-eval` se fija a la versión exacta hasta su reemplazo.

## Arquitectura, capas y reglas de dependencia

| Capa | Ubicación | Responsabilidad | Puede depender de | NO puede depender de |
|---|---|---|---|---|
| Bootstrap | `src/app.ts` (Express sin `listen`), `src/server.ts` (conexión + `listen`) | Middlewares globales, montaje de `/api`, error middleware, arranque tras `sequelize.authenticate()` | config, routes, middlewares | servicios, modelos directamente |
| Rutas | `src/api/<m>/<x>.routes.ts` | Verbo + path, `protect`, `isAdmin`, validación | controller, middlewares, schemas | services, models |
| Controller | `<x>.controller.ts` | Extraer `req.params/body/query/user`, invocar servicio, elegir status HTTP | service, `utils/catchAsync`, domain | models, bcrypt, Sequelize |
| Service | `<x>.service.ts` | Reglas de negocio, transacciones, acceso a datos | models, mappers, otros services, domain, `utils/*` | `req`, `res`, express |
| Mappers | `<x>.mappers.ts` | Proyección pura entidad → DTO de respuesta | domain | models (salvo tipos), express |
| Motor (núcleo) | `src/api/engine/` archivos de grafo, semántica y contexto | Semántica pura del grafo | domain, `utils/expressionEngine` | models, Sequelize, express |
| Motor (cáscara) | `src/api/engine/*.service.ts` | Ejecución y decisión: cargar, aplicar núcleo, persistir | núcleo del motor, models, domain | controllers |
| Dominio | `src/domain/` | Constantes, uniones de dominio, DTOs, `AppError` | nada de `src/` | todo lo demás |
| Modelos | `src/models/*.model.ts`, `index.ts` | Definición de tablas y asociaciones | `config/database`, domain | services, controllers |
| Middlewares | `src/api/middlewares/` | auth, admin, error, validación | passport, utils, domain | services de dominio |
| Config | `src/config/` | Config validada, Sequelize, passport | env | api |
| Utils | `src/utils/` | Funciones puras y helpers transversales | librerías externas, domain | api, models |

Los servicios de un módulo MAY llamar servicios de otro módulo (p. ej. tasks → engine) pero MUST NOT
existir dependencias circulares; los `import` MUST estar al inicio del archivo (prohibidos los imports
dentro de funciones, ver AP-09).

## Estructura de carpetas, convenciones de nombres y plantilla de módulo

```text
src/
├── app.ts                 # Express configurado, sin listen (importable por Supertest)
├── server.ts              # authenticate() + listen
├── api/
│   ├── routes.ts
│   ├── middlewares/       auth.middleware.ts · admin.middleware.ts · error.middleware.ts · validate.middleware.ts
│   ├── engine/            núcleo puro (grafo, semántica, contexto) + execution/decision *.service.ts
│   └── <modulo-kebab>/
│       ├── <recurso>.routes.ts
│       ├── <recurso>.controller.ts
│       ├── <recurso>.service.ts
│       ├── <recurso>.schemas.ts
│       └── <recurso>.mappers.ts
├── domain/                constants.ts · types.ts · errors.ts
├── config/                index.ts · database.ts · passport.ts · default.json · custom-environment-variables.json · <env>.json
├── models/                <entidad-kebab>.model.ts · index.ts
└── utils/                 catchAsync.ts · expressionEngine.ts · logger.ts · pick.ts
db/migrations/             NNN_descripcion.sql
tests/                     unit/ · engine/ · contract/ · fixtures/
```

Los nombres exactos de los archivos internos del motor los fija el plan de 001; la separación núcleo
puro / cáscara de servicios es obligatoria (Principio I).

Nombres:

- Carpeta de módulo: plural kebab-case igual al path (`process-instances`, `field-definitions`).
- Archivos: singular camelCase del recurso + sufijo de capa (`processInstance.controller.ts`).
  Rutas: SHOULD usar singular (`<recurso>.routes.ts`); los archivos existentes en plural (`tasks.routes`,
  `processes.routes`, `processInstances.routes`) pueden conservar su nombre al migrar.
- Modelos: archivo kebab-case singular (`field-definition.model.ts`), modelo PascalCase singular
  (`FieldDefinition`), tabla snake_case plural (`field_definitions`).
- Funciones de servicio: verbo + recurso (`getAllX`, `getXById`, `createX`, `updateX`, `deleteX`).
- Alias de asociaciones: camelCase descriptivo (`processElements`, `assignedRole`, `startedByUser`).
- Tipos: PascalCase; DTOs de respuesta con sufijo `Dto`, entradas con sufijo `Input`.

Plantilla para agregar un módulo de API (ejemplo `field-definitions`; la sintaxis de validación depende
de la biblioteca elegida en el plan de 001 — aquí se ilustra con un esquema que deriva el tipo):

```ts
// src/api/field-definitions/fieldDefinition.schemas.ts
export const createFieldDefinitionSchema = /* esquema de la biblioteca aprobada */;
export type CreateFieldDefinitionInput = /* tipo derivado del esquema */;

// src/api/field-definitions/fieldDefinition.routes.ts
import { Router } from 'express';
import * as controller from './fieldDefinition.controller';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { validateBody, validateIdParam } from '../middlewares/validate.middleware';
import { createFieldDefinitionSchema } from './fieldDefinition.schemas';

export const fieldDefinitionRouter = Router();
fieldDefinitionRouter.use(protect);
fieldDefinitionRouter.get('/', controller.getAll);
fieldDefinitionRouter.post('/', isAdmin, validateBody(createFieldDefinitionSchema), controller.create);
fieldDefinitionRouter.get('/:id', validateIdParam, controller.getById);

// src/api/field-definitions/fieldDefinition.mappers.ts
import type { FieldDefinition } from '../../models';
import type { FieldDefinitionDto } from '../../domain/types';

export const toFieldDefinitionDto = (f: FieldDefinition): FieldDefinitionDto => ({
  id: f.id, name: f.name, label: f.label, fieldType: f.fieldType,
});

// src/api/field-definitions/fieldDefinition.service.ts
import { FieldDefinition } from '../../models';
import { AppError } from '../../domain/errors';
import { toFieldDefinitionDto } from './fieldDefinition.mappers';
import type { CreateFieldDefinitionInput } from './fieldDefinition.schemas';

export const getAll = async () =>
  (await FieldDefinition.findAll({ order: [['name', 'ASC']] })).map(toFieldDefinitionDto);

export const getById = async (id: number) => {
  const field = await FieldDefinition.findByPk(id);
  if (!field) throw new AppError('Field definition not found', 404, 'NOT_FOUND');
  return toFieldDefinitionDto(field);
};

export const create = async ({ name, label, fieldType }: CreateFieldDefinitionInput) =>
  toFieldDefinitionDto(await FieldDefinition.create({ name, label, fieldType })); // lista blanca

// src/api/field-definitions/fieldDefinition.controller.ts
import { catchAsync } from '../../utils/catchAsync';
import * as service from './fieldDefinition.service';

export const getAll = catchAsync(async (_req, res) => { res.status(200).json(await service.getAll()); });
export const getById = catchAsync(async (req, res) => {
  res.status(200).json(await service.getById(Number(req.params.id)));
});
export const create = catchAsync(async (req, res) => { res.status(201).json(await service.create(req.body)); });

// src/api/routes.ts
router.use('/field-definitions', fieldDefinitionRouter);
```

Pasos obligatorios al agregar un módulo: (1) modelo + asociaciones en `models/index.ts` si hay tabla
nueva, con script en `db/migrations/`; (2) routes/controller/service/schemas/mappers; (3) montaje en
`src/api/routes.ts`; (4) pruebas de contrato y de servicio; (5) actualizar `blueprint.md` (catálogo de
endpoints, reglas de negocio, modelo de datos).

## Patrones de diseño aplicados

| Patrón | Dónde | Regla |
|---|---|---|
| Capas Route → Controller → Service → Model | todos los módulos | MUST (Principio I). |
| `catchAsync` tipado (wrapper de handlers async) | `src/utils/catchAsync` | MUST en todo controller. |
| Middleware de errores centralizado + `AppError` con `code` | `src/api/middlewares/error.middleware`, `src/domain/errors` | MUST ser el único formateador (Principio V). |
| Middlewares de autorización componibles (`protect`, `isAdmin`) | `src/api/middlewares/` | MUST; `router.use(protect)` a nivel de router cuando todo el módulo es privado. |
| Unit of Work con transacción gestionada de Sequelize, pasada explícitamente | `process.service.js:97`, `:208`, `:306`; `processEngine.service.js:144`, `:181` | MUST para escrituras multi-tabla (Principio II). |
| Núcleo funcional / cáscara imperativa en el motor | `src/api/engine/` | MUST (Principios I y VI): el núcleo calcula, la cáscara carga y persiste. |
| Tabla de semántica de nodos exhaustiva por tipo | `src/api/engine/` | MUST (Principio VI): `satisfies Record<ElementType, …>` o equivalente verificado por el compilador. |
| Servicio unificado de guardado con decisión de versionado | `process.service.js:94-203` + `getSaveAnalysis` (`:71-92`) | Patrón de referencia para entidades versionadas. |
| Sincronización por diff de clave natural (`bpmnElementId`) | `process.service.js:34-61` | SHOULD reutilizarse para colecciones hijas editadas en bloque (borrando dependientes, ver EXC-04). |
| Evaluador de expresiones aislado (Strategy) | `src/utils/expressionEngine` | Único punto de evaluación de condiciones; permite cambiar la librería sin tocar el motor. |
| Auditoría de decisiones (log antes/después) | `decision.service.js:90-158` | MUST para nuevas APIs de decisión o acciones críticas. |
| DTO de salida mediante mappers puros | `<x>.mappers.ts` | MUST: las respuestas se construyen con proyecciones explícitas, sin mutar entidades del ORM. |
| Uniones literales de dominio desde constantes `as const` | `src/domain/constants.ts` | MUST (Principio X). |
| Configuración validada e inmutable | `src/config/index.ts` | MUST: se valida al arrancar y se expone congelada y tipada. |
| Asociaciones centralizadas | `src/models/index.ts` | MUST (ver convenciones de modelos). |

## Convenciones de modelos Sequelize y esquema

- Un archivo por modelo con una clase tipada (`class X extends Model<InferAttributes<X>,
  InferCreationAttributes<X>>` con `declare` de atributos y `X.init({...}, { sequelize, tableName:
  '<snake_plural>', timestamps: false })`) u otra forma igualmente tipada que el plan justifique.
- Atributos en camelCase con `field: 'snake_case'` para toda columna compuesta. `id` INTEGER
  `autoIncrement` + `primaryKey` (`CreationOptional<number>`).
- Fechas de creación como atributo explícito `createdAt` con `field: 'created_at'` y
  `defaultValue: DataTypes.NOW` (patrón vigente con `timestamps: false`).
- Datos semiestructurados en `DataTypes.JSONB` (`businessData`, `validations`, `completionPayload`...),
  tipados como `unknown` o tipo JSON explícito (Principio X).
- Índices y unicidades MUST declararse también en el modelo (`indexes: [...]`) para documentarlos.
- Todas las asociaciones MUST declararse en `src/models/index.ts` (ambos lados, con `foreignKey` y `as`)
  y los modelos MUST exportarse desde ese módulo. Los servicios MUST importar modelos solo desde
  `src/models`.
- `onDelete` en asociaciones MUST NOT considerarse garantía de integridad (no hay `sync`): la integridad
  la dan FKs físicas (migraciones) y la lógica transaccional del servicio.
- Las columnas de estado son `STRING(50)`; los valores válidos MUST definirse en `src/domain/constants.ts`
  y los atributos MUST tiparse con la unión correspondiente.

## Manejo de errores y códigos HTTP

| Situación | Código | Cuerpo |
|---|---|---|
| Lectura correcta | 200 | recurso / lista |
| Creación | 201 | recurso creado |
| Borrado | 204 | vacío |
| Validación de entrada fallida, JSON malformado, id no numérico | 400 | `{ message, code, details?: [{ field, msg }] }` |
| Sin token / token inválido o vencido / credenciales de login inválidas | 401 | `{ message }` |
| Autenticado sin permiso (no admin, tarea ajena) | 403 | `{ message }` |
| Recurso inexistente (o no visible para el usuario) | 404 | `{ message, code }` |
| Conflicto de estado (otra versión ACTIVE, rol con usuarios, clave duplicada) | 409 | `{ message, code }` |
| Modelo de proceso inconsistente (referencia rota, ciclo sin bloqueo, tarea sin salida) | 422 | `{ message, code: 'PROCESS_MODEL_ERROR' }` |
| Error no controlado | 500 | `{ message: 'Internal server error' }` (sin stack) |

- Los errores de unicidad/FK de Sequelize (`UniqueConstraintError`, `ForeignKeyConstraintError`) MUST
  mapearse a 409 en el middleware central.
- `passport-jwt` responde 401 por sí mismo; se mantiene.
- Ningún error de negocio de un usuario autenticado usa 401 (Principio V).

## Seguridad

Estado actual y obligaciones:

| Control | Estado actual | Obligación para código nuevo |
|---|---|---|
| helmet | Global (`app.js:15`) | Mantener. |
| cors | Abierto a todo origen (`app.js:16`) | Orígenes desde configuración (`config`), ver EXC-08. |
| Rate limit | Global 100 req/15 min (`app.js:20-24`) | Limitar adicionalmente login y endpoints costosos. |
| JWT | HS256, 8 h, payload `{id, roleIds, systemRole}` (`auth.service.js:28-34`) | No añadir datos sensibles al payload; decisiones de autorización críticas SHOULD reconsultar la base. |
| bcrypt | 10 rondas | Mantener ≥ 10; hash solo en servicios. |
| Validación de entrada | **Sin uso** en ningún endpoint | MUST en todo endpoint nuevo o modificado con la biblioteca aprobada (Principio IV). |
| isAdmin | users, roles, `/processes/all`, `/engine/decision-logs` | MUST en toda operación de diseño/administración. |
| Autorización por registro | Solo en `completeTask` | MUST en instancias y tareas nuevas. |
| Estado de usuario (`ACTIVE`) | No verificado | Nuevas rutas de autenticación MUST rechazar usuarios no activos. |
| Auditoría de dependencias | `npm audit` reporta críticas | Gate CC-11. |

## Logging y configuración

- Logger único: `src/utils/logger.ts` (winston). El middleware de errores MUST usarlo (ver EXC-06).
  Niveles: `error` (fallos), `warn` (reglas violadas esperables), `info` (eventos de negocio: instancia
  iniciada/completada, tarea completada, versión creada/activada), `debug` (traza del motor).
- Configuración no secreta: `src/config/default.json` + `<NODE_ENV>.json` + mapeo de variables en
  `custom-environment-variables.json`; acceso solo vía `src/config/index.ts`, que MUST validar al
  arrancar las variables obligatorias, fallar con mensaje claro (sin imprimir valores) si faltan, y
  exponer un objeto tipado e inmutable. Cada archivo `<env>.json` MUST ser JSON válido (al menos `{}`).
- Secretos (`DATABASE_URL`, `JWT_SECRET`) MUST venir de variables de entorno, mapeadas en
  `custom-environment-variables.json`. MUST NOT leerse `process.env` fuera de `src/config/`.
- Variables requeridas: `PORT`, `NODE_ENV`, `NODE_CONFIG_DIR`, `DATABASE_URL`, `JWT_SECRET`. Toda variable
  nueva MUST documentarse en `blueprint.md` §12 (solo el nombre, nunca el valor).
- Scripts npm (desarrollo, compilación, arranque productivo, `typecheck`, `lint`, `test`) MUST funcionar
  en Windows y Unix (sin `VAR=x cmd`; apoyarse en `.env` o `cross-env` previa aprobación en el plan).

## Testing

- Estado real: **0 pruebas**. `jest` 29 y `supertest` 7 instalados; `npm test` ejecuta `jest`.
- Ubicación: `tests/unit`, `tests/engine`, `tests/contract`, `tests/fixtures`; archivos `*.test.ts`.
- Para Supertest, el `app` MUST poder importarse sin abrir puerto ni conectar a la base (`src/app.ts`
  separado de `src/server.ts`).
- Prioridad de cobertura para cualquier feature que toque estas áreas: motor, versionado
  (`process.service`), decisión, `expressionEngine`, autorización.
- Base de pruebas: Postgres dedicada o mocks; MUST NOT usar la base compartida.

## Excepciones aplicadas (deuda aceptada temporalmente)

Desviaciones existentes que se toleran **solo en el código ya escrito**. Cualquier feature que modifique
el archivo afectado SHOULD resolver la excepción si está dentro de su alcance; toda feature nueva MUST
NOT replicarlas.

Las excepciones EXC-01, EXC-02, EXC-03, EXC-04, EXC-05, EXC-08 y EXC-09 son además **criterios de salida
de fase**: pueden quedarse así durante el piloto, pero MUST resolverse o aceptarse por escrito antes de
crear un ambiente de QA o producción (ver "Fase del proyecto").

| ID | Desviación | Ubicación | Motivo de aceptación | Condición de salida |
|---|---|---|---|---|
| EXC-01 | `expr-eval` 2.0.2 con vulnerabilidades sin corrección (GHSA-8gw3-rxh4-v6jx, GHSA-jc85-fpwf-qm7x, GHSA-q9v2-7m5w-4693) | `package.json`, `src/utils/expressionEngine.js:2,20` | Es el único evaluador del motor y está aislado en un archivo. Riesgo renovado por escrito en spec 001 (Clarifications, 2026-11-05): fase piloto con datos de demo. | Feature inmediatamente sucesora de 001 que reemplace la librería con la misma sintaxis y los mismos resultados, usando la batería de expresiones de 001 como aceptación. TODO(EXPR_EVAL_REPLACEMENT). |
| EXC-02 | Middleware de errores devuelve siempre 500 texto plano | `src/api/middlewares/error.middleware.js:18-21` | El frontend actual depende de esos códigos; cambiarlos requiere coordinación | Feature "errores HTTP correctos" (Principio V) coordinada con el frontend. 001 corrige los códigos de su FR-021. |
| EXC-03 | Base sin FKs de dominio; cascadas solo declarativas en Sequelize | Base de datos; `src/models/index.js:18-34` | Esquema heredado de Prisma `relationMode="prisma"` con datos huérfanos existentes | Migración que limpie huérfanos y cree FKs. |
| EXC-04 | Borrados sin tratar dependientes | `process.service.js:59`, `:304-318`; `processInstance.service.js:133-135` | Funcionalidad en uso por el modelador | Feature de integridad (EXC-03). |
| EXC-05 | Rutas de diseño de procesos y escritura de instancias sin `isAdmin` ni control por registro | `processes.routes.js:8-27`, `processInstances.routes.js:7-21`, `task.service.js:66` | El frontend actual no distingue estos permisos | Feature de autorización coordinada con frontend (módulo `PROC`). |
| EXC-06 | Dos loggers y `console.*` | `error.middleware.js:3-16`, `processEngine.service.js` (11 usos), `expressionEngine.js` (5 usos), `app.js` (3 usos) | Traza útil durante desarrollo del motor | Unificación en `utils/logger` (001). |
| EXC-07 | Código y dependencias TypeScript sin uso; metadatos de plantilla en `package.json` | `src/index.ts`, `tsconfig.json`, `package.json` (`name`, `author`, `description`) | Restos de la plantilla Firebase Studio, inocuos | Migración a TypeScript (001). |
| EXC-08 | `cors()` abierto | `src/app.js:16` | Desarrollo local con frontend en otro puerto | Configurar orígenes por entorno antes de cualquier despliegue. |
| EXC-09 | `app.js` arranca el servidor al importarse; `production.json` vacío rompe `start:prod`; `start:dev` solo Unix | `src/app.js:55`, `src/config/production.json`, `package.json` | No hay despliegue productivo ni pruebas todavía | Separación app/server y scripts multiplataforma (001). |
| EXC-10 | Columnas `process_elements.actions` y `case_assignment_config` fuera del modelo | `src/models/process-element.model.js` | Se poblaron fuera de la API; incluirlas cambia la respuesta de formularios | Feature que formalice acciones de tarea (afecta `task.service.js:124`). |
| EXC-11 | Controllers con `try/catch` manual y respuestas de error ad hoc | `user.controller.js`, `role.controller.js`, `auth.controller.js:10-20` | Funcionan y su contrato lo usa el frontend | `catchAsync` + middleware central (001). |
| EXC-12 | `JWT_SECRET` leído directamente de `process.env` | `src/config/passport.js:7`, `src/api/auth/auth.service.js:34` | Funciona con dotenv | Config validada (001). |
| EXC-13 | Documentos legados (`resources/*.sql`, `*.prisma`, README cap. 1, `GEMINI.md`, `.idx/airules.md`) | `resources/`, raíz | Valor histórico | Marcar como legado o eliminar; la referencia vigente es `blueprint.md`. |

Las excepciones cuya condición de salida indica "(001)" MUST retirarse de esta tabla mediante enmienda
PATCH cuando la feature 001-typescript-migration se integre en la rama principal.
TODO(EXC_RETIREMENT_001).

## Prácticas NO recomendadas a continuar (anti-patrones)

| ID | Anti-patrón | Ejemplo en el código | Alternativa obligatoria |
|---|---|---|---|
| AP-01 | Lanzar `new Error()` sin código para errores de negocio | `auth.service.js:11,16`; `process.service.js:30,76,211`; `processEngine.service.js:195` | `throw new AppError(msg, 4xx, CODE)` (Principio V). |
| AP-02 | `try/catch` en controllers traduciendo `statusCode` a mano | `role.controller.js:34-44`, `auth.controller.js:10-20` | `catchAsync` + middleware central. |
| AP-03 | Pasar `req.body` completo a `create`/`update` | `processInstance.service.js:13-15`, `:128-132`; `process.service.js:174-185`; `role.service.js:3-5` | Lista blanca explícita + validación. |
| AP-04 | Lógica de dominio en el controller (hash de contraseña) | `user.controller.js:2,7` | Hash dentro del servicio (como `user.service.js:53`). |
| AP-05 | Validación de reglas que hace inalcanzable el código siguiente | `process.service.js:215` vs `:217-228` (DEPRECATED nunca se aplica) | Una sola rutina transaccional de activación con comportamiento definido en la spec. |
| AP-06 | Consultas dentro de una transacción sin `{ transaction: t }` / consultas sin uso | `processEngine.service.js:267-279` | Pasar `transaction` siempre; eliminar consultas muertas. |
| AP-07 | Usar `findOne` cuando la regla admite varias filas sin documentarlo | `processEngine.service.js:228` (una salida por tarea), `:167` (un START_EVENT) | Validar la cardinalidad al guardar la definición o iterar todas. |
| AP-08 | Recursión sobre el grafo sin protección de ciclos ni nulos | `processEngine.service.js:53-60`, `decision.service.js:77-79` | Conjunto de visitados / límite y error de modelado 422. |
| AP-09 | `require`/`import` dentro de funciones / imports perezosos | `decision.service.js:33`, `:130`, `:167` | Imports al inicio del archivo. |
| AP-10 | Atributos inexistentes en proyecciones | `decision.service.js:169` (`username`) | Atributos tipados del modelo (`fullName`) y prueba de contrato. |
| AP-11 | `console.log` con datos de negocio | `expressionEngine.js:15-17`, `processEngine.service.js:14-16` | `logger.debug` con identificadores (Principio VIII). |
| AP-12 | Devolver resultados crudos de Sequelize como respuesta (`[n]`, 204 sin verificar existencia) | `processInstance.service.js:128-132`, `user.service.js:77-81` | Verificar existencia (404) y devolver el recurso mediante mapper. |
| AP-13 | Confiar en `onDelete: 'CASCADE'` de asociaciones | `src/models/index.js:18-34` | FK física por migración o borrado explícito transaccional. |
| AP-14 | `\|\| null` para valores por defecto que pueden ser falsy válidos | `task.service.js:111` | `??` (nullish coalescing). |
| AP-15 | `order` dentro de `include` (Sequelize lo ignora) | `processInstance.service.js:66` | `order` en el nivel superior con ruta de asociación. |
| AP-16 | Nombres de columna engañosos | `process_definitions.bpmn_xml` guarda JSON (`process.service.js:118`) | Nombrar por contenido real en tablas/columnas nuevas. |
| AP-17 | Autorización basada solo en datos del token para cambios de permiso inmediatos | `passport.js:18-19` | Para operaciones críticas, verificar rol/estado en base. |
| AP-18 | Comentarios de bitácora en el código ("CAMBIO QUIRÚRGICO", "MODIFICADO", "Corregido") | `task.controller.js:10-18`, `passport.js:1-31`, `processInstance.service.js:47` | La historia va en commits y specs; comentarios explican el porqué actual. |
| AP-19 | Indentación/estilo inconsistente dentro de un archivo | `processInstance.controller.js:22-60`, `task.service.js:66-133` | Prettier + ESLint (Stack). |
| AP-20 | Exponer en el motor de decisión tipos que el motor de ejecución rechaza | `decision.service.js:11` (`AUTO_TASK`) vs `processEngine.service.js:131` | Paridad de semántica por construcción (Principio VI). |
| AP-21 | `any`, o `as`/`!` para silenciar al compilador | — (prevención) | `unknown` + validación o guarda de tipo (Principio X). |
| AP-22 | `enum` de TypeScript o literales de dominio repetidos | `'ACTIVE'`, `'PENDING'`, `'USER_TASK'` dispersos en servicios | Constantes `as const` en `src/domain/constants.ts` (Principio X). |
| AP-23 | Promesas flotantes o `Promise.all` con efectos cuyo orden importa | `processEngine.service.js` (creación concurrente de tareas en ramas paralelas) | `await` explícito; iteración secuencial cuando el orden de efectos es observable. |
| AP-24 | Mutar entidades del ORM para construir la respuesta | `process.service.js:287-301` | Mapper puro a DTO (Patrones). |
| AP-25 | Mismo tipo definido a mano en dos sitios (validación y DTO) | — (prevención) | Tipo derivado del esquema o declarado una vez en `<x>.schemas.ts` (Principio X). |

## Flujo de desarrollo con Spec Kit y quality gates

1. **`/speckit-specify`**: describir el QUÉ y el PARA QUÉ (usuarios: ADMIN / USER / roles de proceso),
   sin detalles de implementación. La spec MUST indicar: endpoints afectados y si son públicos/JWT/ADMIN,
   entidades y estados involucrados, impacto en el frontend `sveltekit-bpm`. Usar `blueprint.md` como
   referencia de dominio.
2. **`/speckit-clarify`** (SHOULD): resolver ambigüedades, en especial reglas de versionado, estados y permisos.
3. **`/speckit-plan`**: diseño técnico. El plan MUST completar el *Constitution Check* con los gates
   siguientes y justificar en *Complexity Tracking* cualquier incumplimiento. `data-model.md` MUST incluir
   el script de migración propuesto; `contracts/` MUST describir cada endpoint (request, response, códigos).
4. **`/speckit-tasks`**: las tareas MUST incluir pruebas (Principio VII), migración (si aplica),
   actualización de `blueprint.md` y, si cambia el contrato, la tarea de coordinación con frontend.
5. **`/speckit-analyze`** (SHOULD): verificar consistencia spec/plan/tasks contra esta constitution.
6. **`/speckit-implement`**: implementar respetando capas y convenciones; `typecheck`, `lint` y
   `npm test` en verde.

### Constitution Check (gates para `plan.md`)

| Gate | Verificación | Principio |
|---|---|---|
| CC-01 | El código nuevo sigue `routes → controller → service → models`, la capa de dominio sin dependencias y la estructura de carpetas/nombres. | I |
| CC-02 | Escrituras multi-tabla usan `sequelize.transaction`, pasan `{ transaction: t }` a todas las consultas y reciben `t` como parámetro tipado. | II |
| CC-03 | Cambios de esquema: script en `db/migrations/`, modelo actualizado, FKs con `ON DELETE` explícito. | II |
| CC-04 | No se modifica en sitio una definición ACTIVE o con instancias; se respeta un solo ACTIVE por key. | III |
| CC-05 | Cada endpoint declara: público / JWT / ADMIN y control de acceso por registro si toca instancias o tareas. *Fase piloto: SHOULD; declarar el nivel de acceso sigue siendo MUST.* | IV |
| CC-06 | Toda entrada validada con la biblioteca aprobada única y lista blanca de campos antes de persistir. *Fase piloto: SHOULD.* | IV |
| CC-07 | Ninguna respuesta ni log contiene `passwordHash`, tokens, secretos o `businessData` completo. | IV, VIII |
| CC-08 | Controllers con `catchAsync`; servicios lanzan `AppError` con `statusCode` y `code`; tabla de códigos HTTP respetada (incluido 422 y ningún 401 de negocio). | V |
| CC-09 | Cambios en el motor mantienen paridad ejecución/decisión por construcción, protección de ciclos y pruebas de escenarios. | VI |
| CC-10 | Pruebas Jest/Supertest planificadas (servicio + contrato) y ejecutables sin la base compartida. *Fase piloto: SHOULD; sin pruebas, verificación manual en `quickstart.md`.* | VII |
| CC-11 | Dependencias nuevas justificadas, del stack aprobado o enmendado, y `npm audit` sin críticas/altas nuevas. *Fase piloto: la justificación es MUST; `npm audit` es SHOULD.* | Stack |
| CC-12 | Logging solo vía `utils/logger`; sin `console.*`. | VIII |
| CC-13 | Contrato con `sveltekit-bpm` preservado o cambio incompatible declarado y coordinado. | IX |
| CC-14 | La feature no replica ninguna excepción EXC-xx ni anti-patrón AP-xx, y `blueprint.md` queda actualizado. | Todas |
| CC-15 | `tsc --noEmit` y lint sin errores; sin `any`, `enum` ni `@ts-ignore`; tipos de entrada/salida con fuente única. | X |

### Quality gates de cierre (antes de merge)

- `npm run typecheck` y `npm run lint` sin errores (MUST, también en fase piloto).
- `npm test` en verde; pruebas nuevas cubren los caminos felices y los 400/401/403/404/409/422
  relevantes. *Fase piloto: SHOULD; si no hay pruebas, la verificación manual de `quickstart.md` está hecha.*
- `npm audit --omit=dev` sin vulnerabilidades críticas/altas **nuevas** respecto a la línea base.
  *Fase piloto: SHOULD.*
- El servidor compila y arranca con los scripts de desarrollo y productivo en Windows y Unix.
- Revisión de código verifica CC-01…CC-15 y que `blueprint.md` refleja endpoints, reglas y modelo de datos.

## Governance (Gobierno)

- Esta constitution prevalece sobre `GEMINI.md`, `.idx/airules.md` y cualquier convención informal.
  En caso de conflicto entre esta constitution y el código existente, el código existente se considera
  deuda (sección de excepciones) y no un precedente.
- **Enmiendas**: se proponen mediante `/speckit-constitution` con la justificación del cambio, se revisan
  en pull request por al menos un integrante del equipo backend distinto del autor, y MUST incluir:
  Sync Impact Report actualizado, ajuste de gates CC-xx si cambian principios y plan de migración
  cuando la enmienda invalida código existente.
- **Versionado semántico** de este documento: MAJOR para eliminar o redefinir principios de forma
  incompatible; MINOR para añadir principios, secciones o ampliar materialmente una regla; PATCH para
  aclaraciones y redacción.
- **Cumplimiento**: todo `plan.md` MUST completar el Constitution Check; toda revisión de PR MUST verificar
  los gates aplicables. Las violaciones aceptadas MUST quedar registradas en *Complexity Tracking* del plan
  y, si se vuelven permanentes, como nueva excepción EXC-xx mediante enmienda.
- **Revisión periódica**: la tabla de excepciones y anti-patrones SHOULD revisarse al cerrar cada feature
  que toque los archivos afectados, retirando las excepciones resueltas (cambio PATCH o MINOR).
- **Cambio de fase**: el paso de piloto / demo a producto oficial MUST hacerse con una enmienda MINOR que
  elimine la sección "Fase del proyecto", devuelva a MUST las reglas relajadas y verifique los criterios
  de salida.
- **Guía de referencia en tiempo de desarrollo**: `blueprint.md` (dominio, endpoints, reglas, brechas).

**Version**: 2.0.0 | **Ratified**: 2026-11-05 | **Last Amended**: 2026-11-05
