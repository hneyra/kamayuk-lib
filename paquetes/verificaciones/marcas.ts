/**
 * **El arnés con el que se comprueba que un saco de textos está COMPLETO** (#19).
 *
 * <h2>La idea, que es la de `rentas`#103 y por el mismo motivo</h2>
 *
 * La pregunta «¿queda alguna cadena escrita dentro de un componente?» **no la contesta un escáner
 * de fuentes**: falla en las dos direcciones. Da rojos sobre cadenas que nunca se dibujan —una
 * clave, un `data-slot`, una clase de Tailwind— y se calla sobre las que sí, porque no sabe cuáles
 * llegan a la pantalla.
 *
 * Montando, la pregunta es la de verdad: **lo que se ve**. Se monta la pieza con un saco en el que
 * **cada palabra ha sido sustituida por su propia clave entre `⟦` y `⟧`**, y lo que salga al DOM sin
 * marcar es texto que no pasó por el saco. No hay forma de que un literal se cuele y esto lo ignore:
 * si se ve, se mide.
 *
 * <h2>La trampa que `rentas` pagó, y que aquí NO puede repetirse</h2>
 *
 * Allí la marca la ponía un `parseMissingKeyHandler`, o sea **que la clave faltara**. Cuando el
 * locale se llenó, dejó de faltar nada y la guarda se quedó sin marcar nada — verde y sin sujeto.
 * Aquí la marca **no depende de que falte nada**: se construye recorriendo el saco que existe, clave
 * a clave, así que una clave nueva se marca sola el día que se añade y una clave que desaparezca se
 * lleva su marca con ella.
 *
 * <h2>Y esto mira los ATRIBUTOS, no sólo los nodos de texto</h2>
 *
 * Es la diferencia con el arnés de `rentas`, y no es un adorno: en el armazón, **ocho de las
 * treinta y dos palabras no se dibujan en ninguna parte** —son nombres accesibles y marcadores:
 * `aria-label`, `placeholder`, `title`—. Un recorrido que sólo mire nodos de texto las da todas por
 * buenas, que es exactamente donde estaban escondidas las tres de la barra global. La lista de
 * atributos es la de los que un lector de pantalla anuncia o el navegador dibuja.
 */

/** Lo que abre una marca. Un carácter que no aparece en ningún texto del producto. */
export const ABRE = '⟦';

/** Lo que la cierra. */
export const CIERRA = '⟧';

/**
 * El mismo saco con cada palabra sustituida por su clave marcada.
 *
 * Recorre el saco **que existe**, así que es exhaustivo por construcción: una clave nueva entra
 * marcada sin que nadie lo recuerde. Las entradas que son función devuelven la marca y **se tragan
 * sus argumentos**, a propósito: lo que llevan dentro es un dato —un número, un filtro, el rótulo de
 * una hoja— y un dato no se traduce; dejarlo salir sin marcar sería pedirle a la guarda que lo
 * denunciara.
 */
export function marcarElSaco<T extends object>(saco: T): T {
  const marcado: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(saco)) {
    const marca = `${ABRE}${clave}${CIERRA}`;
    marcado[clave] = typeof valor === 'function' ? () => marca : marca;
  }
  return marcado as T;
}

/** Una marca suelta, para los datos que el consumidor aporta y el marco no traduce. */
export function marca(clave: string): string {
  return `${ABRE}${clave}${CIERRA}`;
}

/**
 * Los atributos por los que el texto llega a una persona sin pasar por un nodo de texto.
 *
 * Los tres primeros son los que este árbol usa de verdad; los demás entran porque son los otros
 * sitios donde una palabra se puede esconder, y una lista que sólo cubra lo de hoy deja el agujero
 * abierto para mañana.
 */
const ANUNCIADOS = [
  'aria-label',
  'placeholder',
  'title',
  'alt',
  'aria-placeholder',
  'aria-description',
  'aria-roledescription',
  'aria-valuetext',
] as const;

/** Un trozo de texto que llegó al DOM, con de dónde salió, para que el rojo diga dónde mirar. */
export interface TrozoVisible {
  readonly texto: string;
  /** `texto` si es un nodo de texto; si no, el nombre del atributo. */
  readonly por: string;
  /** La etiqueta que lo lleva, con su `data-slot` si tiene. */
  readonly donde: string;
}

/** De qué elemento cuelga un trozo, dicho para una persona. */
function donde(elemento: Element | null): string {
  if (elemento === null) return '?';
  const ranura = elemento.getAttribute('data-slot');
  return ranura === null ? elemento.tagName.toLowerCase() : `${elemento.tagName.toLowerCase()}[${ranura}]`;
}

/** Todo el texto visible o anunciable del árbol: nodos de texto y atributos. */
export function textoQueLlegaALaPersona(raiz: ParentNode): readonly TrozoVisible[] {
  const trozos: TrozoVisible[] = [];

  const paseo = document.createTreeWalker(raiz as Node, NodeFilter.SHOW_TEXT);
  let nodo = paseo.nextNode();
  while (nodo !== null) {
    const texto = (nodo.textContent ?? '').trim();
    if (texto !== '') {
      trozos.push({ texto, por: 'texto', donde: donde(nodo.parentElement) });
    }
    nodo = paseo.nextNode();
  }

  for (const elemento of raiz.querySelectorAll('*')) {
    for (const atributo of ANUNCIADOS) {
      const valor = elemento.getAttribute(atributo)?.trim() ?? '';
      if (valor !== '') {
        trozos.push({ texto: valor, por: atributo, donde: donde(elemento) });
      }
    }
  }

  return trozos;
}

/**
 * Lo que se escapó: lo que llegó a la persona sin marcar y sin estar declarado como dato.
 *
 * `startsWith` y no igualdad, por un caso medido: `sonner` **le pega su propio atajo** al nombre de
 * la región viva, así que el atributo sale como `⟦avisos⟧ alt+T`. Ese sufijo es de la librería y no
 * del producto; exigir igualdad obligaría a declarar una excepción por cada cosa que una librería
 * añada por su cuenta.
 */
export function loQueNoPasoPorElSaco(
  raiz: ParentNode,
  datos: ReadonlySet<string>,
): readonly TrozoVisible[] {
  return textoQueLlegaALaPersona(raiz).filter(
    (trozo) => !trozo.texto.startsWith(ABRE) && !datos.has(trozo.texto),
  );
}

/** El rojo, escrito para que diga dónde mirar y no sólo que algo falla. */
export function elRojo(escapadas: readonly TrozoVisible[], sujeto: string): string {
  return (
    `${sujeto} deja llegar texto que NO pasó por el saco:\n` +
    escapadas.map((e) => `  «${e.texto}»  (por ${e.por}, en ${e.donde})`).join('\n') +
    '\n\n  Ese texto no se puede traducir nunca, y nadie lo ve hasta que alguien pide un segundo\n' +
    '  idioma y aparece una pantalla a medias. Sácalo al saco de textos, o —si es un dato y no\n' +
    '  una palabra— decláralo en la lista de datos de esta guarda, con su motivo.'
  );
}
