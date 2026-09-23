// @vitest-environment node
//
// Lee `package.json`, el workflow y los dos archivos con cifras. No es un DOM lo que necesita, y
// NO corre `vitest list`: eso es lo que hace el guion, y un vitest dentro de vitest no mide nada
// que el guion no mida ya en `yarn verificar`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DONDE_HAY_CIFRAS,
  TOTAL,
  agrupar,
  argumentosDeVitest,
  describir,
  medir,
  paquetesDe,
  partirOrden,
  reescribir,
  textoDe,
} from './cifras.mjs';
import { RAIZ } from './texto.ts';

/**
 * **Las cifras de pruebas las escribe un guion** (#128).
 *
 * `cifras.mjs` mide con `vitest list --json` y reescribe solo el texto entre sus marcadores. Aqui
 * se le pasan las muestras que lo tienen que poner rojo —una cifra cambiada a mano, un marcador que
 * falta, uno con una clave que no existe, uno sin cerrar— y las que tiene que dejar pasar, sin
 * correr `vitest list`: la medida entra fabricada, que es lo que permite decir exactamente que
 * tiene que salir.
 *
 * Y dos cosas del arbol de verdad, que sin esto dejarian el guion sin sujeto EN VERDE: que los
 * archivos que declara lleven un marcador por paquete, y que la CI lo corra cuando esos archivos
 * cambian.
 */

const manifiesto = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

/** Lo que devuelve `vitest list --json`: el nombre de la prueba y su archivo, absoluto. */
const prueba = (archivo: string, nombre = 'una prueba') => ({ name: nombre, file: join(RAIZ, archivo) });

/** Una medida fabricada con la forma de la de hoy, en pequeno: dos paquetes y una capa. */
const PAQUETES = ['formato', 'ui'];
const MEDIDAS = medir({
  paquetes: PAQUETES,
  normales: [
    prueba('paquetes/formato/formato.test.ts', 'a'),
    prueba('paquetes/formato/formato.test.ts', 'b'),
    prueba('paquetes/formato/documento.test.ts', 'c'),
    prueba('paquetes/ui/color.test.ts', 'd'),
  ],
  deCapa: [prueba('paquetes/ui/shadcn/capa-del-menu.test.tsx', 'e')],
  raiz: RAIZ,
});

/** Un `CLAUDE.md` en pequeno, con las cifras BIEN. */
const BIEN = [
  '| Pieza | Estado |',
  '|---|---|',
  '| formato | **Existe.** <!-- cifras:formato -->**3 pruebas** en 2 archivos<!-- /cifras -->. Le falta algo |',
  '| ui | <!-- cifras:ui -->**1 prueba** en 1 archivo, más la **1** de capa<!-- /cifras --> y las barreras |',
  '',
  '<!-- cifras:total -->**En total: 4 pruebas en 3 archivos, más la 1 de capa.**<!-- /cifras -->',
].join('\n');

const EN_CLAUDE = { archivo: 'CLAUDE.md', conElTotal: true };
const EN_README = { archivo: 'README.md', conElTotal: false };

describe('las ordenes se leen de `package.json`, no se copian', () => {
  it('parte `test` en las mismas palabras que el shell', () => {
    expect(partirOrden(manifiesto.scripts.test ?? '')).toEqual([
      'vitest',
      'run',
      '--exclude',
      '**/node_modules/**',
      '--exclude',
      '**/capa-*.test.tsx',
    ]);
  });

  it('y lo que le pasa a `vitest list` es lo que `test` y `test:capas` le pasan a `vitest run`', () => {
    expect(argumentosDeVitest('test', manifiesto.scripts.test)).toContain('**/capa-*.test.tsx');
    const deLasCapas = argumentosDeVitest('test:capas', manifiesto.scripts['test:capas']);
    expect(deLasCapas.filter((a) => a.includes('capa-')).length).toBeGreaterThanOrEqual(2);
  });

  it('una orden que no es `vitest run`, compuesta o que falta sale roja diciendolo', () => {
    expect(() => argumentosDeVitest('test', 'jest --ci')).toThrow(/no empieza por «vitest run»/);
    expect(() => argumentosDeVitest('test', 'vitest run && echo hecho')).toThrow(/compuesta/);
    expect(() => argumentosDeVitest('test', "vitest run --exclude '**/x")).toThrow(/sin cerrar/);
    expect(() => argumentosDeVitest('test', undefined)).toThrow(/no tiene la orden «test»/);
  });
});

describe('se cuenta por paquete', () => {
  it('agrupa por `paquetes/<p>/`, con los archivos sin repetir', () => {
    const grupos = agrupar(
      [prueba('paquetes/api/cliente.test.ts'), prueba('paquetes/api/cliente.test.ts'), prueba('paquetes/api/subir.test.ts')],
      RAIZ,
    );
    expect(grupos.get('api')?.pruebas).toBe(3);
    expect(grupos.get('api')?.archivos.size).toBe(2);
  });

  it('una prueba fuera de `paquetes/<p>/` no se reparte a ojo: se dice', () => {
    expect(() => agrupar([prueba('docs/algo.test.ts')], RAIZ)).toThrow(/«docs\/algo\.test\.ts» no vive/);
  });

  it('y una prueba en un directorio que no es un paquete, tampoco', () => {
    expect(() =>
      medir({ paquetes: ['ui'], normales: [prueba('paquetes/fantasma/x.test.ts')], deCapa: [], raiz: RAIZ }),
    ).toThrow(/«paquetes\/fantasma\/»/);
  });

  it('los paquetes se leen del disco: son los seis de hoy', () => {
    expect(paquetesDe(RAIZ)).toEqual(['api', 'formato', 'sesion', 'shell', 'ui', 'verificaciones']);
  });
});

describe('el texto es el que `CLAUDE.md` ya escribia a mano', () => {
  it('con la forma de hoy, y el singular cuando toca', () => {
    expect(textoDe('formato', MEDIDAS)).toBe('**3 pruebas** en 2 archivos');
    expect(textoDe('ui', MEDIDAS)).toBe('**1 prueba** en 1 archivo, más la **1** de capa');
    expect(textoDe(TOTAL, MEDIDAS)).toBe('**En total: 4 pruebas en 3 archivos, más la 1 de capa.**');
  });

  it('y el de hoy, con las cifras de hoy, sale letra por letra', () => {
    const hoy = new Map([
      ['ui', { pruebas: 533, archivos: 25, pruebasDeCapa: 3, archivosDeCapa: 3 }],
      ['api', { pruebas: 124, archivos: 5, pruebasDeCapa: 0, archivosDeCapa: 0 }],
    ]);
    expect(textoDe('ui', hoy)).toBe('**533 pruebas** en 25 archivos, más las **3** de capa');
    expect(textoDe('api', hoy)).toBe('**124 pruebas** en 5 archivos');
  });
});

describe('reescribe solo entre marcadores, y dice lo que cambio', () => {
  it('con las cifras bien, no cambia ni un caracter', () => {
    const resultado = reescribir(BIEN, MEDIDAS, EN_CLAUDE);
    expect(resultado.problemas).toEqual([]);
    expect(resultado.diferencias).toEqual([]);
    expect(resultado.texto).toBe(BIEN);
  });

  it('LA MUESTRA DE AC-1: una cifra cambiada a mano se nombra, con lo escrito y lo medido', () => {
    const tocado = BIEN.replace('En total: 4 pruebas', 'En total: 5 pruebas');
    const { diferencias, texto } = reescribir(tocado, MEDIDAS, EN_CLAUDE);
    expect(diferencias).toHaveLength(1);
    expect(diferencias[0]).toMatchObject({ clave: TOTAL, linea: 6 });
    const dicho = describir(diferencias[0]!);
    expect(dicho).toContain('escrito 5, medido 4');
    expect(dicho).toContain('CLAUDE.md:6');
    // Y al reescribir vuelve a ser la buena, sin tocar lo de fuera.
    expect(texto).toBe(BIEN);
  });

  it('lo de fuera de los marcadores no lo toca aunque lleve numeros', () => {
    const conProsa = BIEN.replace('Le falta algo', 'Le faltan 7 cosas');
    expect(reescribir(conProsa, MEDIDAS, EN_CLAUDE).texto).toBe(conProsa);
  });

  it('una forma escrita a mano con otras palabras se dice como tal, sin emparejar numeros', () => {
    const aMano = BIEN.replace('**3 pruebas** en 2 archivos', '3 pruebas');
    const [diferencia] = reescribir(aMano, MEDIDAS, EN_CLAUDE).diferencias;
    expect(describir(diferencia!)).toContain('no tiene la forma que escribe el guion');
  });

  it('un paquete sin su marcador sale rojo: una cifra sin marcador se queda vieja en verde', () => {
    const sinFormato = BIEN.replace('<!-- cifras:formato -->**3 pruebas** en 2 archivos<!-- /cifras -->', '3 pruebas');
    expect(reescribir(sinFormato, MEDIDAS, EN_CLAUDE).problemas).toEqual([
      expect.stringContaining('falta el marcador «cifras:formato»'),
    ]);
  });

  it('el total se exige donde se declara, y solo ahi', () => {
    const sinTotal = BIEN.split('\n').slice(0, 4).join('\n');
    expect(reescribir(sinTotal, MEDIDAS, EN_CLAUDE).problemas).toEqual([
      expect.stringContaining('falta el marcador «cifras:total»'),
    ]);
    expect(reescribir(sinTotal, MEDIDAS, EN_README).problemas).toEqual([]);
  });

  it('una clave que no es un paquete ni `total` sale roja, nombrando los que hay', () => {
    const errata = `${BIEN}\n<!-- cifras:formatos -->**3 pruebas** en 2 archivos<!-- /cifras -->`;
    expect(reescribir(errata, MEDIDAS, EN_CLAUDE).problemas).toEqual([
      expect.stringMatching(/CLAUDE\.md:7: «cifras:formatos» no es ningun paquete.*formato, ui/),
    ]);
  });

  it('un marcador que abre y no cierra en su linea sale rojo', () => {
    const abierto = `${BIEN}\n<!-- cifras:ui -->**1 prueba**`;
    expect(reescribir(abierto, MEDIDAS, EN_CLAUDE).problemas).toEqual([
      expect.stringContaining('CLAUDE.md:7: un marcador «cifras» abre y no cierra'),
    ]);
  });
});

describe('el arbol de verdad', () => {
  it('cada archivo que declara cifras lleva un marcador por paquete, y `CLAUDE.md` el total', () => {
    // La medida es fabricada —aqui no se corre `vitest list`—, pero la LISTA de paquetes es la del
    // disco: lo que se comprueba es que no falte ni sobre ningun marcador, no que la cifra cuadre.
    // Que cuadre lo comprueba `yarn cifras --comprobar` dentro de `yarn verificar`.
    const paquetes = paquetesDe(RAIZ);
    const ficticias = medir({ paquetes, normales: [], deCapa: [], raiz: RAIZ });
    expect(DONDE_HAY_CIFRAS.length).toBeGreaterThanOrEqual(1);
    for (const donde of DONDE_HAY_CIFRAS) {
      const texto = readFileSync(join(RAIZ, donde.archivo), 'utf8');
      expect(reescribir(texto, ficticias, donde).problemas, donde.archivo).toEqual([]);
    }
  });

  it('`yarn verificar` corre la comprobacion, y es lo que corre la CI', () => {
    expect(manifiesto.scripts.verificar).toContain('yarn cifras --comprobar');
    expect(manifiesto.scripts.cifras).toBe('node paquetes/verificaciones/cifras.mjs');
    const ordenes = leerElWorkflow()
      .split('\n')
      .filter((linea) => !linea.trim().startsWith('#'))
      .join('\n');
    expect(ordenes).toMatch(/run: yarn verificar\s*$/m);
  });

  it('y la CI se dispara cuando cambia un archivo con cifras, en `push` y en `pull_request`', () => {
    const listas = listasDeRutas(leerElWorkflow());
    expect(listas, 'el workflow dejo de tener sus dos listas de `paths`').toHaveLength(2);
    for (const lista of listas) {
      for (const { archivo } of DONDE_HAY_CIFRAS) {
        expect(lista, `«${archivo}» no dispara la CI: una cifra tocada a mano no se comprobaria`).toContain(archivo);
      }
    }
  });
});

function leerElWorkflow(): string {
  return readFileSync(join(RAIZ, '.github/workflows/paquetes.yml'), 'utf8');
}

/** Cada lista `paths:` del workflow, con las comillas quitadas. */
function listasDeRutas(workflow: string): string[][] {
  const listas: string[][] = [];
  let actual: string[] | null = null;
  for (const linea of workflow.split('\n')) {
    const recortada = linea.trim();
    if (recortada === 'paths:') {
      actual = [];
      listas.push(actual);
      continue;
    }
    if (actual !== null && recortada.startsWith('- ')) {
      actual.push(recortada.slice(2).replace(/^"|"$/g, ''));
      continue;
    }
    actual = null;
  }
  return listas;
}
