/**
 * LA MUESTRA de `formato-sin-number-ni-date` (#108). Usa las cinco palabras A PROPOSITO.
 *
 * Esta fuera de `tsc`, de ESLint y de `vitest` —`muestras/` esta apartada en los tres— y la
 * guarda la lee **como texto**. La prueba exige archivo, LINEA y palabra: si se mueve una linea
 * de aqui, se mueve tambien alli. Un `Number` en este comentario no cuenta, y eso tambien se mide.
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
