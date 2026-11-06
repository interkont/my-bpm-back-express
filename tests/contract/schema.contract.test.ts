import type * as Models from '../../src/models';
import type { DataType, Model, ModelStatic } from 'sequelize';
import { getTestDatabaseUrl, query } from '../setup/db';

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
}

type Familia = 'integer' | 'text' | 'boolean' | 'timestamp' | 'jsonb' | 'numeric' | 'otro';

const familiaDb = (dataType: string): Familia => {
  if (['integer', 'smallint', 'bigint'].includes(dataType)) return 'integer';
  if (['character varying', 'text', 'character', 'uuid'].includes(dataType)) return 'text';
  if (dataType === 'boolean') return 'boolean';
  if (dataType.startsWith('timestamp') || dataType === 'date') return 'timestamp';
  if (dataType === 'jsonb' || dataType === 'json') return 'jsonb';
  if (['numeric', 'double precision', 'real'].includes(dataType)) return 'numeric';
  return 'otro';
};

const familiaModelo = (tipo: string): Familia => {
  const t = tipo.toUpperCase();
  if (/^(INTEGER|BIGINT|SMALLINT)/.test(t)) return 'integer';
  if (/^(VARCHAR|CHARACTER|TEXT|CHAR|UUID|STRING)/.test(t)) return 'text';
  if (t.startsWith('BOOLEAN')) return 'boolean';
  if (/^(TIMESTAMP|DATE)/.test(t)) return 'timestamp';
  if (/^JSON/.test(t)) return 'jsonb';
  if (/^(DECIMAL|NUMERIC|FLOAT|DOUBLE|REAL)/.test(t)) return 'numeric';
  return 'otro';
};

const nombreTipo = (tipo: DataType): string =>
  typeof tipo === 'string' ? tipo : tipo.toString({});

const nombreTabla = (modelo: ModelStatic<Model>): string => {
  const tabla = modelo.getTableName();
  return typeof tabla === 'string' ? tabla : tabla.tableName;
};

// Tablas/columnas presentes en la BD y ausentes en los modelos (EXC-10)
const FALTANTES_ESPERADAS = ['process_elements.actions', 'process_elements.case_assignment_config'];

describe('contrato de esquema: modelos vs information_schema', () => {
  let modelos: ModelStatic<Model>[];
  let columnas: ColumnRow[];

  beforeAll(async () => {
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.JWT_SECRET = 'dummy-secret-for-schema-test';
    const models = jest.requireActual<typeof Models>('../../src/models');
    modelos = [
      models.Role,
      models.User,
      models.UserRole,
      models.ProcessDefinition,
      models.ProcessElement,
      models.ProcessSequence,
      models.FieldDefinition,
      models.ElementFormLink,
      models.ProcessInstance,
      models.TaskInstance,
      models.DocumentInstance,
      models.CaseAssignment,
      models.DecisionLog,
      models.SystemRoleModule,
    ];
    columnas = await query<ColumnRow>(
      `SELECT table_name, column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public'`,
    );
  });

  it('cubre los 14 modelos', () => {
    expect(modelos).toHaveLength(14);
  });

  it('cada atributo existe en la BD con familia de tipo compatible', () => {
    const problemas: string[] = [];
    for (const modelo of modelos) {
      const tabla = nombreTabla(modelo);
      const enTabla = new Map(
        columnas.filter((c) => c.table_name === tabla).map((c) => [c.column_name, c.data_type]),
      );
      if (enTabla.size === 0) problemas.push(`tabla ausente: ${tabla}`);
      for (const [nombre, def] of Object.entries(modelo.getAttributes())) {
        const campo = def.field ?? nombre;
        const tipoDb = enTabla.get(campo);
        if (tipoDb === undefined) {
          problemas.push(`${tabla}.${campo} no existe en la BD`);
          continue;
        }
        const fm = familiaModelo(nombreTipo(def.type));
        const fd = familiaDb(tipoDb);
        if (fm !== fd)
          problemas.push(`${tabla}.${campo}: modelo ${nombreTipo(def.type)} vs BD ${tipoDb}`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it('las únicas columnas de BD sin modelo son las de EXC-10', () => {
    const mapeadas = new Set<string>();
    const tablas = new Set<string>();
    for (const modelo of modelos) {
      const tabla = nombreTabla(modelo);
      tablas.add(tabla);
      for (const [nombre, def] of Object.entries(modelo.getAttributes())) {
        mapeadas.add(`${tabla}.${def.field ?? nombre}`);
      }
    }
    const faltantes = columnas
      .filter((c) => tablas.has(c.table_name))
      .map((c) => `${c.table_name}.${c.column_name}`)
      .filter((k) => !mapeadas.has(k))
      .sort();
    expect(faltantes).toEqual(FALTANTES_ESPERADAS);
  });
});
