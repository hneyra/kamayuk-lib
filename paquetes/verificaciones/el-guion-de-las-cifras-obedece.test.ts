// @vitest-environment node
//
// Corre `cifras.mjs` como proceso, sobre una raiz fabricada en una carpeta temporal. No es un DOM
// lo que necesita.

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RAIZ } from './texto.ts';

/**
 * **El guion hace lo que `decidir()` dice** (#128).
 *
 * `las-cifras-las-escribe-un-guion.test.ts` importa las funciones puras de `cifras.mjs` y les pasa
 * entradas fabricadas, y `decidir()` es lo que decide el codigo de salida. Pero **quien sale del
 * proceso es `principal()`**, y ninguna prueba lo corria: medido en la segunda revision de #128,
 * cambiar su `if (codigo !== 0) process.exit(codigo)` por `if (codigo > 1)` y tocar a mano el total
 * de `CLAUDE.md` dejaba el guion imprimiendo `FALLO: las cifras escritas no son las medidas.` y
 * saliendo con **RC=0**, las 232 pruebas de `verificaciones` en verde y el eslabon de
 * `yarn verificar` pasando. La puerta del RC de la CI se aflojaba un eslabon mas abajo.
 *
 * <h2>Como se prueba sin correr la suite</h2>
 *
 * Se corre **el guion de verdad**, como proceso y copiado tal cual en una raiz fabricada:
 * `cifras.mjs` saca su raiz de `import.meta.url`, asi que la copia en `<raiz>/paquetes/verificaciones/`
 * mide `<raiz>` y no este arbol. Lo unico fabricado es lo que `principal()` llama por fuera:
 * `vitest`. En `<raiz>/node_modules/vitest/` hay un `vitest` falso —que es donde el guion lo busca,
 * con `createRequire` desde su propio archivo— que escribe una lista de pruebas escrita aqui, y
 * **solo si le llegan exactamente los argumentos de las ordenes `test` y `test:capas` del
 * `package.json` fabricado**: con otros sale con 3, y el guion revienta.
 *
 * Asi se pueden decir exactamente el codigo, lo que se dijo y lo que quedo en el disco, sin un
 * vitest dentro de vitest —que tardaria un minuto y mediria la suite de este arbol, no la puerta—.
 * Que `vitest list` de verdad cuente lo que corre lo sigue comprobando `yarn cifras --comprobar`
 * dentro de `yarn verificar`.
 */

const GUION = join(RAIZ, 'paquetes/verificaciones/cifras.mjs');

/** Las dos ordenes del `package.json` fabricado, y lo que el `vitest` falso devuelve con cada una. */
const ORDENES = {
  test: "vitest run --exclude '**/capa-*.test.tsx'",
  'test:capas': 'vitest run paquetes/dos/capa-una.test.tsx',
};
const ARGUMENTOS_DE_TEST = '--exclude **/capa-*.test.tsx';
const ARGUMENTOS_DE_CAPAS = 'paquetes/dos/capa-una.test.tsx';

type Lista = { name: string; file: string }[];
type Listas = Record<string, Lista>;

const listasDe = (raiz: string): Listas => ({
  [ARGUMENTOS_DE_TEST]: [
    { name: 'a', file: join(raiz, 'paquetes/uno/a.test.ts') },
    { name: 'b', file: join(raiz, 'paquetes/uno/a.test.ts') },
    { name: 'c', file: join(raiz, 'paquetes/dos/b.test.ts') },
  ],
  [ARGUMENTOS_DE_CAPAS]: [{ name: 'd', file: join(raiz, 'paquetes/dos/capa-una.test.tsx') }],
});

const SIN_PRUEBAS: Listas = { [ARGUMENTOS_DE_TEST]: [], [ARGUMENTOS_DE_CAPAS]: [] };

/** Lo que mide esa lista, en la forma que escribe el guion. */
const CLAUDE_BIEN = [
  '| Pieza | Estado |',
  '|---|---|',
  '| uno | <!-- cifras:uno -->**2 pruebas** en 1 archivo<!-- /cifras --> |',
  '| dos | <!-- cifras:dos -->**1 prueba** en 1 archivo, más la **1** de capa<!-- /cifras --> |',
  '',
  '<!-- cifras:total -->**En total: 3 pruebas en 2 archivos, más la 1 de capa.**<!-- /cifras -->',
  '',
].join('\n');

const README_BIEN = [
  '| uno | <!-- cifras:uno -->**2 pruebas** en 1 archivo<!-- /cifras --> |',
  '| dos | <!-- cifras:dos -->**1 prueba** en 1 archivo, más la **1** de capa<!-- /cifras --> |',
  '',
].join('\n');

/** El total de `CLAUDE.md`, tocado a mano: la rotura de la revision. */
const CLAUDE_TOCADO = CLAUDE_BIEN.replace('En total: 3 pruebas', 'En total: 4 pruebas');

/** El `vitest` falso. Corre con `cwd` en la raiz fabricada, que es donde `listar()` lo pone. */
const VITEST_FALSO = `
import { readFileSync, writeFileSync } from 'node:fs';
const [orden, destino, ...argumentos] = process.argv.slice(2);
const listas = JSON.parse(readFileSync('listas.json', 'utf8'));
const lista = listas[argumentos.join(' ')];
if (orden !== 'list' || !destino?.startsWith('--json=') || lista === undefined) {
  console.error('vitest falso: no se esperaba ' + JSON.stringify(process.argv.slice(2)));
  process.exit(3);
}
writeFileSync(destino.slice('--json='.length), JSON.stringify(lista));
`;

/**
 * Una raiz fabricada con dos paquetes, `uno` y `dos`, el guion copiado de este arbol y el `vitest`
 * falso, con esos dos archivos de cifras.
 */
function conUnaRaiz<T>(
  { claude, readme, listas }: { claude: string; readme: string; listas?: (raiz: string) => Listas },
  hacer: (raiz: string) => T,
): T {
  const raiz = mkdtempSync(join(tmpdir(), 'kamayuk-cifras-guion-'));
  try {
    writeFileSync(join(raiz, 'package.json'), JSON.stringify({ scripts: ORDENES }));
    for (const paquete of ['uno', 'dos']) {
      mkdirSync(join(raiz, 'paquetes', paquete), { recursive: true });
      writeFileSync(join(raiz, 'paquetes', paquete, 'package.json'), '{}');
    }
    mkdirSync(join(raiz, 'paquetes/verificaciones'), { recursive: true });
    // El guion y lo que importa: desde #126 normaliza las rutas con `rutaDesde`, de `archivos.mjs`,
    // que a su vez importa `comentarios.mjs`. Sin ellos el proceso muere en `ERR_MODULE_NOT_FOUND`.
    for (const modulo of ['cifras.mjs', 'archivos.mjs', 'comentarios.mjs']) {
      copyFileSync(join(dirname(GUION), modulo), join(raiz, 'paquetes/verificaciones', modulo));
    }
    mkdirSync(join(raiz, 'node_modules/vitest'), { recursive: true });
    writeFileSync(
      join(raiz, 'node_modules/vitest/package.json'),
      JSON.stringify({ name: 'vitest', bin: { vitest: 'falso.mjs' } }),
    );
    writeFileSync(join(raiz, 'node_modules/vitest/falso.mjs'), VITEST_FALSO);
    writeFileSync(join(raiz, 'listas.json'), JSON.stringify((listas ?? listasDe)(raiz)));
    writeFileSync(join(raiz, 'CLAUDE.md'), claude);
    writeFileSync(join(raiz, 'README.md'), readme);
    return hacer(raiz);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

/** El guion copiado, corrido como lo corre `yarn cifras`: `node paquetes/verificaciones/cifras.mjs`. */
function correr(raiz: string, ...argumentos: string[]) {
  const resultado = spawnSync(process.execPath, ['paquetes/verificaciones/cifras.mjs', ...argumentos], {
    cwd: raiz,
    encoding: 'utf8',
  });
  if (resultado.error) throw resultado.error;
  return {
    codigo: resultado.status,
    dicho: resultado.stdout,
    errores: resultado.stderr,
    claude: readFileSync(join(raiz, 'CLAUDE.md'), 'utf8'),
    readme: readFileSync(join(raiz, 'README.md'), 'utf8'),
  };
}

describe('el guion, como proceso, hace lo que `decidir` dice', () => {
  it('LA DE LA REVISION: con `--comprobar` y UNA cifra tocada a mano, el proceso sale con RC=1 y no escribe', () => {
    const { codigo, errores, claude, readme } = conUnaRaiz({ claude: CLAUDE_TOCADO, readme: README_BIEN }, (raiz) =>
      correr(raiz, '--comprobar'),
    );
    expect(codigo, errores).toBe(1);
    expect(errores).toContain('FALLO: las cifras escritas no son las medidas.');
    expect(errores).toContain('CLAUDE.md:6, «cifras:total»: escrito 4, medido 3');
    expect(claude).toBe(CLAUDE_TOCADO);
    expect(readme).toBe(README_BIEN);
  });

  it('con `--comprobar` y las cifras bien, RC=0; y los argumentos de vitest son los de `package.json`', () => {
    // El `vitest` falso sale con 3 ante cualquier otro argumento, asi que este RC=0 es tambien
    // la prueba de que `principal()` le pasa las dos ordenes tal cual.
    const { codigo, dicho, errores } = conUnaRaiz({ claude: CLAUDE_BIEN, readme: README_BIEN }, (raiz) =>
      correr(raiz, '--comprobar'),
    );
    expect(codigo, errores).toBe(0);
    expect(dicho).toContain(
      'Las cifras escritas son las medidas: **En total: 3 pruebas en 2 archivos, más la 1 de capa.**',
    );
  });

  it('sin `--comprobar`, escribe en el disco lo medido, en los dos archivos, y sale RC=0', () => {
    const readmeTocado = README_BIEN.replace('**1 prueba** en 1 archivo', '**7 pruebas** en 1 archivo');
    const { codigo, dicho, errores, claude, readme } = conUnaRaiz(
      { claude: CLAUDE_TOCADO, readme: readmeTocado },
      (raiz) => correr(raiz),
    );
    expect(codigo, errores).toBe(0);
    expect(dicho).toContain('Cifras reescritas con lo medido:');
    expect(claude).toBe(CLAUDE_BIEN);
    expect(readme).toBe(README_BIEN);
  });

  it('una cifra que no se puede leer: RC=1 en los dos modos, y no escribe nada aunque otra difiera', () => {
    const readmeSinUno = README_BIEN.replace('<!-- cifras:uno -->**2 pruebas** en 1 archivo<!-- /cifras -->', '2');
    for (const argumentos of [['--comprobar'], []]) {
      const { codigo, errores, claude, readme } = conUnaRaiz({ claude: CLAUDE_TOCADO, readme: readmeSinUno }, (raiz) =>
        correr(raiz, ...argumentos),
      );
      expect(codigo, `${argumentos.join(' ')}\n${errores}`).toBe(1);
      expect(errores).toContain('FALLO: hay cifras que no se pueden leer, y no se ha escrito nada.');
      expect(errores).toContain('README.md: falta el marcador «cifras:uno»');
      expect(claude).toBe(CLAUDE_TOCADO);
      expect(readme).toBe(readmeSinUno);
    }
  });

  it('una medida vacia: RC=2 en los dos modos, y no escribe ceros', () => {
    for (const argumentos of [['--comprobar'], []]) {
      const { codigo, errores, claude } = conUnaRaiz(
        { claude: CLAUDE_TOCADO, readme: README_BIEN, listas: () => SIN_PRUEBAS },
        (raiz) => correr(raiz, ...argumentos),
      );
      expect(codigo, `${argumentos.join(' ')}\n${errores}`).toBe(2);
      expect(errores).toContain('MAL: `vitest list` no devolvio ni una prueba.');
      expect(claude).toBe(CLAUDE_TOCADO);
    }
  });

  it('una opcion que no existe: RC=2, diciendo cual', () => {
    const { codigo, errores, claude } = conUnaRaiz({ claude: CLAUDE_TOCADO, readme: README_BIEN }, (raiz) =>
      correr(raiz, '--comprobarr'),
    );
    expect(codigo).toBe(2);
    expect(errores).toContain('Opcion desconocida: --comprobarr. La unica es --comprobar.');
    expect(claude).toBe(CLAUDE_TOCADO);
  });
});
