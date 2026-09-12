/**
 * LA MUESTRA de `sin-nombre-publico-entre-paquetes`. Viola la regla A PROPOSITO.
 *
 * Esto es exactamente lo que `paquetes/sesion/escalera.ts` hacia hasta #4, y lo que resolvia aqui
 * por el `paths` del tsconfig mientras se rompia en el consumidor. Si alguien "arregla" este
 * archivo, la guarda se queda sin demostracion y sale roja sola.
 */
import { ErrorDeLaApi } from '@kamayuk/api';

export function esDeLaApi(x: unknown): boolean {
  return x instanceof ErrorDeLaApi;
}
