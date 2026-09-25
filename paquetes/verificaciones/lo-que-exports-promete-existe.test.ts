// @vitest-environment node
//
// Lee el DISCO, no un DOM: los seis `package.json` y los archivos que prometen. En `jsdom`,
// `import.meta.url` no es una URL `file:` y el `fileURLToPath` de `texto.ts` revienta con «The URL
// must be of scheme file».

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { APARTADAS, PAQUETES, leer } from './texto.ts';

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
 * <h2>Que mira, y por que las cuatro cosas</h2>
 *
 * · Cada subruta de `exports` de cada paquete de `paquetes/`. Es lo que un consumidor escribe.
 * · `main` y `types`, que son la misma promesa sin subruta: por ahi entra `import … from
 *   '@kamayuk/formato'` y por ahi resuelve `tsc` los tipos. Dejarlos fuera seria comprobar la
 *   puerta lateral y no la principal.
 * · **Que la entrada que promete un MODULO lo publique tipado** (#46). Ver abajo.
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
 *
 * <h2>La segunda promesa: un modulo se publica TIPADO (#46)</h2>
 *
 * Que el archivo este no basta. `"./prohibiciones": "./prohibiciones.mjs"` apuntaba a un archivo
 * que existe, y aun asi **llegaba roto al consumidor**: dentro de esta libreria el `.mjs` se tipa
 * solo —ruta relativa mas `allowJs`—, pero desde fuera llega por `node_modules/`, y TypeScript
 * **no aplica `allowJs` a nada que cuelgue de `node_modules`**. Medido en `rentas`#137, el primer
 * sistema que consume el paquete de verdad: `TS7016` mas trece parametros implicitamente `any`. Y
 * la salida de `maxNodeModuleJsDepth` no vale —abre `node_modules` entero y salen veintitantos
 * errores dentro de `jsdom`—, asi que cada sistema acababa escribiendo **su propia copia** de un
 * `.d.ts` que declara la misma forma. El mismo fork, un piso mas abajo.
 *
 * <h2>Que cuenta como «prometer tipos», que es lo unico dificil de esto</h2>
 *
 * **Una guarda que le exigiera tipos a una hoja `.css` se desactivaria sola** — al primer
 * `@import '@kamayuk/ui/estilos.css'` alguien la aflojaria a «mira solo lo que yo diga», y una
 * guarda con lista de excepciones escrita a mano no mira la entrada de manana. Asi que la regla no
 * es «toda entrada»: es **la extension del destino**, que es lo que decide si un consumidor lo
 * escribe en un `import` o en un `@import`:
 *
 * · `.ts`, `.tsx`, `.mts`, `.cts` y `.json` — **traen su tipo**: el archivo ES la declaracion (el
 *   `.json`, con `resolveJsonModule`). Nada que exigir.
 * · `.js`, `.mjs`, `.cjs` — **prometen un modulo y no traen tipo**: hace falta la declaracion que
 *   TypeScript busca al lado, `.d.ts`, `.d.mts` o `.d.cts` segun la extension. Sin ella la entrada
 *   resuelve, se importa y llega como `any`, que es el defecto de #46.
 * · `.css` y lo demas que no se importa como modulo — **no prometen tipos**, y no se les piden.
 *
 * Y una extension que esta guarda no sepa clasificar **sale roja diciendolo**, por lo mismo que
 * una forma de `exports` que no entiende: clasificar en silencio como «no es un modulo» lo que
 * nadie miro es exactamente como `./prohibiciones` estuvo sin tipos desde el dia uno.
 */

/** Las dos claves que prometen UN archivo en vez de un mapa. */
const CLAVES_SUELTAS = ['main', 'types'] as const;

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
    // Lo que `paquetes/` puede tener dentro y no es un paquete: las `APARTADAS` de todas las
    // guardas (#126). Hasta entonces esta lista era la unica sin `muestras`, y no porque se
    // decidiera: `paquetes/muestras/` no existe, y si existiera tampoco seria un paquete.
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

/** Un archivo del paquete `directorio`, tal como lo escribe el manifiesto (`./x.mjs`). */
type HayArchivo = (directorio: string, valor: string) => boolean;

/** Lo de verdad: esta en el disco Y es un archivo. Un directorio no lo sirve nadie. */
const EN_EL_DISCO_HAY: HayArchivo = (directorio, valor) => {
  const ruta = join(PAQUETES, directorio, valor);
  return existsSync(ruta) && statSync(ruta).isFile();
};

/** Las promesas cuyo archivo no esta — o esta pero es un directorio, que tampoco resuelve. */
function lasQueNoEstan(promesas: readonly Promesa[], hay: HayArchivo = EN_EL_DISCO_HAY): Promesa[] {
  return promesas.filter((promesa) => !hay(promesa.directorio, promesa.valor));
}

/**
 * Que promete cada destino en materia de tipos, por su extension.
 *
 * No es una lista de excepciones: es la clasificacion entera, y lo que no cae en ninguna clase
 * sale rojo. Ver el `<h2>` de arriba.
 */
type Clase = 'trae-su-tipo' | 'necesita-declaracion' | 'no-es-un-modulo' | 'sin-clasificar';

/** El archivo ES su propia declaracion. El `.json`, con `resolveJsonModule`. */
const TRAEN_SU_TIPO = ['.ts', '.tsx', '.mts', '.cts', '.json'];

/**
 * Los modulos escritos en JavaScript, y la declaracion que TypeScript busca al lado de cada uno.
 *
 * El emparejamiento no es libre: `./x.mjs` se tipa con `x.d.mts` y con ningun otro nombre — un
 * `x.d.ts` al lado de un `.mjs` **no lo mira nadie**, y la entrada seguiria llegando como `any`
 * con un archivo de tipos en el disco pareciendo que la cubre.
 */
const DECLARACION_DE: Readonly<Record<string, string>> = {
  '.js': '.d.ts',
  '.mjs': '.d.mts',
  '.cjs': '.d.cts',
};

/** Lo que un consumidor no escribe en un `import`, sino en un `@import` o en una etiqueta. */
const NO_SON_MODULOS = ['.css', '.svg', '.png', '.woff', '.woff2', '.html', '.txt', '.md'];

/** La extension del destino, en minusculas: `./estilos/estilos.css` -> `.css`. */
function extensionDe(valor: string): string {
  const ultimo = valor.slice(valor.lastIndexOf('/') + 1);
  const punto = ultimo.lastIndexOf('.');
  return punto <= 0 ? '' : ultimo.slice(punto).toLowerCase();
}

function claseDe(valor: string): Clase {
  const extension = extensionDe(valor);
  if (extension in DECLARACION_DE) return 'necesita-declaracion';
  if (TRAEN_SU_TIPO.includes(extension)) return 'trae-su-tipo';
  if (NO_SON_MODULOS.includes(extension)) return 'no-es-un-modulo';
  return 'sin-clasificar';
}

/** La declaracion que le toca a una promesa, o `null` si no necesita ninguna. */
function declaracionQueLeToca(valor: string): string | null {
  const declaracion = DECLARACION_DE[extensionDe(valor)];
  return declaracion === undefined ? null : valor.replace(/\.[^./]+$/, declaracion);
}

interface SinTipos {
  readonly promesa: Promesa;
  /** La declaracion que hace falta y no esta: `./prohibiciones.d.mts`. */
  readonly declaracion: string;
}

/**
 * Las promesas que un consumidor importa como modulo y recibe como `any`.
 *
 * `hay` es un parametro por el mismo motivo que `promesasDelManifiesto` recibe el manifiesto ya
 * parseado: las muestras tienen que poder ensenar un disco que este arbol no tiene, sin escribir
 * archivos de verdad y confiar en borrarlos.
 */
function lasQueNoPublicanTipos(
  promesas: readonly Promesa[],
  hay: HayArchivo = EN_EL_DISCO_HAY,
): SinTipos[] {
  const sinTipos: SinTipos[] = [];
  for (const promesa of promesas) {
    const declaracion = declaracionQueLeToca(promesa.valor);
    if (declaracion === null) continue;
    if (!hay(promesa.directorio, declaracion)) sinTipos.push({ promesa, declaracion });
  }
  return sinTipos;
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

  it('cada entrada que promete un MODULO lo publica tipado', () => {
    // El defecto de #46: `./prohibiciones` apuntaba a un `.mjs` que existe y llegaba como `any` al
    // consumidor, porque `allowJs` no alcanza dentro de `node_modules`. Se miran las promesas
    // ENTERAS —`exports`, `main` y `types`— porque por las tres entra un `import`.
    const sinTipos = lasQueNoPublicanTipos(EN_EL_DISCO.promesas);

    expect(
      sinTipos.map(({ promesa }) => `${promesa.paquete}  ${promesa.clave}`),
      'Hay entradas que prometen un modulo en JavaScript y NO publican su declaracion. Dentro de ' +
        'esta libreria no se nota —ruta relativa mas «allowJs»—; el consumidor lo importa y lo ' +
        'recibe como «any», con un TS7016 y un parametro implicito por cada derivacion. Escribe ' +
        'la declaracion al lado, con la extension que TypeScript busca (#46).\n\nDonde:\n' +
        sinTipos
          .map(
            ({ promesa, declaracion }) =>
              `  ${promesa.paquete}  ${promesa.clave}  ->  ${comoSeLee(promesa)}\n` +
              `      falta  paquetes/${promesa.directorio}/${declaracion.replace(/^\.\//, '')}`,
          )
          .join('\n'),
    ).toEqual([]);
  });

  it('y ninguna promesa se queda sin clasificar', () => {
    // La mitad que importa de la regla anterior: una extension que la guarda no conozca no puede
    // caer en «no es un modulo» por omision. Asi es exactamente como `./prohibiciones` estuvo sin
    // tipos desde el dia uno — nadie la habia mirado, y no mirarla no daba rojo.
    const sinClasificar = EN_EL_DISCO.promesas.filter((p) => claseDe(p.valor) === 'sin-clasificar');

    expect(
      sinClasificar.map((p) => `${p.paquete}  ${p.clave}  ->  ${p.valor}`),
      'Hay destinos cuya extension esta guarda no sabe clasificar. Di cual de las tres cosas es: ' +
        'trae su tipo (`.ts`…), necesita una declaracion al lado (`.js`…), o no es un modulo y no ' +
        'promete tipos (`.css`…). Dejarlo sin clasificar lo da por bueno en silencio.',
    ).toEqual([]);
  });

  it('EL CENTINELA: la clasificacion no manda el arbol entero a «no es un modulo»', () => {
    // Si `claseDe` devolviera siempre «no-es-un-modulo», las dos comprobaciones de arriba pasarian
    // sobre la lista vacia con el paquete sin tipos y ESLint leyendo `any`. Los seis prometen su
    // `index.ts` por `main` y por `types`: eso son doce promesas que TIENEN que clasificarse como
    // modulo con tipo propio.
    const conTipo = EN_EL_DISCO.promesas.filter((p) => claseDe(p.valor) === 'trae-su-tipo');
    expect(conTipo.length, 'no se clasifico ni una promesa como modulo tipado').toBeGreaterThanOrEqual(
      12,
    );
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

  it('LA MUESTRA: un `.mjs` sin su `.d.mts` al lado sale rojo, y solo el', () => {
    // Es la entrada de #46 tal cual estaba, medida: `prohibiciones.mjs` en el disco y ninguna
    // declaracion. El disco es el parametro `hay`, asi que la muestra no depende de que este
    // arbol siga teniendo —o dejando de tener— ningun archivo.
    const muestra = promesasDelManifiesto('verificaciones', {
      name: '@kamayuk/verificaciones',
      types: 'index.ts',
      main: 'index.ts',
      exports: { '.': './index.ts', './prohibiciones': './prohibiciones.mjs' },
    });
    const soloElMjs: HayArchivo = (_, valor) => valor.endsWith('.mjs') || valor.endsWith('.ts');

    expect(muestra.ilegibles).toEqual([]);
    expect(lasQueNoEstan(muestra.promesas, soloElMjs)).toEqual([]);
    expect(
      lasQueNoPublicanTipos(muestra.promesas, soloElMjs).map(({ promesa, declaracion }) => [
        promesa.clave,
        declaracion,
      ]),
    ).toEqual([['exports["./prohibiciones"]', './prohibiciones.d.mts']]);
  });

  it('LA MUESTRA: y con la declaracion al lado, no sale rojo', () => {
    // La otra direccion. Sin esto, una guarda que devolviera SIEMPRE la entrada pasaria la muestra
    // de arriba y pondria roja una libreria correcta, que es como una guarda se acaba apagando.
    const muestra = promesasDelManifiesto('verificaciones', {
      exports: { './prohibiciones': './prohibiciones.mjs' },
    });
    expect(lasQueNoPublicanTipos(muestra.promesas, () => true)).toEqual([]);
  });

  it('LA MUESTRA: a una hoja `.css` no se le piden tipos, y a un `.ts` tampoco', () => {
    // **El modo de fallo de esta regla es exigir de mas.** Una guarda que le pidiera un `.d.ts` a
    // `@kamayuk/ui/estilos.css` saldria roja sobre una entrada correcta, y lo que se hace con una
    // guarda asi es aflojarla a una lista de excepciones escrita a mano — que ya no mira la
    // entrada que alguien anada manana. Con un disco donde NO hay ninguna declaracion, estas
    // entradas tienen que seguir en verde.
    const muestra = promesasDelManifiesto('ui', {
      name: '@kamayuk/ui',
      types: 'index.ts',
      main: 'index.ts',
      exports: { '.': './index.ts', './estilos.css': './estilos/estilos.css' },
    });
    expect(lasQueNoPublicanTipos(muestra.promesas, () => false)).toEqual([]);
  });

  it('LA MUESTRA: la declaracion que se pide es la que TypeScript busca, no otra', () => {
    // `./x.mjs` se tipa con `x.d.mts` y con ningun otro nombre. Un `x.d.ts` al lado de un `.mjs`
    // no lo mira nadie: la entrada seguiria llegando como `any` con un archivo de tipos en el
    // disco pareciendo que la cubre — un verde peor que el rojo.
    expect(declaracionQueLeToca('./prohibiciones.mjs')).toBe('./prohibiciones.d.mts');
    expect(declaracionQueLeToca('./cosa.cjs')).toBe('./cosa.d.cts');
    expect(declaracionQueLeToca('./cosa.js')).toBe('./cosa.d.ts');
    expect(declaracionQueLeToca('./index.ts')).toBeNull();
    expect(declaracionQueLeToca('./estilos/estilos.css')).toBeNull();
  });

  it('LA MUESTRA: una extension que la guarda no conoce NO pasa por «no es un modulo»', () => {
    // Es el equivalente de las formas raras de `exports`, en la otra mitad de la guarda: lo que
    // no se ha clasificado no se da por bueno.
    expect(claseDe('./cosa.wasm')).toBe('sin-clasificar');
    expect(claseDe('./estilos')).toBe('sin-clasificar');
    expect(claseDe('./prohibiciones.mjs')).toBe('necesita-declaracion');
    expect(claseDe('./index.ts')).toBe('trae-su-tipo');
    expect(claseDe('./estilos/estilos.css')).toBe('no-es-un-modulo');
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
