// @vitest-environment node
//
// Compila CSS de verdad y lee la paleta del disco. No es un DOM lo que necesita.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

import { PAQUETES, RAIZ, archivosDe, rutaDesde } from '../../verificaciones/texto.ts';
import { apilar, contraste, ratioQueNoLlega } from '../color.ts';
import { leerLosOrigenes } from '../temas/base.ts';
import { COMBINACIONES, derivar } from '../temas/derivar.ts';
import {
  CONTORNO_DE_FOCO,
  CONTORNO_DE_FOCO_EN_LA_BARRA,
  FOCO,
  FOCO_EN_LA_BARRA,
  HALO_DE_FOCO,
  TOKEN_DEL_CONTORNO,
  TOKEN_DEL_CONTORNO_EN_LA_BARRA,
} from './foco.ts';

/**
 * **El indicador de foco se VE, en las seis combinaciones** (#37).
 *
 * <h2>Las dos mitades, y por que ninguna sola bastaba</h2>
 *
 * Hasta #37 el foco de todo lo que no es campo era el halo `--foco` y nada mas. Medido en el
 * navegador sobre «Volver» de `#coa-exp`, enfocado CON TECLADO para que `:focus-visible` aplique:
 *
 * ```
 *   institucional/claro   #d3ebfa sobre #f2f6f9 = 1.13   <- el tema y el modo por omision
 *   institucional/oscuro  #414f58 sobre #111213 = 2.22
 *   alto-contraste/claro  #43484c sobre #fafbfb = 8.92
 *   alto-contraste/oscuro #7b8186 sobre #060707 = 5.12
 *   sepia/claro           #c8b49d sobre #f7efe3 = 1.76
 *   sepia/oscuro          #614f3b sobre #1c1813 = 2.26
 * ```
 *
 * WCAG 1.4.11 pide **3:1**. Cuatro de las seis no llegaban, y quien navega con teclado —en una
 * ventanilla, la mitad del trabajo— no veia donde estaba.
 *
 * Asi que se miden **las dos mitades, y las dos hacen falta**:
 *
 *   1. Que el token del contorno llegue a 3:1 contra los dos papeles, en las seis. Si alguien
 *      apunta el contorno a un color palido, esto sale rojo nombrandolo.
 *   2. Que la clase EMITIDA pinte un contorno de verdad. Y esto se comprueba COMPILANDO, no
 *      leyendo la cadena: `outline-none` junto a `outline-2` deja una clase perfectamente escrita
 *      que **no produce ningun contorno**, porque la primera escribe `--tw-outline-style: none` y
 *      la segunda lo lee. Mirar el `className` no ve nada; el CSS emitido, si.
 */

const RAIZ_DE_LA_HOJA = fileURLToPath(new URL('../estilos/', import.meta.url));

/** Compila la hoja del paquete como la compila Vite, y emite las clases que se le pidan. */
async function emitir(clases: readonly string[]): Promise<string> {
  const hoja = readFileSync(`${RAIZ_DE_LA_HOJA}estilos.css`, 'utf8');
  const compilado = await compile(hoja, {
    base: RAIZ_DE_LA_HOJA,
    loadStylesheet: (id: string, base: string) => {
      const ruta =
        id === 'tailwindcss'
          ? fileURLToPath(new URL('../../../node_modules/tailwindcss/index.css', import.meta.url))
          : resolve(base, id);
      return Promise.resolve({
        path: ruta,
        base: dirname(ruta),
        content: readFileSync(ruta, 'utf8'),
      });
    },
  });
  return compilado.build([...clases]);
}

describe('el contorno de foco contrasta, en las seis', () => {
  const origenes = leerLosOrigenes();

  it.each(COMBINACIONES)('%s llega a los 3:1 que pide WCAG 1.4.11', (clave) => {
    const paleta = derivar(origenes, clave);
    const contorno = paleta.get(TOKEN_DEL_CONTORNO);
    expect(contorno, `«${TOKEN_DEL_CONTORNO}» no esta en la paleta de «${clave}»`).toBeDefined();

    // Los dos papeles sobre los que se enfoca algo: el lienzo y la tarjeta. Un contorno que se
    // vea sobre uno y no sobre el otro sigue dejando la mitad de las pantallas sin indicador.
    for (const papel of ['--superficie', '--fondo'] as const) {
      const detras = paleta.get(papel) ?? '';
      // Se decide con el crudo y se escribe con el redondeado (#48).
      const medido = contraste(contorno ?? '', detras);
      expect(
        medido,
        `El contorno de foco «${TOKEN_DEL_CONTORNO}» (${contorno ?? ''}) sobre «${papel}» ` +
          `(${detras}) en «${clave}» da ${ratioQueNoLlega(contorno ?? '', detras, 3)}:1, y ` +
          `WCAG 1.4.11 pide 3:1.\n` +
          '  Es el unico indicador que identifica el foco: el halo `--foco` da 1.13:1 en el tema\n' +
          '  por omision y no identifica nada por si solo.',
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(COMBINACIONES)('%s: y el de la BARRA, que es otro papel', (clave) => {
    // `--azul` sobre la barra es azul sobre azul y no se ve; lo que se ve sobre la barra es lo
    // que ya se lee en ella. Se mide contra la barra Y contra la barra con hover, que es mas
    // clara y por tanto el caso malo.
    const paleta = derivar(origenes, clave);
    const contorno = paleta.get(TOKEN_DEL_CONTORNO_EN_LA_BARRA) ?? '';
    const barra = paleta.get('--azul-oscuro') ?? '';
    const conHover = apilar([paleta.get('--barra-hover') ?? '', barra]);

    for (const [donde, detras] of [
      ['la barra', barra],
      ['la barra CON HOVER', conHover],
    ] as const) {
      const medido = contraste(contorno, detras);
      expect(
        medido,
        `El contorno de foco de la barra «${TOKEN_DEL_CONTORNO_EN_LA_BARRA}» (${contorno}) sobre ` +
          `${donde} (${detras}) en «${clave}» da ${ratioQueNoLlega(contorno, detras, 3)}:1, y ` +
          `WCAG 1.4.11 pide 3:1.`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('EL CENTINELA: el contorno de la pagina NO valdria sobre la barra', () => {
    // Es la razon de que haya dos, y conviene que este medida: si algun dia `--azul` se aclarase
    // hasta verse sobre la barra, esto se pondria rojo y sobraria uno de los dos tokens.
    const paleta = derivar(origenes, 'institucional/claro');
    const medido = contraste(
      paleta.get(TOKEN_DEL_CONTORNO) ?? '',
      paleta.get('--azul-oscuro') ?? '',
    );
    expect(
      medido,
      'El contorno de la pagina ya se ve sobre la barra, asi que el segundo token sobra.',
    ).toBeLessThan(3);
  });

  /** Lo que en `outline-<x>` es un COLOR: ni el grosor, ni la separacion, ni el estilo. */
  const ESTILOS = new Set(['solid', 'dashed', 'dotted', 'double', 'none', 'hidden']);
  const PATRON_DEL_COLOR = /^focus-visible:outline-(?!offset-)(\D[a-z0-9-]*)$/;
  const colorDe = (clases: string): string[] =>
    clases
      .split(/\s+/)
      .map((c) => PATRON_DEL_COLOR.exec(c)?.[1])
      .filter((c): c is string => c !== undefined && !ESTILOS.has(c));

  it('y el literal de la clase nombra ESE token, no otro', () => {
    // Tailwind lee el codigo como texto, asi que la clase va escrita entera y no compuesta. Lo
    // que esto impide es que se separen: el token que se mide arriba y el que se pinta abajo.
    // `outline-2` es el grosor, `outline-offset-1` la separacion y `outline-solid` el estilo; lo
    // que queda es el color.
    const colores = colorDe(CONTORNO_DE_FOCO);
    expect(colores, `«${CONTORNO_DE_FOCO}» no nombra un color de contorno, y solo uno`).toHaveLength(1);
    expect(
      `--${colores[0] ?? ''}`,
      'La clase pinta un token y la guarda mide otro. Se miden los dos sitios y no cuadran.',
    ).toBe(TOKEN_DEL_CONTORNO);

    const enLaBarra = colorDe(CONTORNO_DE_FOCO_EN_LA_BARRA);
    expect(enLaBarra).toHaveLength(1);
    expect(`--${enLaBarra[0] ?? ''}`).toBe(TOKEN_DEL_CONTORNO_EN_LA_BARRA);
  });
});

describe('y el contorno se PINTA: el CSS emitido, no la cadena', () => {
  it('la clase emite un contorno solido de 2 px, separado y del color del token', async () => {
    const css = await emitir(FOCO.split(' '));

    // `outline-style` no puede quedar en `none` ni en una variable que valga `none`. Es el modo
    // en que este indicador se perdio la primera vez, y no deja rastro en el `className`.
    expect(
      css,
      '`outline-solid` tiene que emitir `outline-style: solid` DIRECTAMENTE, y no solo poner la ' +
        'variable: es lo que hace que el contorno gane a un `outline-none` por especificidad y no ' +
        'por el orden en que Tailwind emita las reglas.',
    ).toMatch(/\.focus-visible\\:outline-solid:focus-visible\s*\{[^}]*outline-style:\s*solid/);
    expect(
      css,
      'La clase del contorno no emite `outline-style`. Con `outline-none` en el mismo elemento, ' +
        '`outline-2` emite `outline-style: var(--tw-outline-style)` y esa variable vale `none`: ' +
        'el contorno no se pinta y el `className` se ve perfecto.',
    ).toMatch(/\.focus-visible\\:outline-2:focus-visible\s*\{[^}]*outline-style:/);
    expect(css).toMatch(/\.focus-visible\\:outline-2:focus-visible\s*\{[^}]*outline-width:\s*2px/);
    expect(css).toMatch(/outline-offset:\s*1px/);
    expect(css).toMatch(/outline-color:\s*var\(--color-azul\)/);
  });

  it('EL CENTINELA: sin `outline-none` la variable de estilo vale `solid`', async () => {
    // Es la razon por la que `outline-none` no esta en ningun componente que se enfoque: sin el,
    // el contorno se pinta POR REGLA y no porque dos selectores caigan en el orden conveniente.
    const css = await emitir(FOCO.split(' '));
    expect(css).toMatch(/@property --tw-outline-style[\s\S]*?initial-value:\s*solid/);
  });

  it('y el de la barra tambien se pinta', async () => {
    const css = await emitir(FOCO_EN_LA_BARRA.split(' '));
    expect(css).toMatch(/outline-color:\s*var\(--color-sobre-barra\)/);
    expect(css).toMatch(/\.focus-visible\\:outline-2:focus-visible\s*\{[^}]*outline-style:/);
  });

  it('el halo sigue puesto: convive con el contorno, que es lo que hace el artboard', async () => {
    const css = await emitir(HALO_DE_FOCO.split(' '));
    expect(css).toMatch(/--tw-ring-color:\s*var\(--color-foco\)/);
  });
});

describe('y nadie lo reescribe por su cuenta: el codigo, barrido', () => {
  /**
   * Las dos guardas de arriba miden LA CONSTANTE. Esta mide que la constante sea la unica forma
   * de dibujar un foco — que es lo que hace que medirla signifique algo.
   *
   * Sin ella, la constante puede estar perfecta y un componente escribir a mano el anillo blando
   * de siempre: pasaria todo, y ese componente seguiria con 1.13:1. Es exactamente como estaban
   * los seis que #37 encontro.
   */
  /**
   * Todos los `.ts`/`.tsx` de produccion de los paquetes. Ni pruebas, ni `node_modules`, ni
   * `muestras/`, que violan otras reglas a proposito: el recorrido comun (#126).
   */
  const archivos = archivosDe(PAQUETES, { extensiones: ['.ts', '.tsx'] }).map((ruta) => ({
    ruta: rutaDesde(RAIZ, ruta),
    texto: readFileSync(ruta, 'utf8'),
  }));

  it('EL CENTINELA: el barrido encuentra archivos', () => {
    // Sin esto, un cambio de disposicion dejaria la lista vacia y las dos de abajo pasarian sobre
    // el conjunto vacio.
    expect(archivos.length).toBeGreaterThan(30);
    expect(archivos.map((a) => a.ruta)).toContain('paquetes/ui/shadcn/boton.tsx');
  });

  it('el anillo blando no se escribe a mano en ningun sitio', () => {
    const aMano = archivos
      .filter((a) => a.ruta !== 'paquetes/ui/shadcn/foco.ts' && a.texto.includes('focus-visible:ring-foco'))
      .map((a) => `  ${a.ruta}`);
    expect(
      aMano,
      'Estos archivos escriben el anillo de foco a mano:\n' +
        aMano.join('\n') +
        '\n\n  Se toma de `foco.ts` —`FOCO`, `FOCO_EN_LA_BARRA` o `HALO_DE_FOCO`—, que es lo que\n' +
        '  hace que medir la constante signifique algo. Un anillo escrito a mano es un foco que\n' +
        '  ninguna guarda mide, y asi es como cuatro de las seis combinaciones se quedaron en\n' +
        '  1.13:1 sin que nadie se enterara.',
    ).toEqual([]);
  });

});
