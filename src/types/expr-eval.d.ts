// Sustituye los tipos del paquete: `Parser#evaluate` solo acepta `Value` (sin boolean, null ni
// arrays) y declara `number` como retorno, pero el contexto real es `BusinessData`.
declare module 'expr-eval' {
  export class Parser {
    evaluate(expression: string, values?: object): unknown;
  }
}
