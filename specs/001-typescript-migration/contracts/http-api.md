# Contrato HTTP: 32 endpoints + estático

**Feature**: [../spec.md](../spec.md) · **Errores**: [errors.md](./errors.md) · **Formas de respuesta a congelar**: [../analysis.md §2](../analysis.md)

**Regla general.** Rutas, métodos, niveles de acceso, entradas aceptadas y respuestas de camino correcto
**no cambian** (FR-005). Este documento declara para cada endpoint:

1. Su nivel de acceso (CC-05).
2. La validación nueva, que solo rechaza lo que hoy falla (FR-023, research R-01 y R-13).
3. Los cambios en sus respuestas de error (categoría B).

Toda forma de éxito se verifica con una prueba `frozen` contra la línea base JS.

Leyenda de acceso: **P** = público; **J** = JWT (`protect`); **A** = JWT + `isAdmin`.
`:id` se valida como `^\d+$` (400 `VALIDATION_ERROR` si no cumple), salvo donde se indica.

---

## Auth: `/api/auth`

| Método y ruta | Acceso | Validación nueva | Éxito (sin cambios) | Errores: hoy → tras la migración |
|---|---|---|---|---|
| `POST /login` | P | body: `email` y `password` presentes como string (un valor vacío sigue dando 401, como cualquier credencial inválida) | 200 `{ user, token, modules[] }`; `user.roles[].UserRole` anidado y sin `passwordHash` | Credenciales inválidas: 500 → **401** `INVALID_CREDENTIALS`. Falta un campo: 500 → **400** `VALIDATION_ERROR`. |
| `PUT /profile` | J | ninguna nueva (las reglas actuales siguen en el servicio) | 200 usuario sin hash | Falta `oldPassword`: 400 (se conserva). Usuario inexistente: 404 (se conserva). `oldPassword` incorrecta: **401 → 400** `INVALID_OLD_PASSWORD` (FR-024). |

## Users: `/api/users` (todas **A**)

| Método y ruta | Validación nueva | Éxito (sin cambios) | Errores: hoy → tras la migración |
|---|---|---|---|
| `POST /` | body: `password` presente | 201 usuario con `roles[]` **sin** `UserRole` | Sin `password`: 500 → **400**. Email duplicado: 500 → **409** `CONFLICT`. |
| `GET /` | — | 200 lista con `roles[].UserRole` | — |
| `GET /:id` | `:id` | 200 · 404 `{ message: 'User not found' }` (se conserva; `code` aditivo) | Id no numérico: 500 → 400. |
| `PUT /:id` | `:id` | 200 usuario con roles sin `UserRole` | Inexistente: 500 → **404**. Email duplicado: 500 → **409**. |
| `DELETE /:id` | `:id` | 204, también si no existe (se conserva; C-10) | Id no numérico: 500 → 400. |

El hash de la contraseña pasa del controller al servicio (AP-04). No es observable.

## Roles: `/api/roles` (todas **A**)

| Método y ruta | Validación nueva | Éxito (sin cambios) | Errores: hoy → tras la migración |
|---|---|---|---|
| `POST /` | — | 201 rol | Nombre duplicado: 500 → **409** `CONFLICT`. |
| `GET /` | — | 200 lista | — |
| `GET /:id` | `:id` | 200 rol con `users[]` (`id`, `fullName`, `email`, `status`) · 404 (se conserva) | — |
| `PUT /:id` | `:id` | 200 rol con usuarios · 404 (se conserva) | Nombre duplicado: 500 → **409**. |
| `DELETE /:id` | `:id` | 204 · 404 · 409 con usuarios (se conservan) | Ahora el conteo y el borrado van en una transacción (A-15); no es observable. |

## Processes: `/api/processes` (todas **J**; `/all` **A**)

| Método y ruta | Validación nueva | Éxito (sin cambios) | Errores: hoy → tras la migración |
|---|---|---|---|
| `POST /` | — (body abierto) | 201 fila de la definición con `bpmnXml` string, sin `elements`/`sequences` | Otra ACTIVE para la key: 500 → **409** `ACTIVE_VERSION_CONFLICT`. Unicidad key+versión: 500 → **409**. |
| `GET /` | — | 200 definiciones ACTIVE sin `bpmnXml`, `createdAt DESC` | — |
| `GET /all` (A) | — | 200 todas sin `bpmnXml` | — |
| `GET /:id/start-form` | `:id` | 200 `{ taskName, fields[], actions: ['start'] }` | Sin START_EVENT o definición inexistente: 500 → **404**. Link a campo inexistente: `TypeError` 500 → **422** `PROCESS_MODEL_ERROR`. |
| `GET /:id/save-ask` | `:id` | 200 `{ state, instancesCount, action }` | Inexistente: 500 → **404**. |
| `GET /:id` | `:id` | 200 `{ ...definición, elements[], sequences[], diagramJson }` (`{}` si es inválido) · 404 (se conserva) | — |
| `PUT /:id` | `:id` | 200 definición (en sitio o versión nueva) | **Inexistente: 200 con alta indebida → 404** (FR-021/N-01). Otra ACTIVE: 500 → 409. Versionar desde una versión no última: 500 por unicidad → **200** con `version = max + 1` (FR-028). |
| `PATCH /:id` | `:id`; si viene `status`, debe estar en `DRAFT\|ACTIVE\|INACTIVE\|DEPRECATED` | 200 fila completa con `bpmnXml` | Inexistente: 500 → **404**. Otra ACTIVE: 500 → **409**. `status` inválido: 200 (lo persistía) → **400** (FR-033). |
| `DELETE /:id` | `:id` | 204 | Inexistente: 500 → **404**. |

**Escritura (FR-029).** Se ignoran del body `id`, `version` y `createdAt` de la definición, y `id` y
`processDefId` de elementos y secuencias. Las demás claves que hoy se persisten se siguen persistiendo
(lista exacta en [../data-model.md §9](../data-model.md)). `formFields`, `actions`, `webhook_target` y
`sla_definition` (en snake_case) se siguen descartando, igual que hoy (C-07).

## Process instances: `/api/process-instances` (todas **J**)

| Método y ruta | Validación nueva | Éxito | Errores: hoy → tras la migración |
|---|---|---|---|
| `POST /` | — | 201 `{ processInstanceId, status, message }`; **`status` = estado real al terminar la transacción** (FR-032) | Key sin ACTIVE: 500 → **404**. Errores de modelado: 500 → **422**. |
| `GET /` | — | 200 todas, con definición y usuario iniciador (sin cambios) | — |
| `POST /record` | — | 201 fila creada (sin cambios en la forma) | Solo se asignan los campos de la lista blanca; `id` del body se ignora (FR-029). |
| `GET /:id` | `:id` | 200 instancia + `processDefinition` + `startedByUser` + `taskInstances[]` + `businessDataFields[]` · 404 (se conserva); `taskInstances` **ordenadas por `createdAt` ASC** (FR-030) | — |
| `PUT /:id` | `:id` | 200 `[n]` (se conserva; C-10) | Lista blanca (FR-029). |
| `DELETE /:id` | `:id` | 204 (las tareas siguen quedando huérfanas; C-04) | — |

## Tasks: `/api/tasks` (todas **J**)

| Método y ruta | Validación nueva | Éxito (sin cambios) | Errores: hoy → tras la migración |
|---|---|---|---|
| `GET /my-tasks` | — | 200 lista de 9 campos con valores por defecto | Token sin `roleIds`: 401 `{ error }` → 401 `{ error, message }` (FR-025; sigue siendo 401 por autenticación, research R-11). |
| `GET /:id/form` | `:id` | 200 `{ taskName, fields[], actions: ['complete'] }`; `value` conserva `0`, `false` y `""` (FR-031) | Tarea inexistente: 500 → **404**. Elemento o campo inexistente: `TypeError` → **422**. |
| `POST /:id/complete` | `:id` con semántica `parseInt` (solo rechaza `NaN`; research R-13) | 200 `{ message: 'Task completed successfully.' }` | No existe, no está `PENDING` o no es del usuario: 500 → **404** (nunca 401). Errores de modelado: 500 → **422**. |

## Engine: `/api/engine` (todas **J**; `decision-logs` **A**)

| Método y ruta | Validación nueva | Éxito (sin cambios) | Errores: hoy → tras la migración |
|---|---|---|---|
| `POST /decide-next-task` | Se conserva la regla actual: los tres campos con valor verdadero | 200 `{ nextTasks: [{ bpmnElementId, name, type, assignedRoleId }] }` | Falta un campo: 400 `{ error }` → 400 `{ error, message, code }` (FR-025). Key o elemento inexistente: 500 → **404**. Grafo defectuoso (incluido un ciclo que hoy agota la pila): 500 → **422**, con la decisión auditada. |
| `GET /decision-logs` (A) | — (la query se sigue ignorando) | **500 → 200**: logs `createdAt DESC` con `executedByUser { id, fullName, email }` (FR-026) | — |

## Fuera de `/api`

| Ruta | Contrato |
|---|---|
| `GET /` y estáticos de `public/` | Sin cambios; se sirven antes del rate limit, como hoy (N-15). |
| Cualquier ruta inexistente | Sin cambios: 404 por defecto de Express (HTML). |
| Cuerpo JSON malformado (cualquier ruta) | 500 texto → **400** `MALFORMED_JSON`. |
| Límites | `express.json()` con 100 kB; rate limit 100 peticiones / 15 min por IP; `helmet`; `cors()` abierto (EXC-08). Sin cambios. |
| Autenticación | `Authorization: Bearer <jwt>`; HS256, 8 h, payload `{ id, roleIds, systemRole }`. Los tokens emitidos antes del despliegue siguen siendo válidos (FR-009). El 401 de passport sigue siendo texto `Unauthorized`. |

## Compatibilidad con `sveltekit-bpm`

- El frontend usa 27 de los 32 endpoints. Ningún éxito cambia de forma.
- Todo error pasa a ser JSON con `message`, y el frontend lo muestra en lugar de
  `HTTP error! Status: 500`.
- Ningún error de negocio sobre un usuario autenticado usa 401, así que el frontend no cierra sesiones
  por error (FR-024).
- **No hace falta ningún cambio de código en el frontend.**
