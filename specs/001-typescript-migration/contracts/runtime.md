# Contrato operativo: scripts, configuración y logs

**Feature**: [../spec.md](../spec.md) (FR-016, FR-017, FR-018, US5) · **Decisiones**: [../research.md](../research.md) R-03, R-04, R-07, R-14

Es el contrato que usa el equipo para construir, arrancar y operar el servicio, y lo que verifica
[../quickstart.md](../quickstart.md).

## Scripts npm

Todos funcionan en Windows y en Unix (sin `VAR=x cmd`).

| Script | Efecto | Salida esperada |
|---|---|---|
| `npm run start:dev` | Arranca desde `src/` con recarga (`tsx watch`), `NODE_ENV=development` | `info` "Database connection has been established successfully." y "Server is running on port N" |
| `npm run build` | Compila `src/` a `dist/` (CommonJS) | Código de salida 0 sin errores |
| `npm run start:prod` | `node dist/server.js` con `NODE_ENV=production` | Igual que en desarrollo, con nivel `info` |
| `npm run typecheck` | `tsc --noEmit` sobre `src/` y `tests/` | 0 errores |
| `npm run lint` | ESLint sobre todo el repositorio | 0 errores y 0 advertencias (SC-004) |
| `npm run format` | Prettier | — |
| `npm run db:test:up` / `db:test:down` | Levanta y elimina el Postgres de pruebas (Docker) | Contenedor `healthy` |
| `npm test` | Todas las suites contra el código TS (`dist/` para contrato y motor) | Verde |
| `npm run test:baseline` | Graba los snapshots de la línea base ejecutando el código JS (`node src/app.js`); solo se usa en el commit JS (R-08) | Snapshots escritos |

## Variables de entorno

Los valores nunca se documentan ni se imprimen.

| Variable | Obligatoria | Uso | Si falta |
|---|---|---|---|
| `DATABASE_URL` | Sí | Conexión Sequelize | El proceso termina con código 1 y el mensaje `Missing required configuration: DATABASE_URL` |
| `JWT_SECRET` | Sí | Firma y verificación de tokens | Igual: `Missing required configuration: JWT_SECRET` |
| `PORT` | No | Puerto de escucha | `--port <n>` y, si tampoco está, 3000 (precedencia actual, N-14) |
| `NODE_ENV` | No (lo fijan los scripts) | Selección de `<env>.json` y nivel de log | `development` |
| `NODE_CONFIG_DIR` | No | Carpeta de los JSON de `config` | `<raíz>/src/config` (R-03) |
| `TEST_DATABASE_URL` | Solo en pruebas | Postgres de pruebas | Por defecto, el del compose de pruebas. **Se rechaza** si es igual a `DATABASE_URL`. |
| `CHARACTERIZATION_TARGET` | Solo en pruebas | `js` (línea base) o `ts` | `ts` |

Solo `src/config/` lee `process.env`. El resto del código usa el objeto tipado e inmutable que exporta
`src/config/index.ts`.

## Archivos de configuración

- `src/config/default.json`, `custom-environment-variables.json` y `production.json` (hoy no existe
  `development.json`, y `config` admite que falte).
- `production.json` pasa de estar vacío (rompe `config`) a `{}`.
- Se elimina `App.port` de `default.json`: nunca se usó (N-14) y la precedencia del puerto queda
  explícita en `config/index.ts`.

## Logs

| Destino | Nivel | Formato | Contenido |
|---|---|---|---|
| Consola | `debug` (no producción) / `info` (producción) | `colorize` + `simple` | Arranque, eventos de negocio y traza del motor con identificadores |
| `error.log` | `error` | JSON | Errores con `method`, `url`, `userId` y stack |
| `combined.log` | `info` | JSON | Errores y eventos de negocio |

**Nunca** se registran contraseñas, tokens, hashes, `businessData` ni el contexto de evaluación
(FR-016, SC-011). Una prueba de la suite recorre un flujo completo y busca en los logs generados valores
centinela conocidos de contraseña, token y `businessData`.

## Estructura de la salida

```text
dist/                 # misma profundidad que src/ (__dirname resuelve igual public/ y src/config)
├── server.js
├── app.js
└── …
```

`dist/` no se versiona y se añade a `.gitignore`.
