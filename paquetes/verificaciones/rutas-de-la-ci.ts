import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RAIZ } from './texto.ts';
import { analizarWorkflow, esMapa, valorEn } from './workflow.ts';

const WORKFLOW = '.github/workflows/paquetes.yml';

/**
 * **Qué archivos disparan la CI de los paquetes** (#128).
 *
 * `paquetes.yml` sólo corre cuando el cambio toca una de sus `paths`, y eso tiene una consecuencia
 * que no se ve: una guarda que lee un archivo de fuera de esa lista **no corre** en el PR que sólo
 * toca ese archivo, que es justo el PR que tendría que pararla. Pasó dos veces en #128 —las cifras
 * viven en `CLAUDE.md` y en `README.md`, y el atributo de la mezcla en `.gitattributes`— y por eso
 * el lector vive aquí y no copiado en cada prueba que lo necesita.
 */

export function leerElWorkflow(): string {
  return readFileSync(join(RAIZ, WORKFLOW), 'utf8');
}

/**
 * Cada lista `paths:` de los eventos del workflow (`on.<evento>.paths`), en el orden en que estan
 * escritas.
 *
 * Del YAML analizado desde #114, y no linea a linea: la lectura por lineas cortaba la lista en el
 * primer comentario que se metiera entre dos rutas, y no veia una lista escrita en una sola linea
 * (`paths: ["a", "b"]`), que para GitHub es la misma.
 */
export function listasDeRutas(workflow: string): string[][] {
  const eventos = valorEn(analizarWorkflow(workflow, WORKFLOW), 'on');
  if (!esMapa(eventos)) return [];
  return Object.values(eventos)
    .map((evento) => valorEn(evento, 'paths'))
    .filter((rutas): rutas is unknown[] => Array.isArray(rutas))
    .map((rutas) => rutas.map(String));
}
