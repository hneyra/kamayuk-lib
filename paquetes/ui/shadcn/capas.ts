/**
 * **La pila de capas del producto, en un solo sitio.**
 *
 * Todo lo que se superpone lleva su `z-index` de aquí, y **de ningún otro sitio**: lo vigila
 * `las-capas-se-apilan.test.ts`, que barre `paquetes/` y sale en rojo ante una clase `z-…`
 * escrita en cualquier otro archivo de producción.
 *
 * <h2>Por qué esto existe, y no es orden por el orden</h2>
 *
 * Porque las piezas que se superponen **no se conocen entre sí**. Un `Cajon` y un `Desplegable`
 * van los dos a un portal en `document.body`, así que lo único que los ordena es el número. Cuando
 * ese número vive junto a la pieza que lo usa, nadie tiene delante la pila entera al elegirlo — y
 * el que se equivoca no lo dice: se ve bien y no se deja pulsar.
 *
 * **Pasó, dos veces, y lo encontró un navegador las dos.** En `pcf` (el Catastro Fiscal del MEF),
 * el desplegable de «Departamento» dentro de un `Cajon` se abría y ninguna opción respondía. El
 * registro del clic de Playwright lo dijo entero:
 *
 *     - element is visible, enabled and stable
 *     - <div data-slot="velo-del-cajon" class="fixed inset-0 z-[85] bg-velo"> intercepts pointer events
 *
 * La lista estaba en `z-50`, el velo del cajón en 85. La segunda vez fue el mismo síntoma con el
 * velo de la confirmación (88), en un diálogo que lleva cuatro desplegables dentro, uno de ellos
 * obligatorio: **el formulario no se podía rellenar**. Las 42 pruebas de `vitest` que lo montan
 * pasaban todas, porque **jsdom no maqueta, no apila y no tiene puntero**.
 *
 * <h2>La regla, escrita para no volver a descubrirla</h2>
 *
 * **Una superficie flotante tiene que estar por encima de CUALQUIER superficie desde la que se
 * pueda abrir.** Un desplegable, un menú o un emergente se abren desde una pantalla plana, desde
 * un cajón y desde una confirmación; luego van por encima de todas ellas.
 *
 * Y el reparo que parece obvio —«¿y si una confirmación tiene que tapar un desplegable abierto?»—
 * **no puede ocurrir**: `Confirmacion` es un diálogo modal de Radix y al abrirse atrapa el foco,
 * lo que cierra cualquier capa que estuviera desplegada. La lista y el velo sólo coinciden en
 * pantalla cuando la lista sale **de dentro** del diálogo, que es justo el caso que hay que dejar
 * pulsable.
 *
 * <h2>Por qué son cadenas literales y no números</h2>
 *
 * Porque Tailwind v4 descubre las clases **leyendo el texto de los archivos**. Un
 * `` `z-[${CAPA}]` `` compuesto en tiempo de ejecución no lo ve nadie y la regla no se emite:
 * saldría una pieza sin `z-index`, que es peor que el número equivocado. Escritas así, el barrido
 * las encuentra en este archivo igual que las encontraría en el componente.
 */

/* ── En el flujo del documento ───────────────────────────────────────────────────────────── */

/** La cabecera fija de una tabla, dentro de su propio contexto de apilado. No es de la pila global. */
export const CAPA_CABECERA_FIJA = 'z-[1]';

/* ── El armazón ──────────────────────────────────────────────────────────────────────────── */

/** La barra global. Por debajo de todo lo que se superpone, que es lo que la tapa a ella. */
export const CAPA_BARRA_GLOBAL = 'z-[79]';

/* ── Las superficies MODALES: cada una su velo y su panel ────────────────────────────────── */

export const CAPA_VELO_DE_LA_PALETA = 'z-[84]';
export const CAPA_PANEL_DE_LA_PALETA = 'z-[85]';
export const CAPA_VELO_DEL_CAJON = 'z-[85]';
export const CAPA_PANEL_DEL_CAJON = 'z-[86]';
export const CAPA_VELO_DE_CONFIRMACION = 'z-[88]';
export const CAPA_PANEL_DE_CONFIRMACION = 'z-[89]';

/* ── Las superficies FLOTANTES ───────────────────────────────────────────────────────────── */

/**
 * La lista de un desplegable, la de un menú y el cuerpo de un emergente.
 *
 * **Las tres comparten número a propósito**: las tres son la misma clase de superficie —se abren
 * desde otra— y ninguna puede estar abierta a la vez que otra, porque cada una atrapa el foco.
 * Darles números distintos sería inventar un orden entre cosas que nunca coinciden, y el siguiente
 * que añadiera una cuarta tendría que adivinar dónde encaja.
 */
export const CAPA_FLOTANTE = 'z-[90]';
