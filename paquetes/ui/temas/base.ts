import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { IdentidadDeOrigen, Origen, Origenes } from './derivar.ts';

/** Donde vive la paleta base —el `@theme` del artboard— y donde va la generada. */
export const RUTA_DEL_THEME = fileURLToPath(new URL('../estilos/estilos.css', import.meta.url));
export const RUTA_DE_LOS_TEMAS = fileURLToPath(new URL('../estilos/temas.css', import.meta.url));

/**
 * Donde vive CADA paleta de origen (#56).
 *
 * Hasta #56 habia una sola —el `@theme`— y por eso esta constante no existia: la ruta era una. Con
 * `clasico` son dos, y se escriben aqui juntas para que la pregunta «¿de que archivo sale esta
 * identidad?» tenga una sola respuesta. Que identidad sale de que origen lo dice `ORIGEN_DE` en
 * `derivar.ts`; este mapa solo dice donde esta cada origen en el disco.
 */
export const RUTAS_DE_LOS_ORIGENES: Readonly<Record<IdentidadDeOrigen, string>> = {
  institucional: RUTA_DEL_THEME,
  clasico: fileURLToPath(new URL('../estilos/clasico.css', import.meta.url)),
};

/**
 * **Un CSS sin sus comentarios**: un `--color-x` citado en un comentario no es un token.
 *
 * Es el UNICO quitador de comentarios de CSS del paquete (#126). Hasta entonces este y dos pruebas
 * —`la-fuente-es-de-la-identidad` y `las-paletas-llegan-al-css`— se escribian la misma expresion
 * cada uno. El CSS solo tiene comentarios de bloque, asi que no le hace falta el `(?<!:)` del de
 * JavaScript (`verificaciones/comentarios.mjs`): una `url(https://…)` no se confunde con nada.
 */
export function sinComentariosCss(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** El CSS de un archivo, sin comentarios. */
const cssSinComentarios = (ruta: string): string => sinComentariosCss(readFileSync(ruta, 'utf8'));

/** Los `--color-*` de un archivo de origen, `--nombre` -> valor, en el orden en que se declaran. */
export function coloresDe(ruta: string): Map<string, string> {
  const colores = new Map<string, string>();
  for (const [, n, v] of cssSinComentarios(ruta).matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    colores.set(`--${n}`, (v ?? '').trim());
  }
  return colores;
}

/**
 * La `--font-sans` que declara un archivo de origen, o `null` si no declara ninguna.
 *
 * El `@theme` no declara ninguna, y es a proposito: la de `institucional` es la de Tailwind, y
 * escribirla aqui la cambiaria para las tres identidades que salen de el.
 */
export function fuenteDe(ruta: string): string | null {
  const casa = /--font-sans\s*:\s*([^;]+);/i.exec(cssSinComentarios(ruta));
  return casa === null ? null : (casa[1] ?? '').trim();
}

/**
 * Las paletas de origen, leidas cada una de SU archivo.
 *
 * Se leen del CSS y no de una tabla en TypeScript para que **haya una sola fuente**: el `@theme` es
 * lo que el navegador aplica, asi que es lo que tiene que derivarse. Una copia en TS se
 * desincronizaria y la que se quedaria vieja seria la que genera los otros temas.
 *
 * Hasta #56 esto era `baseDelTema()` y devolvia UNA paleta. Desde #56 son todas, y es lo que
 * `derivar()` y `generar()` reciben: con una base suelta, la unica forma de derivar `clasico` seria
 * pasarle la de otra identidad, y saldria un `clasico` con los colores de `institucional` sin que
 * nada lo dijera.
 */
export function leerLosOrigenes(): Origenes {
  const origenes = {} as Record<IdentidadDeOrigen, Origen>;
  for (const [identidad, ruta] of Object.entries(RUTAS_DE_LOS_ORIGENES) as [IdentidadDeOrigen, string][]) {
    origenes[identidad] = { colores: coloresDe(ruta), fuente: fuenteDe(ruta) };
  }
  return origenes;
}
