/**
 * LA MUESTRA de `sin-suponer-un-sistema`. Viola las cuatro suposiciones A PROPOSITO.
 *
 * Una regla que no puede fallar no protege nada. Este archivo esta fuera de `tsc`, fuera de
 * ESLint y fuera de `vitest` —`muestras/` esta apartada en los tres— y la guarda lo lee **como
 * texto**, igual que leeria el codigo de produccion.
 *
 * Si alguien "arregla" este archivo, la guarda se queda sin demostracion y sale roja sola.
 */

// prefijo-de-un-sistema: el prefijo escrito dentro de la libreria
export const RAIZ = '/rentas/api/v1';

// global-de-configuracion-de-un-sistema
export function entidad(): string {
  const global = window as unknown as Record<string, Record<string, string> | undefined>;
  return global['__KAMAYUK_RENTAS__']?.['entidad'] ?? '';
}

// catalogo-de-modulos-de-un-sistema
export const MODULO_PROPIO = 'RENTAS_REGISTRO';

// vocabulario-tributario
export function totalDeArbitrios(): string {
  return '0.00';
}
