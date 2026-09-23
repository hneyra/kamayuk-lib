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
    const todo = archivosDe(PAQUETES, { extensiones: ['.ts', '.tsx', '.mjs', '.js', '.css'], pruebas: true })
      .map((archivo) => rutaDesde(RAIZ, archivo));
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
