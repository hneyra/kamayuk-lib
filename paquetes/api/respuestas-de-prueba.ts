import { vi } from 'vitest';

/**
 * **Lo que el backend contesta en las pruebas del cliente, escrito una vez** (#127).
 *
 * Hasta #127 `fetchQueContesta` y `problema` estaban copiados letra a letra en `cliente.test.ts` y
 * en `descargar.test.ts`, y la segunda copia lo reconocia en su docblock: «lo mismo que en
 * `cliente.test.ts`». Una copia que avisa de que es copia es la que se queda vieja primero.
 *
 * <h2>Por que este archivo no lleva `.test.` en el nombre, y lo que eso implica</h2>
 *
 * Porque no tiene pruebas: con `.test.` Vitest lo cargaria como una suite vacia. Sin el, las guardas
 * lo leen como codigo de produccion de `@kamayuk/api` —`sin-suponer-un-sistema` le barre los
 * prefijos, `el-xhr-vive-en-un-solo-sitio` y `la-peticion-se-compone-en-un-solo-sitio` lo recorren—,
 * y **eso es lo que se quiere**: el arnes no nombra ningun sistema ni compone ninguna peticion, y
 * si un dia lo hiciera, que salga rojo. Lo declara el centinela de `sin-suponer-un-sistema`. No se
 * exporta desde `index.ts`: no viaja en el paquete servido.
 */

/**
 * Sustituye `fetch` por uno que contesta lo que se le diga, y devuelve el espia.
 *
 * **Clona en cada llamada.** Un `Response` solo se puede leer una vez, asi que devolver el mismo
 * objeto dos veces hace que la segunda peticion muera con «Body has already been read» — un rojo
 * que habla del arnes y no de lo que se estaba midiendo.
 *
 * Lo pone con `vi.stubGlobal`: la suite que lo usa lo devuelve con `vi.unstubAllGlobals()` en su
 * `afterEach`.
 */
export function fetchQueContesta(respuesta: Response) {
  const espia = vi.fn<typeof fetch>(() => Promise.resolve(respuesta.clone()));
  vi.stubGlobal('fetch', espia);
  return espia;
}

/** Un `problem+json` con la forma que publica la cadena de identidad: CUATRO miembros. */
export function problema(estado: number, codigo: string, mensaje: string): Response {
  return new Response(JSON.stringify({ status: estado, title: mensaje, codigo, mensaje }), {
    status: estado,
    headers: { 'content-type': 'application/problem+json' },
  });
}
