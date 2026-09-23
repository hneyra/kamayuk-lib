// @vitest-environment node
//
// Esta guarda lee el DISCO, no un DOM: el mismo motivo por el que `el-xhr-vive-en-un-solo-sitio`
// declara su entorno. En `jsdom`, `import.meta.url` no es una URL `file:` y `fileURLToPath` revienta.

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, leer, sinComentarios } from '../verificaciones/texto.ts';

/**
 * **En `cliente.ts` se llama a `fetch` UNA vez, y es la de `pedir()`** (#121).
 *
 * `solicitar()`, `solicitarRespuesta()` y `descargar()` son la misma peticion porque las tres
 * pasan por `pedir()`. Hasta #121 `descargar()` tenia su propio `fetch`, con su propio prefijo, su
 * propia senal y su propio `!ok -> ErrorDeLaApi`, y hoy devolveria exactamente lo mismo que por
 * `pedir()`: las pruebas de conducta no distinguen las dos formas. **Esta guarda es la que las
 * distingue**, porque lo que se protege no es una conducta sino que no haya una segunda copia de
 * ella que el dia de manana diverja.
 *
 * `subir.ts` no cuenta: va por `XMLHttpRequest`, y eso lo vigila `el-xhr-vive-en-un-solo-sitio`.
 */

const CLIENTE = join(PAQUETES, 'api', 'cliente.ts');

/** Una llamada a `fetch`, escrita como se escriba: `fetch(`, `fetch (`, `globalThis.fetch(`. */
const LLAMAR_A_FETCH = /\bfetch\s*\(/g;

function codigoDelCliente(): string {
  return sinComentarios(leer(CLIENTE));
}

/**
 * El cuerpo de `nombre`, desde su declaracion hasta su cierre: `pedir` es una constante de
 * `crearCliente` y cierra con `};` a dos espacios; las operaciones son metodos del objeto que
 * devuelve y cierran con `},` a cuatro. Si la forma cambia, lo dicen sus dos `expect`.
 */
function cuerpoDe(nombre: string, cierre: string, codigo: string): string {
  const inicio = codigo.search(new RegExp(`\\b${nombre}\\s*=\\s*async\\b|async\\s+${nombre}\\s*[<(]`));
  expect(inicio, `no se encontro «${nombre}» en cliente.ts: la guarda no sabe donde mirar`).toBeGreaterThan(-1);
  const resto = codigo.slice(inicio);
  const fin = resto.indexOf(cierre);
  expect(fin, `«${nombre}» no cierra con «${JSON.stringify(cierre)}»: la guarda no sabe donde acaba`).toBeGreaterThan(-1);
  return resto.slice(0, fin);
}

describe('la peticion de `@kamayuk/api` se compone en un solo sitio', () => {
  it('EL CENTINELA: se lee el cliente de verdad, y tiene su `pedir`', () => {
    expect(codigoDelCliente()).toMatch(/const\s+pedir\s*=\s*async/);
  });

  it('`cliente.ts` llama a `fetch` exactamente UNA vez', () => {
    const llamadas = codigoDelCliente().match(LLAMAR_A_FETCH) ?? [];

    expect(
      llamadas.length,
      'Un segundo `fetch` en `cliente.ts` es una segunda copia del prefijo, el token, la senal y\n' +
        'el `ErrorDeLaApi`: lo que #121 quito de `descargar`. Si una operacion necesita algo que\n' +
        '`pedir()` no hace, se le anade a `pedir()` —como el `aceptar` de `descargar`—.',
    ).toBe(1);
  });

  it('y esa vez es dentro de `pedir`', () => {
    expect(cuerpoDe('pedir', '\n  };', codigoDelCliente())).toMatch(LLAMAR_A_FETCH);
  });

  it('`descargar` pasa por `pedir`', () => {
    expect(cuerpoDe('descargar', '\n    },', codigoDelCliente())).toMatch(/\bpedir\s*\(/);
  });
});
