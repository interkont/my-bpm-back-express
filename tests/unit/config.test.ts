import type { AppConfig } from '../../src/config';

const SECRET_URL = 'postgres://user:SUPER_SECRET_PW@localhost:5432/db';
const SECRET_JWT = 'jwt-secret-value-xyz';

const VARS = ['DATABASE_URL', 'JWT_SECRET', 'PORT'] as const;
const saved: Partial<Record<(typeof VARS)[number], string | undefined>> = {};

// Carga `src/config` en un registro de módulos limpio (lee el entorno al importarse).
const loadConfig = (): AppConfig => {
  let loaded: AppConfig | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = (require('../../src/config') as { config: AppConfig }).config;
  });
  return loaded as AppConfig;
};

const messageOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('Se esperaba un error');
};

describe('config', () => {
  beforeEach(() => {
    for (const v of VARS) saved[v] = process.env[v];
    process.env.DATABASE_URL = SECRET_URL;
    process.env.JWT_SECRET = SECRET_JWT;
  });

  afterEach(() => {
    for (const v of VARS) {
      if (saved[v] === undefined) Reflect.deleteProperty(process.env, v);
      else process.env[v] = saved[v];
    }
  });

  // Cadena vacía (no `delete`): dotenv no pisa variables definidas y .env no debe rellenarlas.
  it('falla nombrando JWT_SECRET sin filtrar valores', () => {
    process.env.JWT_SECRET = '';
    const msg = messageOf(loadConfig);
    expect(msg).toBe('Missing required configuration: JWT_SECRET');
    expect(msg).not.toContain(SECRET_URL);
  });

  it('falla nombrando DATABASE_URL sin filtrar valores', () => {
    process.env.DATABASE_URL = '';
    const msg = messageOf(loadConfig);
    expect(msg).toBe('Missing required configuration: DATABASE_URL');
    expect(msg).not.toContain(SECRET_JWT);
  });

  it('nombra ambas variables si faltan las dos', () => {
    process.env.DATABASE_URL = '';
    process.env.JWT_SECRET = '';
    const msg = messageOf(loadConfig);
    expect(msg).toContain('DATABASE_URL');
    expect(msg).toContain('JWT_SECRET');
  });

  it('exporta una configuración congelada (también anidada)', () => {
    const cfg = loadConfig();
    expect(Object.isFrozen(cfg)).toBe(true);
    expect(Object.isFrozen(cfg.db)).toBe(true);
    expect(Object.isFrozen(cfg.jwt)).toBe(true);
    expect(cfg.db.databaseUrl).toBe(SECRET_URL);
    expect(cfg.jwt.secret).toBe(SECRET_JWT);
  });

  describe('resolvePort', () => {
    const resolve = (argv: string[], env: NodeJS.ProcessEnv): number | string =>
      loadConfig().resolvePort(argv, env);

    it('PORT prevalece sobre --port', () => {
      expect(resolve(['--port', '4000'], { PORT: '5000' })).toBe('5000');
    });
    it('usa --port sin PORT', () => {
      expect(resolve(['--port', '4000'], {})).toBe(4000);
    });
    it('usa 3000 por defecto', () => {
      expect(resolve([], {})).toBe(3000);
    });
    it('PORT vacío y --port no numérico caen al siguiente valor', () => {
      expect(resolve(['--port', 'abc'], { PORT: '' })).toBe(3000);
      expect(resolve(['--port', '4001'], { PORT: '' })).toBe(4001);
      expect(resolve(['--port'], {})).toBe(3000);
    });
  });
});
