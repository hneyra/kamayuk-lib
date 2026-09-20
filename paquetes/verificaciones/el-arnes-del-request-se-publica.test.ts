// @vitest-environment node
//
// Lee el DISCO, no un DOM: el arbol entero del repositorio y el `package.json` del paquete. En
// `jsdom`, `import.meta.url` no es una URL `file:` y el `fileURLToPath` de `texto.ts` revienta con
// «The URL must be of scheme file».

import { join, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  EL_MODULO,
  EL_SITIO_LEGITIMO,
  LA_LINEA,
  barrer,
  copiasEn,
  enchufaElArnes,
} from './el-arnes-del-request-no-se-copia.mjs';
import { RAIZ, leer, sinComentarios } from './texto.ts';

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
