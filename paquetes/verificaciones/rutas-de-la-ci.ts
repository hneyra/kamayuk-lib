import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RAIZ } from './texto.ts';

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
  return readFileSync(join(RAIZ, '.github/workflows/paquetes.yml'), 'utf8');
}

/** Cada lista `paths:` del workflow, con las comillas quitadas. */
export function listasDeRutas(workflow: string): string[][] {
  const listas: string[][] = [];
  let actual: string[] | null = null;
  for (const linea of workflow.split('\n')) {
    const recortada = linea.trim();
    if (recortada === 'paths:') {
      actual = [];
      listas.push(actual);
      continue;
    }
    if (actual !== null && recortada.startsWith('- ')) {
      actual.push(recortada.slice(2).replace(/^"|"$/g, ''));
      continue;
    }
    actual = null;
  }
  return listas;
}
