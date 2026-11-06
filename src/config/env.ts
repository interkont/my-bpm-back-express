// Debe ser el primer import de `server.ts` y `app.ts` (research R-03): TypeScript emite los
// `require` en orden de import y otros módulos (p. ej. passport) leen `process.env` al cargarse.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ quiet: true });

// Misma profundidad desde `src/config` y `dist/config`.
process.env.NODE_CONFIG_DIR ??= path.resolve(__dirname, '../../src/config');
