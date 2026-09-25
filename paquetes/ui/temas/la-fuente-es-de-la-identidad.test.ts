// @vitest-environment node
//
// Compila CSS de verdad y lee archivos del disco. El DOM se fabrica a mano con `JSDOM`, como en
// `shadcn/calendario.test.tsx`: en el entorno `jsdom` de vitest `import.meta.url` no es un `file:`.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from 'tailwindcss';
import { beforeAll, describe, expect, it } from 'vitest';

import { sinComentariosCss } from './base.ts';

/**
 * **La fuente es de la identidad: `clasico` pinta en Arial y las otras tres no cambian** (#56).
 *
 * <h2>Que se mide, y por que no basta con leer `temas.css`</h2>
 *
 * Que `temas.css` escriba `--font-sans: Arial…` dentro de `[data-tema='clasico']` no dice que el
 * documento se pinte en Arial. Entre esa linea y la letra hay tres saltos, y cualquiera se puede
 * romper sin tocarla: el preflight de Tailwind pinta `html` con `var(--default-font-family, …)`,
 * el `@theme` define `--default-font-family: var(--font-sans)` en `:root` DENTRO de
 * `@layer theme`, y la de `clasico` entra SIN capa. Si Tailwind renombrase la variable, si el
 * bloque cayera dentro de una capa posterior o si el selector dejara de casar con `<html>`, el
 * archivo seguiria perfecto y la pantalla seguiria en la fuente del sistema.
 *
 * Asi que se mide **el valor que la cascada le da a `font-family` en `<html>`**, sobre el CSS que
 * el consumidor recibe —la hoja publicada, compilada como la compila Vite— y con `var()` resuelto.
 *
 * <h2>Por que la cascada se resuelve aqui y no la resuelve `jsdom`</h2>
 *
 * Porque `jsdom` no sabe hacerlo, y esta medido: con `@layer theme { :root { --font-sans: … } }`
 * su `getComputedStyle` no ve la variable —no entiende `@layer`— y `font-family` sale `""` para
 * cualquier tema, porque no resuelve `var()`. Una guarda sobre eso saldria verde o roja por
 * razones que no son la fuente.
 *
 * Lo que se escribe aqui es **solo lo que decide este caso**, y cada pieza tiene su centinela
 * contra CSS escrito a mano: capas (lo no encapado gana; entre capas, la ultima declarada),
 * especificidad, orden, `@media` que casa o no, y `var()` con su reserva. Casar un selector con el
 * elemento NO se reescribe: es `Element.matches` de `jsdom`. Lo que queda fuera, dicho: `!important`
 * (si aparece en una propiedad que se consulta, revienta en vez de ignorarlo) y `@supports`, cuyas
 * reglas no se aplican — en la hoja emitida solo declaran variables `--tw-*`.
 *
 * <h2>Y medido en un navegador de verdad, una vez</h2>
 *
 * La misma hoja compilada con `bg-fondo`, abierta en Chrome for Testing 153 sin cabeza, da
 * `getComputedStyle(document.documentElement).fontFamily === 'Arial, Helvetica, sans-serif'` con
 * `<html data-tema="clasico">` —y lo mismo con `data-modo="oscuro"`, y en un `<p>` que lo hereda—,
 * y con `institucional` o `sepia` la pila de Tailwind, que empieza por `-apple-system`. Esta guarda
 * es la que se queda en CI; aquella medida esta en el PR de #56.
 */

const requerir = createRequire(import.meta.url);
const { JSDOM } = requerir('jsdom') as {
  JSDOM: new (html: string) => { readonly window: { readonly document: Document } };
};

const RAIZ_DE_UI = fileURLToPath(new URL('..', import.meta.url));

/** La hoja que `package.json` publica como `@kamayuk/ui/estilos.css`, compilada como la compila Vite. */
async function compilarLaHojaPublicada(clases: readonly string[]): Promise<string> {
  const manifiesto = JSON.parse(readFileSync(join(RAIZ_DE_UI, 'package.json'), 'utf8')) as {
    exports: Record<string, string>;
  };
  const hoja = resolve(RAIZ_DE_UI, manifiesto.exports['./estilos.css'] ?? '');
  const compilado = await compile(readFileSync(hoja, 'utf8'), {
    base: dirname(hoja),
    loadStylesheet: (id: string, desde: string) => {
      const ruta = id === 'tailwindcss' ? requerir.resolve('tailwindcss/index.css') : join(desde, id);
      return Promise.resolve({ path: ruta, base: dirname(ruta), content: readFileSync(ruta, 'utf8') });
    },
  });
  return compilado.build([...clases]);
}

// ============================================================================================
// LA CASCADA, LO JUSTO
// ============================================================================================

interface Declaracion {
  readonly propiedad: string;
  readonly valor: string;
  readonly importante: boolean;
}

interface Regla {
  readonly selector: string;
  readonly declaraciones: readonly Declaracion[];
  /** La capa, o `null` si la regla no esta en ninguna. */
  readonly capa: string | null;
  /** Los preludios de los `@media` que la envuelven, tal cual. */
  readonly medios: readonly string[];
  /** Si algun `@supports` la envuelve. */
  readonly condicionada: boolean;
}

/** Parte por las comas de primer nivel: `:is(a, b), c` son dos, no tres. */
function partirPorComas(texto: string): string[] {
  const partes: string[] = [];
  let profundidad = 0;
  let actual = '';
  for (const caracter of texto) {
    if (caracter === '(') profundidad++;
    if (caracter === ')') profundidad--;
    if (caracter === ',' && profundidad === 0) {
      partes.push(actual.trim());
      actual = '';
      continue;
    }
    actual += caracter;
  }
  if (actual.trim() !== '') partes.push(actual.trim());
  return partes;
}

function declaracionesDe(cuerpo: string): Declaracion[] {
  return cuerpo
    .split(';')
    .map((trozo) => trozo.trim())
    .filter((trozo) => trozo.includes(':'))
    .map((trozo) => {
      const dosPuntos = trozo.indexOf(':');
      const crudo = trozo.slice(dosPuntos + 1).trim();
      const importante = /!important\s*$/i.test(crudo);
      return {
        propiedad: trozo.slice(0, dosPuntos).trim(),
        valor: crudo.replace(/!important\s*$/i, '').trim(),
        importante,
      };
    });
}

/** Las reglas de estilo de una hoja, con su capa y sus condiciones, y el orden de las capas. */
function leerLaHoja(css: string): { reglas: Regla[]; capas: string[] } {
  const texto = sinComentariosCss(css);
  const reglas: Regla[] = [];
  const capas: string[] = [];
  const anotarCapa = (nombre: string): void => {
    if (!capas.includes(nombre)) capas.push(nombre);
  };

  interface Contexto {
    readonly preludio: string;
    cuerpo: string;
  }
  const pila: Contexto[] = [];
  let preludio = '';

  for (const caracter of texto) {
    if (caracter === '{') {
      const abierto = preludio.trim();
      // La capa se anota al ABRIRSE, y con eso el orden de `capas` es el de primera aparicion,
      // que es el que la cascada usa.
      if (abierto.startsWith('@layer')) anotarCapa(abierto.replace(/^@layer\s+/, '').trim());
      pila.push({ preludio: abierto, cuerpo: '' });
      preludio = '';
      continue;
    }
    if (caracter === '}') {
      // Lo que quedo sin `;` antes de la llave es la ultima declaracion del bloque.
      const cerrado = pila.pop();
      if (cerrado === undefined) continue;
      cerrado.cuerpo += preludio;
      preludio = '';
      if (cerrado.preludio.startsWith('@')) continue;
      const envolventes = pila.map((c) => c.preludio);
      const capasEnvolventes = envolventes
        .filter((p) => p.startsWith('@layer'))
        .map((p) => p.replace(/^@layer\s+/, '').trim());
      if (capasEnvolventes.length > 1) {
        // La hoja emitida no las tiene; si un dia las trae, esta cascada no sabe ordenarlas y lo
        // dice, en vez de ordenar mal en silencio.
        throw new Error(`«${cerrado.preludio}» esta dentro de capas anidadas, y esta cascada no las ordena.`);
      }
      reglas.push({
        selector: cerrado.preludio,
        declaraciones: declaracionesDe(cerrado.cuerpo),
        capa: capasEnvolventes[0] ?? null,
        medios: envolventes.filter((p) => p.startsWith('@media')),
        condicionada: envolventes.some((p) => p.startsWith('@supports')),
      });
      continue;
    }
    if (caracter === ';') {
      const sentencia = preludio.trim();
      if (sentencia.startsWith('@layer')) {
        // `@layer theme, base, components, utilities;`: fija el orden antes de que aparezcan.
        for (const nombre of partirPorComas(sentencia.replace(/^@layer\s+/, ''))) anotarCapa(nombre);
        preludio = '';
        continue;
      }
      const dentro = pila[pila.length - 1];
      if (dentro !== undefined) dentro.cuerpo += `${preludio};`;
      preludio = '';
      continue;
    }
    preludio += caracter;
  }
  return { reglas, capas };
}

/** Orden lexicografico descendente de dos tuplas de numeros de la misma longitud. */
function deMayorAMenor(x: readonly number[], y: readonly number[]): number {
  const i = x.findIndex((v, j) => v !== y[j]);
  return i < 0 ? 0 : (y[i] ?? 0) - (x[i] ?? 0);
}

/** La especificidad `(a, b, c)` de un selector simple o compuesto, sin comas. */
function especificidad(selector: string): [number, number, number] {
  let a = 0;
  let b = 0;
  let c = 0;
  let resto = selector;
  // Las pseudoclases con lista dentro: `:where()` no suma, `:not()`/`:is()`/`:has()` suman la mayor.
  resto = resto.replace(/:(where|not|is|has)\(((?:[^()]|\([^()]*\))*)\)/g, (_, nombre: string, dentro: string) => {
    if (nombre !== 'where') {
      const mayor = partirPorComas(dentro)
        .map(especificidad)
        .sort(deMayorAMenor)[0] ?? [0, 0, 0];
      a += mayor[0];
      b += mayor[1];
      c += mayor[2];
    }
    return ' ';
  });
  resto = resto.replace(/\[[^\]]*\]/g, () => {
    b++;
    return ' ';
  });
  resto = resto.replace(/::[a-z-]+(\([^)]*\))?/gi, () => {
    c++;
    return ' ';
  });
  resto = resto.replace(/:[a-z-]+(\([^)]*\))?/gi, () => {
    b++;
    return ' ';
  });
  resto = resto.replace(/#[\w-]+/g, () => {
    a++;
    return ' ';
  });
  resto = resto.replace(/\.[\w\\:-]+/g, () => {
    b++;
    return ' ';
  });
  c += (resto.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return [a, b, c];
}

const casa = (elemento: Element, selector: string): boolean => {
  try {
    return elemento.matches(selector);
  } catch {
    // `jsdom` no conoce `:host`, `::file-selector-button` ni `::-webkit-*`. Ninguno casa con `<html>`.
    return false;
  }
};

/**
 * El valor que la cascada da a `propiedad` en `elemento`, sin resolver `var()`, o `null`.
 *
 * Solo el nivel del elemento: no hay herencia, porque se consulta `<html>`, que no tiene padre.
 */
function enCascada(
  hoja: { reglas: readonly Regla[]; capas: readonly string[] },
  elemento: Element,
  propiedad: string,
  mediosQueCasan: ReadonlySet<string>,
): string | null {
  let ganador: { clave: number[]; valor: string } | null = null as { clave: number[]; valor: string } | null;
  hoja.reglas.forEach((regla, orden) => {
    if (regla.condicionada) return;
    if (!regla.medios.every((m) => mediosQueCasan.has(m))) return;
    const partes = partirPorComas(regla.selector).filter((p) => casa(elemento, p));
    if (partes.length === 0) return;
    for (const declaracion of regla.declaraciones) {
      if (declaracion.propiedad !== propiedad) continue;
      if (declaracion.importante) {
        throw new Error(
          `«${propiedad}» llega con !important en «${regla.selector}», y esta cascada no lo ordena. ` +
            'Hay que ensenarselo antes de fiarse de lo que diga.',
        );
      }
      // La especificidad de la parte MAS especifica que casa, como hace el navegador.
      const [a, b, c] = partes.map(especificidad).sort(deMayorAMenor)[0] ?? [0, 0, 0];
      // Lo no encapado gana a cualquier capa; entre capas, la declarada despues. Luego la
      // especificidad y, a igualdad, el orden: una tupla que se compara de izquierda a derecha.
      const rangoDeCapa = regla.capa === null ? hoja.capas.length : hoja.capas.indexOf(regla.capa);
      const clave = [rangoDeCapa, a, b, c, orden];
      // `orden` es distinto en cada regla, asi que dos claves nunca empatan; `<= 0` deja ganar a la
      // declaracion posterior dentro de la misma regla.
      if (ganador === null || deMayorAMenor(clave, ganador.clave) <= 0) {
        ganador = { clave, valor: declaracion.valor };
      }
    }
  });
  return ganador?.valor ?? null;
}

/** Sustituye cada `var(--x, reserva)` por el valor de `--x` en el elemento, o por su reserva. */
function resolverVariables(
  valor: string,
  buscar: (variable: string) => string | null,
  visitadas: ReadonlySet<string> = new Set(),
): string {
  const inicio = valor.indexOf('var(');
  if (inicio < 0) return valor;
  let profundidad = 0;
  let fin = inicio + 3;
  for (; fin < valor.length; fin++) {
    if (valor[fin] === '(') profundidad++;
    if (valor[fin] === ')') {
      profundidad--;
      if (profundidad === 0) break;
    }
  }
  const dentro = valor.slice(inicio + 4, fin);
  const coma = dentro.indexOf(',');
  const nombre = (coma < 0 ? dentro : dentro.slice(0, coma)).trim();
  const reserva = coma < 0 ? null : dentro.slice(coma + 1).trim();
  if (visitadas.has(nombre)) throw new Error(`«${nombre}» se refiere a si misma.`);
  const declarado = buscar(nombre);
  const sustituto =
    declarado !== null
      ? resolverVariables(declarado, buscar, new Set([...visitadas, nombre]))
      : reserva !== null
        ? resolverVariables(reserva, buscar, visitadas)
        : null;
  if (sustituto === null) throw new Error(`«${nombre}» no esta declarada y no trae reserva.`);
  return resolverVariables(`${valor.slice(0, inicio)}${sustituto}${valor.slice(fin + 1)}`, buscar, visitadas);
}

/** La `font-family` de `<html>` con estos atributos, sobre esta hoja: la cascada entera y `var()` resuelto. */
function fuenteDelDocumento(
  css: string,
  atributos: Readonly<Record<string, string>>,
  mediosQueCasan: ReadonlySet<string> = new Set(),
): string {
  const puestos = Object.entries(atributos)
    .map(([nombre, valor]) => ` ${nombre}="${valor}"`)
    .join('');
  const { document } = new JSDOM(`<!doctype html><html${puestos}><body></body></html>`).window;
  const raiz = document.documentElement;
  const hoja = leerLaHoja(css);
  const declarada = enCascada(hoja, raiz, 'font-family', mediosQueCasan);
  if (declarada === null) return '';
  const resuelta = resolverVariables(declarada, (variable) => enCascada(hoja, raiz, variable, mediosQueCasan));
  return resuelta.replace(/\s+/g, ' ').trim();
}

// ============================================================================================
// LAS PRUEBAS
// ============================================================================================

const OSCURO_DEL_EQUIPO = '@media (prefers-color-scheme: dark)';
const ARIAL = 'Arial, Helvetica, sans-serif';

describe('EL CENTINELA: la cascada de esta guarda ordena como un navegador', () => {
  it('lo no encapado gana a una capa, aunque pese menos y vaya antes', () => {
    const css = `
      [data-x] { --f: fuera; }
      @layer theme { html:root[data-x] { --f: dentro; } }
      html { font-family: var(--f); }`;
    expect(fuenteDelDocumento(css, { 'data-x': '' })).toBe('fuera');
  });

  it('entre capas gana la declarada DESPUES, aunque su bloque vaya antes', () => {
    const css = `
      @layer theme, base;
      @layer base { html { font-family: base; } }
      @layer theme { html:root { font-family: theme; } }`;
    expect(fuenteDelDocumento(css, {})).toBe('base');
  });

  it('dentro de la misma capa decide la especificidad, y a igualdad el orden', () => {
    expect(fuenteDelDocumento(':root { --f: raiz; } html { --f: html; } html { font-family: var(--f); }', {})).toBe(
      'raiz',
    );
    expect(fuenteDelDocumento('html { --f: uno; } html { --f: dos; } html { font-family: var(--f); }', {})).toBe(
      'dos',
    );
  });

  it('un `@media` solo cuenta si casa, y `var()` cae a su reserva si la variable no esta', () => {
    const css = `html { font-family: var(--f, reserva); } ${OSCURO_DEL_EQUIPO} { html { --f: oscura; } }`;
    expect(fuenteDelDocumento(css, {})).toBe('reserva');
    expect(fuenteDelDocumento(css, {}, new Set([OSCURO_DEL_EQUIPO]))).toBe('oscura');
  });

  it('y un selector que no casa con `<html>` no cuenta', () => {
    const css = `html { font-family: var(--f, nada); } [data-tema='clasico'] { --f: ${ARIAL}; }`;
    expect(fuenteDelDocumento(css, { 'data-tema': 'sepia' })).toBe('nada');
    expect(fuenteDelDocumento(css, { 'data-tema': 'clasico' })).toBe(ARIAL);
  });
});

describe('la fuente de `<html>` sobre la hoja publicada (#56)', () => {
  // `bg-fondo` y nada mas, la misma lista que `las-paletas-llegan-al-css`: la fuente no puede
  // depender de que alguien use `font-sans`, porque el preflight pinta `html` sin ninguna clase.
  let css = '';
  let deFabrica = '';
  beforeAll(async () => {
    css = await compilarLaHojaPublicada(['bg-fondo']);
    deFabrica = fuenteDelDocumento(css, {});
  });

  it('EL CENTINELA: sin identidad, la de Tailwind — que existe y no es Arial', () => {
    // Si Tailwind podara `--font-sans` o el preflight dejara de pintar `html`, esto sale vacio y
    // las de abajo compararian vacio con vacio.
    expect(deFabrica, 'la cascada no le dio ninguna `font-family` a <html>').not.toBe('');
    expect(deFabrica.startsWith('Arial'), `la fuente de fabrica ya empieza por Arial: «${deFabrica}»`).toBe(false);
  });

  it('con `data-tema="clasico"` es Arial', () => {
    expect(fuenteDelDocumento(css, { 'data-tema': 'clasico' })).toBe(ARIAL);
  });

  it('y lo sigue siendo en oscuro, por los dos caminos: la fuente es de la identidad, no del modo', () => {
    expect(fuenteDelDocumento(css, { 'data-tema': 'clasico', 'data-modo': 'oscuro' })).toBe(ARIAL);
    expect(fuenteDelDocumento(css, { 'data-tema': 'clasico' }, new Set([OSCURO_DEL_EQUIPO]))).toBe(ARIAL);
  });

  it.each(['institucional', 'alto-contraste', 'sepia'])(
    'con `data-tema="%s"` NO cambia: es la de fabrica, en claro y en oscuro',
    (identidad) => {
      expect(fuenteDelDocumento(css, { 'data-tema': identidad })).toBe(deFabrica);
      expect(fuenteDelDocumento(css, { 'data-tema': identidad, 'data-modo': 'oscuro' })).toBe(deFabrica);
      expect(fuenteDelDocumento(css, { 'data-tema': identidad }, new Set([OSCURO_DEL_EQUIPO]))).toBe(deFabrica);
    },
  );
});
