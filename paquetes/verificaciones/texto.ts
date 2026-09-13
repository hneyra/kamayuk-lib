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
 * Sin esto, cualquier guarda de texto obligaria a borrar la memoria del proyecto: los docblocks
 * de estos paquetes explican **de que archivo de que sistema salio cada pieza**, y esa
 * procedencia es la medicion que se hizo. Un comentario que dice «esto vivio en
 * `rentas/src/api/identidad.ts`» tiene que poder decirlo.
 *
 * El `(?<!:)` no es decorativo y viene de un defecto medido en `infrastructure`: el `//` de un
 * comentario NO va precedido de dos puntos, y el de una URL SI. Sin ese limite, `https://…` se
 * comia el resto de la linea y **un nombre dentro de cualquier URL quedaba invisible** — la
 * guarda equivalente dejo pasar en verde una URL con el nombre prohibido dentro. Cubre tambien
 * `jdbc:postgresql://` y cualquier otro esquema.
 */
export function sinComentarios(texto: string): string {
  // Cada comentario de bloque se vacia CONSERVANDO sus saltos de linea (#42). Sustituido por un
  // solo espacio se llevaba sus lineas con el, cada docblock restaba las suyas a todo lo de debajo
  // y el rojo de las guardas nombraba una linea que no era: medido, `identidad.ts:129` para un
  // `'/rentas/api/v1'` escrito en la 297; la 129 cae en mitad del docblock de `FallaDeLaPuerta`.
  const sinBloques = texto.replace(/\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, ' '));
  return sinBloques
    .split('\n')
    .map((linea) => {
      const limpia = linea.replace(/(?<!:)\/\/.*$/, '');
      // Una linea que EMPIEZA por `*` o por `//` es comentario. Solo al principio: a mitad de
      // linea se dejaria un `http://host/algo` sin mirar.
      return /^\s*(\*|\/\/)/.test(limpia) ? '' : limpia;
    })
    .join('\n');
}

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
