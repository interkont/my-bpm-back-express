import './env';
import nodeConfig from 'config';
import { z } from 'zod';
import { isProduction, nodeEnv } from './environment';

// Variables obligatorias: no vacías. Los valores nunca se incluyen en los mensajes de error.
const configSchema = z.object({
  db: z.object({ databaseUrl: z.string().min(1) }),
  jwt: z.object({ secret: z.string().min(1) }),
});

// Nombre de la variable de entorno asociada a cada ruta del esquema.
const ENV_VAR_BY_PATH: Readonly<Record<string, string>> = {
  'db.databaseUrl': 'DATABASE_URL',
  'jwt.secret': 'JWT_SECRET',
};

export interface AppConfig {
  readonly nodeEnv: string;
  readonly isProduction: boolean;
  readonly db: { readonly databaseUrl: string };
  readonly jwt: { readonly secret: string };
  readonly resolvePort: (argv: readonly string[], env?: NodeJS.ProcessEnv) => number | string;
}

const getPortFromArgs = (argv: readonly string[]): number | null => {
  const portArgIndex = argv.indexOf('--port');
  const value = portArgIndex !== -1 ? argv[portArgIndex + 1] : undefined;
  return value ? parseInt(value, 10) : null;
};

// Precedencia: PORT → --port → 3000 (N-14). `||` es intencional: un PORT vacío o un --port
// no numérico (NaN) caen al siguiente valor, igual que en el app.js original.
export const resolvePort = (
  argv: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): number | string => {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return env.PORT || getPortFromArgs(argv) || 3000;
};

const readRaw = (key: string): string => (nodeConfig.has(key) ? nodeConfig.get<string>(key) : '');

const loadConfig = (): AppConfig => {
  const parsed = configSchema.safeParse({
    db: { databaseUrl: readRaw('db.databaseUrl') },
    jwt: { secret: readRaw('jwt.secret') },
  });
  if (!parsed.success) {
    const names = [
      ...new Set(
        parsed.error.issues.map((issue) => {
          const key = issue.path.join('.');
          return ENV_VAR_BY_PATH[key] ?? key;
        }),
      ),
    ];
    throw new Error(`Missing required configuration: ${names.join(', ')}`);
  }
  return Object.freeze({
    nodeEnv,
    isProduction,
    db: Object.freeze({ databaseUrl: parsed.data.db.databaseUrl }),
    jwt: Object.freeze({ secret: parsed.data.jwt.secret }),
    resolvePort,
  });
};

export const config: AppConfig = loadConfig();
