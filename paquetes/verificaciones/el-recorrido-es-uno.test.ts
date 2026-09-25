// @vitest-environment node
//
// Fabrica arboles en el disco y los recorre. No es un DOM lo que necesita, y en `jsdom` el
// `fileURLToPath` de `texto.ts` revienta con «The URL must be of scheme file».

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * **Un sistema de archivos que no ordena** (#126, N3). En Linux el `scandir` de libuv ya devuelve
 * las entradas ordenadas, asi que ahi quitar el `sort()` de `archivosDe` no cambia nada y la
 * promesa de su docblock —la misma lista en cualquier sistema de archivos— no se podia medir. Con
 * `alReves` encendido, `readdirSync` devuelve lo mismo en orden inverso: lo que haria un sistema
 * de archivos que no ordena. Apagado —el resto del archivo—, es el de verdad.
 */
const desorden = vi.hoisted(() => ({ alReves: false }));
vi.mock('node:fs', async (original) => {
  const real = await original<typeof import('node:fs')>();
  const readdirSync = ((...argumentos: Parameters<typeof real.readdirSync>) => {
    const entradas = real.readdirSync(...argumentos);
    return desorden.alReves ? [...entradas].reverse() : entradas;
  }) as typeof real.readdirSync;
  return { ...real, default: { ...real, readdirSync }, readdirSync };
});

import {
  APARTADAS,
  PAQUETES,
  RAIZ,
  archivosDe,
  archivosDeLosPaquetes,
  archivosDeProduccion,
  lineasDelTextoQueCasan,
  lineasQueCasan,
  rutaDesde,
} from './texto.ts';

/**
 * **Las guardas recorren con UN recorredor, y se demuestra que recorre** (#126).
 *
 * Hasta #126 habia seis recorredores recursivos y `APARTADAS` escrita cinco veces con tres
 * contenidos distintos. Ahora hay uno, en `archivos.mjs`, y por eso mismo **un defecto suyo es un
 * defecto de todas las guardas a la vez**: si dejara de bajar de un nivel, o dejara de apartar
 * `muestras/`, las guardas no se pondrian rojas —verian menos, o verian las muestras y se
 * acabarian desactivando—. Esta prueba es la que lo diria.
 *
 * Se mide sobre un arbol FABRICADO, y no sobre `paquetes/`, a proposito: el de verdad cambia con
 * cada PR y no tiene una carpeta apartada en cada nivel. El fabricado tiene cada cosa donde hace
 * falta para que el recorrido tenga que decidir, y la lista que devuelve se compara ENTERA.
 */

let raiz = '';

/** El arbol: cada ruta, y lo que lleva dentro. */
const ARBOL: Readonly<Record<string, string>> = {
  'uno.ts': 'export const uno = 1;\n',
  'a/dos.ts': 'export const dos = 2;\n',
  // Cuatro niveles por debajo de la raiz: un recorrido que solo listara, o que bajara uno, no llega.
  'a/b/c/d/hondo.ts': 'export const hondo = 4;\n',
  'a/b/c/d/hondo.tsx': 'export const Hondo = () => null;\n',
  'a/b/c/d/nota.md': 'no es codigo\n',
  'a/b/pieza.test.ts': 'es una prueba\n',
  'a/b/pieza.spec.tsx': 'tambien es una prueba\n',
  'a/b/c/.oculta/escondido.ts': 'export const escondido = 1;\n',
  // Una carpeta apartada en cada nivel, y CON archivos que el recorrido si recogeria.
  'node_modules/dep/index.ts': 'export {};\n',
  'a/dist/compilado.ts': 'export {};\n',
  'a/b/c/muestras/viola.ts': 'export {};\n',
  'a/b/c/d/node_modules/otra/index.ts': 'export {};\n',
};

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'kamayuk-recorrido-'));
  for (const [ruta, texto] of Object.entries(ARBOL)) {
    mkdirSync(dirname(join(raiz, ruta)), { recursive: true });
    writeFileSync(join(raiz, ruta), texto);
  }
});

afterAll(() => {
  if (raiz !== '') rmSync(raiz, { recursive: true, force: true });
});

const recorrido = (opciones: Parameters<typeof archivosDe>[1]): string[] =>
  archivosDe(raiz, opciones).map((archivo) => rutaDesde(raiz, archivo));

describe('el recorredor comun baja y aparta', () => {
  it('EL CENTINELA: APARTADAS es la lista que se decidio, ni una mas ni una menos', () => {
    // Una lista que crece en silencio vacia las guardas —se deja de mirar lo que se aparta— y una
    // que encoge las llena de muestras, que violan las reglas a proposito. Las dos cosas pasan en
    // verde en todas las guardas a la vez, porque todas usan esta.
    expect([...APARTADAS].sort()).toEqual(['dist', 'muestras', 'node_modules']);
  });

  it('EL CENTINELA: en el arbol de verdad, ni una muestra ni una dependencia entran al recorrido', () => {
    const todo = archivosDeLosPaquetes().map((archivo) => rutaDesde(RAIZ, archivo));
    expect(todo.length, 'el recorrido no encontro nada: la guarda no mide').toBeGreaterThan(100);
    expect(todo.filter((ruta) => /\/(?:muestras|node_modules|dist)\//.test(ruta))).toEqual([]);
    // Y que apartar `muestras/` aparta algo: si la carpeta se vaciara, lo de arriba seria trivial.
    const sinApartar = archivosDe(PAQUETES, { extensiones: ['.ts', '.tsx'], apartadas: new Set(['node_modules']) });
    expect(sinApartar.some((archivo) => rutaDesde(RAIZ, archivo).includes('/muestras/'))).toBe(true);
  });

  it('baja a todos los niveles, salta cada carpeta apartada y deja fuera las pruebas', () => {
    expect(recorrido({ extensiones: ['.ts', '.tsx'] })).toEqual([
      'a/b/c/.oculta/escondido.ts',
      'a/b/c/d/hondo.ts',
      'a/b/c/d/hondo.tsx',
      'a/dos.ts',
      'uno.ts',
    ]);
  });

  it.each([...APARTADAS])('«%s» se aparta, y el arbol SI tiene algo que apartar ahi', (apartada) => {
    // Las dos mitades: sin la segunda, una carpeta que el arbol no tuviera pasaria en verde.
    const dentro = (ruta: string): boolean => ruta.split('/').includes(apartada);
    expect(recorrido({ extensiones: ['.ts'] }).filter(dentro)).toEqual([]);
    expect(recorrido({ extensiones: ['.ts'], apartadas: new Set<string>() }).filter(dentro).length).toBeGreaterThan(0);
  });

  it('las pruebas entran cuando se piden, en todas sus formas', () => {
    expect(recorrido({ extensiones: ['.ts', '.tsx'], pruebas: true })).toEqual([
      'a/b/c/.oculta/escondido.ts',
      'a/b/c/d/hondo.ts',
      'a/b/c/d/hondo.tsx',
      'a/b/pieza.spec.tsx',
      'a/b/pieza.test.ts',
      'a/dos.ts',
      'uno.ts',
    ]);
  });

  it('las carpetas ocultas se saltan cuando se pide, que es lo que hace el guion del arnes', () => {
    expect(recorrido({ extensiones: ['.ts'], ocultas: false })).toEqual(['a/b/c/d/hondo.ts', 'a/dos.ts', 'uno.ts']);
  });

  it('el orden no es el del sistema de archivos: uno que no ordena da la misma lista', () => {
    const ordenado = recorrido({ extensiones: ['.ts', '.tsx'], pruebas: true });
    desorden.alReves = true;
    try {
      expect(recorrido({ extensiones: ['.ts', '.tsx'], pruebas: true })).toEqual(ordenado);
    } finally {
      desorden.alReves = false;
    }
  });

  it('y solo recoge las extensiones que se le piden', () => {
    expect(recorrido({ extensiones: ['.md'] })).toEqual(['a/b/c/d/nota.md']);
  });
});

/**
 * **Las guardas del arbol leen CINCO extensiones, y se fija cuales** (#126, N1 y N3 de la primera
 * correccion).
 *
 * `archivosDeProduccion` y `archivosDeLosPaquetes` son lo que recorren `sin-suponer-un-sistema`,
 * `sin-nombre-publico-entre-paquetes`, `el-xhr-vive-en-un-solo-sitio`, `el-marco-no-decide-permisos`
 * y el barrido del texto visible. Su lista de extensiones —`EXTENSIONES` en `texto.ts`— es la que
 * habia en `main`, con `.css` y `.mjs` dentro. Quitar una no pone roja ninguna guarda: **las deja
 * mirando menos, en verde**. Se midio: sin `.css`, un `.predio-fantasma` en `clasico.css` deja de
 * caer en `sin-suponer-un-sistema`; sin `.mjs`, un `from '@kamayuk/api'` en `comentarios.mjs` deja
 * de caer en `sin-nombre-publico-entre-paquetes`, y los propios `archivos.mjs` y `comentarios.mjs`
 * —el recorredor y el quitador de comentarios— salen del barrido.
 *
 * Por eso se fija de las dos maneras: sobre un arbol FABRICADO con un archivo de cada extension, cuya
 * lista se compara ENTERA —una extension que se va o una que entra la cambian—, y sobre el arbol de
 * VERDAD, nombrando los archivos que hoy solo entran por `.css` y por `.mjs`.
 */
describe('las guardas del arbol leen las cinco extensiones que se decidieron', () => {
  let arbol = '';
  const DE_CADA_EXTENSION: Readonly<Record<string, string>> = {
    'codigo.ts': 'export {};\n',
    'pieza.tsx': 'export {};\n',
    'guion.mjs': 'export {};\n',
    'viejo.js': 'export {};\n',
    'estilos/hoja.css': '.a { color: red; }\n',
    'pieza.test.ts': 'es una prueba\n',
    'guion.test.mjs': 'tambien es una prueba\n',
    // Lo que NO es codigo del arbol: si alguna entrara, la lista crece y se ve.
    'nota.md': 'no\n',
    'datos.json': '{}\n',
    'tipos.d.mts': 'export {};\n',
    'imagen.svg': '<svg/>\n',
  };

  beforeAll(() => {
    arbol = mkdtempSync(join(tmpdir(), 'kamayuk-extensiones-'));
    for (const [ruta, texto] of Object.entries(DE_CADA_EXTENSION)) {
      mkdirSync(dirname(join(arbol, ruta)), { recursive: true });
      writeFileSync(join(arbol, ruta), texto);
    }
  });

  afterAll(() => {
    if (arbol !== '') rmSync(arbol, { recursive: true, force: true });
  });

  it('`archivosDeProduccion` recoge .ts, .tsx, .mjs, .js y .css, y nada mas', () => {
    expect(archivosDeProduccion(arbol).map((archivo) => rutaDesde(arbol, archivo))).toEqual([
      'codigo.ts',
      'estilos/hoja.css',
      'guion.mjs',
      'pieza.tsx',
      'viejo.js',
    ]);
  });

  it('`archivosDeLosPaquetes` recoge lo mismo, con las pruebas', () => {
    expect(archivosDeLosPaquetes(arbol).map((archivo) => rutaDesde(arbol, archivo))).toEqual([
      'codigo.ts',
      'estilos/hoja.css',
      'guion.mjs',
      'guion.test.mjs',
      'pieza.test.ts',
      'pieza.tsx',
      'viejo.js',
    ]);
  });

  it('EL CENTINELA: en el arbol de verdad entran los CSS de la interfaz y los .mjs de las guardas', () => {
    // Los que hoy solo entran por `.css` y por `.mjs`: si uno falta, una guarda dejo de mirarlo.
    const QUE_TIENEN_QUE_ENTRAR = [
      'paquetes/ui/estilos/clasico.css',
      'paquetes/ui/estilos/estilos.css',
      'paquetes/ui/estilos/temas.css',
      'paquetes/verificaciones/archivos.mjs',
      'paquetes/verificaciones/comentarios.mjs',
      'paquetes/verificaciones/prohibiciones.mjs',
    ];
    for (const recorrido of [archivosDeProduccion(), archivosDeLosPaquetes()]) {
      const rutas = recorrido.map((archivo) => rutaDesde(RAIZ, archivo));
      expect(QUE_TIENEN_QUE_ENTRAR.filter((ruta) => !rutas.includes(ruta))).toEqual([]);
    }
  });
});

describe('el escaner de lineas es uno, y numera como el archivo', () => {
  it('omite los comentarios, no se come una URL y conserva el numero de linea', () => {
    const texto = [
      '/**',
      ' * PROHIBIDO en un docblock no cuenta',
      ' */',
      "const u = 'https://x'; const p = 'PROHIBIDO';",
      '// PROHIBIDO en un comentario de linea tampoco',
      'const q = 1; // PROHIBIDO al final tampoco',
    ].join('\n');
    expect(lineasDelTextoQueCasan(texto, /PROHIBIDO/)).toEqual([
      { linea: 4, texto: "const u = 'https://x'; const p = 'PROHIBIDO';" },
    ]);
  });

  it('acepta varios patrones, y una linea que casa con dos sale una vez', () => {
    expect(lineasDelTextoQueCasan('a b\nb\nc', [/a/, /b/])).toEqual([
      { linea: 1, texto: 'a b' },
      { linea: 2, texto: 'b' },
    ]);
  });

  it('cada hallazgo lleva su archivo, escrito desde la raiz con `/`', () => {
    const archivos = archivosDe(raiz, { extensiones: ['.ts'] });
    expect(lineasQueCasan(archivos, /hondo/, raiz)).toEqual([
      { archivo: 'a/b/c/d/hondo.ts', linea: 1, texto: 'export const hondo = 4;' },
    ]);
  });
});
