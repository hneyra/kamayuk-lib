// @vitest-environment node
//
// Lee el DISCO, no un DOM: los seis `package.json` y los archivos que prometen. En `jsdom`,
// `import.meta.url` no es una URL `file:` y el `fileURLToPath` de `texto.ts` revienta con «The URL
// must be of scheme file».

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, leer } from './texto.ts';

/**
 * **Lo que `exports` promete existe en el disco** (#24).
 *
 * <h2>El defecto del que sale, medido</h2>
 *
 * `paquetes/ui/package.json` declaraba `"./fuentes": "./fuentes/fuentes.css"` y
 * `paquetes/ui/fuentes/` **no existia**. La entrada la decidio el plan y la capa que la necesitaba
 * no llego, asi que quedo escrita como promesa. Y una promesa asi no degrada: quien escriba
 * `@import '@kamayuk/ui/fuentes'` **no recibe una fuente sin cara, recibe un fallo de
 * resolucion** — y lo recibe en SU build, en otro repositorio, que es donde este producto ya
 * aprendio que salen los rojos mas caros de leer (#4).
 *
 * El modo de fallo es el de siempre aqui: **silencioso**. Ni `yarn lint`, ni `tsc`, ni las 349
 * pruebas miraban `exports` — `tsc` sigue los imports del codigo y nadie importaba esa subruta—,
 * y `yarn install` con `link:` tampoco: yarn enlaza el directorio y no valida una sola ruta del
 * manifiesto. Medido: la entrada entro con el esqueleto del paquete —#2, `60014cc`, 2026-09-12— y
 * **no ha resuelto ni un dia**, con la suite en verde todo el tiempo.
 *
 * <h2>Que mira, y por que las tres cosas</h2>
 *
 * · Cada subruta de `exports` de cada paquete de `paquetes/`. Es lo que un consumidor escribe.
 * · `main` y `types`, que son la misma promesa sin subruta: por ahi entra `import … from
 *   '@kamayuk/formato'` y por ahi resuelve `tsc` los tipos. Dejarlos fuera seria comprobar la
 *   puerta lateral y no la principal.
 * · **La FORMA del `exports`**, y esto es la mitad que importa. Esta guarda entiende UNA forma
 *   —mapa de subruta a ruta relativa— y cualquier otra sale **en rojo diciendolo**, no en verde:
 *   un condicional anidado (`{".": {"import": "./x.ts"}}`), un array de alternativas, el atajo de
 *   condiciones (`{"import": "./x.ts"}`, que parece un mapa de subrutas y no lo es) o un
 *   `exports` que no sea un objeto. Un `exports` que la guarda no entiende y pasa en verde es
 *   **exactamente el modo de fallo que esta guarda existe para impedir**, con un disfraz mejor.
 *
 * <h2>Y lee el `exports` de verdad, no una lista</h2>
 *
 * Las entradas no estan escritas aqui: se recorren `paquetes/`, los manifiestos que haya y las
 * claves que traigan. Una entrada nueva —o un paquete nuevo— la mira sola desde el minuto uno, que
 * es la unica forma de que la guarda no se quede vieja sin que nadie lo note. Una lista copiada a
 * mano habria dejado fuera justo la entrada que alguien anada manana, que es la que nadie ha
 * mirado todavia.
 */

/** Las dos claves que prometen UN archivo en vez de un mapa. */
const CLAVES_SUELTAS = ['main', 'types'] as const;

/** Lo que `paquetes/` puede tener dentro y no es un paquete. */
const APARTADAS = new Set(['node_modules', 'dist']);

/** Los seis de ADR-0030 §4. La lista solo la usa EL CENTINELA; el barrido no. */
const LOS_SEIS = ['api', 'formato', 'sesion', 'shell', 'ui', 'verificaciones'] as const;

interface Promesa {
  /** El nombre publico, para el mensaje: `@kamayuk/ui`. */
  readonly paquete: string;
  /** El directorio bajo `paquetes/`, que es contra lo que resuelve la ruta. */
  readonly directorio: string;
  /** `exports["./estilos.css"]`, `main`, `types`. */
  readonly clave: string;
  /** La ruta tal cual la escribe el manifiesto. */
  readonly valor: string;
}

interface Ilegible {
  readonly paquete: string;
  readonly clave: string;
  readonly motivo: string;
}

interface Lectura {
  readonly promesas: Promesa[];
  readonly ilegibles: Ilegible[];
}

function esObjetoLlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Como se nombra una forma en el mensaje de error: `array` y `null` a mano, que `typeof` miente. */
function forma(valor: unknown): string {
  if (valor === null) return 'null';
  if (Array.isArray(valor)) return 'array';
  return typeof valor;
}

/** La ruta como se lee en un mensaje: desde la raiz del repositorio. */
function comoSeLee(promesa: Promesa): string {
  return `paquetes/${promesa.directorio}/${promesa.valor.replace(/^\.\//, '')}`;
}

/**
 * Lo que UN manifiesto promete, y lo que de el no se sabe leer.
 *
 * Recibe el objeto ya parseado en vez de leerlo del disco para que las muestras puedan darle
 * formas que este arbol no tiene. Sin eso, demostrar que la guarda muerde en las formas raras
 * exigiria escribir un `package.json` invalido en el arbol de verdad y confiar en restaurarlo.
 */
function promesasDelManifiesto(directorio: string, manifiesto: unknown): Lectura {
  const promesas: Promesa[] = [];
  const ilegibles: Ilegible[] = [];

  if (!esObjetoLlano(manifiesto)) {
    return {
      promesas,
      ilegibles: [
        {
          paquete: directorio,
          clave: '(el manifiesto entero)',
          motivo: `no es un objeto: es «${forma(manifiesto)}»`,
        },
      ],
    };
  }

  const paquete = typeof manifiesto.name === 'string' ? manifiesto.name : directorio;
  const anotar = (clave: string, motivo: string): void => {
    ilegibles.push({ paquete, clave, motivo });
  };

  for (const clave of CLAVES_SUELTAS) {
    const valor = manifiesto[clave];
    // No prometer nada no es un defecto; prometer otra cosa que una ruta, si.
    if (valor === undefined) continue;
    if (typeof valor !== 'string') {
      anotar(clave, `no es una cadena: es «${forma(valor)}»`);
      continue;
    }
    promesas.push({ paquete, directorio, clave, valor });
  }

  const exportaciones = manifiesto.exports;
  if (exportaciones === undefined) return { promesas, ilegibles };

  if (!esObjetoLlano(exportaciones)) {
    anotar(
      'exports',
      `esta guarda entiende «exports» solo como un mapa de subruta a archivo, y esto es ` +
        `«${forma(exportaciones)}». Si la forma tiene que cambiar, se ensena a la guarda a leerla: ` +
        `pasarla en verde sin leerla es como la entrada de #24 no resolvio ni un dia sin un rojo`,
    );
    return { promesas, ilegibles };
  }

  for (const [subruta, destino] of Object.entries(exportaciones)) {
    const clave = `exports["${subruta}"]`;
    if (!subruta.startsWith('.')) {
      // `{"import": "./index.ts"}` es un mapa de cadena a cadena y NO es un mapa de subrutas: es
      // el atajo de condiciones. Leerlo como subrutas comprobaria un archivo que nadie promete.
      anotar(
        clave,
        `la subruta no empieza por «.»: esto no es un mapa de subrutas, es el atajo de ` +
          `condiciones («import», «default»…), y esta guarda no lo lee`,
      );
      continue;
    }
    if (typeof destino !== 'string') {
      anotar(
        clave,
        `el destino no es una cadena: es «${forma(destino)}». Un condicional anidado o un array ` +
          `de alternativas no lo lee esta guarda`,
      );
      continue;
    }
    if (!destino.startsWith('./')) {
      // Node rechaza el destino de un `exports` que no empiece por `./` —«Invalid "exports"
      // target»—, asi que resolverlo contra el directorio del paquete daria por bueno un archivo
      // que ningun consumidor va a alcanzar.
      anotar(
        clave,
        `el destino «${destino}» no empieza por «./»: Node no lo acepta como ruta de un ` +
          `«exports», asi que no hay archivo que comprobar`,
      );
      continue;
    }
    promesas.push({ paquete, directorio, clave, valor: destino });
  }

  return { promesas, ilegibles };
}

/** Lo que prometen TODOS los paquetes del disco. */
function loQuePrometenLosPaquetes(raiz: string = PAQUETES): Lectura {
  const promesas: Promesa[] = [];
  const ilegibles: Ilegible[] = [];
  for (const directorio of readdirSync(raiz).sort()) {
    if (APARTADAS.has(directorio)) continue;
    const completa = join(raiz, directorio);
    if (!statSync(completa).isDirectory()) continue;
    const manifiesto = join(completa, 'package.json');
    if (!existsSync(manifiesto)) {
      // Un directorio de `paquetes/` sin manifiesto no lo enlaza nadie. Se anota en vez de
      // saltarse: saltarselo es como un paquete entero se cae del barrido sin un rojo.
      ilegibles.push({
        paquete: directorio,
        clave: '(el manifiesto entero)',
        motivo: 'no hay `package.json`, asi que este directorio no es un paquete que nadie enlace',
      });
      continue;
    }
    const leida = promesasDelManifiesto(directorio, JSON.parse(leer(manifiesto)) as unknown);
    promesas.push(...leida.promesas);
    ilegibles.push(...leida.ilegibles);
  }
  return { promesas, ilegibles };
}

/** Las promesas cuyo archivo no esta — o esta pero es un directorio, que tampoco resuelve. */
function lasQueNoEstan(promesas: readonly Promesa[]): Promesa[] {
  return promesas.filter((promesa) => {
    const ruta = join(PAQUETES, promesa.directorio, promesa.valor);
    return !existsSync(ruta) || !statSync(ruta).isFile();
  });
}

function detalleDe(faltantes: readonly Promesa[]): string {
  return faltantes.map((p) => `  ${p.paquete}  ${p.clave}  ->  ${comoSeLee(p)}`).join('\n');
}

const EN_EL_DISCO = loQuePrometenLosPaquetes();
const DE_EXPORTS = EN_EL_DISCO.promesas.filter((p) => p.clave.startsWith('exports['));
const SUELTAS = EN_EL_DISCO.promesas.filter((p) => !p.clave.startsWith('exports['));

describe('lo que `exports` promete existe en el disco', () => {
  it('EL CENTINELA: se leyeron los manifiestos de los seis paquetes', () => {
    // Sin esto, un barrido que no encuentre manifiestos pasaria sobre la lista vacia y saldria
    // verde. Es como una guarda se queda sin sujeto sin que nadie la borre.
    expect(
      EN_EL_DISCO.promesas.length,
      'no se leyo ni una promesa: la guarda no mide nada',
    ).toBeGreaterThanOrEqual(12);
    for (const paquete of LOS_SEIS) {
      expect(
        EN_EL_DISCO.promesas.some((p) => p.directorio === paquete),
        `no se leyo ni una promesa de «${paquete}»`,
      ).toBe(true);
    }
  });

  it('EL CENTINELA: los seis prometen algo por `exports`, y algo por `main` y `types`', () => {
    // Si alguien borrara el `exports` de un paquete, el barrido seguiria verde por la via facil:
    // sin entradas no hay nada que fallar. Y es justo lo que no puede pasar sin que se vea.
    for (const paquete of LOS_SEIS) {
      expect(
        DE_EXPORTS.some((p) => p.directorio === paquete),
        `«${paquete}» no promete ni una subruta por «exports»`,
      ).toBe(true);
      expect(
        SUELTAS.filter((p) => p.directorio === paquete).map((p) => p.clave).sort(),
        `«${paquete}» no promete «main» y «types»`,
      ).toEqual(['main', 'types']);
    }
  });

  it('cada entrada de `exports` apunta a un archivo que existe', () => {
    const faltantes = lasQueNoEstan(DE_EXPORTS);
    expect(
      faltantes,
      'Hay entradas de «exports» que prometen un archivo que NO esta. Quien las escriba en un ' +
        'consumidor no recibe una hoja vacia: recibe un fallo de resolucion, y lo recibe en su ' +
        'build. O entra el archivo, o sale la entrada (#24).\n\nDonde:\n' +
        detalleDe(faltantes),
    ).toEqual([]);
  });

  it('y `main` y `types` tambien, que es por donde se entra sin subruta', () => {
    const faltantes = lasQueNoEstan(SUELTAS);
    expect(
      faltantes,
      'Hay «main» o «types» que apuntan a un archivo que NO esta. Es la misma promesa que ' +
        '«exports» sin subruta: por ahi entra el import del nombre a secas y por ahi resuelve ' +
        `«tsc» los tipos.\n\nDonde:\n${detalleDe(faltantes)}`,
    ).toEqual([]);
  });

  it('y no hay ni una forma de manifiesto que la guarda lea a medias', () => {
    const detalle = EN_EL_DISCO.ilegibles
      .map((i) => `  ${i.paquete}  ${i.clave}  ->  ${i.motivo}`)
      .join('\n');
    expect(
      EN_EL_DISCO.ilegibles,
      'Hay claves del manifiesto que esta guarda no sabe leer. No se pasan por alto a proposito: ' +
        'un «exports» que la guarda no entiende y deja en verde es el mismo defecto de #24 con un ' +
        `disfraz mejor. O se ensena a la guarda a leer la forma, o la forma no entra.\n\n${detalle}`,
    ).toEqual([]);
  });

  it('LA MUESTRA: una entrada que apunta a lo que no esta sale roja, y solo ella', () => {
    // Es la entrada de #24 tal cual estaba, medida: `paquetes/ui/fuentes/` no existe y `./index.ts`
    // si. Que salga UNA y no dos es la mitad que importa — una guarda que se pone roja con todo no
    // dice donde esta el defecto.
    const muestra = promesasDelManifiesto('ui', {
      name: '@kamayuk/ui',
      main: 'index.ts',
      exports: { '.': './index.ts', './fuentes': './fuentes/fuentes.css' },
    });
    expect(muestra.ilegibles).toEqual([]);
    expect(lasQueNoEstan(muestra.promesas).map((p) => p.clave)).toEqual(['exports["./fuentes"]']);
  });

  it('LA MUESTRA: una entrada que apunta a un DIRECTORIO tambien sale roja', () => {
    // `./estilos` existe en el disco y no resuelve: un `exports` que apunta a un directorio no lo
    // sirve nadie. Con un `existsSync` pelado esto pasaria en verde.
    const muestra = promesasDelManifiesto('ui', { name: '@kamayuk/ui', exports: { './e': './estilos' } });
    expect(muestra.ilegibles).toEqual([]);
    expect(lasQueNoEstan(muestra.promesas).map((p) => p.clave)).toEqual(['exports["./e"]']);
  });

  it('LA MUESTRA: las formas que la guarda no sabe leer salen DICIENDOLO, y sin promesas', () => {
    // Cada una de estas pasa hoy por un `Object.entries` sin quejarse si nadie la mira, y cada una
    // esconde un archivo distinto que nadie comprueba.
    const raras: readonly [string, unknown][] = [
      ['un array de alternativas', { exports: { './x': ['./a.css', './b.css'] } }],
      ['un condicional anidado', { exports: { '.': { import: './index.ts' } } }],
      ['el atajo de condiciones', { exports: { import: './index.ts' } }],
      ['un `exports` que no es objeto', { exports: './index.ts' }],
      ['un destino sin `./`', { exports: { './x': 'estilos/estilos.css' } }],
      ['un `main` que no es cadena', { main: 42 }],
      ['un manifiesto que no es objeto', ['@kamayuk/ui']],
    ];
    for (const [dice, manifiesto] of raras) {
      const muestra = promesasDelManifiesto('ui', manifiesto);
      expect(muestra.ilegibles.length, `«${dice}» no se anoto: paso en silencio`).toBeGreaterThan(0);
      expect(
        muestra.promesas.filter((p) => p.clave.startsWith('exports[')),
        `«${dice}» dejo pasar una promesa de «exports» que la guarda no entiende`,
      ).toEqual([]);
    }
  });
});
