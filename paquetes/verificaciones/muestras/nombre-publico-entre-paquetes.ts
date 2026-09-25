/**
 * LA MUESTRA de `sin-nombre-publico-entre-paquetes`. Viola la regla A PROPOSITO.
 *
 * Esto es exactamente lo que `paquetes/sesion/escalera.ts` hacia hasta #4, y lo que resolvia aqui
 * por el `paths` del tsconfig mientras se rompia en el consumidor. Si alguien "arregla" este
 * archivo, la guarda se queda sin demostracion y sale roja sola.
 *
 * Y lleva, desde #112, **una linea por cada forma de importar** que la guarda tiene que ver: la
 * prueba exige hallar cada una por su texto. Las tres del medio se le escapaban a la expresion
 * regular de antes —el import de efecto, con subcamino y sin el, y el subcamino detras de un
 * `from`—, y `ui` publica de verdad `./estilos.css`, asi que la segunda es la que un paquete
 * escribiria. La ultima linea es un comentario y NO cuenta.
 *
 * Las dos `export * as` las anadio la segunda verificacion independiente de #112: la expresion
 * regular de antes SI las veia —llevan `from '…'`— y `ts.preProcessFile`, el primer analizador que
 * se uso aqui, no; asi que la guarda nueva era, para esa forma, peor que la vieja.
 */
import { ErrorDeLaApi } from '@kamayuk/api';
import '@kamayuk/ui';
import '@kamayuk/ui/estilos.css';
import { PROHIBICIONES } from '@kamayuk/verificaciones/prohibiciones';
export { crearCliente } from '@kamayuk/api';
export * as api from '@kamayuk/api';
export type * as ui from '@kamayuk/ui';

export function esDeLaApi(x: unknown): boolean {
  return x instanceof ErrorDeLaApi && PROHIBICIONES.length > 0;
}

export const laSesion = () => import('@kamayuk/sesion');

// import '@kamayuk/ui';
