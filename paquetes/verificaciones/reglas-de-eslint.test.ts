// @vitest-environment node
//
// Lintea de verdad con la API de ESLint sobre archivos del disco: no es un DOM lo que necesita.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

import { OTRAS_MUESTRAS } from './otras-muestras.ts';
import { PAQUETES, RAIZ } from './texto.ts';
import {
  CLIENTE_DE_API,
  DONDE_SE_LLAMA_A_FETCH,
  PROHIBICIONES,
  PROHIBICIONES_OPCIONALES,
  PUERTA_DE_IDENTIDAD,
  REGLAS_EXIGIDAS,
  REGLAS_OPCIONALES,
} from './prohibiciones.mjs';

/**
 * Las reglas de `eslint.config.js` muerden.
 *
 * Es el equivalente frontend de `ReglasDeArquitecturaMuerdenTest`: cada prohibicion tiene
 * una muestra que la viola a proposito, y aqui se exige que ESLint la senale. **Una regla
 * que no puede fallar no protege nada** — el mismo argumento por el que la prueba de
 * aislamiento demuestra que el superusuario omite RLS en vez de afirmarlo.
 *
 * Tres cosas hacen que esto no sea una lista mas que alguien olvida actualizar:
 *
 *   1. La lista de prohibiciones **se importa del propio config**. No hay copia.
 *   2. El nombre del archivo de la muestra **se compone** desde el `clave`. Anadir una
 *      prohibicion sin su muestra es un archivo que no existe, y sale rojo aqui mismo.
 *   3. El mensaje esperado **es el del config**. Si alguien reescribe el mensaje y deja la
 *      regla apagada, no hay texto duplicado que lo tape.
 *
 * Lo que ninguna derivacion puede sujetar es que alguien BORRE una prohibicion: con ella
 * se iria su prueba, en verde. Eso lo sujeta `REGLAS_EXIGIDAS`, que es la unica lista
 * escrita a mano y la que nombra las reglas del producto.
 *
 * Las muestras estan en `ignores` de la configuracion para que `yarn lint` no las senale;
 * aqui se lintan como TEXTO, con una ruta sintetica dentro de `src/`, que es donde la
 * regla tiene que aplicar de verdad. La excepcion es `switch-sin-agotar` (#111), que necesita tipos
 * y se lintea en su ruta de verdad: ver su `describe`, al final.
 */

const MUESTRAS = join(PAQUETES, 'verificaciones', 'muestras');

/**
 * **El linter del arbol, sin el bloque con tipos de #111.**
 *
 * `eslint.config.js` lleva un bloque con `projectService` para `switch-exhaustiveness-check`, y el
 * servicio de proyectos **solo sabe tipar archivos que un `tsconfig` incluye y que existen**. Las
 * muestras de aqui se juzgan con una ruta sintetica —`paquetes/ui/correcto.ts`, que no existe—, y
 * con el bloque encendido cada una sale con «Parsing error: … was not found by the project service»
 * (medido: 55 de 68 en rojo, y ninguno por su regla). Asi que estos dos linters apagan ESE bloque y
 * nada mas: las prohibiciones son `no-restricted-syntax`, que no mira tipos. La regla con tipos se
 * juzga aparte, con `eslintConTipos`, sobre la muestra en su ruta de verdad.
 */
const REGLA_CON_TIPOS = '@typescript-eslint/switch-exhaustiveness-check';
const SIN_EL_BLOQUE_CON_TIPOS = {
  languageOptions: { parserOptions: { projectService: false } },
  rules: { [REGLA_CON_TIPOS]: 'off' },
} as const;

const eslint = new ESLint({ cwd: RAIZ, overrideConfig: SIN_EL_BLOQUE_CON_TIPOS });

/**
 * El mismo lint del arbol, **con las opcionales encendidas** (#58).
 *
 * `eslint.config.js` monta solo `PROHIBICIONES`, que es lo correcto: esta libreria no publica
 * ninguna cifra normativa y las opcionales las enciende el sistema que las quiera, en su propio
 * `eslint.prohibiciones.mjs`. Pero una prohibicion que nadie enciende **aqui** es una prohibicion
 * que nadie ha demostrado que pueda fallar — y eso es exactamente lo que este archivo existe para
 * impedir. Asi que se enciende en un segundo linter, y la muestra se juzga contra el.
 *
 * `overrideConfig` se aplica **el ultimo**, asi que reescribe `no-restricted-syntax` entero: por
 * eso lleva las obligatorias TAMBIEN. Si llevara solo las opcionales, el caso «la misma linea en
 * los dos sentidos» no probaria nada — mediria un linter sin las nueve.
 */
const eslintConLasOpcionales = new ESLint({
  cwd: RAIZ,
  overrideConfig: {
    ...SIN_EL_BLOQUE_CON_TIPOS,
    rules: {
      ...SIN_EL_BLOQUE_CON_TIPOS.rules,
      'no-restricted-syntax': [
        'error',
        ...[...PROHIBICIONES, ...PROHIBICIONES_OPCIONALES].map(({ selector, message }) => ({
          selector,
          message,
        })),
      ],
    },
  },
});

/**
 * ESLint se arranca AQUI, y no dentro del primer caso.
 *
 * **Medido (#36): el arranque en frio costaba 3,64 s y sus diecinueve hermanas, de 0,02 a
 * 0,51.** O sea que el primer caso —`'identificador-con-tilde'`, por orden y no por nada que
 * tenga de especial— pagaba el `import` de `eslint`, de `typescript-eslint` y de `typescript`
 * entero para todos los demas, dentro de SU presupuesto de tiempo. Por eso llevaba un
 * `30_000` escrito a mano, y aun asi **reventaba**: en una de las doce corridas de la tanda
 * tardo **49,80 s** y salio en rojo diciendo «Test timed out in 30000ms», que es un rojo que
 * habla de la maquina y no de la regla que se venia a comprobar — exactamente el rojo mas
 * caro, porque no se reproduce.
 *
 * Con el arranque aqui, ese caso pasa a costar lo que cuestan sus hermanas y el `30_000`
 * sobra: los veinte corren con los 5 s de Vitest y de sobra. El coste no desaparece —hay que
 * cargar TypeScript— pero deja de estar dentro del presupuesto de una prueba que no lo mide,
 * y si algun dia el arranque se atasca, el rojo sale de este gancho y dice que fue el
 * arranque.
 */
beforeAll(async () => {
  await eslint.lintText('export const listo = 1;\n', {
    filePath: join(RAIZ, 'paquetes/ui/calentamiento.ts'),
  });
}, 60_000);

/**
 * Ruta sintetica: la muestra se juzga como si viviera en una pantalla de la aplicacion.
 *
 * **Conserva la extension del archivo de la muestra**, y no es un detalle: una muestra con
 * JSX tiene que juzgarse como `.tsx`. Juzgada como `.ts`, el analizador de TypeScript no
 * admite JSX y el rojo habla de un error de sintaxis en vez de la regla que se venia a
 * comprobar — o peor, la prohibicion no llega a evaluarse y la muestra pasa en verde.
 */
const enUnaPantalla = (nombre: string) => join(RAIZ, 'paquetes/ui', nombre);

/** El archivo de la muestra de esa clave, o `null` si no hay ninguno. */
function archivoDeLaMuestra(clave: string): string | null {
  for (const extension of ['.ts', '.tsx']) {
    const candidato = join(MUESTRAS, `${clave}${extension}`);
    if (existsSync(candidato)) {
      return candidato;
    }
  }
  return null;
}

async function mensajesDelTexto(
  codigo: string,
  rutaJuzgada: string,
  linter: ESLint = eslint,
): Promise<string[]> {
  const [resultado] = await linter.lintText(codigo, { filePath: rutaJuzgada });
  return (resultado?.messages ?? []).map((m) => m.message);
}

async function mensajesDe(
  archivo: string,
  rutaJuzgada: string,
  linter: ESLint = eslint,
): Promise<string[]> {
  return mensajesDelTexto(readFileSync(archivo, 'utf8'), rutaJuzgada, linter);
}

describe('cada prohibicion tiene su muestra, y ESLint la senala', () => {
  it.each(PROHIBICIONES.map((p) => ({ ...p })))('$clave', async ({ clave, message }) => {
    const archivo = archivoDeLaMuestra(clave);

    expect(
      archivo,
      `La prohibicion «${clave}» no tiene muestra que la viole.\n` +
        `Escribe verificaciones/muestras/${clave}.ts con codigo que la incumpla a\n` +
        `proposito. Una regla sin muestra no se ha demostrado que pueda fallar, y una\n` +
        `regla que no puede fallar no protege nada.`,
    ).not.toBeNull();

    const mensajes = await mensajesDe(archivo as string, enUnaPantalla(basename(archivo as string)));

    expect(
      mensajes,
      `ESLint no senalo la muestra de «${clave}».\n` +
        `Se esperaba el mensaje del config:\n  ${message}\n` +
        `Se obtuvo:\n${mensajes.length === 0 ? '  (ninguno)' : mensajes.map((m) => `  · ${m}`).join('\n')}`,
    ).toContain(message);
    // Sin tiempo propio: el arranque en frio lo paga `beforeAll`, asi que los veinte casos
    // caben en los 5 s de Vitest con dos ordenes de magnitud de margen (#36).
  });
});

describe('la lista de prohibiciones y la de muestras no se separan', () => {
  it('cada regla del producto tiene al menos una prohibicion que la sirve', () => {
    const servidas = new Set(PROHIBICIONES.map((p) => p.regla));
    const huerfanas = REGLAS_EXIGIDAS.filter((regla) => !servidas.has(regla));

    expect(
      huerfanas,
      'Hay reglas del producto que ninguna prohibicion de ESLint expresa. Una regla que\n' +
        'solo vive en un documento se incumple en seis meses.',
    ).toEqual([]);
  });

  it('ninguna prohibicion sirve a una regla que nadie declaro', () => {
    const noDeclaradas = PROHIBICIONES.filter((p) => !REGLAS_EXIGIDAS.includes(p.regla)).map(
      (p) => `${p.clave} -> ${p.regla}`,
    );

    expect(
      noDeclaradas,
      'Una prohibicion nueva se declara tambien en REGLAS_EXIGIDAS: si no, borrarla se\n' +
        'llevaria su prueba por delante y nadie lo notaria.',
    ).toEqual([]);
  });

  it('no hay muestras sin duenо que las reclame', () => {
    // Las nueve prohibiciones, las opcionales (#58) y las guardas que no son de ESLint.
    // `muestras/` es un solo directorio —es donde la casa mira— asi que las terceras se declaran
    // en `OTRAS_MUESTRAS`: aflojar esto a «ignora las que no reconozcas» convertiria una muestra
    // huerfana en invisible, que es justo lo que esta comprobacion impide.
    const claves = new Set([
      ...PROHIBICIONES.map((p) => p.clave),
      ...PROHIBICIONES_OPCIONALES.map((p) => p.clave),
      ...Object.keys(OTRAS_MUESTRAS),
    ]);
    const sobrantes = readdirSync(MUESTRAS)
      .map((archivo) => archivo.replace(/\.tsx?$/, ''))
      .filter((clave) => !claves.has(clave));

    expect(
      sobrantes,
      'Sobra una muestra: viola una regla que ya no existe, asi que nadie la lee y nada\n' +
        'la mantiene cierta. Si es de una guarda que no es de ESLint, declarala en\n' +
        'verificaciones/otras-muestras.ts.',
    ).toEqual([]);
  });

  it('y las declaradas en OTRAS_MUESTRAS existen de verdad', () => {
    // La direccion que falta: una entrada que nombre un archivo inexistente dejaria de
    // comprobarse en verde, que es como una lista se queda vieja sin que nada lo diga.
    const enDisco = new Set(readdirSync(MUESTRAS).map((a) => a.replace(/\.tsx?$/, '')));
    const fantasmas = Object.keys(OTRAS_MUESTRAS).filter((clave) => !enDisco.has(clave));
    expect(fantasmas, 'OTRAS_MUESTRAS nombra una muestra que no esta en el disco.').toEqual([]);
  });
});

/**
 * **LAS OPCIONALES** (#58).
 *
 * `cifra-tributaria-literal` no es una decima prohibicion: es la primera de una segunda lista, y
 * la diferencia esta medida en el javadoc de `PROHIBICIONES_OPCIONALES`. Lo que se comprueba aqui
 * es que existir aparte no la deja sin demostrar: tiene su muestra, ESLint la senala **con la
 * regla encendida**, y las dos direcciones de `REGLAS_OPCIONALES` la sujetan igual que
 * `REGLAS_EXIGIDAS` sujeta a las nueve.
 */
describe('las opcionales existen, muerden, y no se le exigen a nadie', () => {
  it('EL CENTINELA: hay al menos una opcional', () => {
    // Sin esto, una lista vacia dejaria todo lo de abajo recorriendo cero elementos y pasando en
    // verde — que es como una guarda se queda sin sujeto.
    expect(PROHIBICIONES_OPCIONALES.length).toBeGreaterThanOrEqual(1);
    expect(REGLAS_OPCIONALES.length).toBeGreaterThanOrEqual(1);
  });

  it.each(PROHIBICIONES_OPCIONALES.map((p) => ({ ...p })))(
    '$clave tiene su muestra, y ESLint la senala con la regla encendida',
    async ({ clave, message }) => {
      const archivo = archivoDeLaMuestra(clave);

      expect(
        archivo,
        `La prohibicion opcional «${clave}» no tiene muestra que la viole.\n` +
          `Escribe verificaciones/muestras/${clave}.ts con codigo que la incumpla a proposito.\n` +
          'Que sea opcional no la exime: una regla que no puede fallar no protege nada.',
      ).not.toBeNull();

      const mensajes = await mensajesDe(
        archivo as string,
        enUnaPantalla(basename(archivo as string)),
        eslintConLasOpcionales,
      );

      expect(
        mensajes,
        `ESLint no senalo la muestra de «${clave}» con la regla encendida.\n` +
          `Se esperaba:\n  ${message}\n` +
          `Se obtuvo:\n${mensajes.length === 0 ? '  (ninguno)' : mensajes.map((m) => `  · ${m}`).join('\n')}`,
      ).toContain(message);
    },
  );

  it('cada regla opcional tiene al menos una prohibicion que la sirve', () => {
    const servidas = new Set(PROHIBICIONES_OPCIONALES.map((p) => p.regla));
    expect(
      REGLAS_OPCIONALES.filter((regla) => !servidas.has(regla)),
      'Hay reglas opcionales que ninguna prohibicion expresa. Una regla que solo vive en un\n' +
        'documento se incumple en seis meses, tambien cuando es opcional.',
    ).toEqual([]);
  });

  it('ninguna prohibicion opcional sirve a una regla que nadie declaro', () => {
    expect(
      PROHIBICIONES_OPCIONALES.filter((p) => !REGLAS_OPCIONALES.includes(p.regla)).map(
        (p) => `${p.clave} -> ${p.regla}`,
      ),
      'Una prohibicion opcional se declara tambien en REGLAS_OPCIONALES: si no, borrarla se\n' +
        'llevaria su prueba por delante y nadie lo notaria.',
    ).toEqual([]);
  });

  it('y las dos listas de reglas no se mezclan', () => {
    // `REGLAS_EXIGIDAS` es lo que se le EXIGE a los cinco sistemas. Una regla opcional colada ahi
    // diria lo contrario de lo que este issue midio, y pondria rojo a `rentas` por la puerta de
    // atras: su prueba compara `REGLAS_EXIGIDAS` campo a campo y exige muestra por clave.
    expect(REGLAS_EXIGIDAS.filter((regla) => REGLAS_OPCIONALES.includes(regla))).toEqual([]);
    const claves = new Set(PROHIBICIONES.map((p) => p.clave));
    expect(PROHIBICIONES_OPCIONALES.filter((p) => claves.has(p.clave)).map((p) => p.clave)).toEqual(
      [],
    );
  });
});

/**
 * **LA MISMA LINEA, EN LOS DOS SENTIDOS.**
 *
 * `export const alicuotaPredial = '0.006';` es el ejemplo de codigo CORRECTO de «el codigo que las
 * respeta pasa limpio», aqui y en `rentas`. Y es la linea que la V6 de `normativa` escribia como su
 * diferencia con `rentas`: «la linea que en rentas pasa limpia, aqui es roja». Las dos cosas son
 * ciertas a la vez, y esto es lo que lo demuestra — es tambien el motivo entero por el que la
 * opcional no puede entrar en `PROHIBICIONES`.
 */
describe('la linea que en `rentas` pasa limpia y en `normativa` es roja', () => {
  const LINEA = "export const alicuotaPredial = '0.006';\n";

  it('con las nueve del producto, limpia', async () => {
    expect(await mensajesDelTexto(LINEA, enUnaPantalla('alicuota.ts'))).toEqual([]);
  });

  it('con la opcional encendida, roja', async () => {
    expect(
      (await mensajesDelTexto(LINEA, enUnaPantalla('alicuota.ts'), eslintConLasOpcionales)).join(
        '\n',
      ),
    ).toMatch(/Ninguna cifra tributaria literal/);
  });
});

describe('la opcional caza las cinco formas, y NO el resto', () => {
  /**
   * Las cinco formas de la muestra, una a una y no en bloque.
   *
   * **En bloque no serviria**: la comprobacion de arriba usa `toContain`, asi que con que UNA de
   * las cinco siga senalada la muestra pasa en verde — y quitar del selector la forma en cadena, o
   * una de las cuatro ataduras, no daria rojo en ningun sitio. Aqui cada forma se juzga sola, que
   * es lo que pone en rojo a la que se caiga.
   */
  const FORMAS = {
    'numero en una constante': 'export const uit = 5500;\n',
    'CADENA en una constante': "export const alicuotaPredial = '0.006';\n",
    'propiedad de un objeto': 'export const TRAMOS = { tramo1: 0.002 };\n',
    'propiedad de una clase': "export class Cuadro { readonly valorUnitarioC3 = '412.88'; }\n",
    'valor por omision de un parametro':
      'export const depreciar = (v: string, depreciacion = 0.05) => `${v} ${depreciacion}`;\n',
  };

  it.each(Object.entries(FORMAS))('%s', async (forma, codigo) => {
    expect(
      (await mensajesDelTexto(codigo, enUnaPantalla('forma.ts'), eslintConLasOpcionales)).join('\n'),
      `La forma «${forma}» de la muestra dejo de estar senalada: se cayo del selector una\n` +
        'atadura o una de las dos formas del literal, y esa forma de esconder una cifra\n' +
        'normativa vuelve a pasar en verde.',
    ).toMatch(/Ninguna cifra tributaria literal/);
  });

  it('caza tambien el numero, no solo el texto', async () => {
    expect(
      (
        await mensajesDelTexto(
          'export const uit = 5500;\n',
          enUnaPantalla('uit.ts'),
          eslintConLasOpcionales,
        )
      ).join('\n'),
    ).toMatch(/Ninguna cifra tributaria literal/);
  });

  it('pero NO senala un numero que no es una cifra normativa', async () => {
    // **Es la mitad que hace util a la otra.** Una prohibicion sobre literales numericos que
    // senalara todos los literales numericos se desactivaria el primer dia. Lo que la hace
    // aplicable es que mire el NOMBRE al que la cifra queda atada.
    expect(
      await mensajesDelTexto(
        'export const filasPorPagina = 50;\nexport const ejercicioPorOmision = 2026;\n',
        enUnaPantalla('paginacion.ts'),
        eslintConLasOpcionales,
      ),
      'Si un contador de filas queda senalado, la regla ya no distingue una cifra normativa\n' +
        'de cualquier numero — que es indistinguible de no distinguir nada.',
    ).toEqual([]);
  });

  it('y no senala la cifra que se PIDE, que es la forma correcta de tenerla', async () => {
    const correcto = `
      export function uitDelEjercicio(conjunto: { uit: string }) {
        return conjunto.uit;
      }
    `;

    expect(
      await mensajesDelTexto(correcto, enUnaPantalla('conjunto.ts'), eslintConLasOpcionales),
    ).toEqual([]);
  });
});

/**
 * **LOS NOMBRES DE IMPORTE SON LOS DEL PRODUCTO** (#58).
 *
 * Hasta #58 `CAMPOS_DE_DINERO` era el vocabulario de una ventanilla que cobra, y `uit`, `alicuota`,
 * `arancel` o `valorUnitario` pasaban sin vigilar en los cinco sistemas. Cada nombre de la union se
 * ejerce por los dos lados —`number` rojo, `string` limpio—, que es lo unico que impide que alguien
 * lo borre del selector sin que nada se ponga rojo.
 */
describe('los nombres de importe del producto, uno a uno', () => {
  const NOMBRES_NUEVOS = [
    'uit',
    'alicuota',
    'arancel',
    'valorUnitario',
    'valorArancelario',
    'valorReferencial',
    'valorNumerico',
    'valorM2',
    'deduccion',
    'depreciacion',
    'reajuste',
    'baseImponible',
  ];

  it.each(NOMBRES_NUEVOS)('«%s» declarado number sale rojo', async (nombre) => {
    const mal = `export interface Fila { readonly ${nombre}: number }\n`;

    expect(
      (await mensajesDelTexto(mal, enUnaPantalla(`${nombre}.ts`))).join('\n'),
      `«${nombre}» salio de la union de CAMPOS_DE_DINERO: es un campo de dinero sin vigilar,\n` +
        'y no hay rojo en ningun otro sitio que lo diga.',
    ).toMatch(/Un importe se declara «string»/);
  });

  it.each(NOMBRES_NUEVOS)('«%s» declarado string pasa limpio', async (nombre) => {
    const bien = `export interface Fila { readonly ${nombre}: string }\n`;
    expect(await mensajesDelTexto(bien, enUnaPantalla(`${nombre}-bien.ts`))).toEqual([]);
  });

  it('un `reduce` sobre los parametros del conjunto sale rojo', async () => {
    // Un conjunto sellado de `normativa` es una lista de parametros: sumarla en la pantalla
    // compone una cifra que nadie sello.
    const mal = `
      export const junta = (c: { parametros: readonly { clave: string }[] }) =>
        c.parametros.reduce((a, p) => a + p.clave, '');
    `;

    expect((await mensajesDelTexto(mal, enUnaPantalla('conjunto.ts'))).join('\n')).toMatch(
      /Aritmetica con un importe/,
    );
  });
});

/**
 * **LO QUE LA UNION DEJA FUERA, Y POR QUE.**
 *
 * Los tres casos de abajo son codigo REAL —dos de este arbol y de `catastro`, uno de la V6— que se
 * pondria rojo si `valor`, `porcentaje` o `tramos` entraran en las listas. Una prohibicion que
 * senala codigo correcto se desactiva, y una regla desactivada no protege nada: por eso los tres
 * se quedan fuera y por eso hace falta esto, que es lo que lo dice el dia que alguien los anada.
 */
describe('lo que la union deja fuera, medido en codigo que existe', () => {
  it('«valor» a secas: en `catastro` es el numero de una columna', async () => {
    // Dos sitios, los dos `readonly valor: number` y ninguno dinero:
    // `catastro:src/pantallas/piezas/columnas-de-la-respuesta.tsx:42` —«la columna del valor de
    // cada casilla»— y `…/opciones-de-una-lectura.tsx:33`. Y en este mismo arbol,
    // `paquetes/ui/shadcn/avance.tsx:24` declara `valor: number | null`: el avance de 0 a 100.
    const columnas = `
      export interface AjustesDeColumnas {
        readonly columnasPor: number;
        readonly valor: number;
      }
    `;

    expect(
      await mensajesDelTexto(columnas, enUnaPantalla('columnas-de-la-respuesta.ts')),
      '`valor` a secas entro en CAMPOS_DE_DINERO y pone rojo a `catastro` por el numero de una\n' +
        'columna. Los tres cuadros de ADR-0017 entran CON APELLIDO: `valorUnitario`,\n' +
        '`valorArancelario`, `valorReferencial`, `valorNumerico`, `valorM2`.',
    ).toEqual([]);
  });

  it('«porcentaje» a secas: en `catastro` es el indice de una columna', async () => {
    // `catastro:src/pantallas/piezas/avance-por-fila.tsx:37`.
    const columnas = `
      export interface Columnas {
        readonly rotulo: number;
        readonly porcentaje: number;
        readonly hechos: number;
      }
    `;

    expect(
      await mensajesDelTexto(columnas, enUnaPantalla('columnas.ts')),
      '`porcentaje` a secas entro en CAMPOS_DE_DINERO y pone rojo a `catastro` por un indice\n' +
        'de columna. Entra con apellido: `porcentajeDeActualizacion`.',
    ).toEqual([]);
  });

  it('un `reduce` sobre los tramos del codigo catastral suma digitos, no dinero', async () => {
    // `catastro:src/pantallas/piezas/codigo-por-tramos.tsx:87`.
    const largo = `
      export const largo = (ajustes: { tramos: readonly { digitos: number }[] }) =>
        ajustes.tramos.reduce((suma, t) => suma + t.digitos, 0);
    `;

    expect(
      await mensajesDelTexto(largo, enUnaPantalla('codigo-por-tramos.ts')),
      '`tramos` entro en la lista de `reduce` y pone rojo a `catastro` por sumar longitudes.\n' +
        'Lo peligroso —clavar el tramo del predial— lo caza la opcional, con `tramo` en\n' +
        'CIFRAS_NORMATIVAS.',
    ).toEqual([]);
  });
});

describe('las excepciones son exactamente las declaradas, y son dos', () => {
  const conExcepcion = PROHIBICIONES.filter((p) => p.salvo !== undefined);

  /**
   * El archivo que se juzga dentro de cada directorio exceptuado. En la puerta es `identidad.ts`,
   * y no uno cualquiera, porque dentro de `paquetes/sesion/` la excepcion vale solo para el (#122).
   */
  const ARCHIVO_EXCEPTUADO: Readonly<Record<string, string>> = {
    [PUERTA_DE_IDENTIDAD]: 'identidad.ts',
  };

  it('solo `fetch` esta exceptuado, y solo en los dos sitios declarados', () => {
    // Se comprueba la LISTA ENTERA, no su tamano. Y son dos desde #4: el cliente HTTP y la
    // puerta de identidad. El canje PKCE no puede pasar por «solicitar» —va a Keycloak, con
    // otro tipo de contenido, sin token y sin `problem+json`—, y mientras las dos piezas
    // vivieron en el mismo `src/api/` de `rentas` una sola excepcion las cubria y esto no se
    // veia. Lo destapo la prohibicion al mudarse, con un rojo en `identidad.ts:282`.
    expect(conExcepcion.map((p) => p.clave)).toEqual(['fetch-fuera-del-cliente']);
    expect(new Set(conExcepcion.flatMap((p) => p.salvo))).toEqual(new Set(DONDE_SE_LLAMA_A_FETCH));
    expect(DONDE_SE_LLAMA_A_FETCH).toHaveLength(2);
  });

  it.each(
    PROHIBICIONES.filter((p) => p.salvo !== undefined).flatMap((p) =>
      [...(p.salvo ?? [])].map((directorio: string) => ({
        clave: p.clave,
        message: p.message,
        directorio,
      })),
    ),
  )('«$clave» no se senala dentro de $directorio', async ({ clave, message, directorio }) => {
    const archivo = archivoDeLaMuestra(clave);
    const mensajes = await mensajesDe(
      archivo as string,
      join(RAIZ, directorio, ARCHIVO_EXCEPTUADO[directorio] ?? 'x.ts'),
    );

    expect(mensajes).not.toContain(message);
  });

  it('dentro de la puerta, `fetch` solo pasa en identidad.ts: en sus piezas sale rojo (#122)', async () => {
    // La excepcion es el DIRECTORIO `paquetes/sesion/`, y no cambia —los consumidores la situan en
    // su arbol—, pero el sitio legitimo es un archivo. Desde que la puerta se partio en `pkce.ts` y
    // `rebote.ts`, un `fetch` en una pieza pasaba el lint: medido, RC=0. Lo cierra un bloque de
    // `eslint.config.js` que devuelve la prohibicion al resto del directorio.
    for (const pieza of ['rebote.ts', 'pkce.ts', 'escalera.ts', 'pieza-nueva.ts']) {
      const mensajes = await mensajesDe(
        archivoDeLaMuestra('fetch-fuera-del-cliente') as string,
        join(RAIZ, PUERTA_DE_IDENTIDAD, pieza),
      );

      expect(mensajes.join('\n'), `${pieza} admite un fetch`).toMatch(
        /Las peticiones pasan por «solicitar»/,
      );
    }
  });

  it.each([
    "export const sondear = (): Promise<Response> => globalThis.fetch('/x');",
    "export const sondear = (): Promise<Response> => window.fetch('/x');",
    "export const sondear = (): Promise<Response> => globalThis['fetch']('/x');",
    "export const sondear = (): Promise<Response> => fetch.call(globalThis, '/x');",
    "const pedir = fetch;\nexport const sondear = (): Promise<Response> => pedir('/x');",
    'export const crear = (pedir: typeof fetch) => pedir;',
  ])('y tampoco escrito de otra forma: %s (#122)', async (codigo) => {
    // El selector de `PROHIBICIONES` solo ve la llamada desnuda. Medido: `globalThis.fetch('/x')`
    // al final de `rebote.ts` daba `eslint` sin salida y RC=0. Dentro de la puerta se prohibe el
    // NOMBRE, que es lo que tienen en comun las seis formas; la ultima es el puerto con forma de
    // `fetch` que el issue descarta.
    const mensajes = await mensajesDelTexto(codigo, join(RAIZ, PUERTA_DE_IDENTIDAD, 'rebote.ts'));

    expect(mensajes.join('\n')).toMatch(/Las peticiones pasan por «solicitar»/);
  });

  it('pero fuera de ellos, si', async () => {
    const mensajes = await mensajesDe(
      archivoDeLaMuestra('fetch-fuera-del-cliente') as string,
      enUnaPantalla('cualquiera.ts'),
    );

    expect(mensajes.join('\n')).toMatch(/Las peticiones pasan por «solicitar»/);
  });

  it('y el cliente de API no queda exento de TODO: solo de su excepcion', async () => {
    // Que `paquetes/api/` pueda llamar a `fetch` no lo pone fuera del idioma ni de la regla 2.
    const mensajes = await mensajesDe(
      archivoDeLaMuestra('municipalidad-en-el-cliente') as string,
      join(RAIZ, CLIENTE_DE_API, 'x.ts'),
    );

    expect(mensajes.join('\n')).toMatch(/jamas envia municipalidadId/);
  });
});

describe('las reglas no senalan codigo correcto', () => {
  it('los dos contadores del envoltorio de paginacion se declaran «number», y pasan', async () => {
    // `totalElementos` y `totalPaginas` son cuentas de cosas, no de dinero: el backend los
    // publica como `entero` en las mas de sesenta operaciones paginadas. Si la prohibicion los
    // senalara, toda pantalla con una tabla arrancaria con dos `eslint-disable` — y una regla
    // que se desactiva por costumbre deja de proteger a la tercera vez.
    const envoltorio = `
      export interface Pagina<T> {
        readonly contenido: readonly T[];
        readonly pagina: number;
        readonly tamano: number;
        readonly totalElementos: number;
        readonly totalPaginas: number;
        readonly hayMas: boolean;
      }
    `;

    const [resultado] = await eslint.lintText(envoltorio, {
      filePath: enUnaPantalla('paginacion.ts'),
    });

    expect(resultado?.messages ?? []).toEqual([]);
  });

  it('pero el resto de «total…» sigue prohibido: la excepcion no se derrama', async () => {
    const conDinero = `
      export interface Liquidacion {
        readonly totalAPagar: number;
      }
    `;

    const [resultado] = await eslint.lintText(conDinero, {
      filePath: enUnaPantalla('liquidacion.ts'),
    });

    expect((resultado?.messages ?? []).map((m) => m.message).join('\n')).toMatch(
      /Un importe se declara «string»/,
    );
  });

  it('el codigo que las respeta pasa limpio', async () => {
    const correcto = `
      import { solicitar } from '../api/cliente.ts';

      export interface CuentaCorriente {
        readonly total: string;
        readonly fechaCalculo: string;
      }

      export const alicuotaPredial = '0.006';

      export function cuentaDe(contribuyente: string) {
        // El total llega calculado del backend, con su fecha: aqui solo se pide.
        return solicitar<CuentaCorriente>(\`/contribuyentes/\${contribuyente}/cuenta\`);
      }
    `;

    const [resultado] = await eslint.lintText(correcto, {
      filePath: enUnaPantalla('correcto.ts'),
    });

    expect(resultado?.messages ?? []).toEqual([]);
  });

  it('un «Importe» CON su fecha de calculo pasa limpio', async () => {
    // **Esta es la mitad que faltaba, y hacia falta.** La muestra de
    // `importe-sin-fecha` escribe `<Importe valor="…" />` SIN un solo atributo, asi que
    // un selector que buscara cualquier otro nombre —`fechaDeCalculo` en vez de
    // `fechaCalculo`— la seguiria senalando igual y la prohibicion pasaria en VERDE
    // habiendo dejado de proteger nada. Se comprobo: renombrar el atributo dentro del
    // selector dejaba las 17 pruebas en verde. Lo que lo caza es el caso positivo.
    const correcto = `
      import { Importe } from '../ds/index.ts';

      export function FilaDeCuentaCorriente() {
        return <Importe valor="1842.60" fechaCalculo="2026-09-06" />;
      }
    `;

    const [resultado] = await eslint.lintText(correcto, {
      filePath: enUnaPantalla('correcto.tsx'),
    });

    expect(
      (resultado?.messages ?? []).map((m) => m.message),
      'Un `<Importe>` que SI declara su fecha no puede estar senalado: si lo esta, el\n' +
        'selector ya no busca el atributo que dice buscar, y entonces la prohibicion\n' +
        'senala a todo el mundo — que es indistinguible de no senalar a nadie.',
    ).toEqual([]);
  });
});

/**
 * **LA EXHAUSTIVIDAD DE UN `switch`, EN EL LINT DE ESTE REPOSITORIO** (#111).
 *
 * `@typescript-eslint/switch-exhaustiveness-check` no es una prohibicion de `PROHIBICIONES` —es una
 * regla con tipos, y alli solo caben selectores; y una clave nueva ahi es un cambio coordinado en
 * cinco repositorios, como el XHR—: vive en un bloque propio de `eslint.config.js`. Que viva aparte
 * no la exime de su muestra, y aqui se juzga contra el **mismo** linter del arbol, el que corre
 * `yarn lint`.
 *
 * Van las dos mitades: la muestra senalada, y la misma muestra con el `case` que le faltaba, limpia.
 * Sin la segunda, una regla que senalara todos los `switch` tambien «morderia».
 */
describe('la exhaustividad de un switch la senala el lint (#111)', () => {
  /** La muestra en su ruta de VERDAD: el servicio de proyectos no tipa una ruta que no existe. */
  const RUTA = 'paquetes/verificaciones/muestras/switch-sin-agotar.ts';

  /**
   * El config del arbol entero —el bloque con tipos incluido—, con dos cosas mas y solo dos:
   * `ignore: false`, porque `muestras/` esta en los `ignores`; y la muestra en `allowDefaultProject`,
   * porque `tsconfig.json` la excluye. El proyecto por omision toma las opciones de ese mismo
   * `tsconfig.json`, asi que los tipos son los del arbol.
   */
  const eslintConTipos = new ESLint({
    cwd: RAIZ,
    ignore: false,
    overrideConfig: {
      languageOptions: {
        parserOptions: { projectService: { allowDefaultProject: [RUTA], defaultProject: 'tsconfig.json' } },
      },
    },
  });

  const deLaRegla = async (codigo: string): Promise<string[]> => {
    const [resultado] = await eslintConTipos.lintText(codigo, { filePath: join(RAIZ, RUTA) });
    const mensajes = resultado?.messages ?? [];
    // Un error de analisis no es un verde: si el servicio de proyectos no encuentra la muestra, la
    // regla no llega a mirarla y la mitad «limpia» pasaria sin haber juzgado nada.
    expect(mensajes.filter((m) => m.fatal === true).map((m) => m.message)).toEqual([]);
    return mensajes.filter((m) => m.ruleId === REGLA_CON_TIPOS).map((m) => m.message);
  };

  const muestra = (): string => readFileSync(join(RAIZ, RUTA), 'utf8');

  // El arranque del servicio de proyectos, fuera del presupuesto de un caso, por lo mismo que el
  // `beforeAll` de arriba (#36): medido, el primer caso con tipos costaba 3,1 s en frio, y los
  // siguientes, 20 ms. Dentro del caso, una maquina cargada lo pondria en rojo por la maquina.
  beforeAll(async () => {
    await eslintConTipos.lintText(muestra(), { filePath: join(RAIZ, RUTA) });
  }, 60_000);

  it('la muestra —una rama sin `case` en una funcion que no devuelve nada— sale senalada', async () => {
    expect(
      (await deLaRegla(muestra())).join('\n'),
      `ESLint no senalo la muestra de «${REGLA_CON_TIPOS}». Si la regla se apago o perdio los\n` +
        'tipos (`projectService`), un `switch` al que le falta una clase vuelve a pasar en verde.',
    ).toMatch(/"guarda"/);
  });

  it('y con el `case` que le faltaba, limpia', async () => {
    const agotada = muestra().replace(
      "      hechas.push('hace');\n      return;\n",
      "      hechas.push('hace');\n      return;\n    case 'guarda':\n      hechas.push('guarda');\n      return;\n",
    );
    expect(agotada, 'La muestra cambio de forma: el reemplazo no encontro su `case`.').toContain("case 'guarda'");
    expect(await deLaRegla(agotada)).toEqual([]);
  });

  it('con un `default` que no agota nada, sigue senalada', async () => {
    // `considerDefaultExhaustiveForUnions: false` es lo que el config fija a proposito, y la muestra
    // sin `default` no lo vigilaba: medido en la revision de #111, con `true` estas pruebas seguian
    // verdes y un `default` sin la asignacion a `never` daba por agotada una octava clase de pieza.
    const conDefault = muestra().replace(
      "      hechas.push('hace');\n      return;\n  }\n",
      "      hechas.push('hace');\n      return;\n    default:\n      return;\n  }\n",
    );
    expect(conDefault, 'La muestra cambio de forma: el reemplazo no encontro su final.').toContain('default:');
    expect(
      (await deLaRegla(conDefault)).join('\n'),
      'Un `default` dio por agotada la union: `considerDefaultExhaustiveForUnions` ya no es `false`.',
    ).toMatch(/"guarda"/);
  });

  /**
   * Los archivos donde viven los `switch` del interprete, `.ts` y `.tsx`. La muestra es un `.ts`, y
   * con ella sola un `files` estrechado —a `*.ts`, o a `verificaciones/`— la seguia senalando y dejaba
   * sin mirar `pulsar`, en `GrupoDeAcciones.tsx`, que es justo el caso que el compilador no ve
   * (medido en la revision de #111: con `paquetes/**\/*.ts`, las 68 verdes y `yarn lint` RC=0).
   */
  const DONDE_HAY_UN_SWITCH = [
    'paquetes/ui/interprete/GrupoDeAcciones.tsx',
    'paquetes/ui/interprete/acciones.ts',
    'paquetes/ui/interprete/CampoDelBloque.tsx',
    'paquetes/ui/interprete/EstadoDeLaLectura.tsx',
    'paquetes/ui/interprete/PiezaDeLaPantalla.tsx',
  ];

  it.each(DONDE_HAY_UN_SWITCH)('el lint del arbol la aplica, con tipos, en %s', async (archivo) => {
    // El config SIN ningun `overrideConfig`: el mismo que corre `yarn lint`.
    const config = (await new ESLint({ cwd: RAIZ }).calculateConfigForFile(join(RAIZ, archivo))) as {
      rules?: Record<string, unknown>;
      languageOptions?: { parserOptions?: { projectService?: unknown } };
    };
    const regla = config.rules?.[REGLA_CON_TIPOS];
    expect(regla, `${archivo} no esta en el bloque de «${REGLA_CON_TIPOS}».`).toBeDefined();
    expect([2, 'error']).toContain(Array.isArray(regla) ? regla[0] : regla);
    expect(config.languageOptions?.parserOptions?.projectService, 'Sin tipos, la regla no ve la union.').toBeTruthy();
  });

  it('no es una prohibicion: no se le exige a ningun consumidor', () => {
    // Si alguien la mudara a `PROHIBICIONES`, los cinco sistemas saldrian rojos pidiendo su muestra.
    expect(PROHIBICIONES.map((p) => p.clave)).not.toContain('switch-sin-agotar');
  });
});
