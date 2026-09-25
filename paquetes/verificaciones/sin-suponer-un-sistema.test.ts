// @vitest-environment node
//
// Esta guarda lee el DISCO, no un DOM. En `jsdom`, `import.meta.url` no es una URL `file:` y
// `fileURLToPath` revienta con «The URL must be of scheme file» — medido aqui mismo antes de
// poner esta linea. El entorno se declara por archivo y no en `vitest.config.ts` porque las
// demas pruebas de estos paquetes SI necesitan DOM.

import { join, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, RAIZ, archivosDeProduccion, leer, lineasQueCasan, sinComentarios, type Hallazgo } from './texto.ts';
import { SISTEMAS, SISTEMAS_QUE_NO_CONSUMEN, SUPOSICIONES, type Suposicion } from './suposiciones.ts';

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

function hallazgosDe(suposicion: Suposicion, archivos: readonly string[]): Hallazgo[] {
  return lineasQueCasan(archivos, suposicion.patron, RAIZ);
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

  it('EL CENTINELA: y las piezas de #44 tambien, que son las que aprenden lo que `catastro` dibuja', () => {
    // Son las que mas tentadas estan de nombrar un predio: salen de su V6 hoja por hoja. Se nombran
    // una a una, y no se cuentan: un conteo seguiria cuadrando con una renombrada y otra nueva.
    const leidas = PRODUCCION.filter((a) => a.includes(join('ui', 'interprete')));
    for (const archivo of [
      'componer.ts',
      'muestras.ts',
      'EstadoDeLaLectura.tsx',
      'PieDeOperaciones.tsx',
      'PiezaDeLaPantalla.tsx',
      // Y las de #65, que aprenden las tablas de sus hojas.
      'AccionesDeLaFila.tsx',
      'reglas-de-las-tablas.ts',
      'muestras-de-campos-y-tablas.ts',
    ]) {
      expect(
        leidas.some((a) => a.endsWith(join('interprete', archivo))),
        `no se leyo «interprete/${archivo}»`,
      ).toBe(true);
    }
  });

  it('EL CENTINELA: y las de #66, que aprenden a escribir y a ir a otra hoja', () => {
    // Salen del `Acto` de la V6 de `catastro`, que hablaba de campanias y de sectores. Se nombran
    // una a una, como las de #44, y la de `@kamayuk/shell` tambien: navegar es donde un slug de un
    // sistema se colaria antes.
    for (const archivo of [
      join('ui', 'interprete', 'tipos-de-los-actos.ts'),
      join('ui', 'interprete', 'acciones.ts'),
      join('ui', 'interprete', 'interaccion.ts'),
      join('ui', 'interprete', 'GrupoDeAcciones.tsx'),
      join('ui', 'interprete', 'ActoDeLaPantalla.tsx'),
      join('ui', 'shadcn', 'boton-con-motivo.tsx'),
      join('shell', 'navegacion.tsx'),
    ]) {
      expect(
        PRODUCCION.some((a) => a.endsWith(archivo)),
        `no se leyo «${archivo}»`,
      ).toBe(true);
    }
  });

  it('EL CENTINELA: y las de #67, las que guardan en la ruta lo que se elige en la hoja', () => {
    // El maestro-detalle sale de la lista de predios de la V6, y la ruta de su `shell/ruta.ts`: son
    // las dos que mas facil nombrarian lo que transcriben. Una a una, por lo mismo que las de #44.
    for (const archivo of [
      join('ui', 'interprete', 'MaestroDetalle.tsx'),
      join('ui', 'interprete', 'PestanasDeLaPantalla.tsx'),
      join('ui', 'interprete', 'composicion.ts'),
      join('ui', 'interprete', 'hoja.ts'),
      join('ui', 'interprete', 'muestras-de-la-composicion.ts'),
      join('shell', 'ruta.ts'),
    ]) {
      expect(
        PRODUCCION.some((a) => a.endsWith(archivo)),
        `no se leyo «${archivo}»`,
      ).toBe(true);
    }
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

/**
 * **La lista de sistemas dice la verdad: la manda `consumidores.json`** (#113).
 *
 * `SISTEMAS` se escribe a mano —la guarda la necesita como dato, y la muestra tambien—, y una lista
 * escrita a mano se queda vieja sin avisar: hasta #113 le faltaban `ciudadano` y `pcf`, que llevaban
 * meses en el JSON, y `'/pcf/api/v1'` escrito en `ui` pasaba en verde. Aqui se comprueba **entera y
 * en los dos sentidos**, como la lista de excepciones de `fetch`: cada consumidor esta en
 * `SISTEMAS`, y lo que esta en `SISTEMAS` sin consumir se declara aparte con su motivo.
 */
const { consumidores } = JSON.parse(leer(join(RAIZ, 'consumidores.json'))) as {
  consumidores: readonly { readonly repositorio: string }[];
};

/** El nombre del sistema es el ultimo trozo del repositorio: `hneyra/pcf` → `pcf`. */
const nombreDe = (repositorio: string): string => repositorio.split('/').at(-1) ?? '';

/** Los consumidores cuyo nombre no esta en la lista dada. Pura, para poder darle una ficticia. */
function consumidoresFuera(lista: readonly string[], repositorios: readonly string[]): string[] {
  return repositorios.filter((repositorio) => !lista.includes(nombreDe(repositorio)));
}

/** Los numeros que se escriben con letra delante de «sistemas» o de «consumidores». */
const NUMEROS = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const CUANTOS = new RegExp(`\\b(${NUMEROS.join('|')})\\s+(?:sistemas|consumidores)\\b`, 'gi');

/**
 * Las veces que un texto cuenta los sistemas con un numero que NO es `cuantos`. Pura, por lo mismo.
 *
 * Solo mira «N sistemas» y «N consumidores» escritos con letra, que es como `CLAUDE.md` los cuenta.
 * Hasta #113 los contaba de tres maneras —«cuatro sistemas» arriba, «cinco sistemas» en las reglas y
 * seis entradas en el JSON— y ninguna la leia nadie.
 */
function cuentasQueNoCuadran(texto: string, cuantos: number): string[] {
  const esperado = NUMEROS[cuantos - 1];
  return [...texto.matchAll(CUANTOS)]
    .filter((casa) => casa[1]?.toLowerCase() !== esperado)
    .map((casa) => casa[0]);
}

describe('LA LISTA DE SISTEMAS dice la verdad: sale de `consumidores.json` (#113)', () => {
  it('EL CENTINELA: el JSON tiene consumidores, y todos con repositorio', () => {
    // Sin esto, las dos comprobaciones de abajo pasarian sobre la lista vacia.
    expect(consumidores.length).toBeGreaterThan(0);
    for (const { repositorio } of consumidores) expect(nombreDe(repositorio)).not.toBe('');
  });

  it('cada consumidor de `consumidores.json` es un sistema de `SISTEMAS`', () => {
    expect(
      consumidoresFuera(SISTEMAS, consumidores.map((c) => c.repositorio)),
      'Estos consumidores no estan en «SISTEMAS» (paquetes/verificaciones/suposiciones.ts), y la ' +
        'guarda deja pasar su prefijo en verde: anadelos alli.',
    ).toEqual([]);
  });

  it('y lo que esta en `SISTEMAS` sin consumir se declara aparte, entero y con su motivo', () => {
    // La otra mitad: un sistema que dejara de consumir, o uno escrito con una errata, se quedaria
    // en la lista sin que nada lo dijera.
    const consumen = new Set(consumidores.map((c) => nombreDe(c.repositorio)));
    const sinConsumir = SISTEMAS.filter((s) => !consumen.has(s));
    expect(Object.keys(SISTEMAS_QUE_NO_CONSUMEN).sort()).toEqual([...sinConsumir].sort());
    for (const motivo of Object.values(SISTEMAS_QUE_NO_CONSUMEN)) expect(motivo?.trim()).not.toBe('');
  });

  it('el prefijo de CADA consumidor lo caza la guarda, derivado del JSON y no de la lista', () => {
    const prefijo = SUPOSICIONES.find((s) => s.clave === 'prefijo-de-un-sistema')?.patron;
    const escapados = consumidores
      .map((c) => `'/${nombreDe(c.repositorio)}/api/v1'`)
      .filter((literal) => !(prefijo?.test(literal) ?? false));
    expect(escapados, 'estos prefijos pasan «prefijo-de-un-sistema» en verde').toEqual([]);
  });

  it('LA MUESTRA: los dos que faltaban estan en ella, y la guarda los caza', () => {
    const prefijo = SUPOSICIONES.find((s) => s.clave === 'prefijo-de-un-sistema');
    const cazados = prefijo
      ? hallazgosDe(prefijo, [join(PAQUETES, 'verificaciones/muestras/supone-un-sistema.ts')]).map((h) => h.texto)
      : [];
    for (const literal of ['/pcf/api', '/ciudadano/api']) {
      expect(
        cazados.some((texto) => texto.includes(literal)),
        `«${literal}» no lo caza «prefijo-de-un-sistema» sobre la muestra`,
      ).toBe(true);
    }
  });

  it('y la comprobacion muerde: un consumidor ficticio sale rojo nombrado', () => {
    expect(consumidoresFuera(['rentas'], ['hneyra/rentas', 'hneyra/septimo'])).toEqual(['hneyra/septimo']);
  });
});

describe('`CLAUDE.md` cuenta los sistemas con UN numero, el que sale del JSON (#113)', () => {
  it('ninguna cuenta de «N sistemas» o «N consumidores» contradice a `consumidores.json`', () => {
    const texto = leer(join(RAIZ, 'CLAUDE.md'));
    expect(
      texto.match(CUANTOS)?.length ?? 0,
      'EL CENTINELA: CLAUDE.md ya no cuenta los sistemas en ningun sitio, y esto no mide nada',
    ).toBeGreaterThan(0);
    expect(
      cuentasQueNoCuadran(texto, consumidores.length),
      `consumidores.json tiene ${String(consumidores.length)} consumidores, y CLAUDE.md dice otra cosa`,
    ).toEqual([]);
  });

  it('LA MUESTRA: la cuenta que no cuadra sale, y la que cuadra no', () => {
    const muestra = 'Vale en los cuatro sistemas. Vale en los seis sistemas. Y en los cinco consumidores.';
    expect(cuentasQueNoCuadran(muestra, 6)).toEqual(['cuatro sistemas', 'cinco consumidores']);
  });
});
