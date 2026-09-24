// @vitest-environment node
//
// Esta guarda lee el DISCO, no un DOM: el mismo motivo por el que `el-xhr-vive-en-un-solo-sitio`
// declara su entorno. En `jsdom`, `import.meta.url` no es una URL `file:` y `fileURLToPath` revienta.

import { basename, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, archivosDeProduccion, leer, sinComentarios } from '../verificaciones/texto.ts';

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
 * `subir.ts` no cuenta para el `fetch`: va por `XMLHttpRequest`, y eso lo vigila
 * `el-xhr-vive-en-un-solo-sitio`. **Pero si cuenta para lo que comparte con el cliente**, y eso lo
 * vigila el segundo bloque de este archivo: la lectura del `problem+json` y el `VERBO /ruta`.
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

/**
 * **La lectura del `problem+json` y el `VERBO /ruta` se escriben UNA vez, en `errores.ts`** (#121).
 *
 * Es lo mismo que el bloque de arriba, un piso mas abajo: `cuerpoDeProblema` y `operacionDe`
 * existen para que `cliente.ts` y `subir.ts` no tengan cada una su copia. Y una copia **con el
 * mismo cuerpo** no la ve ninguna prueba de conducta, porque se porta igual: medido en la vuelta 2
 * de los verificadores, devolverle a `subir.ts` su `problemaDelTexto` —`JSON.parse` y
 * `typeof … === 'object' && … !== null` en un `try`— o su `` `${metodo} ${ruta}` `` en linea deja
 * `tsc`, `eslint` y las 373 pruebas de `api` y `verificaciones` en verde. El dia que una de las dos
 * copias se corrija y la otra no, el mismo fallo dira dos cosas segun por que puerta entre.
 *
 * Se mira el codigo de produccion de `paquetes/api` **sin comentarios**: los docblocks nombran
 * `JSON.parse` y `` `${metodo} ${ruta}` `` para explicar por que no estan.
 */

/** Los archivos de produccion de `@kamayuk/api`, por nombre, ya sin comentarios. */
function codigoDeLaApi(): ReadonlyMap<string, string> {
  const salida = new Map<string, string>();
  for (const archivo of archivosDeProduccion(join(PAQUETES, 'api'))) {
    salida.set(basename(archivo), sinComentarios(leer(archivo)));
  }
  return salida;
}

/** El codigo sin sus `import`: nombrar una funcion al importarla no es usarla. */
function sinImports(codigo: string): string {
  return codigo.replace(/^import\b[\s\S]*?\bfrom\s*['"][^'"]+['"];?/gm, '');
}

/** Cuantas veces aparece `patron` en cada archivo que lo tiene. Los que no, no salen. */
function vecesPorArchivo(patron: RegExp): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const [nombre, codigo] of codigoDeLaApi()) {
    const veces = (codigo.match(patron) ?? []).length;
    if (veces > 0) salida[nombre] = veces;
  }
  return salida;
}

/** Un `JSON.parse(`, escrito como se escriba. */
const INTERPRETAR_JSON = /\bJSON\s*\.\s*parse\s*\(/g;

/**
 * `VERBO /ruta` compuesto a mano: una plantilla que abre con dos huecos separados por un espacio
 * —`` `${metodo} ${ruta}` ``, `` `${m} ${prefijo}${r}` ``— o una suma con `' '` en medio.
 */
const OPERACION_A_MANO = /`\$\{[^}`]*\}\s\$\{|\+\s*(['"])\s\1\s*\+/g;

describe('lo que `cliente.ts` y `subir.ts` comparten se escribe una vez, en `errores.ts`', () => {
  it('EL CENTINELA: se leen los archivos de la api, y estan los tres', () => {
    expect([...codigoDeLaApi().keys()]).toEqual(
      expect.arrayContaining(['cliente.ts', 'subir.ts', 'errores.ts']),
    );
  });

  it('`JSON.parse` sale EXACTAMENTE donde se declara: la lista entera, no la cuenta', () => {
    expect(
      vecesPorArchivo(INTERPRETAR_JSON),
      'Un `JSON.parse` de mas es, casi siempre, una segunda lectura del `problem+json`: la que\n' +
        '#121 quito de `subir.ts` (`problemaDelTexto`). El de `errores.ts` es `cuerpoDeProblema`;\n' +
        'el de `subir.ts` interpreta el cuerpo de un 2xx, que no es un problema. Si hace falta leer\n' +
        'el `problem+json` en otro sitio, se llama a `cuerpoDeProblema`.',
    ).toEqual({ 'errores.ts': 1, 'subir.ts': 1 });
  });

  it('y el de `errores.ts` es el de `cuerpoDeProblema`', () => {
    const codigo = codigoDeLaApi().get('errores.ts') ?? '';
    const inicio = codigo.search(/function\s+cuerpoDeProblema\s*\(/);
    expect(inicio, 'no se encontro `cuerpoDeProblema` en errores.ts').toBeGreaterThan(-1);
    const cuerpo = codigo.slice(inicio, codigo.indexOf('\n}', inicio));
    expect(cuerpo).toMatch(INTERPRETAR_JSON);
  });

  it.each(['cliente.ts', 'subir.ts'])('`%s` lee el `problem+json` con `cuerpoDeProblema`', (nombre) => {
    expect(sinImports(codigoDeLaApi().get(nombre) ?? '')).toMatch(/\bcuerpoDeProblema\b/);
  });

  it('`VERBO /ruta` no se compone a mano fuera de `operacionDe`', () => {
    expect(
      vecesPorArchivo(OPERACION_A_MANO),
      'La operacion se escribe con `operacionDe(metodo, ruta)`: la pantalla y `peldanoDe()` la\n' +
        'comparan, y una puerta que la escriba a su manera hace que el mismo fallo diga dos cosas.',
    ).toEqual({ 'errores.ts': 1 });
  });

  it.each(['cliente.ts', 'subir.ts'])('`%s` compone la operacion con `operacionDe`', (nombre) => {
    expect(sinImports(codigoDeLaApi().get(nombre) ?? '')).toMatch(/\boperacionDe\s*\(/);
  });
});
