// @vitest-environment node
//
// Lee las fuentes del paquete. No es un DOM lo que necesita (ver `el-texto-visible-es-dato`).

import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, RAIZ, archivosDeProduccion, leer, sinComentarios } from '../verificaciones/texto.ts';

/**
 * **El marco lleva el acceso de cada hoja, y no decide nada con el** (#67, `acceso-por-hoja`, AC-4).
 *
 * `Destino.acceso` y `Destino.tambien` viajan con la hoja para que el SISTEMA filtre el catalogo. Si
 * el marco empezara a decidir —a preguntar a la sesion que puede la cuenta, a pedirle a la API los
 * permisos—, cada sistema tendria dos opiniones sobre lo mismo, y la del marco no la podria cambiar
 * nadie. Lo que lo impediria en la practica es no poder hacerlo: **que `@kamayuk/shell` no importe
 * `@kamayuk/sesion` ni `@kamayuk/api`, ni llame a `fetch`**. Y eso es lo que se mira aqui.
 *
 * Se mira el import RELATIVO, que es como se importan los paquetes entre si (ver
 * `sin-nombre-publico-entre-paquetes`): el nombre publico ya lo prohibe otra guarda.
 */

const SHELL = join(PAQUETES, 'shell');
const ARCHIVOS = archivosDeProduccion(SHELL);

/** Lo que el marco no puede usar para decidir un permiso. */
const NO_PUEDE = [
  { que: 'importa @kamayuk/sesion', patron: /from\s+['"][./]*\/sesion\//u },
  { que: 'importa @kamayuk/api', patron: /from\s+['"][./]*\/api\//u },
  { que: 'llama a fetch', patron: /\bfetch\s*\(/u },
] as const;

/** Lo que cada archivo del marco hace de lo prohibido, con su linea. */
function loQueHace(archivo: string): readonly string[] {
  const lineas = sinComentarios(leer(archivo)).split('\n');
  return NO_PUEDE.flatMap(({ que, patron }) =>
    lineas.flatMap((linea, i) =>
      patron.test(linea) ? [`${relative(RAIZ, archivo)}:${String(i + 1)}  ${que}  «${linea.trim()}»`] : [],
    ),
  );
}

describe('EL AC-4 de #67: el marco no decide permisos', () => {
  it('EL CENTINELA: hay archivos que barrer, y el patron ve un import cuando lo hay', () => {
    expect(ARCHIVOS.length, 'el barrido no encontro el marco').toBeGreaterThan(8);
    expect(ARCHIVOS.some((a) => a.endsWith('Armazon.tsx'))).toBe(true);
    // Sin esta mitad, un patron mal escrito pasaria en verde sin mirar nada.
    expect(NO_PUEDE[0].patron.test("import { peldanoDe } from '../sesion/escalera.ts';")).toBe(true);
    expect(NO_PUEDE[1].patron.test("import { crearCliente } from '../api/cliente.ts';")).toBe(true);
    expect(NO_PUEDE[2].patron.test('await fetch(url)')).toBe(true);
    // Y el de la ui, que el marco SI importa, no cuenta.
    expect(NO_PUEDE.some(({ patron }) => patron.test("import { Avisos } from '../ui/index.ts';"))).toBe(false);
  });

  it('ningun archivo del marco importa la sesion ni la api, ni pide nada', () => {
    const hallado = ARCHIVOS.flatMap(loQueHace);
    expect(
      hallado,
      'El marco no decide permisos (#67, AC-4): lleva el acceso de cada hoja y el sistema filtra.\n' +
        hallado.map((h) => `  ${h}`).join('\n'),
    ).toEqual([]);
  });
});
