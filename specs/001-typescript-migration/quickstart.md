# Quickstart: validación de la migración a TypeScript

**Feature**: [spec.md](./spec.md) · **Contratos**: [contracts/](./contracts/) · **Decisiones**: [research.md](./research.md)

Guía para comprobar de extremo a extremo que la migración cumple la spec. Cada paso indica qué criterio
de éxito (SC) o historia (US) verifica. No contiene código de implementación.

## Requisitos previos

- Node 20.x y npm.
- Docker con `docker compose` (para la base de pruebas). Alternativa: un Postgres propio en
  `TEST_DATABASE_URL`.
- Un `.env` en la raíz con `DATABASE_URL` y `JWT_SECRET` (los valores se piden al equipo; nunca se
  versionan ni se pegan en documentos).
- Acceso de lectura a la base de demo, solo para el paso 1. Sirve para extraer el esquema y las
  expresiones.

## 1. Línea base, sobre el commit JavaScript (una sola vez, antes de migrar)

| Paso | Comando / acción | Resultado esperado |
|---|---|---|
| 1.1 | Generar `db/migrations/000_baseline.sql` con `pg_dump --schema-only` (R-07) y extraer las expresiones a `tests/fixtures/expressions.json` (R-08) | Archivos creados; ningún cambio en la base de demo |
| 1.2 | `npm ci` · `npm run db:test:up` | Postgres de pruebas `healthy` |
| 1.3 | `npm run test:baseline` | Snapshots `frozen` y `corrected` grabados a partir de `node src/app.js`; batería de expresiones grabada |
| 1.4 | Commit de los snapshots | La línea base queda versionada **antes** del primer cambio en `src/` (FR-003) |

## 2. Verificación estática (US2, SC-004)

| Paso | Comando | Resultado esperado |
|---|---|---|
| 2.1 | `npm run typecheck` | 0 errores |
| 2.2 | `npm run lint` | 0 errores y 0 advertencias |
| 2.3 | Buscar `.js` de aplicación: `git ls-files "src/*.js" "src/**/*.js"` | Salida vacía |
| 2.4 | Pruebas negativas de US2 (ver abajo) | Cada una hace fallar 2.1 o las pruebas |

**Pruebas negativas de US2.** Se hacen a mano, en una rama desechable:

- **Estado inexistente**: escribir `'ACTIV'` donde se espera un estado → falla `typecheck`.
- **Tipo de nodo incompleto**: añadir `'SCRIPT_TASK'` a `ELEMENT_TYPE` sin su fila en `NODE_SEMANTICS` →
  falla `typecheck`.
- **Atributo inexistente**: pedir `username` en `attributes` de `User` → falla `typecheck`.
- **Forma de respuesta alterada**: quitar un campo de `toInboxItem` → falla el contrato de `my-tasks`.

## 3. Equivalencia funcional (US1, SC-001, SC-002, SC-010)

| Paso | Comando | Resultado esperado |
|---|---|---|
| 3.1 | `npm run build` | `dist/` generado |
| 3.2 | `npm test` | Verde en las tres suites, sin la base compartida: **contract** (32 endpoints), **engine** (escenarios de R-08) y **unit** (incluida la batería de expresiones) |
| 3.3 | Revisar el reporte de la suite `contract` | Todos los casos `frozen` coinciden con la línea base JS |
| 3.4 | Token emitido por la versión JS (fixture de 1.3) usado contra la versión TS | 200 con los mismos permisos (US1-4, FR-009) |

## 4. Correcciones de categoría B (US3, US4, SC-005, SC-006)

Las cubren los casos `corrected` de `npm test`, uno por fila de
[contracts/errors.md](./contracts/errors.md) y por FR-020…FR-034. Comprobación manual adicional con el
frontend:

| Paso | Acción | Resultado esperado |
|---|---|---|
| 4.1 | Login con una contraseña incorrecta | Aviso "Invalid credentials" (antes: "HTTP error! Status: 500") |
| 4.2 | Perfil: cambiar la contraseña con una anterior incorrecta | Aviso de error y **la sesión sigue abierta** (FR-024) |
| 4.3 | Activar una segunda versión de la misma key | Aviso "An active version already exists…" sin cambios en la base |
| 4.4 | `POST /api/engine/decide-next-task` sobre el fixture de grafo con ciclo de gateways | 422 `PROCESS_MODEL_ERROR`; el servidor sigue respondiendo; el log de decisión tiene `errorMessage` |

## 5. Operación multiplataforma (US5, SC-007, SC-011)

Se repite en Windows y en Linux, desde un clon limpio:

| Paso | Comando / acción | Resultado esperado |
|---|---|---|
| 5.1 | `npm ci` → `npm run build` → `npm run start:prod` | "Server is running on port 3000" (o `PORT`) |
| 5.2 | `npm run start:dev` y editar un archivo de `src/` | Reinicio automático |
| 5.3 | Arrancar con `JWT_SECRET` vacío en el entorno del proceso | Código de salida 1; mensaje `Missing required configuration: JWT_SECRET`, sin valores |
| 5.4 | `npm run start:prod -- --port 4000` sin `PORT` | Escucha en 4000 |
| 5.5 | Recorrer los flujos de demo del frontend sin modificarlo (SC-003) | Mismo funcionamiento que antes |
| 5.6 | Revisar `error.log`, `combined.log` y la consola tras 5.5 | Solo identificadores y resultados; sin contraseñas, tokens, hashes ni `businessData` (la suite incluye además la prueba de centinelas) |
| 5.7 | Tiempo total de 5.1, desde el clon | Menos de 10 minutos (SC-007) |

## 6. Cierre (US6, SC-008, SC-009)

| Paso | Acción | Resultado esperado |
|---|---|---|
| 6.1 | `npm audit --omit=dev` | Sin críticas ni altas con corrección dentro de la versión mayor. Las restantes (`expr-eval`, `sequelize`) están listadas con su feature sucesora |
| 6.2 | Revisar `blueprint.md` | Refleja los códigos de error nuevos, los comandos y la estructura (FR-041) |
| 6.3 | Revisar el catálogo de deuda | Cada EXC-xx, AP-xx y punto del blueprint §11 aparece como resuelto (con su prueba) o asignado a una feature sucesora |
| 6.4 | Constitución | PR con la enmienda PATCH que retira EXC-06, 07, 09, 11 y 12 y deja en EXC-02 solo lo pendiente (TODO `EXC_RETIREMENT_001`) |
