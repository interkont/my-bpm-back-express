import fs from 'node:fs';
import path from 'node:path';
import { Client, type QueryResultRow } from 'pg';

export const DEFAULT_TEST_DATABASE_URL =
  'postgres://flowify_test:flowify_test@localhost:55432/flowify_test';

export const REPO_ROOT = path.resolve(__dirname, '..', '..');

// URL de la base de pruebas (nunca la base compartida de .env)
export const getTestDatabaseUrl = (): string =>
  process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;

const withClient = async <T>(fn: (client: Client) => Promise<T>): Promise<T> => {
  const client = new Client({ connectionString: getTestDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};

// Ejecuta un archivo SQL (ruta relativa a la raíz del repo)
export const loadSql = async (relPath: string): Promise<void> => {
  const sql = fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
  await withClient((client) => client.query(sql));
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => withClient(async (client) => (await client.query<T>(sql, params)).rows);

const SEED_PATH = 'tests/fixtures/seed.sql';

// Vacía todas las tablas públicas (lista dinámica) y recarga el seed determinista
export const resetDatabase = async (): Promise<void> => {
  await withClient(async (client) => {
    const { rows } = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    if (rows.length > 0) {
      const tables = rows.map((r) => `"public"."${r.table_name}"`).join(', ');
      await client.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    }
    const seed = path.join(REPO_ROOT, SEED_PATH);
    if (fs.existsSync(seed)) {
      await client.query(fs.readFileSync(seed, 'utf8'));
    }
  });
};

// Cada operación abre y cierra su propio cliente; se conserva por simetría con el contrato del arnés
export const closeDb = (): Promise<void> => Promise.resolve();
