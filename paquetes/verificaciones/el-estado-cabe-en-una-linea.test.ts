// @vitest-environment node
//
// Lee `CLAUDE.md` y mira que existan los `README.md` que enlaza. No es un DOM lo que necesita.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { paquetesDe } from './cifras.mjs';
import { RAIZ } from './texto.ts';

/**
 * **La tabla de estado de `CLAUDE.md` cabe en una línea por pieza** (#128).
 *
 * <h2>El defecto del que sale, medido</h2>
 *
 * Sobre `origin/main@2530761` la tabla tenía nueve líneas que pesaban **23 889 bytes**, el 66 % de
 * un archivo que cada sesión carga entero, y la del intérprete sola medía **10 445**. Decía de sí
 * misma que «dice el ESTADO, no cómo se llegó a él», y sus filas citaban ocho y nueve issues cada
 * una. Y como cada PR escribía en ella, era el conflicto de todos: de los últimos 40 merges de
 * primer padre, 26 tocaron `CLAUDE.md`.
 *
 * Lo narrativo se fue al `README.md` de cada paquete, y la tabla quedó en una línea por pieza. Esta
 * guarda es lo que impide que vuelva a crecer por acumulación, que es como creció: nadie escribió
 * nunca una fila de diez mil bytes, se escribieron veinte añadidos de quinientos.
 *
 * <h2>Qué exige</h2>
 *
 *   - ninguna línea de la tabla pasa de **400 bytes** —bytes y no caracteres, que es como se midió
 *     la de 10 445—;
 *   - cada paquete de `paquetes/` tiene su fila, y la fila enlaza su `README.md`;
 *   - cada `README.md` que la tabla enlaza existe y es un archivo: lo movido sigue enlazado.
 */

const LIMITE_EN_BYTES = 400;

/** La cabecera que abre la tabla de estado. Si cambia, la guarda sale roja diciéndolo. */
const CABECERA = '| Pieza | Estado |';

const claude = readFileSync(join(RAIZ, 'CLAUDE.md'), 'utf8').split('\n');

/** Las líneas de la tabla de estado: desde su cabecera hasta la primera que no empieza por `|`. */
function tablaDeEstado(lineas: readonly string[]): { numero: number; texto: string }[] {
  const desde = lineas.indexOf(CABECERA);
  if (desde < 0) return [];
  const tabla: { numero: number; texto: string }[] = [];
  for (let i = desde; i < lineas.length && (lineas[i] ?? '').startsWith('|'); i += 1) {
    tabla.push({ numero: i + 1, texto: lineas[i] ?? '' });
  }
  return tabla;
}

/** Los `README.md` que enlaza una línea, tal como los escribe: rutas desde la raíz. */
function readmesQueEnlaza(linea: string): string[] {
  return [...linea.matchAll(/\]\(([^)\s]*README\.md)\)/g)].map((enlace) => enlace[1] ?? '');
}

const TABLA = tablaDeEstado(claude);
const FILAS = TABLA.slice(2);

describe('la tabla de estado de `CLAUDE.md` cabe en una línea por pieza', () => {
  it('EL CENTINELA: la tabla está, con una fila por paquete como mínimo', () => {
    // Sin esto, cambiar la cabecera o borrar la tabla dejaría las comprobaciones de abajo
    // recorriendo la lista vacía y pasando en verde.
    expect(TABLA.length, `no se encontró «${CABECERA}» en CLAUDE.md`).toBeGreaterThan(0);
    expect(FILAS.length).toBeGreaterThanOrEqual(paquetesDe(RAIZ).length);
  });

  it(`ninguna línea de la tabla pasa de ${String(LIMITE_EN_BYTES)} bytes`, () => {
    const largas = TABLA.filter(({ texto }) => Buffer.byteLength(texto, 'utf8') > LIMITE_EN_BYTES).map(
      ({ numero, texto }) => `CLAUDE.md:${String(numero)} mide ${String(Buffer.byteLength(texto, 'utf8'))} bytes`,
    );
    expect(
      largas,
      'Lo narrativo de un paquete va en su README.md, no en la tabla: la tabla dice el estado en una ' +
        'línea, y cada añadido que la alarga es el conflicto del siguiente PR.',
    ).toEqual([]);
  });

  it('cada paquete tiene su fila, y la fila enlaza su README.md', () => {
    const enlazados = new Set(FILAS.flatMap(({ texto }) => readmesQueEnlaza(texto)));
    const sinFila = paquetesDe(RAIZ).filter((paquete) => !enlazados.has(`paquetes/${paquete}/README.md`));
    expect(sinFila, 'estos paquetes no tienen una fila que enlace su README.md').toEqual([]);
  });

  it('lo movido sigue enlazado: cada README.md que la tabla enlaza existe', () => {
    const enlaces = FILAS.flatMap(({ numero, texto }) => readmesQueEnlaza(texto).map((ruta) => ({ numero, ruta })));
    expect(enlaces.length).toBeGreaterThanOrEqual(paquetesDe(RAIZ).length);
    const rotos = enlaces
      .filter(({ ruta }) => !existsSync(join(RAIZ, ruta)) || !statSync(join(RAIZ, ruta)).isFile())
      .map(({ numero, ruta }) => `CLAUDE.md:${String(numero)} enlaza ${ruta}, y no está`);
    expect(rotos).toEqual([]);
  });
});
