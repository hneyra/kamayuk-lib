import { hexAOklch, oklchAHex, type Hex, type Oklch } from '../color.ts';
import { PAPELES, type Papel } from './papeles.ts';

/**
 * De la paleta del artboard a las otras cinco, con reglas y no a mano.
 *
 * <h2>Que se escribe aqui, y que no</h2>
 *
 * Se escriben **las reglas**: para cada papel —papel, tinta, filo, accion, insignia— a donde va su
 * rampa de luminosidad y cuanto croma conserva. Son unos pocos numeros por tema.
 *
 * NO se escriben los colores. Doscientos hex escritos a mano son doscientas decisiones que nadie
 * tomo y que nadie puede revisar; y el dia que el artboard cambie un azul, hay que volver a
 * tomarlas todas. Con reglas, se vuelve a correr.
 *
 * <h2>Por que una rampa y no una formula por color</h2>
 *
 * Porque lo que hay que conservar no es cada valor sino **el orden y la separacion** dentro de su
 * papel: `--tinta`, `--tinta-2` y `--tinta-3` son tres grises que se distinguen entre si, y un
 * `1 - l` aplicado a cada uno por separado los deja casi juntos. Se mide la rampa entera del papel
 * en el origen y se lleva, reversible y proporcionalmente, al tramo que le toca en el destino.
 *
 * <h2>Lo que NO se deriva</h2>
 *
 * Los cinco translucidos —tres de la barra y dos velos—. Su color depende de sobre que se pintan,
 * y eso no lo dice el token: lo dice la pantalla. Se declaran aparte, por tema.
 */

/** A donde va la rampa de un papel, y cuanto croma conserva. */
interface Regla {
  /** El tramo de luminosidad destino, en el orden en que hay que leerlo. */
  readonly a: readonly [number, number];
  /** Multiplicador del croma. Menos de 1 apaga; mas de 1 satura. */
  readonly croma: number;
  /**
   * El tono, en grados ABSOLUTOS. Para el sepia.
   *
   * Absoluto y no un delta, y lo enseño el primer intento: la paleta base es azul —`--tinta` esta
   * sobre los 250°— asi que sumarle 40° daba purpura, no ambar. Un delta conserva la distancia
   * entre tonos, que aqui no interesa: lo que se quiere es que TODO el papel y TODA la tinta
   * caigan en el calido, vinieran de donde vinieran.
   */
  readonly tono?: number;
  /**
   * Croma MINIMO. Se anade, no se multiplica.
   *
   * Lo enseño el sepia: `--superficie` es `#ffffff`, croma 0, y multiplicar cero por 1.6 sigue
   * siendo cero — el papel salia gris. Un tono no tiñe lo que no tiene color; hay que darselo.
   */
  readonly cromaMinimo?: number;
}

export type Modo = 'claro' | 'oscuro';
export type Identidad = 'institucional' | 'alto-contraste' | 'sepia';

/**
 * Las reglas, tema por tema.
 *
 * `institucional`/`claro` no esta: **es el origen**. La paleta del artboard se usa tal cual, sin
 * pasar por ninguna regla — si pasara, el tema que V8 dibuja seria una derivacion de si mismo y
 * un redondeo lo movería.
 */
const REGLAS: Readonly<Record<string, Readonly<Record<Papel, Regla>>>> = {
  // El oscuro: se invierte la luminosidad y se baja el croma, porque un color saturado sobre
  // fondo oscuro deslumbra. Ningun papel llega al negro puro: sobre OLED produce halo y es mas
  // duro de lo que la metafora del papel necesita.
  'institucional/oscuro': {
    // EL PAPEL CONSERVA SU ORDEN, y el resto de papeles lo invierten. Medido: con el orden
    // invertido, `--superficie` salia #090909 y `--fondo` #0f1012 — la tarjeta mas OSCURA que el
    // lienzo. En claro la tarjeta es blanca sobre lienzo gris, o sea mas clara; en oscuro tiene
    // que seguir siendo mas clara, porque la elevacion se lee con luz en los dos modos. El
    // contraste no lo caza: las dos parejas pasaban.
    papel: { a: [0.13, 0.22], croma: 0.6 },
    tinta: { a: [0.96, 0.7], croma: 0.7 },
    filo: { a: [0.32, 0.42], croma: 0.7 },
    // La accion se sube hasta que el enlace se lea sobre la tarjeta: con el tramo en
    // [0.72, 0.58] daba 4.07:1 y WCAG 1.4.3 pide 4.5:1. Se mueve la REGLA, no el color.
    accion: { a: [0.8, 0.7], croma: 0.9 },
    'sobre-accion': { a: [0.16, 0.16], croma: 0.2 },
    barra: { a: [0.24, 0.24], croma: 0.8 },
    'sobre-barra': { a: [0.82, 0.97], croma: 0.5 },
    'insignia-fondo': { a: [0.3, 0.26], croma: 0.8 },
    'insignia-tinta': { a: [0.86, 0.8], croma: 0.9 },
    adorno: { a: [0.55, 0.5], croma: 0.7 },
    velo: { a: [0, 0], croma: 1 },
  },

  // Alto contraste: los mismos tonos, la luminosidad empujada a los extremos y el croma casi
  // apagado. Los rellenos suaves dejan de ser suaves y los filos se vuelven solidos.
  'alto-contraste/claro': {
    papel: { a: [0.97, 1], croma: 0.15 },
    tinta: { a: [0.05, 0.22], croma: 0.3 },
    filo: { a: [0.3, 0.4], croma: 0.3 },
    accion: { a: [0.32, 0.24], croma: 0.8 },
    'sobre-accion': { a: [1, 1], croma: 0 },
    barra: { a: [0.2, 0.2], croma: 0.5 },
    'sobre-barra': { a: [0.92, 1], croma: 0.1 },
    'insignia-fondo': { a: [0.95, 0.92], croma: 0.5 },
    'insignia-tinta': { a: [0.22, 0.28], croma: 0.7 },
    adorno: { a: [0.45, 0.4], croma: 0.5 },
    velo: { a: [0, 0], croma: 1 },
  },
  'alto-contraste/oscuro': {
    papel: { a: [0.08, 0.16], croma: 0.15 },
    tinta: { a: [1, 0.88], croma: 0.3 },
    filo: { a: [0.7, 0.6], croma: 0.3 },
    accion: { a: [0.86, 0.78], croma: 0.8 },
    'sobre-accion': { a: [0.08, 0.08], croma: 0 },
    barra: { a: [0.14, 0.14], croma: 0.4 },
    'sobre-barra': { a: [0.94, 1], croma: 0.1 },
    'insignia-fondo': { a: [0.2, 0.24], croma: 0.5 },
    'insignia-tinta': { a: [0.95, 0.9], croma: 0.7 },
    adorno: { a: [0.62, 0.56], croma: 0.5 },
    velo: { a: [0, 0], croma: 1 },
  },

  // Sepia: papel calido y tinta calida, para jornadas largas de lectura. El tono se rota hacia
  // el ambar y el papel gana algo de croma; la accion se mantiene reconocible.
  'sepia/claro': {
    papel: { a: [0.94, 0.965], croma: 1.6, tono: 75, cromaMinimo: 0.018 },
    tinta: { a: [0.24, 0.52], croma: 0.9, tono: 40 },
    filo: { a: [0.84, 0.78], croma: 1.2, tono: 70, cromaMinimo: 0.02 },
    // LA ACCION NO CAMBIA DE TONO, y el primer intento enseño por que: con el tono en 10° el
    // azul salia granate (#5f1d2c) — o sea del color del error. El sepia entibia el PAPEL y la
    // TINTA; la semantica del color se queda quieta.
    accion: { a: [0.42, 0.34], croma: 0.9 },
    'sobre-accion': { a: [0.98, 0.98], croma: 0, cromaMinimo: 0.014, tono: 75 },
    barra: { a: [0.3, 0.3], croma: 0.9, tono: 55 },
    'sobre-barra': { a: [0.84, 0.97], croma: 0.6, tono: 60 },
    'insignia-fondo': { a: [0.93, 0.9], croma: 1.1, tono: 20 },
    'insignia-tinta': { a: [0.4, 0.45], croma: 0.9, tono: 10 },
    adorno: { a: [0.7, 0.65], croma: 0.9, tono: 30 },
    velo: { a: [0, 0], croma: 1 },
  },
  'sepia/oscuro': {
    papel: { a: [0.17, 0.24], croma: 1.4, tono: 70, cromaMinimo: 0.012 },
    tinta: { a: [0.93, 0.7], croma: 0.9, tono: 40 },
    filo: { a: [0.36, 0.44], croma: 1.2, tono: 70, cromaMinimo: 0.015 },
    accion: { a: [0.76, 0.62], croma: 0.9 },
    'sobre-accion': { a: [0.18, 0.18], croma: 0.4, tono: 60 },
    barra: { a: [0.22, 0.22], croma: 0.9, tono: 55 },
    'sobre-barra': { a: [0.82, 0.95], croma: 0.6, tono: 60 },
    'insignia-fondo': { a: [0.32, 0.28], croma: 1, tono: 20 },
    'insignia-tinta': { a: [0.88, 0.82], croma: 0.9, tono: 10 },
    adorno: { a: [0.58, 0.52], croma: 0.9, tono: 30 },
    velo: { a: [0, 0], croma: 1 },
  },
};

/** Los translucidos, declarados por modo. Ver el javadoc: no se derivan. */
const TRANSLUCIDOS: Readonly<Record<Modo, Readonly<Record<string, string>>>> = {
  claro: {
    '--barra-control': 'rgba(255, 255, 255, 0.09)',
    '--barra-realce': 'rgba(255, 255, 255, 0.2)',
    '--barra-hover': 'rgba(255, 255, 255, 0.18)',
    '--velo': 'rgba(0, 54, 90, 0.4)',
    '--velo-paleta': 'rgba(22, 35, 44, 0.38)',
  },
  oscuro: {
    // Sobre una barra ya oscura, un realce blanco al 9 % no se ve. Se sube.
    '--barra-control': 'rgba(255, 255, 255, 0.14)',
    '--barra-realce': 'rgba(255, 255, 255, 0.26)',
    '--barra-hover': 'rgba(255, 255, 255, 0.24)',
    // Y el velo tiene que oscurecer mas, porque lo que tapa ya es oscuro.
    '--velo': 'rgba(0, 0, 0, 0.62)',
    '--velo-paleta': 'rgba(0, 0, 0, 0.58)',
  },
};

const esOpaco = (v: string): boolean => /^#[0-9a-f]{6}$/i.test(v.trim());

/** Lleva `x`, que esta en [min, max], al tramo `[a, b]` proporcionalmente. */
function remapear(x: number, min: number, max: number, [a, b]: readonly [number, number]): number {
  // Con un solo valor en la rampa no hay proporcion que conservar: se pone al principio del
  // tramo. Sin esta rama saldria una division por cero y un `NaN` que acabaria en `#000000`.
  if (max - min < 1e-6) return a;
  return a + ((x - min) / (max - min)) * (b - a);
}

/**
 * Deriva una paleta entera desde la del artboard.
 *
 * @param base los tokens del artboard, `--nombre` -> valor
 * @param clave `identidad/modo`, p. ej. `sepia/oscuro`
 */
export function derivar(base: ReadonlyMap<string, string>, clave: string): Map<string, string> {
  if (clave === 'institucional/claro') {
    // El origen no pasa por ninguna regla. Ver el javadoc de REGLAS.
    return new Map(base);
  }
  const reglas = REGLAS[clave];
  if (reglas === undefined) {
    throw new Error(`No hay reglas para «${clave}». Las que hay: ${Object.keys(REGLAS).join(', ')}.`);
  }
  const modo: Modo = clave.endsWith('/oscuro') ? 'oscuro' : 'claro';

  // La rampa de cada papel EN EL ORIGEN: de que luminosidad a que luminosidad va.
  const rampas = new Map<Papel, { min: number; max: number }>();
  for (const [nombre, valor] of base) {
    const papel = PAPELES[nombre];
    if (papel === undefined || !esOpaco(valor)) continue;
    const { l } = hexAOklch(valor);
    const previo = rampas.get(papel);
    rampas.set(papel, {
      min: Math.min(previo?.min ?? l, l),
      max: Math.max(previo?.max ?? l, l),
    });
  }

  const salida = new Map<string, string>();
  for (const [nombre, valor] of base) {
    const papel = PAPELES[nombre];
    if (papel === undefined) {
      // Un token sin papel declarado NO se deja pasar tal cual: pasaria al tema nuevo con el
      // color del viejo y se veria mal en una sola de las seis combinaciones, que es el defecto
      // mas caro de ver.
      throw new Error(
        `«${nombre}» no tiene papel declarado en \`papeles.ts\`, asi que no se sabe como derivarlo.`,
      );
    }
    if (papel === 'velo') {
      const declarado = TRANSLUCIDOS[modo][nombre];
      if (declarado === undefined) {
        throw new Error(`El translucido «${nombre}» no esta declarado para el modo «${modo}».`);
      }
      salida.set(nombre, declarado);
      continue;
    }

    const regla = reglas[papel];
    const rampa = rampas.get(papel);
    const { l, c, h } = hexAOklch(valor);
    const derivado: Oklch = {
      l: remapear(l, rampa?.min ?? l, rampa?.max ?? l, regla.a),
      c: Math.max(c * regla.croma, regla.cromaMinimo ?? 0),
      h: regla.tono === undefined ? h : regla.tono,
    };
    salida.set(nombre, oklchAHex(derivado) as Hex);
  }
  return salida;
}

/** Las seis combinaciones, en orden estable. */
export const COMBINACIONES: readonly string[] = [
  'institucional/claro',
  'institucional/oscuro',
  'alto-contraste/claro',
  'alto-contraste/oscuro',
  'sepia/claro',
  'sepia/oscuro',
];
