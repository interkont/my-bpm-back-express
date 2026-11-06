const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// Copia profunda que sustituye valores no deterministas (fechas y tokens JWT)
export const normalize = (value: unknown): unknown => {
  if (value instanceof Date) return '<date>';
  if (typeof value === 'string') return ISO_DATE.test(value) ? '<date>' : value;
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = key === 'token' ? '<jwt>' : normalize(val);
    }
    return out;
  }
  return value;
};

interface NormalizedMarker {
  __normalized: true;
  value: unknown;
}

// Serializador de Jest: solo actúa sobre el envoltorio { __normalized: true, value }
export const test = (val: unknown): boolean =>
  val !== null &&
  typeof val === 'object' &&
  (val as Partial<NormalizedMarker>).__normalized === true &&
  'value' in val;

export const serialize = (
  val: NormalizedMarker,
  config: unknown,
  indentation: string,
  depth: number,
  refs: unknown,
  printer: (v: unknown, c: unknown, i: string, d: number, r: unknown) => string,
): string => printer(normalize(val.value), config, indentation, depth, refs);

// Forma compatible con `snapshotSerializers` (require devuelve test/serialize)
export default { test, serialize };
