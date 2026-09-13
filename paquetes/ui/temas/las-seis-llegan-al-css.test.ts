// @vitest-environment node
//
// Compila CSS de verdad y lee archivos del disco. No es un DOM lo que necesita.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

import { baseDelTema } from './base.ts';
import { COMBINACIONES, derivar } from './derivar.ts';

/**
 * **Las seis paletas llegan al CSS QUE EL NAVEGADOR RECIBE** (#23).
 *
 * <h2>El hueco que esto tapa, y por que ninguna prueba lo dijo</h2>
 *
 * `estilos/temas.css` existia desde #8 con sus 228 declaraciones, su guarda de regeneracion y su
 * contraste medido en las seis combinaciones. Y no lo importaba nadie: `estilos.css` empezaba con
 * `@import "tailwindcss"` y nada mas, `package.json` exportaba `"."`, `"./estilos.css"` y
 * `"./fuentes"`, y la unica referencia al archivo en todo el arbol era la constante que usa su
 * propia guarda. Medido en el consumidor —`yarn build` de `rentas`, sobre `dist/assets/*.css`—:
 * `data-tema` 0 apariciones, `data-modo` 0, `prefers-color-scheme` 0.
 *
 * Ninguna de las dos guardas de #8 podia decirlo, porque las dos miden **el archivo** y no **el
 * camino**: `temas.test.ts` comprueba que existe y que volver a generarlo da lo mismo;
 * `contraste.test.ts` mide las seis paletas leyendolo del disco. Las dos pasan con el archivo
 * perfectamente escrito y perfectamente inalcanzable.
 *
 * <h2>Por que esta guarda compila, en vez de leer</h2>
 *
 * Porque lo que hay que sostener es lo que ninguna lectura ve: que la hoja **que el consumidor
 * importa** —`@kamayuk/ui/estilos.css`, resuelta por el `exports` del paquete y no por una ruta
 * escrita aqui— arrastre las seis paletas hasta el CSS emitido. Un `@import` borrado, una entrada
 * de `exports` que deje de apuntar donde apunta, o un `@layer` de mas dejan el archivo intacto y
 * la pantalla sin colores.
 *
 * <h2>Como se compila «igual que el consumidor»</h2>
 *
 * Con la API de `tailwindcss`, y con la `base` de cada hoja puesta en **el directorio de la hoja
 * que importa**, que es lo que hace Vite: un `@import` relativo se resuelve contra el archivo que
 * lo escribe, no contra la raiz del paquete. No es un detalle: con la `base` puesta en la raiz,
 * `./temas.css` se busca en `paquetes/ui/temas.css` y la compilacion revienta con un `ENOENT`
 * sobre un archivo que nadie nombro.
 *
 * <h2>Y que digan `color-scheme: dark`, que no es un color</h2>
 *
 * Desde #33 se mide aqui una cosa mas: que los tres bloques oscuros declaren `color-scheme: dark`.
 * Llegar con los 38 colores no basta — lo que el navegador dibuja por su cuenta (controles
 * nativos, barra de desplazamiento, fondo previo del lienzo) lo decide esa propiedad y nada mas, y
 * hasta #33 el documento decia `light` siempre. Se mide en el mismo sitio y por el mismo motivo:
 * `temas.css` es archivo generado, asi que leer `temas/generar.ts` dejaria pasar un `temas.css` sin
 * regenerar, y leer `temas.css` dejaria pasar un `@import` roto.
 */

const requerir = createRequire(import.meta.url);

/** La raiz del paquete: el padre de `temas/`. */
const RAIZ_DE_UI = fileURLToPath(new URL('..', import.meta.url));

/** Lo que `package.json` publica como `@kamayuk/ui/estilos.css`. Se resuelve, no se supone. */
const HOJA_PUBLICADA = (() => {
  const manifiesto = JSON.parse(readFileSync(join(RAIZ_DE_UI, 'package.json'), 'utf8')) as {
    exports?: Record<string, string>;
  };
  const entrada = manifiesto.exports?.['./estilos.css'];
  if (entrada === undefined) {
    throw new Error(
      '`paquetes/ui/package.json` ya no exporta `./estilos.css`. Sin esa entrada, el consumidor ' +
        'no tiene como importar la hoja: ni la paleta ni los seis temas llegan al navegador.',
    );
  }
  return resolve(RAIZ_DE_UI, entrada);
})();

/**
 * El CSS emitido para una lista de clases, compilando la hoja publicada.
 *
 * `loadStylesheet` hace dos cosas: resuelve `tailwindcss` —que es un nombre de paquete y no una
 * ruta— y devuelve, para cada hoja, la `base` con la que se resolveran SUS imports. Esa base es
 * el directorio de la hoja, que es lo que hace Vite.
 */
async function compilar(clases: readonly string[]): Promise<string> {
  const compilado = await compile(readFileSync(HOJA_PUBLICADA, 'utf8'), {
    base: dirname(HOJA_PUBLICADA),
    loadStylesheet: (id: string, desde: string) => {
      const ruta = id === 'tailwindcss' ? requerir.resolve('tailwindcss/index.css') : join(desde, id);
      return Promise.resolve({ path: ruta, base: dirname(ruta), content: readFileSync(ruta, 'utf8') });
    },
  });
  return compilado.build([...clases]);
}

/**
 * Los selectores con que cada combinacion llega al CSS.
 *
 * El oscuro son DOS: uno bajo `prefers-color-scheme` para quien no ha elegido modo y otro bajo
 * `[data-modo='oscuro']` para quien si. Se escriben aqui enteros —con el `@media` delante— en vez
 * de derivarlos de `generar.ts`, y a proposito: derivarlos de la misma funcion que escribe el
 * archivo haria que un error en esa funcion saliera verde por los dos lados.
 */
const SELECTORES: Readonly<Record<string, readonly string[]>> = {
  'institucional/claro': ["[data-tema='institucional'] {"],
  'institucional/oscuro': [
    "@media (prefers-color-scheme: dark) { :root:not([data-modo='claro']) {",
    ":root[data-modo='oscuro'] {",
  ],
  'alto-contraste/claro': ["[data-tema='alto-contraste'] {"],
  'alto-contraste/oscuro': [
    "@media (prefers-color-scheme: dark) { [data-tema='alto-contraste']:not([data-modo='claro']) {",
    "[data-tema='alto-contraste'][data-modo='oscuro'] {",
  ],
  'sepia/claro': ["[data-tema='sepia'] {"],
  'sepia/oscuro': [
    "@media (prefers-color-scheme: dark) { [data-tema='sepia']:not([data-modo='claro']) {",
    "[data-tema='sepia'][data-modo='oscuro'] {",
  ],
};

/** El selector sin la llave con que se busca, para poder nombrarlo en un mensaje. */
function sinLlave(selector: string): string {
  return selector.replace(/ \{$/, '');
}

/** El CSS con los espacios colapsados: lo emitido se compara por texto, no por formato. */
function aplanar(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ');
}

/** Las declaraciones del bloque que abre en `selector`, hasta su `}`. */
function bloqueDe(plano: string, selector: string): string {
  const inicio = plano.indexOf(selector);
  if (inicio < 0) return '';
  const cuerpo = plano.slice(inicio + selector.length);
  const fin = cuerpo.indexOf('}');
  return fin < 0 ? cuerpo : cuerpo.slice(0, fin);
}

/**
 * El valor de la PROPIEDAD `color-scheme` dentro de un bloque ya aplanado, o `''` si no la declara.
 *
 * Se busca la propiedad y no la cadena, y ese es el punto entero (#33). En el CSS emitido la cadena
 * `color-scheme` sale **diez** veces: las seis declaraciones de los bloques oscuros, la `light` del
 * `:root` de `estilos.css` y las **tres** de `@media (prefers-color-scheme: dark)`, que no son una
 * declaracion de nada. Una guarda que contara apariciones —que es lo que el issue midio con
 * `grep -c`, dando 4 sobre un archivo donde la propiedad no estaba ni una vez— saldria verde con el
 * defecto puesto. Por eso se ancla al principio del bloque o a un `;`: dentro del preludio de un
 * `@media` no hay ninguno de los dos.
 */
function esquemaDeColorDe(bloque: string): string {
  return (/(?:^|;)\s*color-scheme\s*:\s*([^;}]+)/.exec(bloque)?.[1] ?? '').trim();
}

/**
 * Cuantos `@layer` quedan abiertos en ese punto del CSS.
 *
 * Es la mitad silenciosa del asunto. `@theme` emite sus `--color-*` dentro de `@layer theme`, y lo
 * que hace que las seis paletas GANEN es entrar sin capa: lo no encapado le gana a cualquier capa
 * **con independencia del orden y de la especificidad**.
 *
 * **Este docblock decia «envuelto en un `@layer` … la pantalla no cambia de color», y es falso.**
 * Medido con `@import "./temas.css" layer(theme);` puesto: las nueve reglas caen en un SEGUNDO
 * bloque `@layer theme` posterior al del `@theme`, dentro de una misma capa gana lo que va despues,
 * y ademas `[data-tema='alto-contraste']` y `[data-tema='sepia']` pesan mas que `:root, :host`. En
 * un navegador siguen pintando las seis.
 *
 * Asi que lo que mide esta funcion no es «si pintan» sino **de que depende que pinten**: encapadas
 * pintan por esas dos casualidades, que no vigila nadie, y el dia que cambie cualquiera el fallo es
 * silencioso. Fuera de capa no hay nada que pueda cambiar.
 */
function capasAbiertasEn(plano: string, indice: number): number {
  const pila: boolean[] = [];
  let abiertas = 0;
  let inicioDeRegla = 0;
  for (let i = 0; i < indice; i++) {
    const caracter = plano[i];
    if (caracter === '{') {
      const esCapa = plano.slice(inicioDeRegla, i).trim().startsWith('@layer');
      pila.push(esCapa);
      if (esCapa) abiertas++;
      inicioDeRegla = i + 1;
    } else if (caracter === '}') {
      if (pila.pop() === true) abiertas--;
      inicioDeRegla = i + 1;
    } else if (caracter === ';') {
      inicioDeRegla = i + 1;
    }
  }
  return abiertas;
}

const base = baseDelTema();

describe('las seis paletas llegan al CSS emitido', () => {
  it('EL CENTINELA: la hoja publicada compila y Tailwind emite', async () => {
    // Sin esto, una hoja que dejara de compilar —o un `build()` que devolviera la cadena vacia—
    // dejaria todo lo de abajo fallando por el motivo equivocado, o pasando si alguien invirtiera
    // una comprobacion. Y la hoja es la PUBLICADA: si `exports` deja de llevar a ella, esto
    // revienta al resolverla, que es la otra mitad del camino.
    expect(base.size, 'el @theme no declaro ni un color').toBe(38);
    expect(COMBINACIONES).toHaveLength(6);
    // Y cada una con su selector declarado: una combinacion sin entrada en `SELECTORES` se
    // recorreria sobre la lista vacia y saldria verde sin haberse buscado en el CSS.
    expect(
      COMBINACIONES.filter((c) => (SELECTORES[c] ?? []).length === 0),
      'hay combinaciones sin selector declarado en `SELECTORES`',
    ).toEqual([]);

    const css = await compilar(['bg-fondo']);
    // El umbral lo pasa la hoja SOLA, sin los temas: este centinela mide que la compilacion
    // ocurrio, no que las paletas esten — si se le pusiera un umbral que solo pasara con ellas,
    // se pondria rojo por el defecto que las otras tres pruebas tienen que nombrar.
    expect(css.length, 'Tailwind no emitio CSS: la hoja publicada no compila').toBeGreaterThan(2000);
    expect(css, 'no se emitieron las capas de Tailwind: no se compilo la hoja que se cree').toContain(
      '@layer theme',
    );
    expect(aplanar(css), 'no se emitio la utilidad pedida').toContain('.bg-fondo {');
  });

  it('las SEIS combinaciones estan dentro, con sus 38 colores y sus valores', async () => {
    const plano = aplanar(await compilar(['bg-fondo']));

    const ausentes: string[] = [];
    for (const clave of COMBINACIONES) {
      const paleta = derivar(base, clave);
      for (const selector of SELECTORES[clave] ?? []) {
        if (!plano.includes(selector)) {
          ausentes.push(`  ${clave}: el CSS emitido no trae «${sinLlave(selector)}»`);
          continue;
        }
        const cuerpo = bloqueDe(plano, selector);
        const faltan = [...paleta].filter(([n, v]) => !cuerpo.includes(`--color-${n.slice(2)}: ${v};`));
        if (faltan.length > 0) {
          ausentes.push(
            `  ${clave}: «${sinLlave(selector)}» llega al CSS sin ` +
              `${String(faltan.length)} de sus 38 colores, p. ej. ${faltan[0]?.[0] ?? ''}`,
          );
        }
      }
    }

    expect(
      ausentes,
      'Las seis paletas NO llegan al navegador:\n' +
        `${ausentes.join('\n')}\n\n` +
        '  Es el defecto de #23: `estilos/temas.css` puede estar perfecto y no importarlo nadie.\n' +
        '  El camino es el `@import "./temas.css"` de `estilos/estilos.css`, y la entrada\n' +
        '  `"./estilos.css"` del `exports` de `paquetes/ui/package.json`. Sin los dos, el CSS\n' +
        '  servido no trae ni un `data-tema` y `ProveedorDeTema` estampa atributos que nadie lee.',
    ).toEqual([]);
  });

  it('los DOS ejes se pueden leer: tres `data-tema`, dos `data-modo` y el del sistema', async () => {
    const plano = aplanar(await compilar(['bg-fondo']));
    // Lo mismo de arriba contado por ejes, que es como lo midio el issue sobre el `dist` del
    // consumidor: tres identidades, los dos modos elegibles, y el que decide el equipo.
    for (const identidad of ['institucional', 'alto-contraste', 'sepia']) {
      expect(plano, `no hay ni una regla para [data-tema='${identidad}']`).toContain(
        `[data-tema='${identidad}']`,
      );
    }
    expect(plano, "nadie puede elegir oscuro: no hay [data-modo='oscuro']").toContain(
      "[data-modo='oscuro']",
    );
    expect(plano, "elegir claro no le ganaria al equipo: no hay [data-modo='claro']").toContain(
      "[data-modo='claro']",
    );
    // Tres, una por identidad: el oscuro del sistema tiene que existir para las tres, no solo
    // para la de por omision.
    expect(
      plano.split('@media (prefers-color-scheme: dark)').length - 1,
      'el oscuro del sistema no llega para las tres identidades',
    ).toBe(3);
  });

  /**
   * **Los tres bloques oscuros declaran `color-scheme: dark`** (#33).
   *
   * Los 38 `--color-*` son lo que pinta la hoja. `color-scheme` es lo que pinta el navegador por su
   * cuenta: los controles de formulario sin estilar, la barra de desplazamiento, el resaltado de
   * los menus nativos y el fondo del lienzo antes de que el CSS cargue. Hasta #33 el unico
   * `color-scheme` que llegaba al documento era el `light` de `estilos.css`, y llegaba SIEMPRE: con
   * el equipo en oscuro la paleta se oscurecia entera y eso se quedaba blanco.
   *
   * Se mide sobre el CSS EMITIDO y no sobre `temas/generar.ts`, y es la leccion de #23: el archivo
   * fuente puede ser perfecto y no llegar. Aqui ademas hay un segundo camino por el que perderse —
   * `temas.css` es archivo generado— y leer el generador dejaria pasar un `temas.css` sin regenerar.
   */
  it('los TRES bloques oscuros declaran `color-scheme: dark`, y el claro no', async () => {
    const plano = aplanar(await compilar(['bg-fondo']));

    const mal: string[] = [];
    let oscurosMedidos = 0;
    let clarosMedidos = 0;
    for (const clave of COMBINACIONES) {
      const esOscuro = clave.endsWith('/oscuro');
      for (const selector of SELECTORES[clave] ?? []) {
        if (!plano.includes(selector)) {
          mal.push(`  ${clave}: el CSS emitido no trae «${sinLlave(selector)}»`);
          continue;
        }
        if (esOscuro) oscurosMedidos++;
        else clarosMedidos++;
        const declarado = esquemaDeColorDe(bloqueDe(plano, selector));
        const dicho = declarado === '' ? 'no declara `color-scheme`' : `declara \`${declarado}\``;
        if (esOscuro && declarado !== 'dark') {
          mal.push(`  ${clave}: «${sinLlave(selector)}» ${dicho}, y tiene que declarar \`dark\``);
        }
        if (!esOscuro && declarado !== '') {
          mal.push(
            `  ${clave}: «${sinLlave(selector)}» ${dicho}, y el claro no declara ninguno: el ` +
              '`:root` de `estilos.css` ya dice `light`',
          );
        }
      }
    }

    expect(
      mal,
      'El oscuro no se lo dice al navegador:\n' +
        `${mal.join('\n')}\n\n` +
        '  La propiedad sale de `temas/generar.ts`, en los tres bloques oscuros y por duplicado\n' +
        "  cada uno —bajo `prefers-color-scheme` y bajo `[data-modo='oscuro']`—, o sea SEIS sitios.\n" +
        '  Y `estilos/temas.css` es archivo generado: se regenera con\n' +
        '    KAMAYUK_REGENERAR=1 yarn vitest run paquetes/ui/temas\n' +
        '  Sin ella la paleta se oscurece y los controles nativos, la barra de desplazamiento y el\n' +
        '  fondo previo del lienzo se quedan CLAROS (#33).',
    ).toEqual([]);

    // Y que se hayan medido los nueve bloques, no un subconjunto: sin esto, unos selectores que
    // dejaran de encontrarse dejarian la comprobacion pasando sobre lo poco que quedara.
    expect([oscurosMedidos, clarosMedidos], 'no se midieron los seis oscuros y los tres claros').toEqual(
      [6, 3],
    );

    // El otro extremo del asunto: el `light` del documento SE QUEDA. Es el valor por omision y el
    // que el artboard declara, y es contra el que los seis bloques oscuros tienen que ganar.
    expect(
      esquemaDeColorDe(bloqueDe(plano, ':root {')),
      'el `:root` de `estilos.css` dejo de declarar `color-scheme: light`',
    ).toBe('light');
  });

  /**
   * **El centinela de la prueba de arriba: la cadena suelta no cuenta.**
   *
   * `color-scheme` aparece en el CSS emitido dentro del preludio de cada `@media
   * (prefers-color-scheme: dark)`, que no declara nada. Si `esquemaDeColorDe` se dejara enganar por
   * eso, los tres bloques del sistema saldrian verdes **por el texto de su propio `@media`** y el
   * defecto de #33 volveria a pasar desapercibido en la mitad de los sitios. Que es, con otra
   * forma, el `grep -c` que daba 4 sobre un archivo sin ni una declaracion.
   */
  it('EL CENTINELA DEL ESQUEMA: se mide la propiedad, no la cadena', () => {
    expect(
      esquemaDeColorDe('@media (prefers-color-scheme: dark) { '),
      'el preludio de un `@media` no declara nada, y aqui contaria como declaracion',
    ).toBe('');
    expect(esquemaDeColorDe(' --color-fondo: #111213; '), 'un bloque sin la propiedad').toBe('');
    expect(esquemaDeColorDe(' color-scheme: dark; --color-fondo: #111213; ')).toBe('dark');
    expect(esquemaDeColorDe(' --color-fondo: #111213; color-scheme: dark; ')).toBe('dark');
    expect(esquemaDeColorDe(' color-scheme: light; --radius: 3px; ')).toBe('light');
  });

  it('y entran SIN capa, que es lo que hace que le ganen al `@theme` POR REGLA', async () => {
    const plano = aplanar(await compilar(['bg-fondo']));
    const encapadas = COMBINACIONES.flatMap((clave) =>
      (SELECTORES[clave] ?? [])
        .filter((s) => plano.includes(s) && capasAbiertasEn(plano, plano.indexOf(s)) > 0)
        .map((s) => `  ${clave}: «${sinLlave(s)}» quedo dentro de un @layer`),
    );
    expect(
      encapadas,
      'Hay paletas emitidas DENTRO de una capa:\n' +
        `${encapadas.join('\n')}\n\n` +
        '  No es que asi no pinten: HOY pintan, y esta medido — caen en un segundo `@layer theme`\n' +
        '  posterior al del `@theme`, dentro de una misma capa gana lo que va despues, y los\n' +
        '  selectores de tema pesan mas que `:root, :host`. El problema es que entonces pintan por\n' +
        '  esas DOS casualidades y no por una regla: el orden en que Tailwind emite los bloques y\n' +
        '  el peso de los selectores. Cambie cualquiera de las dos y el fallo es silencioso.\n' +
        '  Fuera de capa ganan por la cascada y no hay nada que pueda cambiar.',
    ).toEqual([]);
  });

  /**
   * **El centinela de la prueba de arriba: que HAYA a quien ganarle.**
   *
   * «Entrar sin capa es lo que hace que le ganen al `@theme`» presupone que el `@theme` emite algo
   * dentro de `@layer theme`. Y **Tailwind v4 PODA del `@theme` los tokens que ninguna utilidad
   * usa**: medido con esta misma hoja y este mismo `compilar()`, con `['bg-fondo']` el bloque
   * `:root, :host` de la capa trae `--color-fondo: #f2f6f9;` y con `[]` **no lo trae**, aunque el
   * bloque siga ahi con sus `--font-*`.
   *
   * O sea que el dia que la lista de clases que se compila deje de usar un color —un renombrado,
   * una utilidad que se quita— la prueba de la capa seguiria verde **sin tener enfrente ni una
   * declaracion del `@theme`**: verde por vacia, que es la forma en que una guarda se queda sin
   * sujeto sin que nadie se entere. Es el mismo modo de fallo que #23 vino a cerrar, una vuelta
   * mas adentro.
   */
  it('EL CENTINELA DE LA CAPA: el `@theme` emite el color al que las paletas le ganan', async () => {
    const plano = aplanar(await compilar(['bg-fondo']));
    const DEL_THEME = ':root, :host {';
    const donde = plano.indexOf(DEL_THEME);
    expect(donde, 'el `@theme` no emitio su regla `:root, :host`').toBeGreaterThan(-1);
    expect(
      capasAbiertasEn(plano, donde),
      'el `@theme` dejo de emitirse dentro de una capa: si ya no esta encapado, la prueba de ' +
        'arriba compara contra algo que ya no es una capa y deja de decir lo que dice',
    ).toBeGreaterThan(0);
    expect(
      bloqueDe(plano, DEL_THEME),
      'El `@theme` no emitio `--color-fondo`, asi que la prueba de la capa no tiene contra quien ' +
        'ganar y pasaria en verde POR VACIA. Tailwind poda los tokens del `@theme` que ninguna ' +
        'utilidad usa: la lista de clases con la que se compila aqui tiene que seguir usando un ' +
        'color del artboard.',
    ).toContain('--color-fondo: #f2f6f9;');
  });

  it('y la poda es real, que es POR QUE hace falta ese centinela', async () => {
    // Sin esta prueba, el centinela de arriba seria una precaucion sin medir. Compilado lo MISMO
    // sin ninguna clase, el bloque del `@theme` sigue estando —con sus `--font-*`— y el color ya
    // no: eso es exactamente lo que dejaria la comprobacion de la capa sin sujeto.
    const sinClases = aplanar(await compilar([]));
    expect(sinClases, 'la hoja dejo de compilar sin clases').toContain(':root, :host {');
    expect(
      bloqueDe(sinClases, ':root, :host {'),
      'Tailwind ha dejado de podar los tokens del `@theme` que nadie usa. Es una buena noticia y ' +
        'deja obsoleto el centinela de arriba, pero hay que enterarse: esta prueba es la que lo ' +
        'dice.',
    ).not.toContain('--color-fondo');
    // Y las paletas NO se podan: son CSS corriente, no tokens del `@theme`. Si esto cambiara, la
    // guarda entera estaria midiendo otra cosa.
    expect(sinClases, 'las paletas se podaron: ya no son CSS corriente').toContain(
      "[data-tema='sepia']",
    );
  });
});
