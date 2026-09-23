// @vitest-environment node
//
// Lee el DISCO, no un DOM: en `jsdom`, `import.meta.url` no es una URL `file:` y `fileURLToPath`
// revienta con «The URL must be of scheme file».

import { join, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, archivosDeProduccion, leer, sinComentarios } from './texto.ts';

/**
 * **En `@kamayuk/formato` no hay ni un `Number` ni un `Date`** (regla 1, #108).
 *
 * `CLAUDE.md` lo afirmaba y no era verdad: medido sobre `origin/main@2530761`,
 * `formato.ts:176` hacia `MESES[Number(mes) - 1]` y `formato.ts:182`
 * `` `${String(Number(dia))} de ${nombre}` ``. Los dos eran inocuos —un mes y un dia—, y los dos
 * pasaban la CI en verde, que es lo que no lo era: las prohibiciones de ESLint
 * (`importe-convertido-a-number`) solo cazan `Number(...)` sobre un identificador con nombre de
 * importe, asi que la proxima persona que escribiera `Number(valor)` en este paquete tambien
 * pasaba. La regla se cumplia por costumbre.
 *
 * Esta guarda barre el codigo de PRODUCCION de `paquetes/formato/`, **omitiendo comentarios** con
 * `comentarios.mjs` —los docblocks del paquete explican con `Number("0.1")` por que no se usa, y
 * esa explicacion tiene que poder quedarse—, y busca las cinco palabras con las que un texto
 * decimal o una fecha ISO dejan de ser texto:
 *
 *   - `Number`, `parseInt` y `parseFloat`: coma flotante, o un entero que ya no sabe de centimos;
 *   - `Date`: la zona horaria del puesto (en Lima, `new Date("2026-09-06")` es el 5);
 *   - `Intl`: sus formateadores de fecha necesitan un `Date`, y los de numero un `number`.
 *
 * Es solo `formato` y no los seis paquetes a proposito: `api` y `ui` usan `Date` y `Number` con
 * todo derecho —un `Content-Length`, un calendario— y la promesa de «ni uno» es de este paquete.
 */

/** Las palabras prohibidas. Una por grupo, para que el rojo diga cual. */
const PALABRAS = /\b(Number|Date|Intl|parseInt|parseFloat)\b/g;

/** La misma, sin `g`: un `test` sobre una expresion global arrastra su `lastIndex` de una a otra. */
const ALGUNA = new RegExp(PALABRAS.source);

interface Hallazgo {
  readonly archivo: string;
  readonly linea: number;
  readonly palabra: string;
}

function hallazgosDe(archivos: readonly string[]): Hallazgo[] {
  const salida: Hallazgo[] = [];
  for (const archivo of archivos) {
    sinComentarios(leer(archivo))
      .split('\n')
      .forEach((linea, indice) => {
        for (const encontrada of linea.matchAll(PALABRAS)) {
          salida.push({
            archivo: archivo.replace(PAQUETES, 'paquetes'),
            linea: indice + 1,
            palabra: encontrada[1] ?? '',
          });
        }
      });
  }
  return salida;
}

const FORMATO = join(PAQUETES, 'formato');
const PRODUCCION = archivosDeProduccion(FORMATO);

describe('en @kamayuk/formato no hay ni un Number ni un Date (regla 1)', () => {
  it('EL CENTINELA: se barre el paquete de verdad, archivo por archivo', () => {
    // Sin esto, lo de abajo pasaria sobre la lista vacia —si alguien moviera `paquetes/formato/` o
    // el recorrido dejara de bajar— y la guarda seguiria en verde sin sujeto. Se nombran uno a uno,
    // y no se cuentan: un conteo seguiria cuadrando con uno renombrado y otro nuevo.
    // `partir.ts` va con nombre: es donde vive el analisis de lo servido, y el primer sitio donde
    // alguien pensaria en «convertir el mes a numero».
    expect(PRODUCCION.length, 'no se leyo ni un archivo de formato: la guarda no mide nada').toBeGreaterThanOrEqual(6);
    for (const archivo of ['formato.ts', 'aritmetica.ts', 'partir.ts', 'documento.ts', 'valores.ts', 'index.ts']) {
      expect(
        PRODUCCION.some((a) => a.endsWith(join('formato', archivo))),
        `no se leyo «formato/${archivo}»`,
      ).toBe(true);
    }
  });

  it('ni Number, ni Date, ni Intl, ni parseInt, ni parseFloat en el codigo de produccion', () => {
    const hallazgos = hallazgosDe(PRODUCCION);
    const detalle = hallazgos.map((h) => `  ${h.archivo}:${String(h.linea)}  ${h.palabra}`).join('\n');
    expect(
      hallazgos,
      'Un importe es texto decimal y una fecha es texto ISO (regla 1, RNF-055): un `Number` ' +
        'pierde centimos y un `Date` arrastra la zona horaria del puesto. En este paquete no hay ' +
        'ni uno, tampoco para un mes o un dia: trabaja con el texto.\n\n' +
        `Donde aparece:\n${detalle}`,
    ).toEqual([]);
  });
});

describe('LA MUESTRA: la guarda muerde, y se demuestra', () => {
  const MUESTRA = join(PAQUETES, 'verificaciones/muestras/formato-con-number-o-date.ts');

  it('la muestra existe y NO la recoge el recorrido de produccion', () => {
    // Si `muestras/` entrara en el recorrido, la guarda saldria roja siempre y se acabaria
    // desactivando; si la muestra no existiera, no habria con que demostrar que muerde.
    expect(leer(MUESTRA).length).toBeGreaterThan(0);
    expect(PRODUCCION.filter((a) => a.includes(`${sep}muestras${sep}`))).toEqual([]);
  });

  it('sobre la muestra, el rojo nombra archivo, linea y palabra de cada una de las cinco', () => {
    // Exacto, y no «alguno»: una guarda que solo cazara `Number` seguiria «mordiendo». Las lineas
    // son las del archivo —con su docblock delante—, que es lo que el rojo tiene que decir para
    // que se mire donde es (#42).
    const archivo = 'paquetes/verificaciones/muestras/formato-con-number-o-date.ts';
    expect(hallazgosDe([MUESTRA])).toEqual([
      { archivo, linea: 12, palabra: 'Number' },
      { archivo, linea: 15, palabra: 'Date' },
      { archivo, linea: 17, palabra: 'Intl' },
      { archivo, linea: 20, palabra: 'parseInt' },
      { archivo, linea: 24, palabra: 'parseFloat' },
    ]);
  });

  it('y sabe callarse: ni en un comentario ni dentro de otro identificador', () => {
    // La explicacion de por que no se usa `Number("0.1")` vive en los docblocks del paquete, y no
    // puede ponerse roja. Y `\b` no es adorno: `formatearFecha` o `FECHA_SERVIDA` no son `Date`.
    expect(sinComentarios('/** `Number("0.1") + Number("0.2")` no es 0.3. */\nexport const x = 1;')).not.toMatch(
      ALGUNA,
    );
    expect('export const esNumberish = 1; const toDateString = 2;').not.toMatch(ALGUNA);
    // Y lo contrario, para que las dos de arriba no pasen por no mirar: en codigo si se ve.
    expect('const mes = Number(texto);').toMatch(ALGUNA);
  });
});
