/**
 * LA MUESTRA de `formato-sin-number-ni-date` (#108). Convierte texto en numero A PROPOSITO.
 *
 * Esta fuera de `tsc`, de ESLint y de `vitest` —`muestras/` esta apartada en los tres— y la
 * guarda la lee con **el comprobador de TypeScript**. La prueba exige archivo, LINEA y que: si se
 * mueve una linea de aqui, se mueve tambien alli. Un `Number` en este comentario no cuenta.
 */

// Lo que `formato.ts` hacia hasta #108: un mes pasado por coma flotante para indexar una lista.
const MESES = ['enero', 'febrero'];
export function mesDe(mes: string): string | undefined {
  return MESES[Number(mes) - 1];
}

export const hoy = new Date('2026-09-06');

export const soles = new Intl.Collator('es-PE');

export function dia(texto: string): number {
  return parseInt(texto, 10);
}

export function importe(texto: string): number {
  return parseFloat(texto);
}

// Lo que la guarda por TEXTO dejaba pasar (#108, vuelta 1): la conversion sin ninguna de las cinco
// palabras. Un `+` unario es coma flotante igual que `Number()`, y la salida no cambia.
export function sinCero(dia: string): string {
  return `${String(+dia)} de enero`;
}

// Y un `//` dentro de una cadena: el barrido por texto lo tomaba por comentario y se comia el
// `Number` que venia detras en la misma linea.
export function oculto(dia: string): string {
  return `${'//'.slice(2)}${String(Number(dia))} de enero`;
}

export const menos = (dia: string): number => -dia;
export const doble = (dia: string): number => ~~dia;
export const mentira = (dia: string): number => dia as unknown as number;
export const porUno = (dia: string): number => dia * 1;
export const sinTipo = (dia: string): unknown => JSON.parse(dia);
export const porNombre = (): unknown => globalThis['Date'];

// Lo que la guarda con el comprobador dejaba pasar (#108, vuelta 2): un `number` que el
// comprobador CREE y no es. Por donde se miente —un `as T` generico, un predicado, una
// sobrecarga, un `declare`, una directiva, un `any` escrito— y donde se convierte: `Math` y la
// aritmetica sobre un `number`.
function comoSi<T>(valor: unknown): T {
  return valor as T;
}
export const recortado = (dia: string): number => Math.trunc(comoSi<number>(dia));
function esCifra(valor: unknown): valor is number {
  return valor !== undefined;
}
export const vuelto = (suelto: unknown): number => (esCifra(suelto) ? -(-suelto) : 0);
export function sinCero(valor: string): number;
export function sinCero(valor: unknown): unknown {
  return valor;
}
declare const convertir: (valor: string) => number;
// @ts-expect-error: el dia llega como texto y se recorta
export const directo = (dia: string): number => Math.trunc(dia);
export const suelto = (dia: any): number => dia;
export const largo = (texto: string): number => texto.length - 1;
