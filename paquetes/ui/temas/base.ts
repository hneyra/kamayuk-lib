import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Donde vive la paleta base —el `@theme` del artboard— y donde va la generada. */
export const RUTA_DEL_THEME = fileURLToPath(new URL('../estilos/estilos.css', import.meta.url));
export const RUTA_DE_LOS_TEMAS = fileURLToPath(new URL('../estilos/temas.css', import.meta.url));

/**
 * La paleta base, leida del `@theme`.
 *
 * Se lee del CSS y no de una tabla en TypeScript para que **haya una sola fuente**: el `@theme` es
 * lo que el navegador aplica, asi que es lo que tiene que derivarse. Una copia en TS se
 * desincronizaria y la que se quedaria vieja seria la que genera los otros cinco temas.
 */
export function baseDelTema(): Map<string, string> {
  const css = readFileSync(RUTA_DEL_THEME, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const base = new Map<string, string>();
  for (const [, n, v] of css.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    base.set(`--${n}`, (v ?? '').trim());
  }
  return base;
}
