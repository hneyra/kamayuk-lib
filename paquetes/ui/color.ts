/**
 * El color, en OKLCH, y el contraste en WCAG 2.1.
 *
 * <h2>Por que OKLCH y no HSL</h2>
 *
 * Porque en HSL la luminosidad no es la que se ve. `hsl(60 100% 50%)` —amarillo— y
 * `hsl(240 100% 50%)` —azul— dicen los dos «50 % de luz» y uno deslumbra mientras el otro es casi
 * negro. Derivar un tema oscuro invirtiendo esa L daria colores con contrastes disparatados y
 * habria que corregirlos a mano uno a uno, que es exactamente lo que se queria evitar.
 *
 * En OKLab la L SI se corresponde con lo que el ojo percibe, asi que «invertir la luminosidad
 * conservando el tono» es una operacion con sentido y el resultado se puede razonar.
 *
 * <h2>El contraste se mide aparte, y en sRGB</h2>
 *
 * WCAG 2.1 define su ratio sobre la luminancia relativa de sRGB, no sobre la L de OKLab. Son dos
 * cosas distintas y aqui no se mezclan: OKLCH se usa para DERIVAR y el ratio de WCAG para
 * APROBAR. Un color derivado no se acepta porque su L cuadre: se acepta porque su ratio pasa.
 */

/** Un color opaco, como lo escribe el artboard: `#rrggbb`. */
export type Hex = string;

export interface Oklch {
  /** Luminosidad percibida, de 0 a 1. */
  readonly l: number;
  /** Croma. 0 es gris; por encima de ~0.37 se sale de sRGB en casi todos los tonos. */
  readonly c: number;
  /** Tono, en grados. */
  readonly h: number;
}

const HEX = /^#([0-9a-f]{6})$/i;

function componentes(hex: Hex): [number, number, number] {
  const casa = HEX.exec(hex.trim());
  if (casa === null) {
    throw new Error(`«${hex}» no es un color opaco de seis digitos. Los translucidos no se derivan.`);
  }
  const n = Number.parseInt(casa[1] ?? '', 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** sRGB con gamma -> lineal. */
const aLineal = (v: number): number => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};

/** Lineal -> sRGB con gamma, recortado al byte. */
const aGamma = (v: number): number => {
  const x = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(x * 255)));
};

export function hexAOklch(hex: Hex): Oklch {
  const [r8, g8, b8] = componentes(hex);
  const r = aLineal(r8);
  const g = aLineal(g8);
  const b = aLineal(b8);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.hypot(A, B);
  // `atan2` da (-180, 180]; se normaliza a [0, 360) para que un tono no cambie de signo al
  // cruzar el rojo y las comparaciones sigan teniendo sentido.
  const h = c < 1e-7 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

export function oklchAHex({ l, c, h }: Oklch): Hex {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;

  const r = aGamma(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_);
  const g = aGamma(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_);
  const b = aGamma(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_);

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** La luminancia relativa de WCAG 2.1. */
function luminancia(hex: Hex): number {
  const [r, g, b] = componentes(hex);
  return 0.2126 * aLineal(r) + 0.7152 * aLineal(g) + 0.0722 * aLineal(b);
}

/**
 * El ratio de contraste de WCAG 2.1, de 1 a 21. **SIN redondear, y este es el que se compara.**
 *
 * 4.5:1 es el minimo para texto normal (1.4.3) y 3:1 para texto grande y para componentes de
 * interfaz (1.4.11). 7:1 es el nivel AAA, que es al que apunta el tema de alto contraste.
 *
 * <h2>Por que la cifra cruda y no la de dos decimales</h2>
 *
 * Porque WCAG no dice «4.50 redondeado»: dice **4.5:1**. Hasta #48 esta funcion tenia encima una
 * `ratio()` que devolvia un NUMERO ya redondeado, y las guardas comparaban ese numero contra el
 * umbral. Eso mueve el umbral real a **4.495** —y lo mueve hacia el lado malo—: una pareja a
 * **4.4973:1** se escribia `4.50` y satisfacia el `>=`.
 *
 * No es hipotetico. Es lo que paso midiendo #41: el avatar sobre la barra con hover en
 * `institucional/claro` daba exactamente 4.4973 y la guarda lo daba por bueno, asi que el issue
 * conto «cuatro de las seis» cuando eran cinco.
 */
export function contraste(uno: Hex, otro: Hex): number {
  const a = luminancia(uno);
  const b = luminancia(otro);
  const claro = Math.max(a, b);
  const oscuro = Math.min(a, b);
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Redondea PARA EL MENSAJE, y **devuelve texto a proposito** (#48).
 *
 * El redondeo si hace falta: un rojo que diga «4.4973:1» no ayuda a nadie. Lo que sobra es
 * redondear **para decidir**. La forma de que nadie vuelva a confundir las dos cosas no es un
 * comentario sino el TIPO: una cadena no se compara contra un umbral sin que `tsc` lo diga, y
 * `'4.50' >= 4.5` ni siquiera se escribe. Un numero redondeado, en cambio, entra en un
 * `>=` sin hacer ruido — que es exactamente como llego el defecto.
 */
export const aLaVista = (valor: number, decimales: number): string => valor.toFixed(decimales);

/**
 * El ratio **como se escribe en un mensaje**: dos decimales, y texto.
 *
 * A dos decimales porque es como se escriben los ratios en las guardas y en `EXCEPCIONES`. Para
 * DECIDIR se usa `contraste()`, que no redondea.
 */
export const ratio = (uno: Hex, otro: Hex): string => aLaVista(contraste(uno, otro), 2);

/**
 * El ratio para un mensaje que dice **que no llega**: dos decimales, y cuatro cuando a dos
 * decimales no se ve por que no llega (#48).
 *
 * Sin esto, la franja que este issue destapa produce rojos que se leen como una contradiccion:
 * una pareja a 4.497210:1 sale «4.50:1, y texto pide 4.5:1», y quien lo lee se va a buscar el
 * defecto a la guarda en vez de al color. El redondeo existe para que el mensaje SE LEA —«4.4973»
 * no ayuda a nadie—, asi que se afloja exactamente donde dejaria de leerse, y en ningun otro
 * sitio: el umbral no se toca, y quien decide sigue siendo `contraste()`.
 */
export const ratioQueNoLlega = (uno: Hex, otro: Hex, exigido: number): string => {
  const crudo = contraste(uno, otro);
  return aLaVista(crudo, Number(aLaVista(crudo, 2)) >= exigido ? 4 : 2);
};

/**
 * Un color translucido, como lo escribe el artboard: `rgba(r, g, b, a)`.
 *
 * El alfa es opcional porque `rgb(...)` es legal y vale lo mismo que un alfa de 1.
 */
const RGBA = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

/**
 * El color QUE SE VE cuando se apila una capa translucida sobre lo que hay debajo.
 *
 * <h2>Por que hace falta, y por que no vale medir el token de reposo</h2>
 *
 * Porque los tres translucidos de la barra —`--barra-control`, `--barra-realce` y
 * `--barra-hover`— no se ven NUNCA con su propio color: se ven mezclados con la barra. Medir
 * `--sobre-barra-2` contra `--azul-oscuro` responde a «¿se lee la entidad sobre la barra?», que
 * es una pregunta distinta de «¿se lee la entidad cuando el raton esta encima?» — y esa segunda
 * la contesta el blanco del hover ya mezclado —entre el 15 % y el 20 %, segun la combinacion—, que
 * es mas claro y por tanto contrasta MENOS con un
 * texto claro. El hover BAJA el contraste, y ese es justo el estado que nadie media (#38).
 *
 * La mezcla es la de `source-over` en sRGB con gamma, que es lo que hace el navegador con un
 * `background-color` translucido: componente a componente, `capa * a + fondo * (1 - a)`. No se
 * hace en lineal a proposito — el navegador tampoco lo hace, y lo que hay que reproducir es lo
 * que se VE, no lo que seria fisicamente correcto.
 */
export function componer(capa: string, fondo: Hex): Hex {
  const casa = RGBA.exec(capa.trim());
  if (casa === null) {
    // Una capa opaca tapa lo de abajo, y ademas hay que decirlo: si un token deja de ser
    // translucido, apilarlo silenciosamente devolveria el mismo color y la pila perderia sentido
    // sin que nada lo dijera.
    if (HEX.test(capa.trim())) return capa.trim();
    throw new Error(`«${capa}» no es un color: ni #rrggbb ni rgba(r, g, b, a).`);
  }
  const alfa = casa[4] === undefined ? 1 : Number(casa[4]);
  const capaRgb = [Number(casa[1]), Number(casa[2]), Number(casa[3])] as const;
  const fondoRgb = componentes(fondo);
  const mezcla = capaRgb.map((c, i) => Math.round(c * alfa + (fondoRgb[i] ?? 0) * (1 - alfa)));
  return `#${mezcla.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Apila varias capas y devuelve el color resultante. La PRIMERA es la de arriba; la ultima, el
 * fondo opaco.
 *
 * `['--barra-realce', '--barra-hover', '--azul-oscuro']` es lo que dibuja el avatar de la barra
 * cuando el raton esta sobre el boton de sesion: tres capas, y el color que se lee encima no
 * contrasta contra ninguna de las tres sino contra la suma.
 */
export function apilar(capas: readonly string[]): Hex {
  const abajo = capas[capas.length - 1];
  if (abajo === undefined) throw new Error('Una pila de capas no puede estar vacia.');
  if (!HEX.test(abajo.trim())) {
    throw new Error(`La capa de abajo de una pila tiene que ser opaca, y «${abajo}» no lo es.`);
  }
  let visto: Hex = abajo.trim();
  for (let i = capas.length - 2; i >= 0; i--) visto = componer(capas[i] ?? '', visto);
  return visto;
}

/**
 * La distancia CROMATICA entre dos colores: la del plano a/b de OKLab, SIN la luminosidad.
 *
 * <h2>Por que sin la luminosidad</h2>
 *
 * Porque dos rellenos que solo se diferencian en lo claros que son se leen como «el mismo color,
 * uno mas palido» — y lo que una insignia tiene que decir no es «mas palido» sino «conforme» o
 * «vencida». Eso lo lleva el TONO. En `sepia` los cuatro fondos semanticos conservaban cuatro
 * luminosidades distintas y aun asi eran el mismo rosa (#36): una distancia que incluyera la L
 * habria dicho que `ok` y `atencion` estaban a 0.0325 —mas lejos que `ok` y `mal` en
 * `alto-contraste`, que es correcto— y no habria cazado nada.
 *
 * Se mide en OKLab y no en HSL por lo mismo que se deriva en OKLCH: en OKLab la distancia entre
 * dos colores se parece a lo que el ojo llama «distintos», y en HSL no.
 */
/**
 * La distancia de LUMINOSIDAD entre dos colores: la L de OKLab, y solo la L.
 *
 * <h2>Para que hace falta, si ya esta el ratio de contraste</h2>
 *
 * Porque el ratio contesta «¿se lee?» y esta contesta «¿se distinguen?», y son dos preguntas
 * distintas cuando los dos colores son texto. Un dia del mes vecino en el calendario tiene que
 * estar ATENUADO respecto de un dia del mes —si no, el mes deja de tener bordes— y a la vez
 * seguir siendo legible (#39). El ratio entre los dos tokens no sirve para eso: entre dos grises
 * oscuros sobre papel blanco da cifras cercanas a 1 que no dicen nada de lo separados que se ven.
 *
 * Se mide en OKLab por lo mismo que se deriva en OKLCH: ahi la L es la que el ojo percibe, asi que
 * «0.05 de diferencia» significa lo mismo en la zona clara y en la oscura de la escala.
 *
 * Es la hermana de `distanciaCromatica()`, y cada una deja fuera lo que a la otra le sobra: dos
 * rellenos de insignia se distinguen por el TONO —lo palidos que sean no dice «conforme» ni
 * «vencida»— y dos tintas del mismo gris se distinguen por la LUZ.
 */
export function distanciaDeLuminosidad(uno: Hex, otro: Hex): number {
  // SIN redondear, por lo mismo que `contraste()` (#48): quien decide es esta cifra, y
  // redondearla antes del `>=` corre el umbral medio paso hacia el lado malo. Para escribirla se
  // usa `aLaVista(d, 4)` —cuatro decimales, la misma escala que `distanciaCromatica()`: la
  // separacion entre dos tintas vecinas vive entre 0.05 y 0.12, asi que dos decimales las
  // igualaria de tres en tres—.
  return Math.abs(hexAOklch(uno).l - hexAOklch(otro).l);
}

export function distanciaCromatica(uno: Hex, otro: Hex): number {
  const ab = (hex: Hex): [number, number] => {
    const { c, h } = hexAOklch(hex);
    const rad = (h * Math.PI) / 180;
    return [c * Math.cos(rad), c * Math.sin(rad)];
  };
  const [a1, b1] = ab(uno);
  const [a2, b2] = ab(otro);
  // SIN redondear, por lo mismo que `contraste()` (#48). Para escribirla se usa `aLaVista(d, 4)`
  // —cuatro decimales, que es la escala en la que se escribe: el croma de un relleno suave vive
  // entre 0.01 y 0.04, asi que dos decimales los haria todos iguales a cero—.
  return Math.hypot(a1 - a2, b1 - b2);
}
