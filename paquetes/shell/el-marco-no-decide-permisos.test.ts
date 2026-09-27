// @vitest-environment node
//
// Lee las fuentes del paquete. No es un DOM lo que necesita (ver `el-texto-visible-es-dato`).

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PAQUETES,
  RAIZ,
  archivosDeProduccion,
  importsQueCasan,
  lineasQueCasan,
} from '../verificaciones/texto.ts';

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
 * `sin-nombre-publico-entre-paquetes`), y de paso el nombre publico, que ya lo prohibe otra guarda.
 *
 * **Y se mira el ESPECIFICADOR que saca el analizador de TypeScript, no la linea** (#112). Hasta
 * #112 era `from '…/sesion/'` sobre el texto, y se le escapaban `from '../sesion'` —import de
 * directorio, que con `moduleResolution: bundler` resuelve—, `import '../sesion/x.ts'` e
 * `import('../sesion/x.ts')`. La muestra, `marco-que-decide-permisos.ts`, lleva cada forma.
 */

const SHELL = join(PAQUETES, 'shell');
const ARCHIVOS = archivosDeProduccion(SHELL);

/**
 * Si un especificador llega al paquete `paquete`: relativo o por el nombre publico, y con el
 * paquete como un TRAMO entero del camino —`../sesion`, `../sesion/x.ts`, `@kamayuk/sesion`—, no
 * como subcadena: `./sesiones.ts` no es la sesion.
 */
function llegaA(paquete: string): (especificador: string) => boolean {
  return (especificador) =>
    /^(?:\.|@kamayuk\/)/u.test(especificador) && especificador.split('/').includes(paquete);
}

/** Lo que el marco no puede importar para decidir un permiso. */
const NO_PUEDE_IMPORTAR = [
  { que: 'importa @kamayuk/sesion', llega: llegaA('sesion') },
  { que: 'importa @kamayuk/api', llega: llegaA('api') },
] as const;

/** Y lo que no puede llamar. `fetch` no es un import: se sigue buscando en el texto. */
const NO_PUEDE_LLAMAR = [{ que: 'llama a fetch', patron: /\bfetch\s*\(/u }] as const;

/** Lo que cada archivo del marco hace de lo prohibido, con su linea. */
function loQueHace(archivo: string): readonly string[] {
  return [
    ...NO_PUEDE_IMPORTAR.flatMap(({ que, llega }) =>
      importsQueCasan([archivo], llega, RAIZ).map((h) => ({ ...h, que })),
    ),
    ...NO_PUEDE_LLAMAR.flatMap(({ que, patron }) =>
      lineasQueCasan([archivo], patron, RAIZ).map((h) => ({ ...h, que })),
    ),
  ].map((h) => `${h.archivo}:${String(h.linea)}  ${h.que}  «${h.texto}»`);
}

describe('EL AC-4 de #67: el marco no decide permisos', () => {
  it('EL CENTINELA: hay archivos que barrer, y el patron ve un import cuando lo hay', () => {
    expect(ARCHIVOS.length, 'el barrido no encontro el marco').toBeGreaterThan(8);
    expect(ARCHIVOS.some((a) => a.endsWith('Armazon.tsx'))).toBe(true);
    // Sin esta mitad, un criterio mal escrito pasaria en verde sin mirar nada.
    const [sesion, api] = NO_PUEDE_IMPORTAR;
    expect(sesion.llega('../sesion/escalera.ts')).toBe(true);
    expect(sesion.llega('../sesion')).toBe(true);
    expect(sesion.llega('@kamayuk/sesion')).toBe(true);
    expect(api.llega('../api/cliente.ts')).toBe(true);
    expect(NO_PUEDE_LLAMAR[0].patron.test('await fetch(url)')).toBe(true);
    // Y el de la ui, que el marco SI importa, no cuenta; ni un paquete de fuera con el mismo
    // tramo, ni un archivo que solo lleve la palabra en el nombre.
    for (const suyo of ['../ui/index.ts', 'react-router', 'otro/api', './sesiones.ts']) {
      expect(NO_PUEDE_IMPORTAR.some(({ llega }) => llega(suyo)), suyo).toBe(false);
    }
  });

  it('LA MUESTRA: ve cada forma de llegar a la sesion y a la api, y no el comentario (#112)', () => {
    // La muestra escribe la sesion y la api de las cinco formas en que un import relativo llega a
    // ellas. La expresion regular de antes solo veia las que llevan barra tras el directorio —la
    // primera y `export type * as cliente from '../api/cliente.ts'`—: `from '../sesion'` —import
    // de directorio, que con `moduleResolution: bundler` resuelve—, el de efecto, el dinamico, el
    // `export … from` y `export * as sesion from '../sesion'` pasaban en verde.
    const muestra = join(PAQUETES, 'verificaciones/muestras/marco-que-decide-permisos.ts');
    const hallado = loQueHace(muestra).map((h) => h.replace(/^\S+:\d+ {2}/u, '')).sort();
    expect(hallado).toEqual(
      [
        "importa @kamayuk/sesion  «import { peldanoDe } from '../sesion/escalera.ts';»",
        "importa @kamayuk/sesion  «import { crearIdentidad } from '../sesion';»",
        "importa @kamayuk/sesion  «import '../sesion/identidad.ts';»",
        "importa @kamayuk/api  «export { crearCliente } from '../api';»",
        "importa @kamayuk/sesion  «export * as sesion from '../sesion';»",
        "importa @kamayuk/api  «export type * as cliente from '../api/cliente.ts';»",
        "importa @kamayuk/sesion  «export const identidad = () => import('../sesion/identidad.ts');»",
      ].sort(),
    );
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
