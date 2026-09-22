import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** La raiz de `kamayuk-lib`: el padre de `paquetes/`. */
export const RAIZ = fileURLToPath(new URL('../..', import.meta.url));

/** Donde viven los seis paquetes. */
export const PAQUETES = join(RAIZ, 'paquetes');

/**
 * Deja solo lo que NO es comentario.
 *
 * **Se sigue importando de aqui, y su codigo ya no vive aqui** (#92): esta en
 * `comentarios.mjs`, porque hace falta tambien fuera del comprobador —el guion que un consumidor
 * corre contra su propio arbol lo carga con `node`, sin Vite ni `tsc`—. Las guardas de este
 * repositorio no cambian ni una linea: lo que se mueve es el archivo, no la puerta. El motivo
 * entero, y el de omitir los comentarios, estan en el docblock de alli.
 */
export { sinComentarios } from './comentarios.mjs';

const APARTADAS = new Set(['node_modules', 'dist', 'muestras']);
const EXTENSIONES = new Set(['.ts', '.tsx', '.mjs', '.js', '.css']);

/**
 * Los archivos de **codigo de produccion** de los paquetes.
 *
 * Ni pruebas ni muestras: una prueba del cliente tiene que poder escribir `'/rentas/api/v1'`
 * —es justo lo que comprueba, que el prefijo sea un parametro— y una muestra existe para
 * violar la regla.
 */
export function archivosDeProduccion(raiz: string = PAQUETES): string[] {
  const salida: string[] = [];
  const recorrer = (directorio: string): void => {
    for (const entrada of readdirSync(directorio)) {
      if (APARTADAS.has(entrada)) continue;
      const completa = join(directorio, entrada);
      if (statSync(completa).isDirectory()) {
        recorrer(completa);
        continue;
      }
      if (/\.(test|spec)\.(ts|tsx)$/.test(entrada)) continue;
      if (!EXTENSIONES.has(extname(entrada))) continue;
      salida.push(completa);
    }
  };
  recorrer(raiz);
  return salida;
}

/**
 * TODOS los archivos de los paquetes, pruebas incluidas, menos las muestras.
 *
 * La guarda del nombre publico mira tambien las pruebas: una prueba que importe por el nombre
 * publico resuelve aqui y documentaria, en el sitio donde se lee como si fuera el uso correcto,
 * justo la via que ningun consumidor tiene.
 */
export function archivosDeLosPaquetes(raiz: string = PAQUETES): string[] {
  const salida: string[] = [];
  const recorrer = (directorio: string): void => {
    for (const entrada of readdirSync(directorio)) {
      if (APARTADAS.has(entrada)) continue;
      const completa = join(directorio, entrada);
      if (statSync(completa).isDirectory()) {
        recorrer(completa);
        continue;
      }
      if (!EXTENSIONES.has(extname(entrada))) continue;
      salida.push(completa);
    }
  };
  recorrer(raiz);
  return salida;
}

export function leer(archivo: string): string {
  return readFileSync(archivo, 'utf8');
}
