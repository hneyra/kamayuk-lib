/**
 * Dejar solo lo que NO es comentario, **en JavaScript y no en TypeScript** (#92).
 *
 * Vivia dentro de `texto.ts`, que es quien lo sigue publicando —los guardas lo importan de alli y
 * ninguno cambia—. Se muda aqui porque hace falta **tambien fuera del comprobador**: el guion
 * `el-arnes-del-request-no-se-copia.mjs` lo ejecuta un consumidor con `node`, contra su propio
 * arbol, sin Vite ni `tsc` que transformen nada. Escribirlo dos veces —una en `.ts` para las
 * guardas de aqui y otra en `.mjs` para el guion— es exactamente el defecto que #92 cierra un piso
 * mas arriba: la copia que se queda vieja es la que vigila.
 *
 * <h2>Por que los comentarios se omiten, y no es comodidad</h2>
 *
 * Sin esto, cualquier guarda de texto obligaria a borrar la memoria del proyecto: los docblocks de
 * estos paquetes explican **de que archivo de que sistema salio cada pieza**, y esa procedencia es
 * la medicion que se hizo. Un comentario que dice «esto vivio en `rentas/src/api/identidad.ts`»
 * tiene que poder decirlo.
 *
 * El `(?<!:)` no es decorativo y viene de un defecto medido en `infrastructure`: el `//` de un
 * comentario NO va precedido de dos puntos, y el de una URL SI. Sin ese limite, `https://…` se
 * comia el resto de la linea y **un nombre dentro de cualquier URL quedaba invisible** — la guarda
 * equivalente dejo pasar en verde una URL con el nombre prohibido dentro. Cubre tambien
 * `jdbc:postgresql://` y cualquier otro esquema.
 *
 * @param {string} texto
 * @returns {string} el mismo texto con los comentarios en blanco, linea por linea
 */
export function sinComentarios(texto) {
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
