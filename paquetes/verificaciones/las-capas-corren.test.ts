// @vitest-environment node
//
// Lee el `package.json` y el arbol de archivos. No es un DOM lo que necesita.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

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
 *
 * <h2>Y desde #13 barre `paquetes/` ENTERO, no un directorio</h2>
 *
 * Hasta el armazon, las dos unicas capas vivian en `paquetes/ui/shadcn` y la guarda miraba ahi. Eso
 * era un hueco medido, no una simplificacion: el patron de `--exclude` de `test` es **global** —lleva
 * el comodin de directorio delante—, asi que un `capa-*.test.tsx` en `paquetes/shell` —o en otro—
 * quedaba excluido de `test` igual que los demas y **la guarda no lo veia** para exigir que
 * `test:capas` lo nombrara. O sea: el archivo no lo corria nadie, que es exactamente el modo de
 * fallo que esta guarda existe para impedir, escondido en el sitio donde la guarda no miraba.
 */

const paquete = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

const PAQUETES = 'paquetes';
const APARTADAS = new Set(['node_modules', 'dist', 'muestras']);

/** Todos los archivos de capa del arbol, con su ruta desde la raiz. Ver el javadoc. */
function archivosDeCapa(directorio: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    if (APARTADAS.has(entrada)) continue;
    const completa = join(directorio, entrada);
    if (statSync(completa).isDirectory()) {
      salida.push(...archivosDeCapa(completa));
      continue;
    }
    if (entrada.startsWith('capa-') && entrada.endsWith('.test.tsx')) {
      salida.push(completa);
    }
  }
  return salida;
}

const enElDisco = archivosDeCapa(PAQUETES);

describe('las pruebas de capa corren, y corren aparte', () => {
  it('EL CENTINELA: hay archivos de capa que vigilar', () => {
    // Sin esto, borrarlos todos dejaria las comprobaciones de abajo recorriendo la lista vacia y
    // pasando en verde — que es como una guarda se queda sin sujeto sin que nadie la borre.
    expect(enElDisco.length, 'no quedo ni un archivo `capa-*.test.tsx`').toBeGreaterThanOrEqual(2);
  });

  it('EL CENTINELA: el barrido es de `paquetes/` entero y no de un directorio', () => {
    // La guarda mira donde el `--exclude` de `test` muerde, que es TODO el arbol. Si alguien la
    // volviera a acotar a un directorio, un archivo de capa fuera de el dejaria de correrlo nadie
    // sin que esto se pusiera rojo. Se comprueba recorriendo: `paquetes/` tiene subdirectorios de
    // mas de un nivel y el recorrido tiene que llegar a ellos.
    expect(enElDisco.every((n) => n.startsWith(`${PAQUETES}${sep}`))).toBe(true);
    expect(
      enElDisco.some((n) => relative(PAQUETES, n).split(sep).length > 2),
      'el recorrido no bajo de un nivel: no esta recorriendo, esta listando',
    ).toBe(true);
  });

  it('`test` los EXCLUYE, que es lo que evita el rojo intermitente', () => {
    expect(paquete.scripts.test).toContain('--exclude');
    expect(paquete.scripts.test).toContain('capa-*.test.tsx');
  });

  it('y `test:capas` los nombra a TODOS, uno por uno', () => {
    // Uno por uno y no por comodin, a proposito: anadir un archivo de capa obliga a decir cual, que
    // es la unica senal de que la suite lenta crecio.
    const guion = paquete.scripts['test:capas'] ?? '';
    const sinCorrer = enElDisco.filter((n) => !guion.includes(n));
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
