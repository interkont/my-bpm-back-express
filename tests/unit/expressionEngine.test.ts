import fs from 'node:fs';
import path from 'node:path';

interface ExpressionEngine {
  evaluateExpression(expression: unknown, context: unknown): boolean;
}

interface ExpressionCase {
  label: string;
  expression: unknown;
  context: unknown;
}

const repoRoot = path.resolve(__dirname, '..', '..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const engine = require(path.join(repoRoot, 'src/utils/expressionEngine')) as ExpressionEngine;

const cases = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'tests/fixtures/expressions.json'), 'utf8'),
) as ExpressionCase[];

describe('expressionEngine.evaluateExpression', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('evaluates every fixture case as recorded', () => {
    const results = cases.map((c) => ({
      label: c.label,
      result: engine.evaluateExpression(c.expression, c.context),
    }));
    expect(results).toMatchSnapshot();
  });

  it('always returns a boolean', () => {
    for (const c of cases) {
      expect(typeof engine.evaluateExpression(c.expression, c.context)).toBe('boolean');
    }
  });
});
