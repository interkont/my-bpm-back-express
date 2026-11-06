# Implementation Plan: Migración del backend a TypeScript con equivalencia funcional y saneamiento de deuda

**Branch**: `001-typescript-migration` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-typescript-migration/spec.md` · Auditoría técnica: [analysis.md](./analysis.md)

## Summary

El backend pasa al 100 % a TypeScript estricto sin cambiar su comportamiento: mismas rutas, mismas
respuestas de éxito y misma semántica del motor. Además se resuelve la deuda invisible (categoría A) y
se corrige una lista cerrada de defectos compatibles (categoría B: errores HTTP, grafos defectuosos,
versionado, listas blancas…).

Enfoque técnico:

1. **Primero la red de seguridad.** Antes de tocar `src/` se graba una suite de caracterización de caja
   negra por HTTP contra el código JS actual: 32 endpoints, escenarios del motor y la batería de
   expresiones de la base de demo. Corre sobre un Postgres de pruebas construido con el esquema real.
2. **Port 1:1** de las hojas a la raíz, con la suite en verde.
3. **Refactors A**: mappers puros, config validada, logger único, transacción explícita, y núcleo
   funcional del motor con una tabla de semántica exhaustiva por tipo de nodo.
4. **Correcciones B**, una por requisito, cada una con su prueba.
5. **Limpieza**: dependencias, documentación y catálogo de deuda C.

Stack (constitución 2.0.0): TypeScript 5.9 → CommonJS; zod 4; tsx; ts-jest; ESLint 9 +
typescript-eslint 8; Prettier 3. Decisiones y alternativas en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript ~5.9.2 (`strict`, `noUncheckedIndexedAccess`), salida CommonJS ES2022 sobre Node 20.x

**Primary Dependencies**:
- Express 4.21, Sequelize 6.37 + pg 8, passport-jwt 4 + jsonwebtoken 9, bcryptjs 2.4.
- config 3 + dotenv 17, winston 3.17, helmet 7, cors 2.8, express-rate-limit 7.5.
- **zod 4.6** (nueva) y expr-eval **2.0.2 exacta** (FR-042).

**Storage**: PostgreSQL (base de demo remota, sin cambios de esquema); Postgres de pruebas en Docker con `db/migrations/000_baseline.sql`

**Testing**: Jest 29 + ts-jest 29.4 (solo transpilación) + Supertest 7, en tres proyectos: `unit` (sin base), `contract` y `engine` (HTTP de caja negra contra el servidor y la base de pruebas). La línea base se graba con snapshots sobre el código JS.

**Target Platform**: Servidor Node 20 en Windows y Linux (desarrollo y demo)

**Project Type**: Servicio web (API REST) de un único proyecto

**Performance Goals**: Sin regresión respecto a hoy. Se elimina el N+1 del recorrido del grafo (una carga por operación). No hay objetivos nuevos de throughput.

**Constraints**:
- Equivalencia funcional verificada (FR-005…FR-009).
- Integración completa de una vez, sin JS en `main` (FR-002).
- Ningún error de negocio con 401.
- Frontend sin cambios.
- La suite no se ejecuta nunca contra la base compartida.

**Scale/Scope**: 48 archivos `.js` (~2.870 líneas), 14 modelos, 7 módulos, 32 endpoints; 17 deudas A, 14 B y 13 C catalogadas

Todas las incógnitas quedaron resueltas en [research.md](./research.md) (R-01…R-18). No queda ningún
NEEDS CLARIFICATION.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución **v2.0.0**.

| Gate | Evaluación | Estado |
|---|---|---|
| **CC-01** Capas y estructura | Se conservan los 7 módulos con routes → controller → service → models. Se añaden `<x>.schemas.ts` y `<x>.mappers.ts`, la capa `src/domain/` sin dependencias, y el motor en `src/api/engine/` separado en núcleo puro (`graph`, `semantics`, `context`) y cáscara. ESLint aplica las restricciones de import por capa (R-06). | ✅ |
| **CC-02** Transacciones | Las operaciones transaccionales actuales se conservan. Las funciones internas reciben `t: Transaction` como parámetro obligatorio. `deleteRole` pasa a ir en una transacción (A-15). Se elimina el `count` sin transacción del join (AP-06). | ✅ |
| **CC-03** Esquema | No cambia. `000_baseline.sql` solo documenta el esquema y se aplica únicamente en la base de pruebas ([data-model.md §1](./data-model.md)). | ✅ N/A |
| **CC-04** Versionado | No se modifica en sitio una definición ACTIVE o con instancias. Un único ACTIVE por key (409). Nueva versión = máximo + 1 (FR-028). | ✅ |
| **CC-05** Acceso declarado | Declarado endpoint por endpoint en [contracts/http-api.md](./contracts/http-api.md), sin cambios. Las rutas sin `isAdmin` (EXC-05) siguen así, aplicando la regla SHOULD de la fase piloto; su corrección es C-02. | ✅ (SHOULD en piloto) |
| **CC-06** Validación + lista blanca | zod es la única biblioteca. Es permisiva por FR-023 y valida solo lo que hoy falla. `pick` tipado en todas las escrituras con body ([data-model.md §9](./data-model.md)). | ✅ |
| **CC-07** Sin datos sensibles | `AuthUser` sin hash, DTOs sin `passwordHash` y logs sin `businessData` ni contexto. La suite incluye una prueba de centinelas en los logs. | ✅ |
| **CC-08** Errores | `catchAsync` en todos los controllers. `AppError` con `statusCode` + `code`. Tabla HTTP con 422 y ningún 401 de negocio ([contracts/errors.md](./contracts/errors.md)). | ✅ |
| **CC-09** Motor | Paridad por construcción (`NODE_SEMANTICS satisfies Record<ElementType, …>`, contexto y gateway compartidos). Detección de ciclos por camino que conserva los diamantes (R-10). Pruebas de escenarios. | ✅ |
| **CC-10** Pruebas | Suites `unit`, `contract` y `engine` sin la base compartida (R-07, R-08). | ✅ |
| **CC-11** Dependencias | Cada alta o baja está justificada en R-17. `npm audit` sin críticas ni altas **nuevas**. `expr-eval` y `sequelize` quedan como riesgo aceptado (EXC-01, C-13). Tres dependencias de desarrollo no figuran en la tabla del stack (ver Complexity Tracking). | ✅ con justificación |
| **CC-12** Logging | Logger único (R-14) y `no-console` en lint. | ✅ |
| **CC-13** Contrato frontend | Los éxitos no cambian. Los errores pasan a JSON con `message`, lo que el frontend ya soporta. Sin cambios en el frontend. | ✅ |
| **CC-14** Sin EXC/AP nuevos | La feature retira AP-01…AP-20 del código y resuelve EXC-06, 07, 09, 11 y 12 (y EXC-02 en parte). `blueprint.md` se actualiza (FR-041). | ✅ |
| **CC-15** Tipado | `tsc --noEmit` y lint sin errores; sin `any`, `enum` ni `@ts-ignore`; tipos de entrada derivados de zod y de salida de los mappers. | ✅ |

**Resultado previo a la fase 0**: PASS. **Revaluado tras la fase 1** (data-model, contratos, quickstart):
PASS. El diseño no introdujo violaciones nuevas. Las dos interpretaciones de la spec (R-11, R-12) son
coherentes con el Principio V y se exponen para confirmación en el informe de cierre del plan.

## Project Structure

### Documentation (this feature)

```text
specs/001-typescript-migration/
├── spec.md              # Especificación (con Clarifications)
├── analysis.md          # Auditoría técnica y catálogo de deuda A/B/C
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones R-01…R-18
├── data-model.md        # Fase 1: contratos tipados, motor, listas blancas, 000_baseline
├── quickstart.md        # Fase 1: guía de validación end-to-end
├── contracts/
│   ├── http-api.md      # 32 endpoints: acceso, validación, éxito, errores antes/después
│   ├── errors.md        # Formato y catálogo de códigos
│   └── runtime.md       # Scripts, variables, configuración, logs
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
src/
├── server.ts                      # env → config → sequelize.authenticate() → listen (PORT → --port → 3000)
├── app.ts                         # Express configurado, sin listen (importable)
├── api/
│   ├── routes.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # protect (passport-jwt)
│   │   ├── admin.middleware.ts    # isAdmin → AppError 403
│   │   ├── validate.middleware.ts # validateBody / validateParams (zod) → 400
│   │   └── error.middleware.ts    # único formateador; logger único
│   ├── auth/                      auth.{routes,controller,service,schemas,mappers}.ts
│   ├── users/                     user.{routes,controller,service,schemas,mappers}.ts
│   ├── roles/                     role.{routes,controller,service,schemas,mappers}.ts
│   ├── processes/                 processes.routes.ts · process.{controller,service,schemas,mappers}.ts
│   ├── process-instances/         processInstances.routes.ts · processInstance.{controller,service,schemas,mappers}.ts
│   ├── tasks/                     tasks.routes.ts · task.{controller,service,schemas,mappers}.ts
│   └── engine/
│       ├── graph.ts               # núcleo puro: ProcessGraph desde filas
│       ├── semantics.ts           # núcleo puro: NODE_SEMANTICS exhaustiva
│       ├── context.ts             # núcleo puro: contexto de evaluación + gateway exclusivo
│       ├── execution.service.ts   # cáscara: startProcess, completeTask (antes processEngine.service.js)
│       ├── decision.service.ts    # cáscara: decideNextTask, getDecisionLogs
│       ├── decision.routes.ts · decision.controller.ts · decision.schemas.ts · decision.mappers.ts
├── domain/
│   ├── constants.ts               # uniones as const (estados, tipos de nodo, systemRole, acciones)
│   ├── types.ts                   # JsonValue, AuthUser, DTOs
│   └── errors.ts                  # AppError + constructores
├── config/
│   ├── env.ts                     # dotenv + NODE_CONFIG_DIR por defecto (primer import)
│   ├── index.ts                   # config validada, tipada e inmutable
│   ├── database.ts · passport.ts
│   └── default.json · custom-environment-variables.json · production.json ({})
├── models/                        14 × <entidad>.model.ts (clase tipada) · index.ts (asociaciones)
├── types/
│   ├── express.d.ts               # Express.User = AuthUser
│   └── expr-eval.d.ts             # solo si el .d.ts de la librería no basta (R-17)
└── utils/                         catchAsync.ts · expressionEngine.ts · logger.ts · pick.ts

db/migrations/000_baseline.sql     # esquema vigente (solo documentación y base de pruebas)
docker-compose.test.yml            # Postgres de pruebas
tests/
├── setup/                         # globalSetup (esquema, guarda anti-base-compartida), arnés de servidor
├── fixtures/                      # seed.sql, grafos de escenarios, expressions.json, normalizador
├── unit/                          # núcleo del motor, mappers, pick, expressionEngine, config
├── contract/                      # 32 endpoints (frozen + corrected) + __snapshots__/
└── engine/                        # escenarios de grafo end-to-end

tsconfig.json · tsconfig.build.json · eslint.config.mjs · .prettierrc · jest.config.ts
```

Se **eliminan**: los 48 `.js` de `src/`, `src/index.ts` (plantilla), `nodemon.json` y los metadatos de
plantilla de `package.json` (`name`, `description`, `author`, `main`).

**Structure Decision**: es un único proyecto de servicio web. Se conserva la estructura modular actual
y solo se cambia la extensión, como exige el Principio I de la constitución 2.0.0. Hay tres cambios de
fondo:

- La capa `src/domain/`.
- La división núcleo/cáscara dentro de `src/api/engine/`.
- `processEngine.service` pasa a llamarse `execution.service`, para distinguirlo de `decision.service`.

Los nombres de archivo en plural de las rutas (`tasks.routes`, `processes.routes`,
`processInstances.routes`) se conservan, como admite la constitución.

## Implementation Phases (input para `/speckit-tasks`)

Detalle y justificación en [research.md R-18](./research.md).

| Fase | Contenido | Puerta de salida |
|---|---|---|
| **0. Arnés** (sin tocar `src/`) | Herramientas TS, lint y Jest; `000_baseline.sql`; compose de pruebas; seed y fixtures; extracción de expresiones; suites `contract`, `engine` y `unit/expressions`; `test:baseline` sobre JS | Snapshots de la línea base commiteados |
| **1. Port 1:1** | domain → utils → config → models → middlewares → services → controllers/rutas → app/server | `typecheck` y `lint` verdes; casos `frozen` verdes |
| **2. Refactor A** | Mappers y `pick`; transacción explícita; config validada; logger único; núcleo del motor + carga única del grafo + determinismo | Casos `frozen` verdes; `unit` del núcleo verde |
| **3. Correcciones B** | FR-020…FR-034, una tarea con prueba `corrected` por FR | Casos `corrected` verdes |
| **4. Cierre** | Bajas y actualizaciones de dependencias, `npm audit`; borrar restos; `blueprint.md`; catálogo C; enmienda PATCH de la constitución | [quickstart.md](./quickstart.md) completo en Windows y Linux |

**Riesgos y mitigación**: [analysis.md §8](./analysis.md). Los más relevantes:

- **Diferencias de serialización.** Se mitigan con los casos `frozen` y con mappers construidos sobre
  `get({ plain: true })` (R-15).
- **Diamantes en el grafo.** Se mitigan con la detección de ciclos por camino (R-10).
- **Orden de carga de `config`.** Se mitiga con `env.ts` como primer import (R-03).

## Complexity Tracking

| Desviación o decisión | Por qué es necesaria | Alternativa más simple descartada |
|---|---|---|
| Dependencias de desarrollo fuera de la tabla del stack: `cross-env`, `eslint-plugin-import-x` y `eslint-config-prettier` | `cross-env`: la constitución lo menciona como opción "previa aprobación en el plan", y fijar `NODE_ENV` por script es la única forma de conservar el comportamiento actual en Windows. `import-x`: `no-cycle` exige la regla de "sin dependencias circulares". `eslint-config-prettier`: evita conflictos entre las dos herramientas aprobadas. | Fijar `NODE_ENV` solo con `.env` cambia el comportamiento de `start:prod`. Sin `import-x`, la regla de ciclos quedaría sin verificación automática. |
| Modelos Sequelize como clases (`class X extends Model`) | Es la única forma tipada de Sequelize 6 (R-16). Los modelos quedan como declaraciones de datos sin lógica. | `sequelize.define` con tipos genéricos manuales: más verboso y con menos garantías. `sequelize-typescript`: no aprobada. |
| `as` en los bordes con Sequelize (resultados de `include` y `get({ plain: true })`) | Sequelize 6 no infiere los tipos de los includes. Cada `as` lleva un comentario con su invariante, como permite el Principio X, y la prueba `frozen` del endpoint lo respalda. | Validar con zod cada fila leída: coste en ejecución y duplicación sin beneficio. |
| Convivencia temporal JS/TS en la rama de la feature | Necesaria para un port incremental con la suite en verde (FR-002 lo admite dentro de la rama). | Reescritura de una sola vez sin pasos intermedios: no permite aislar regresiones. |
