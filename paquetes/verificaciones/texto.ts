import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { archivosDe } from './archivos.mjs';

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

/**
 * Las herramientas comunes de las guardas: el recorrido, la normalizacion de rutas y el escaner de
 * lineas (#126).
 *
 * Como `sinComentarios`, **se importan de aqui y viven en un `.mjs`**, `archivos.mjs`, porque el
 * guion que un consumidor corre contra su arbol recorre y escanea igual y no tiene `tsc`. El porque
 * entero esta en el docblock de alli.
 */
export {
  APARTADAS,
  PRUEBAS,
  archivosDe,
  lineasDelTextoQueCasan,
  lineasQueCasan,
  rutaDesde,
} from './archivos.mjs';
export type { Hallazgo, LineaQueCasa } from './archivos.mjs';

/** Lo que las guardas de este arbol leen como codigo. */
const EXTENSIONES = ['.ts', '.tsx', '.mjs', '.js', '.css'] as const;

/**
 * Los archivos de **codigo de produccion** de los paquetes.
 *
 * Ni pruebas ni muestras: una prueba del cliente tiene que poder escribir `'/rentas/api/v1'`
 * —es justo lo que comprueba, que el prefijo sea un parametro— y una muestra existe para
 * violar la regla.
 */
export function archivosDeProduccion(raiz: string = PAQUETES): string[] {
  return archivosDe(raiz, { extensiones: EXTENSIONES });
}

/**
 * TODOS los archivos de los paquetes, pruebas incluidas, menos las muestras.
 *
 * La guarda del nombre publico mira tambien las pruebas: una prueba que importe por el nombre
 * publico resuelve aqui y documentaria, en el sitio donde se lee como si fuera el uso correcto,
 * justo la via que ningun consumidor tiene.
 */
export function archivosDeLosPaquetes(raiz: string = PAQUETES): string[] {
  return archivosDe(raiz, { extensiones: EXTENSIONES, pruebas: true });
}

export function leer(archivo: string): string {
  return readFileSync(archivo, 'utf8');
}
