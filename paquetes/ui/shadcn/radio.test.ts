// @vitest-environment node
//
// Lee el `@theme` del disco. Va aparte del `boton.test.tsx` porque aquel MONTA el boton y
// necesita DOM: una prueba que necesita disco y DOM a la vez no puede declarar entorno, y
// mezclarlas dejaba `render` con «document is not defined».

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * **El `--radius` es el del producto, no el de shadcn** (#8).
 *
 * `kamayuk-lib`#6 dejo este punto declarado a medias: el `@theme` emitia `--radius-radio` y shadcn
 * lee `var(--radius)` a secas, asi que el token existia y no se llamaba como shadcn lo busca. No
 * se arreglo entonces porque no habia ni un componente con el que comprobarlo — un `--radius`
 * escrito sin nada que lo lea es una afirmacion sin sujeto.
 */

const estilos = readFileSync('paquetes/ui/estilos/estilos.css', 'utf8');
const DONDE = 'paquetes/ui/shadcn';

describe('el radio es el del producto, no el de shadcn', () => {
  it('`--radius` esta declarado y vale lo que el artboard dice', () => {
    // shadcn parte de `0.625rem` y de ahi deriva sus tres tamanos. El artboard usa 3 px.
    expect(estilos).toMatch(/--radius:\s*3px;/);
    expect(estilos).not.toMatch(/--radius:\s*0\.625rem/);
  });

  it('y los tres tamanos de shadcn valen lo mismo, porque el artboard usa un solo radio', () => {
    for (const tamano of ['sm', 'md', 'lg']) {
      expect(estilos, `falta --radius-${tamano}`).toMatch(
        new RegExp(`--radius-${tamano}:\\s*3px;`),
      );
    }
  });

  /**
   * Y NINGUNA pieza se escribe su propio radio (#11, AC4).
   *
   * Un `rounded-[3px]` a mano se ve identico HOY y deja de seguir al token el dia que el artboard
   * cambie de radio — que es la forma de deriva que no se ve mirando la pantalla. `Boton` ya lo
   * tenia vigilado para si mismo; con once piezas mas, vigilarlo pieza a pieza es como se olvida
   * una.
   */
  const PIEZAS = readdirSync(DONDE)
    .filter((n) => n.endsWith('.tsx') && !n.includes('.test.'))
    .map((n) => [n, readFileSync(join(DONDE, n), 'utf8')] as const);

  it('EL CENTINELA: hay piezas que mirar', () => {
    // Sin esto, cambiar la extension o mover el directorio dejaria la comprobacion de abajo
    // recorriendo la lista vacia y pasando en verde.
    expect(PIEZAS.length, 'no se leyo ni una pieza').toBeGreaterThanOrEqual(11);
  });

  it('ninguna pieza se escribe su propio radio: todas salen del token', () => {
    const culpables = PIEZAS.flatMap(([nombre, fuente]) =>
      // El comentario se quita antes: una pieza puede EXPLICAR por que no escribe un radio a mano.
      [...fuente.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ')
        .matchAll(/rounded-\[[^\]]+\]|border-radius:\s*[^v][^;]*/g)]
        .map((m) => `  ${nombre}: «${m[0]}»`),
    );
    expect(
      culpables,
      'Hay piezas con el radio escrito a mano. Se ven igual hoy y dejan de seguir al artboard\n' +
        `manana:\n${culpables.join('\n')}`,
    ).toEqual([]);
  });
});

