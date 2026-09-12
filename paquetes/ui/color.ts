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
 * El ratio de contraste de WCAG 2.1, de 1 a 21.
 *
 * 4.5:1 es el minimo para texto normal (1.4.3) y 3:1 para texto grande y para componentes de
 * interfaz (1.4.11). 7:1 es el nivel AAA, que es al que apunta el tema de alto contraste.
 */
export function contraste(uno: Hex, otro: Hex): number {
  const a = luminancia(uno);
  const b = luminancia(otro);
  const claro = Math.max(a, b);
  const oscuro = Math.min(a, b);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Redondeado a dos decimales, que es como se escriben los ratios en las guardas. */
export const ratio = (uno: Hex, otro: Hex): number =>
  Math.round(contraste(uno, otro) * 100) / 100;
