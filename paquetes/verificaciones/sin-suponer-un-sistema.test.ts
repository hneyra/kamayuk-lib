// @vitest-environment node
//
// Esta guarda lee el DISCO, no un DOM. En `jsdom`, `import.meta.url` no es una URL `file:` y
// `fileURLToPath` revienta con «The URL must be of scheme file» — medido aqui mismo antes de
// poner esta linea. El entorno se declara por archivo y no en `vitest.config.ts` porque las
// demas pruebas de estos paquetes SI necesitan DOM.

import { join, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, archivosDeProduccion, leer, sinComentarios } from './texto.ts';
import { SUPOSICIONES, type Suposicion } from './suposiciones.ts';

/**
 * **Nada en `@kamayuk/*` supone un sistema.**
 *
 * Es la guarda que separa una libreria comun de una extraccion disfrazada. `rentas` es el primer
 * consumidor de estos paquetes y sera, durante un tiempo, el unico: esa es exactamente la
 * situacion en la que una suposicion suya se cuela sin que nada se ponga rojo, porque **en el
 * unico consumidor que hay es cierta**. El dia que `caja` los estrene, el sintoma seria un 404
 * de una ruta que si existe en el sistema correcto — el mas caro de leer que hay.
 *
 * Vigila el codigo de PRODUCCION de los seis paquetes, **omitiendo comentarios**: los docblocks
 * explican de que archivo de que sistema salio cada pieza, y esa procedencia es la medicion que
 * se hizo. Una guarda que obligara a borrarla estaria pidiendo falsificar el registro.
 *
 * La regla que la gobierna es de ADR-0030 §4: *«una libreria comun no puede contener logica de
 * negocio de un contexto. Si `@kamayuk/ui` necesita saber que es un arbitrio, dejo de ser comun
 * y es el monolito otra vez, repartido y sin que el build lo vea»*.
 */

interface Hallazgo {
  readonly archivo: string;
  readonly linea: number;
  readonly texto: string;
}

function hallazgosDe(suposicion: Suposicion, archivos: readonly string[]): Hallazgo[] {
  const salida: Hallazgo[] = [];
  for (const archivo of archivos) {
    const limpio = sinComentarios(leer(archivo));
    limpio.split('\n').forEach((linea, indice) => {
      if (suposicion.patron.test(linea)) {
        salida.push({ archivo: archivo.replace(PAQUETES, 'paquetes'), linea: indice + 1, texto: linea.trim() });
      }
    });
  }
  return salida;
}

/**
 * `@kamayuk/verificaciones` queda fuera del barrido, y el motivo lo descubrio la propia guarda:
 * **se delataba a si misma**. El texto de la regla `vocabulario-tributario` cita «arbitrio»
 * —porque es el ejemplo con el que ADR-0030 §4 la escribe— y ese texto es codigo, no comentario.
 *
 * Es el unico paquete que no viaja a un navegador: su trabajo es nombrar lo prohibido. Los otros
 * cinco si se barren, y la exclusion se comprueba abajo para que nadie la ensanche en silencio.
 */
const EXCLUIDO = join(PAQUETES, 'verificaciones');
const PRODUCCION = archivosDeProduccion().filter((a) => !a.startsWith(EXCLUIDO));

describe('ninguna libreria comun supone un sistema', () => {
  it('EL CENTINELA: se lee codigo de produccion de verdad', () => {
    // Sin esto, todo lo de abajo pasaria sobre la lista vacia — que es como una guarda se queda
    // sin sujeto y sigue en verde. Son seis paquetes: si se leen menos de seis archivos, o el
    // recorrido se rompio o alguien movio `paquetes/`.
    expect(
      PRODUCCION.length,
      'no se leyo ni un archivo de produccion: la guarda no mide nada',
    ).toBeGreaterThan(8);
  });

  it('EL CENTINELA: la exclusion es UNO y se sabe cual', () => {
    // Una exclusion que crece en silencio es como se vacia una guarda sin que nadie la borre.
    // Aqui se nombra la unica que hay, y se comprueba que de verdad aparta algo: si
    // `@kamayuk/verificaciones` dejara de tener codigo, esta linea lo diria.
    const apartados = archivosDeProduccion().filter((a) => a.startsWith(EXCLUIDO));
    expect(apartados.length).toBeGreaterThan(0);
    expect(archivosDeProduccion().length).toBe(PRODUCCION.length + apartados.length);
    // Y los cinco que si se barren estan todos representados.
    for (const paquete of ['formato', 'api', 'sesion', 'ui', 'shell']) {
      expect(
        PRODUCCION.some((a) => a.startsWith(join(PAQUETES, paquete))),
        `no se leyo ni un archivo de «${paquete}»`,
      ).toBe(true);
    }
  });

  it('EL CENTINELA: el interprete de pantallas se barre (#27)', () => {
    // Es el archivo que MAS tentado esta de suponer un sistema: subio de `rentas`, y en `rentas`
    // su tabla de tonos hablaba de coactiva y de deuda. Si el recorrido dejara de bajar a
    // `ui/interprete`, esa tentacion volveria sin que nada lo dijera.
    expect(
      PRODUCCION.filter((a) => a.includes(join('ui', 'interprete'))).length,
      'no se leyo el interprete: sus cuatro piezas y sus dos archivos de tipos',
    ).toBeGreaterThanOrEqual(6);
  });

  it.each(SUPOSICIONES.map((s) => [s.clave, s] as const))('no se supone: %s', (_clave, suposicion) => {
    const hallazgos = hallazgosDe(suposicion, PRODUCCION);
    const detalle = hallazgos
      .map((h) => `  ${h.archivo}:${String(h.linea)}  ${h.texto}`)
      .join('\n');
    expect(hallazgos, `${suposicion.porQue}\n\nDonde aparece:\n${detalle}`).toEqual([]);
  });
});

describe('LA MUESTRA: la guarda muerde, y se demuestra', () => {
  const MUESTRA = [join(PAQUETES, 'verificaciones/muestras/supone-un-sistema.ts')];

  it('la muestra existe y NO la recoge el recorrido de produccion', () => {
    // Las dos mitades importan: si `muestras/` entrara en el recorrido, la guarda saldria roja
    // siempre y se acabaria desactivando; si la muestra no existiera, no habria con que
    // demostrar que muerde.
    expect(leer(MUESTRA[0] ?? '').length).toBeGreaterThan(0);
    expect(PRODUCCION.filter((a) => a.includes(`${sep}muestras${sep}`))).toEqual([]);
  });

  it.each(SUPOSICIONES.map((s) => [s.clave, s] as const))(
    'y sobre la muestra, «%s» encuentra lo que tiene que encontrar',
    (_clave, suposicion) => {
      expect(hallazgosDe(suposicion, MUESTRA).length).toBeGreaterThan(0);
    },
  );

  it('los comentarios se omiten, y se demuestra', () => {
    // Si esto dejara de funcionar, la guarda empezaria a exigir que se borre la procedencia de
    // cada pieza — que es lo unico que dice de donde salio y por que es como es.
    const soloEnComentario = '/** Esto vivio en `rentas/frontend/src/api/cliente.ts`, con /rentas/api/v1 dentro. */\nexport const x = 1;';
    expect(sinComentarios(soloEnComentario)).not.toContain('/rentas/api');
    // Y lo contrario: en codigo de verdad SI se ve.
    expect(sinComentarios("export const R = '/rentas/api/v1';")).toContain('/rentas/api');
  });

  it('el rojo nombra la linea DEL ARCHIVO: un docblock de varias lineas no la corre (#42)', () => {
    // Medido al demostrar la rotura de #42: con `'/rentas/api/v1'` escrito en la linea 297 de
    // `paquetes/sesion/identidad.ts`, el rojo decia `identidad.ts:129` —mitad de un docblock—,
    // porque cada comentario de bloque se sustituia por un espacio y se llevaba sus saltos de
    // linea. Un rojo que manda a mirar la linea equivocada es el mas caro de leer que hay (#4).
    const texto = [
      '/**',
      ' * uno',
      ' * dos',
      ' */',
      'export const x = 1;',
      "export const R = '/rentas/api/v1';",
    ].join('\n');
    const limpio = sinComentarios(texto).split('\n');

    expect(limpio.length).toBe(texto.split('\n').length);
    expect(limpio.findIndex((linea) => linea.includes('/rentas/api')) + 1).toBe(6);
  });

  it('una URL no se come la linea que la sigue (el defecto del `(?<!:)`)', () => {
    // Medido en `infrastructure`: sin el limite, `https://…` hacia invisible todo lo que
    // viniera detras en esa linea, y la guarda equivalente dejo pasar un nombre prohibido en
    // VERDE por estar dentro de una URL.
    const linea = "const u = 'https://ejemplo.test/x'; const r = '/rentas/api/v1';";
    expect(sinComentarios(linea)).toContain('/rentas/api');
  });
});
