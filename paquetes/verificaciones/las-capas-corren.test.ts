// @vitest-environment node
//
// Lee el `package.json` y el arbol de archivos. No es un DOM lo que necesita.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * **Las pruebas de capa corren, y corren APARTE** (#11).
 *
 * <h2>Por que estan en un guion propio, y por que eso necesita vigilancia</h2>
 *
 * Montar una capa de Radix bajo jsdom cuesta ~6 s —medido con `radix-ui` pelado, sin una linea de
 * esta libreria de por medio— y ademas hace caducar de vez en cuando la llamada del trabajador al
 * proceso principal:
 *
 *     [vitest-worker]: Timeout calling "onTaskUpdate"
 *     Test Files  20 passed (20)   Tests  246 passed (246)   Errors  1 error
 *
 * O sea: **la suite entera en verde y el `yarn verificar` en rojo**, por un artefacto del arnes.
 * Un rojo intermitente que no dice nada del producto es peor que una suite lenta: se acaba
 * ignorando, y con el se ignora el rojo de verdad que venga detras.
 *
 * La salida es `test:capas`, que corre esos archivos con `--dangerouslyIgnoreUnhandledErrors`. La
 * indulgencia se acota a DOS archivos —no a la suite— y sus afirmaciones siguen mordiendo: si una
 * capa deja de abrirse, el `it` falla y `yarn verificar` sale en rojo.
 *
 * <h2>Y el modo de fallo que esta guarda existe para impedir</h2>
 *
 * Que un archivo de capa quede **fuera de los dos guiones a la vez**: excluido de `test` por el
 * patron y no nombrado en `test:capas`. No daria ningun rojo — daria menos pruebas, que es la
 * forma mas silenciosa de perder cobertura. Ya paso una vez en `rentas` con el artboard (#78).
 */

const paquete = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

const DONDE = 'paquetes/ui/shadcn';
const enElDisco = readdirSync(DONDE).filter((n) => n.startsWith('capa-') && n.endsWith('.test.tsx'));

describe('las pruebas de capa corren, y corren aparte', () => {
  it('EL CENTINELA: hay archivos de capa que vigilar', () => {
    // Sin esto, borrarlos todos dejaria las comprobaciones de abajo recorriendo la lista vacia y
    // pasando en verde — que es como una guarda se queda sin sujeto sin que nadie la borre.
    expect(enElDisco.length, 'no quedo ni un archivo `capa-*.test.tsx`').toBeGreaterThanOrEqual(2);
  });

  it('`test` los EXCLUYE, que es lo que evita el rojo intermitente', () => {
    expect(paquete.scripts.test).toContain('--exclude');
    expect(paquete.scripts.test).toContain('capa-*.test.tsx');
  });

  it('y `test:capas` los nombra a TODOS, uno por uno', () => {
    // Uno por uno y no por comodin, a proposito: anadir un archivo de capa obliga a decir cual, que
    // es la unica senal de que la suite lenta crecio.
    const guion = paquete.scripts['test:capas'] ?? '';
    const sinCorrer = enElDisco.filter((n) => !guion.includes(join(DONDE, n)));
    expect(
      sinCorrer,
      'Hay archivos de capa que NO los corre nadie: `test` los excluye y `test:capas` no los ' +
        `nombra.\n  ${sinCorrer.join('\n  ')}`,
    ).toEqual([]);
  });

  it('`verificar` encadena los dos, en ese orden', () => {
    const verificar = paquete.scripts.verificar ?? '';
    expect(verificar).toContain('yarn test');
    expect(verificar).toContain('yarn test:capas');
  });

  it('la indulgencia es de `test:capas` y NO de `test`', () => {
    // Si `test` la llevara, un error no capturado de verdad —en cualquiera de los 18 archivos
    // restantes— dejaria de verse.
    expect(paquete.scripts['test:capas']).toContain('--dangerouslyIgnoreUnhandledErrors');
    expect(paquete.scripts.test).not.toContain('dangerouslyIgnoreUnhandledErrors');
  });
});
