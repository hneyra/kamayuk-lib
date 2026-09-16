/**
 * LA MUESTRA de `las-capas-se-apilan`. Rompe las DOS mitades de la regla, a propósito.
 *
 * Este archivo está fuera de `tsc`, fuera de ESLint y fuera de `vitest` —`muestras/` está apartada
 * en los tres— y la guarda lo lee **como texto**, igual que leería `capas.ts`.
 *
 * Si alguien «arregla» este archivo, la guarda se queda sin demostración y sale roja sola.
 */

// (1) Una superficie flotante POR DEBAJO de un velo desde el que se puede abrir: es literalmente
//     el fallo que se vio dos veces en `pcf`, con 50 contra 85 y contra 88.
export const CAPA_VELO_DEL_CAJON = 'z-[85]';
export const CAPA_PANEL_DEL_CAJON = 'z-[86]';
export const CAPA_VELO_DE_CONFIRMACION = 'z-[88]';
export const CAPA_PANEL_DE_CONFIRMACION = 'z-[89]';
export const CAPA_FLOTANTE = 'z-50';

// (2) Y una clase de capa escrita FUERA del módulo de capas, que es como llegó a haber dos
//     fuentes de verdad la primera vez.
export const ALGO_QUE_SE_SUPERPONE = 'fixed inset-0 z-[87] bg-velo';
