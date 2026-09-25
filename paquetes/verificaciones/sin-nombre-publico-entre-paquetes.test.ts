// @vitest-environment node
//
// Lee el DISCO, no un DOM: en `jsdom`, `import.meta.url` no es una URL `file:` y `fileURLToPath`
// revienta con «The URL must be of scheme file».

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PAQUETES,
  RAIZ,
  archivosDeLosPaquetes,
  importsDe,
  importsDelCss,
  importsQueCasan,
  leer,
  type ImportHallado,
} from './texto.ts';

/**
 * **Ningun paquete importa a otro por su nombre publico.**
 *
 * Los imports ENTRE paquetes son relativos. No es estilo: es la unica forma que resuelve igual
 * aqui y en un consumidor.
 *
 * <h2>De que defecto viene, medido (#4)</h2>
 *
 * `paquetes/sesion/escalera.ts` hacia `import { ErrorDeLaApi } from '@kamayuk/api'`. Aqui resolvia
 * —este repositorio es raiz de workspaces y yarn crea `node_modules/@kamayuk/api`, y ademas el
 * `tsconfig.json` tenia un `paths`—. En un consumidor no: Vite y `tsc` resuelven el symlink a su
 * RUTA REAL (`preserveSymlinks` apagado por omision en los dos) y buscan subiendo por
 * `kamayuk-lib/`, no por el arbol del consumidor. Sin `kamayuk-lib/node_modules`:
 *
 *     paquetes/sesion/index.ts(1,30): error TS2307: Cannot find module '@kamayuk/api'    RC=2
 *
 * Un rojo que SOLO sale en CI, dentro de un archivo de otro repositorio, y cuya primera lectura
 * —«esta roto `kamayuk-lib`»— manda a mirar donde no es.
 *
 * Y no hay ninguna senal en la que apoyarse: medido en banco, **yarn 1.22.22 no emite ni un aviso
 * de `peerDependency` para una dependencia `link:`**, ni `--check-files` lo caza. La comprobacion
 * habia que escribirla.
 */

/**
 * **Un especificador que nombra un paquete de la casa por su nombre publico**, con subcamino o sin
 * el: `@kamayuk/api`, `@kamayuk/ui/estilos.css`, `@kamayuk/verificaciones/prohibiciones`.
 *
 * Se mira el ESPECIFICADOR que el analizador de TypeScript saca de cada import (`imports.mjs`), no
 * la linea (#112). Hasta #112 era una expresion regular sobre el texto —`from '@kamayuk/<x>'`,
 * `require(…)` o `import(…)`— y se le escapaban el import de efecto (`import '@kamayuk/ui';`) y
 * cualquier subcamino, porque `[a-z-]+['"]` no lo admitia.
 */
const NOMBRE_PUBLICO = /^@kamayuk\/[a-z-]+(?:\/|$)/u;

function esNombrePublico(especificador: string): boolean {
  return NOMBRE_PUBLICO.test(especificador);
}

function hallazgosDe(archivos: readonly string[]): ImportHallado[] {
  return importsQueCasan(archivos, esNombrePublico, RAIZ);
}

const TODOS = archivosDeLosPaquetes();

describe('ningun paquete importa a otro por su nombre publico', () => {
  it('EL CENTINELA: se leen archivos de los seis paquetes', () => {
    // Sin esto lo de abajo pasaria sobre la lista vacia, que es como una guarda se queda sin
    // sujeto y sigue en verde.
    expect(TODOS.length, 'no se leyo ni un archivo: la guarda no mide nada').toBeGreaterThan(12);
    for (const paquete of ['formato', 'api', 'sesion', 'verificaciones']) {
      expect(
        TODOS.some((a) => a.startsWith(join(PAQUETES, paquete))),
        `no se leyo ni un archivo de «${paquete}»`,
      ).toBe(true);
    }
  });

  it('ni en codigo de produccion ni en pruebas', () => {
    const hallazgos = hallazgosDe(TODOS);
    const detalle = hallazgos.map((h) => `  ${h.archivo}:${String(h.linea)}  ${h.texto}`).join('\n');
    expect(
      hallazgos,
      'Un import por el nombre publico resuelve AQUI —este repositorio es raiz de workspaces— y ' +
        'se rompe en el consumidor, que resuelve el symlink a su ruta real. Usa una ruta ' +
        `relativa: "../api/index.ts".\n\nDonde aparece:\n${detalle}`,
    ).toEqual([]);
  });

  it('LA MUESTRA: la guarda muerde, y se demuestra', () => {
    const muestra = [join(PAQUETES, 'verificaciones/muestras/nombre-publico-entre-paquetes.ts')];
    expect(leer(muestra[0] ?? '').length).toBeGreaterThan(0);
    // Y no la recoge el recorrido de verdad: si `muestras/` entrara, la guarda saldria roja
    // siempre y se acabaria desactivando.
    // El SEGMENTO de directorio, no la subcadena: `otras-muestras.ts` lleva la palabra en el
    // nombre y no es una muestra. Medido — con `includes('muestras')` esta linea salio roja
    // nombrando ese archivo.
    expect(TODOS.filter((a) => a.includes(`${sep}muestras${sep}`))).toEqual([]);
    expect(hallazgosDe(muestra).length).toBeGreaterThan(0);
  });

  it('LA MUESTRA: halla CADA forma de importar, una por una, y no el comentario (#112)', () => {
    // Que la muestra de positivo no basta: con la expresion regular de antes, la primera linea
    // bastaba para el verde y las tres del medio pasaban sin que nada lo dijera.
    const muestra = [join(PAQUETES, 'verificaciones/muestras/nombre-publico-entre-paquetes.ts')];
    expect(hallazgosDe(muestra).map((h) => h.texto)).toEqual([
      "import { ErrorDeLaApi } from '@kamayuk/api';",
      "import '@kamayuk/ui';",
      "import '@kamayuk/ui/estilos.css';",
      "import { PROHIBICIONES } from '@kamayuk/verificaciones/prohibiciones';",
      "export { crearCliente } from '@kamayuk/api';",
      "export * as api from '@kamayuk/api';",
      "export type * as ui from '@kamayuk/ui';",
      "export const laSesion = () => import('@kamayuk/sesion');",
    ]);
  });

  it('un import en un comentario NO se denuncia, ni una cadena con su forma (#112)', () => {
    // Lo descarta el propio analizador, que mira nodos y no texto: no hace falta quitar los
    // comentarios antes.
    const texto = [
      "// import '@kamayuk/ui';",
      "/* import { x } from '@kamayuk/api'; */",
      "const linea = \"import '@kamayuk/ui/estilos.css';\";",
      "import { formatear } from '../formato/index.ts';",
    ].join('\n');
    expect(importsDe(texto).map((i) => i.especificador)).toEqual(['../formato/index.ts']);
  });

  it('el analizador ve CADA forma de import que el lenguaje tiene, una por linea (#112)', () => {
    // Las muestras de las guardas llevan las formas que se escriben; esta lista lleva TODAS, para
    // que lo que decide que es un import no pierda una sin que nada lo diga. Medido en la segunda
    // verificacion independiente: `ts.preProcessFile` devolvia `[]` para `export * as x from` y
    // `export type * as x from`, que la expresion regular de antes si veia.
    const formas = [
      ["import x from 'a';", 'a'],
      ["import 'b';", 'b'],
      ["import * as c from 'c';", 'c'],
      ["import type { D } from 'd';", 'd'],
      ["import { type E } from 'e';", 'e'],
      ["export { f } from 'f';", 'f'],
      ["export * from 'g';", 'g'],
      ["export * as h from 'h';", 'h'],
      ["export type * as i from 'i';", 'i'],
      ["export type { J } from 'j';", 'j'],
      ["export type * from 'k';", 'k'],
      ["const l = import('l');", 'l'],
      ["const m = require('m');", 'm'],
      ["import n = require('n');", 'n'],
      ["type O = typeof import('o');", 'o'],
      ["let p: import('p').P;", 'p'],
      ["import q from 'q' with { type: 'json' };", 'q'],
      ["export { t as default } from 't';", 't'],
      ["const u = await import(/* x */ 'u');", 'u'],
    ] as const;
    const texto = formas.map(([linea]) => linea).join('\n');
    expect(importsDe(texto).map((i) => [i.linea, i.especificador])).toEqual(
      formas.map(([, especificador], indice) => [indice + 1, especificador]),
    );
  });

  it('y el texto JSX con la forma de un import NO es un import (#112)', () => {
    const texto = ["import { x } from '../ui/index.ts';", "export const P = () => <p>import '@kamayuk/ui'</p>;"];
    expect(importsDe(texto.join('\n'), undefined, 'pieza.tsx').map((i) => i.especificador)).toEqual([
      '../ui/index.ts',
    ]);
    // Y el barrido le pasa al analizador el nombre de cada archivo: leido como `.ts`, esa linea es
    // un cast seguido de un import de efecto, y la guarda se pondria roja con un parrafo.
    const carpeta = mkdtempSync(join(tmpdir(), 'kamayuk-jsx-'));
    try {
      const pieza = join(carpeta, 'Pieza.tsx');
      writeFileSync(pieza, texto.join('\n'));
      expect(hallazgosDe([pieza])).toEqual([]);
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });

  it('y en una hoja de estilos, el `@import` por el nombre publico tambien (#112)', () => {
    // El recorrido lee los `.css`, y el analizador de TypeScript no los entiende: van aparte.
    const hoja = [
      '/* Un consumidor hace `@import \'@kamayuk/ui/estilos.css\'` y eso no cuenta. */',
      '@import "tailwindcss";',
      "@import '@kamayuk/ui/estilos.css' layer(base);",
      '@import url("./temas.css");',
    ].join('\n');
    expect(importsDelCss(hoja).map((i) => [i.linea, i.especificador])).toEqual([
      [2, 'tailwindcss'],
      [3, '@kamayuk/ui/estilos.css'],
      [4, './temas.css'],
    ]);
    expect(importsDelCss(hoja).filter((i) => esNombrePublico(i.especificador)).length).toBe(1);
  });

  it('y en una hoja de estilos, CADA forma del `@import`, con `url()` sin comillas tambien (#112)', () => {
    // La verificacion independiente de #112 midio el hueco: `@import url(@kamayuk/ui/estilos.css);`
    // —CSS valido— como primera linea de `clasico.css` dejaba esta guarda en verde, porque la
    // expresion exigia comillas. Una linea por forma, y la ultima NO es un import: `@importurl`
    // es otra palabra para el tokenizador de CSS.
    const hoja = [
      '@import url(@kamayuk/ui/estilos.css);',
      '@import url(  @kamayuk/ui/temas.css  ) layer(base);',
      "@import url( '@kamayuk/ui' );",
      '@IMPORT URL(@kamayuk/shell/estilos.css);',
      '@import"@kamayuk/ui/estilos.css";',
      "@import '@kamayuk/ui/estilos.css' supports(display: grid);",
      '@importurl(@kamayuk/ui/estilos.css);',
    ].join('\n');
    expect(importsDelCss(hoja).map((i) => [i.linea, i.especificador])).toEqual([
      [1, '@kamayuk/ui/estilos.css'],
      [2, '@kamayuk/ui/temas.css'],
      [3, '@kamayuk/ui'],
      [4, '@kamayuk/shell/estilos.css'],
      [5, '@kamayuk/ui/estilos.css'],
      [6, '@kamayuk/ui/estilos.css'],
    ]);
    expect(importsDelCss(hoja).every((i) => esNombrePublico(i.especificador))).toBe(true);
  });

  it('y no confunde el nombre publico con una mencion en prosa', () => {
    // `@kamayuk/api` aparece en docblocks por todas partes explicando de donde viene cada pieza.
    // Eso no es un import y no puede ponerse rojo.
    expect(hallazgosDe([join(PAQUETES, 'sesion/index.ts')])).toEqual([]);
  });
});
