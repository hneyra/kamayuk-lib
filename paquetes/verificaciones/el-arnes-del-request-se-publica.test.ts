// @vitest-environment node
//
// Lee el DISCO, no un DOM: el arbol entero del repositorio y el `package.json` del paquete. En
// `jsdom`, `import.meta.url` no es una URL `file:` y el `fileURLToPath` de `texto.ts` revienta con
// «The URL must be of scheme file».

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  EL_MODULO,
  EL_SITIO_LEGITIMO,
  LA_LINEA,
  archivosDelArbol,
  barrer,
  copiasEn,
  enchufaElArnes,
} from './el-arnes-del-request-no-se-copia.mjs';
import { RAIZ, leer, rutaDesde, sinComentarios } from './texto.ts';

/**
 * **El arnes del `Request` se publica una vez, y aqui se importa** (#92).
 *
 * El arnes que permite correr con Node 24 vivia copiado en el `vitest.setup.ts` de esta libreria y
 * en el de otro sistema, y hacia falta en tres mas. Ahora vive en `arnes-del-request.ts`, lo
 * publica `exports` y esta libreria es su primer consumidor.
 *
 * Lo que esta guarda puede vigilar y lo que no esta escrito en el docblock de
 * `el-arnes-del-request-no-se-copia.mjs`, que es el modulo con el que barre — el mismo que el
 * consumidor ejecuta contra su arbol. **Se importa en vez de copiarse el barrido**, que seria
 * empezar el defecto de este issue en la guarda que lo cierra.
 */

/** El manifiesto del paquete, tal cual. Lo que el consumidor resuelve sale de aqui. */
const MANIFIESTO = JSON.parse(leer(join(RAIZ, 'paquetes/verificaciones/package.json'))) as {
  name?: unknown;
  exports?: Record<string, unknown>;
};

const EL_ARNES = join(RAIZ, 'paquetes/verificaciones/arnes-del-request.ts');
const EL_SETUP = join(RAIZ, 'vitest.setup.ts');

describe('el arnes del `Request` se publica y se importa', () => {
  it('EL CENTINELA: el patron reconoce la instalacion de verdad, la del modulo publicado', () => {
    // Sin esto, una expresion regular que no case con nada dejaria el barrido en verde para
    // siempre. Se valida contra el unico codigo que SI instala el `Request`: el publicado.
    expect(
      copiasEn(leer(EL_ARNES)).length,
      'el patron no reconoce la instalacion del modulo publicado: no reconoceria ninguna copia',
    ).toBeGreaterThan(0);
  });

  it('EL CENTINELA: el barrido mira el arbol entero, no un rincon', () => {
    const { mirados } = barrer(RAIZ);
    expect(mirados, 'no se leyo casi nada: el barrido no mide el arbol').toBeGreaterThan(60);
  });

  it('en este arbol, el `Request` global se instala en UN solo archivo: el publicado', () => {
    const { copias } = barrer(RAIZ);
    const detalle = copias.map((c) => `  ${c.archivo}:${String(c.linea)}  ${c.texto}`).join('\n');
    expect(
      copias,
      'El arnes del `Request` esta escrito a mano fuera del modulo que lo publica. Se importa:\n' +
        `  ${LA_LINEA}\n\nDonde aparece:\n${detalle}`,
    ).toEqual([]);
  });

  it('y `vitest.setup.ts` lo IMPORTA, que es la otra mitad', () => {
    // Que no haya copia no basta: un `vitest.setup.ts` que simplemente se quedara sin arnes
    // pasaria esa comprobacion y dejaria las 21 pruebas del armazon rojas con Node 24.
    const setup = leer(EL_SETUP);
    expect(
      enchufaElArnes(setup),
      '`vitest.setup.ts` no enchufa el arnes: sin el, con Node 24 cada navegacion del enrutador ' +
        'de datos muere dentro de `createClientSideRequest`',
    ).toBe(true);
    expect(copiasEn(setup), '`vitest.setup.ts` volvio a llevar la copia').toEqual([]);
  });

  it('y lo importa POR RUTA RELATIVA, no por el nombre publico', () => {
    // Aqui el nombre publico resolveria —este repositorio es raiz de workspaces— y documentaria,
    // en el archivo que todo el mundo copia, justo la via que no vale entre paquetes (#4).
    //
    // Sin comentarios: el docblock de ese archivo NOMBRA la subruta publica para decir cual es la
    // linea del consumidor, y tiene que poder seguir diciendolo.
    const setup = sinComentarios(leer(EL_SETUP));
    expect(setup).toContain("import './paquetes/verificaciones/arnes-del-request.ts';");
    expect(setup, 'el arnes entra por su nombre publico').not.toContain(EL_MODULO);
  });

  it('LA LINEA que se le dice al consumidor resuelve de verdad', () => {
    // Una linea documentada que no resuelve es peor que ninguna: el consumidor la pega, le sale
    // un fallo de resolucion en SU build y el rojo no habla de aqui. Asi que la cadena que dicen
    // el README y el guion se comprueba contra el `exports` de verdad.
    const especificador = /^import '(.+)';$/.exec(LA_LINEA)?.[1];
    expect(especificador, 'LA_LINEA no es un import de una sola pieza').toBe(EL_MODULO);
    const nombre = MANIFIESTO.name;
    expect(typeof nombre === 'string' && EL_MODULO.startsWith(`${nombre}/`)).toBe(true);
    const subruta = `.${EL_MODULO.slice(String(nombre).length)}`;
    expect(
      Object.keys(MANIFIESTO.exports ?? {}),
      `el manifiesto no publica «${subruta}», que es lo que se le dice al consumidor que escriba`,
    ).toContain(subruta);
  });

  it('y el README dice ESA linea, no una parecida', () => {
    // El README es donde los tres sistemas que faltan la van a leer (#92, AC-3). Si el modulo se
    // renombra, esto sale rojo aqui y no en el repositorio del que la copie.
    expect(leer(join(RAIZ, 'README.md'))).toContain(LA_LINEA);
  });

  it('LA MUESTRA: una copia a mano sale roja, y su comentario NO cuenta', () => {
    const muestra = join(RAIZ, 'paquetes/verificaciones/muestras/arnes-del-request-copiado.ts');
    const hallazgos = copiasEn(leer(muestra));
    // UNA y no dos: la muestra nombra la asignacion tambien dentro de un comentario, y una guarda
    // de texto que no distinguiera las dos obligaria a borrar la memoria del proyecto —los
    // docblocks de estos paquetes explican de donde salio cada pieza— para poder pasar.
    expect(hallazgos.map((h) => h.texto)).toEqual([
      'globalThis.Request = RequestQueAceptaLaSenalDelDocumento;',
    ]);
    // Y no la recoge el barrido de verdad: si `muestras/` entrara, la guarda saldria roja siempre
    // y se acabaria desactivando.
    expect(barrer(RAIZ).copias.filter((c) => c.archivo.includes(`${sep}muestras${sep}`))).toEqual(
      [],
    );
  });

  it('LA MUESTRA: las otras dos formas de instalarlo tampoco pasan', () => {
    // Quien copie el arnes no tiene por que escribirlo con un punto. Si la guarda solo mirara esa
    // forma, cambiar de sintaxis seria un `--no-verify` sin decirlo.
    expect(copiasEn("globalThis['Request'] = ElArnes;").length).toBe(1);
    expect(copiasEn("Object.defineProperty(globalThis, 'Request', { value: ElArnes });").length)
      .toBe(1);
    expect(copiasEn('window.Request = ElArnes;').length).toBe(1);
  });

  it('y no confunde con una copia lo que solo COMPARA el global', () => {
    // El modulo publicado comprueba si ya esta montado con `===`. Un patron sin el `(?!=)` lo
    // llamaria copia, y el modulo original saldria rojo contra si mismo.
    expect(copiasEn('if (globalThis.Request === ElArnes) return;')).toEqual([]);
    expect(copiasEn("import './paquetes/verificaciones/arnes-del-request.ts';")).toEqual([]);
  });

  it('el sitio legitimo es UNO, y esta donde dice', () => {
    expect(EL_ARNES.endsWith(`${sep}${EL_SITIO_LEGITIMO}`)).toBe(true);
    expect(leer(EL_ARNES).length).toBeGreaterThan(0);
  });
});

/**
 * **Lo que el guion hace en el arbol de un consumidor no cambio con el recorredor comun** (#126,
 * AC-4).
 *
 * El guion lo ejecutan los consumidores contra SU arbol, y su recorrido tiene tres decisiones que
 * las guardas de aqui no toman: aparta `build` y `coverage`, que esta libreria no tiene, y no baja
 * a ningun directorio oculto. Al pasar al recorredor comun, cualquiera de las tres se podia perder
 * sin un rojo aqui —este arbol no tiene `build/`, ni `coverage/`, ni un oculto con codigo—, asi que
 * se fabrica uno que si, con una copia del arnes en cada sitio que NO se mira y dos donde si.
 */
describe('el guion, en un arbol de consumidor fabricado', () => {
  let arbol = '';
  const COPIA = 'globalThis.Request = ElArnes;\n';
  const ARBOL: Readonly<Record<string, string>> = {
    'vitest.setup.ts': `${LA_LINEA}\n`,
    'src/a/b/c/hondo.ts': COPIA,
    'src/a/b/c/hondo.cjs': "window['Request'] = ElArnes;\n",
    'src/a/uno.test.ts': COPIA,
    // Una prueba en CADA una de las demas extensiones que el guion lee. Sin ellas, estrechar
    // `PRUEBAS` a `.ts`/`.tsx` pasaba en verde y ponia rojo al consumidor que escribe un
    // `.test.js` (#126, N1): el guion lo tomaba por codigo y lo nombraba como copia.
    'src/a/dos.spec.tsx': COPIA,
    'src/a/tres.test.mts': COPIA,
    'src/a/cuatro.spec.cts': COPIA,
    'src/a/cinco.test.js': COPIA,
    'src/a/seis.spec.mjs': COPIA,
    'src/a/siete.test.cjs': COPIA,
    'src/a/b/nota.md': COPIA,
    '.oculto.ts': 'export const x = 1;\n',
    '.claude/worktrees/otro/vitest.setup.ts': COPIA,
    'src/.cache/copia.ts': COPIA,
    'build/copia.js': COPIA,
    'coverage/copia.js': COPIA,
    'node_modules/dep/copia.ts': COPIA,
    'dist/copia.js': COPIA,
    'src/muestras/copia.ts': COPIA,
  };

  beforeAll(() => {
    arbol = mkdtempSync(join(tmpdir(), 'kamayuk-consumidor-'));
    for (const [ruta, texto] of Object.entries(ARBOL)) {
      mkdirSync(dirname(join(arbol, ruta)), { recursive: true });
      writeFileSync(join(arbol, ruta), texto);
    }
  });

  afterAll(() => {
    if (arbol !== '') rmSync(arbol, { recursive: true, force: true });
  });

  it('mira lo que miraba: ni ocultos, ni `build`, ni `coverage`, ni pruebas, ni lo de siempre', () => {
    // Un ARCHIVO oculto si se mira: lo que se salta es el directorio. Asi era antes de #126.
    expect(archivosDelArbol(arbol).map((archivo) => rutaDesde(arbol, archivo))).toEqual([
      '.oculto.ts',
      'src/a/b/c/hondo.cjs',
      'src/a/b/c/hondo.ts',
      'vitest.setup.ts',
    ]);
  });

  it('y como proceso sale igual: RC=1, las dos copias nombradas y la linea que las cambia', () => {
    const guion = join(RAIZ, 'paquetes/verificaciones/el-arnes-del-request-no-se-copia.mjs');
    const salida = spawnSync(process.execPath, [guion, '--raiz', arbol], { encoding: 'utf8' });
    expect(salida.status).toBe(1);
    expect(salida.stdout).toContain('(4 archivos de codigo)');
    expect(salida.stderr.split('\n').filter((linea) => linea.startsWith('  · '))).toEqual([
      "  · src/a/b/c/hondo.cjs:1  window['Request'] = ElArnes;",
      '  · src/a/b/c/hondo.ts:1  globalThis.Request = ElArnes;',
    ]);
    expect(salida.stderr).toContain(LA_LINEA);
  });
});

/**
 * **Lo que es enchufar el arnes lo decide el analizador de TypeScript, no una expresion regular**
 * (#112, AC-4): las formas que el guion reconocia las sigue reconociendo, y lo que no es un import
 * sigue sin contar.
 */
describe('el guion reconoce el enchufe por el analizador (#112)', () => {
  it('las formas de enchufarlo cuentan: la linea, la ruta relativa, el `require` y el dinamico', () => {
    for (const forma of [
      LA_LINEA,
      "import './paquetes/verificaciones/arnes-del-request.ts';",
      "import '../../kamayuk-lib/paquetes/verificaciones/arnes-del-request';",
      "require('@kamayuk/verificaciones/arnes-del-request');",
      "await import('@kamayuk/verificaciones/arnes-del-request');",
    ]) {
      expect(enchufaElArnes(forma), forma).toBe(true);
    }
  });

  it('y lo que no es un import no cuenta: un comentario, una cadena, ni el propio guion', () => {
    expect(enchufaElArnes(`// ${LA_LINEA}`)).toBe(false);
    expect(enchufaElArnes(`const linea = "${LA_LINEA}";`)).toBe(false);
    // El caso medido en #92: el guion DECLARA la subruta en `EL_MODULO` y no la importa.
    const guion = join(RAIZ, 'paquetes/verificaciones/el-arnes-del-request-no-se-copia.mjs');
    expect(enchufaElArnes(leer(guion))).toBe(false);
  });
});

/**
 * **El guion corre en la CI de un consumidor, donde esta libreria no tiene `node_modules`** (#112).
 *
 * El trabajo `consumidores` solo instala el consumidor, y `node` resuelve el guion enlazado a su
 * ruta real: un `typescript` que solo se buscara junto a la libreria no aparece. Se ensaya con una
 * COPIA del guion y de lo que importa en un directorio sin `node_modules` alrededor, contra dos
 * arboles de consumidor: uno sin `typescript`, que tiene que salir con RC=2 diciendolo —y que
 * demuestra, de paso, que la copia de verdad no encuentra el de esta libreria—, y otro con el suyo,
 * que tiene que medir. El `typescript` del segundo es un paquete de una linea que reexporta el de
 * aqui: sin enlaces, que dentro de un `node_modules` ya rompieron un arbol de trabajo.
 */
describe('el guion, sin los `node_modules` de esta libreria (#112)', () => {
  let base = '';
  const LO_QUE_CARGA = [
    'el-arnes-del-request-no-se-copia.mjs',
    'archivos.mjs',
    'comentarios.mjs',
    'imports.mjs',
  ];

  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'kamayuk-sin-node-modules-'));
    const copia = join(base, 'kamayuk-lib/paquetes/verificaciones');
    mkdirSync(copia, { recursive: true });
    for (const archivo of LO_QUE_CARGA) {
      writeFileSync(join(copia, archivo), leer(join(RAIZ, 'paquetes/verificaciones', archivo)));
    }
    for (const consumidor of ['sin-typescript', 'con-typescript']) {
      mkdirSync(join(base, consumidor), { recursive: true });
      writeFileSync(join(base, consumidor, 'vitest.setup.ts'), `${LA_LINEA}\n`);
    }
    const suyo = join(base, 'con-typescript/node_modules/typescript');
    mkdirSync(suyo, { recursive: true });
    writeFileSync(join(suyo, 'package.json'), '{ "name": "typescript", "main": "index.js" }\n');
    const elDeAqui = createRequire(import.meta.url).resolve('typescript');
    writeFileSync(join(suyo, 'index.js'), `module.exports = require(${JSON.stringify(elDeAqui)});\n`);
  });

  afterAll(() => {
    if (base !== '') rmSync(base, { recursive: true, force: true });
  });

  function correr(consumidor: string) {
    const guion = join(base, 'kamayuk-lib/paquetes/verificaciones', LO_QUE_CARGA[0] ?? '');
    return spawnSync(process.execPath, [guion, '--raiz', join(base, consumidor)], {
      encoding: 'utf8',
    });
  }

  it('sin `typescript` en ningun sitio, RC=2 y lo dice: no mide en verde lo que no pudo leer', () => {
    const salida = correr('sin-typescript');
    expect(salida.status, salida.stderr).toBe(2);
    expect(salida.stderr).toContain('FALLO: no se encontro `typescript`');
  });

  it('con el `typescript` del consumidor, mide igual que aqui', () => {
    const salida = correr('con-typescript');
    expect(salida.status, salida.stderr).toBe(0);
    expect(salida.stdout).toContain('(1 archivos de codigo)');
    expect(salida.stdout).toContain('Lo enchufa: vitest.setup.ts');
  });
});
