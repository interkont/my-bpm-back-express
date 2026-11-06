# Contrato de errores

**Feature**: [../spec.md](../spec.md) (FR-020…FR-027) · **Constitution**: Principio V, tabla de códigos HTTP · **Decisiones**: [../research.md](../research.md) R-11, R-12

## Formato

```json
{ "message": "Process definition not found.", "code": "NOT_FOUND" }
{ "message": "Invalid input", "code": "VALIDATION_ERROR", "details": [{ "field": "status", "msg": "…" }] }
{ "message": "businessProcessKey, currentBpmnElementId, and contextData are required.",
  "error":   "businessProcessKey, currentBpmnElementId, and contextData are required.",
  "code": "VALIDATION_ERROR" }
{ "message": "Internal server error" }
```

- `message` está siempre presente y es el texto que muestra el frontend. Conserva el texto actual de
  cada error.
- `code` está presente en todo error generado por la aplicación y es estable: los consumidores pueden
  ramificar por él.
- `details` aparece solo en `VALIDATION_ERROR`.
- `error` aparece solo en las dos respuestas que hoy lo usan (FR-025).
- Un 500 nunca incluye stack, nombre de excepción ni mensaje interno.

## Catálogo de códigos

| `code` | HTTP | Cuándo | Origen actual |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Entrada que hoy termina en error: falta un campo obligatorio, `:id` no numérico, `status` fuera de la unión en `PATCH`, falta `password` al crear un usuario, falta `oldPassword` al cambiarla | Validación nueva y `auth.service.js:59` |
| `MALFORMED_JSON` | 400 | El body no es JSON válido (`entity.parse.failed` de body-parser) | Middleware |
| `INVALID_OLD_PASSWORD` | 400 | `PUT /auth/profile` con contraseña anterior incorrecta | `auth.service.js:66` (hoy 401) |
| `INVALID_CREDENTIALS` | 401 | Login con email inexistente o contraseña incorrecta | `auth.service.js:11,16` |
| `MISSING_AUTH_DATA` | 401 | `my-tasks` con un token sin `roleIds` | `task.controller.js:14` |
| `FORBIDDEN` | 403 | `isAdmin` falla | `admin.middleware.js:10` |
| `NOT_FOUND` | 404 | Recurso inexistente, o tarea no visible o no completable por el usuario | research R-11 |
| `CONFLICT` | 409 | `UniqueConstraintError` o `ForeignKeyConstraintError` de Sequelize; rol con usuarios | Middleware y `role.service.js:56` |
| `ACTIVE_VERSION_CONFLICT` | 409 | Ya existe otra versión ACTIVE para la key | `process.service.js:30` |
| `PROCESS_MODEL_ERROR` | 422 | Grafo que el motor no puede recorrer (ver abajo) | Engine y forms |
| — | 500 | Cualquier otro error | Middleware |

### `PROCESS_MODEL_ERROR` (FR-027)

| Situación | Mensaje (formato) |
|---|---|
| Secuencia hacia un elemento inexistente | `Process modelling error: sequence <source> → <target> points to a missing element.` |
| Ciclo sin elementos bloqueantes | `Process modelling error: cycle without blocking elements at <bpmnElementId>.` |
| Tarea de usuario sin salida | Mensaje actual de `processEngine.service.js:236` |
| Siguiente elemento inexistente | `Process modelling error: Next element not found.` (texto actual) |
| Tarea o form link cuyo elemento o campo no existe | `Process modelling error: element <id> not found for task <taskId>.` |
| Gateway exclusivo sin ruta válida | Mensaje actual (`processEngine.service.js:112`, `decision.service.js:68`) |
| Tipo de elemento no soportado (`AUTO_TASK` en ejecución) | `Unsupported element type: <type>` (texto actual) |
| Definición sin `START_EVENT` al iniciar una instancia | `Process is invalid: No START_EVENT found.` (texto actual) |

Los mensajes nuevos (las filas sin "texto actual") nombran el elemento problemático (US4), pero no
incluyen `businessData`.

## Responsabilidades

| Componente | Hace | No hace |
|---|---|---|
| Servicios | `throw` de `AppError` mediante funciones (`notFound`, `conflict`, `modelError`, `validation`…) | Formatear respuestas; usar `new Error` en condiciones esperadas |
| Controllers | Nada con los errores (`catchAsync` los propaga) | `try/catch` ni `res.status(4xx)` |
| `validate` middleware | `next(validation(details))` | Rechazar lo que hoy funciona |
| `isAdmin` | `next(forbidden())` | — |
| `error.middleware` | Traducir `AppError`, errores de Sequelize, `SyntaxError` de body-parser y desconocidos; registrar `method`, `url`, `userId` y el stack con el logger único | Exponer detalles internos; crear su propio logger |
| passport-jwt | 401 texto `Unauthorized` | — (no se toca) |

## Compatibilidad

- Ningún error de negocio sobre un usuario autenticado usa 401 (Principio V, FR-024).
- Los errores que FR-022 conserva mantienen estado y `message`. `code` es aditivo y no se elimina ninguna
  clave existente (research R-12).
- Solo los consumidores que dependían de recibir 500 en estos casos notan el cambio, y el frontend no es
  uno de ellos (lee `message`).
