// @vitest-environment node
//
// Lee el `@theme` del disco. Va aparte del `boton.test.tsx` porque aquel MONTA el boton y
// necesita DOM: una prueba que necesita disco y DOM a la vez no puede declarar entorno, y
// mezclarlas dejaba `render` con «document is not defined».

import { readFileSync } from 'node:fs';

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

});

