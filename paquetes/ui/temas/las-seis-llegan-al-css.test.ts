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
 * Cuantos `@layer` quedan abiertos en ese punto del CSS.
 *
 * Es la mitad silenciosa del asunto. `@theme` emite sus `--color-*` dentro de `@layer theme`, y lo
 * que hace que las seis paletas GANEN es entrar sin capa: lo no encapado le gana a cualquier capa,
 * pase lo que pase con el orden de los `@import`. Envuelto en un `@layer`, el CSS trae las 228
 * declaraciones, las tres guardas de arriba siguen verdes y la pantalla no cambia de color.
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

  it('y entran SIN capa, que es lo que hace que le ganen al `@theme`', async () => {
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
        '  `@theme` emite sus `--color-*` en `@layer theme`, y lo que hace que estas le ganen es\n' +
        '  entrar sin capa. Encapadas, el CSS trae las 228 declaraciones y la pantalla no cambia\n' +
        '  de color — con todas las demas guardas en verde.',
    ).toEqual([]);
  });
});
