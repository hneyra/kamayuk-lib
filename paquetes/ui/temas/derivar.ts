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
 * y eso no lo dice el token: lo dice la pantalla. Se declaran aparte: los tres de la barra **por
 * combinacion** (#41), porque lo que limita su blanco es cuanto admite la barra de debajo antes de
 * que lo que se lee encima baje del minimo de ese tema; los dos que apagan, por modo.
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
export type Identidad = 'institucional' | 'alto-contraste' | 'sepia' | 'clasico';

/**
 * Las identidades cuyo claro ES una paleta de origen, y no una derivacion (#56).
 *
 * Hasta #56 habia una, y por eso el origen era una comparacion de cadenas —`clave ===
 * 'institucional/claro'`— y la base era un argumento suelto. Con dos, la base de una identidad
 * deja de ser «la base»: es **la de su origen**, y pasarle a `clasico` la de `institucional`
 * tiene que ser imposible, no un descuido que produce un `clasico` azul marino.
 */
export type IdentidadDeOrigen = Extract<Identidad, 'institucional' | 'clasico'>;

/**
 * De que paleta de origen sale cada identidad. **Una fuente por identidad, y ninguna con dos.**
 *
 * `alto-contraste` y `sepia` son derivaciones del artboard de `institucional`, y lo siguen siendo:
 * #56 no las toca, y lo comprueba una guarda que compara sus bloques de `temas.css` byte a byte con
 * los de antes. `clasico` sale del suyo, que no es una derivacion de ninguno: es otro artboard.
 */
export const ORIGEN_DE: Readonly<Record<Identidad, IdentidadDeOrigen>> = {
  institucional: 'institucional',
  'alto-contraste': 'institucional',
  sepia: 'institucional',
  clasico: 'clasico',
};

/** Una paleta de origen: sus 38 colores y, si la declara, la fuente de las identidades que salen de ella. */
export interface Origen {
  readonly colores: ReadonlyMap<string, string>;
  readonly fuente: string | null;
}

/** Las paletas de origen, una por `IdentidadDeOrigen`. Se leen del CSS con `leerLosOrigenes()`. */
export type Origenes = Readonly<Record<IdentidadDeOrigen, Origen>>;

/** La identidad de una clave `identidad/modo`, comprobada: una que no existe revienta nombrandola. */
export function identidadDe(clave: string): Identidad {
  const identidad = clave.split('/')[0] ?? '';
  if (!(identidad in ORIGEN_DE)) {
    throw new Error(
      `«${clave}» no es de ninguna identidad conocida. Las que hay: ${Object.keys(ORIGEN_DE).join(', ')}.`,
    );
  }
  return identidad as Identidad;
}

/** La fuente de una identidad: la de su origen, o `null` si su origen no declara ninguna. */
export const fuenteDeLaIdentidad = (origenes: Origenes, identidad: Identidad): string | null =>
  origenes[ORIGEN_DE[identidad]].fuente;

/**
 * Las reglas, tema por tema.
 *
 * `institucional`/`claro` no esta: **es el origen**. La paleta del artboard se usa tal cual, sin
 * pasar por ninguna regla — si pasara, el tema que V8 dibuja seria una derivacion de si mismo y
 * un redondeo lo movería. Y desde #56 tampoco esta `clasico/claro`, por lo mismo: es el otro
 * origen (ver `ORIGEN_DE`).
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
    // El tramo bajo se subio de 0.82 a 0.84 en #38: con 0.82, `--sobre-barra-2` daba 4.40:1
    // sobre la barra CON HOVER —el blanco al 24 % DE ENTONCES ya mezclado, que es mas claro que la
    // barra; #41 lo bajo despues al 20 %— y
    // WCAG 1.4.3 pide 4.5:1 para los 11 px de la entidad. En reposo daba 6.20 y nadie lo medía.
    'sobre-barra': { a: [0.84, 0.97], croma: 0.5 },
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
    // El tramo alto bajo de 0.52 a 0.49 en #38: `--tinta-3` es la tinta mas palida y sobre
    // `--azul-suave` —la nota del modulo ACTIVO, a 10.5 px— daba 4.21:1 con el sepia roto y
    // 4.27:1 ya arreglado, contra los 4.90:1 que da el origen. O sea que la tinta terciaria del
    // sepia era mas palida que la de `institucional` respecto de sus propios papeles, y lo que
    // dice eso es la rampa. Con 0.49 da 4.84:1, que es el mismo sitio que el origen.
    tinta: { a: [0.24, 0.49], croma: 0.9, tono: 40 },
    filo: { a: [0.84, 0.78], croma: 1.2, tono: 70, cromaMinimo: 0.02 },
    // LA ACCION NO CAMBIA DE TONO, y el primer intento enseño por que: con el tono en 10° el
    // azul salia granate (#5f1d2c) — o sea del color del error. El sepia entibia el PAPEL y la
    // TINTA; la semantica del color se queda quieta. Desde #36 eso vale tambien para las cuatro
    // insignias, que se habian quedado fuera de esta misma frase.
    accion: { a: [0.42, 0.34], croma: 0.9 },
    'sobre-accion': { a: [0.98, 0.98], croma: 0, cromaMinimo: 0.014, tono: 75 },
    barra: { a: [0.3, 0.3], croma: 0.9, tono: 55 },
    'sobre-barra': { a: [0.84, 0.97], croma: 0.6, tono: 60 },
    // LA SEMANTICA TAMPOCO CAMBIA DE TONO, y es el mismo hallazgo que la accion, un paso mas
    // alla (#36). Con `tono: 20` y `tono: 10` los CUATRO semanticos derivaban al mismo rosa:
    // `ok` salia #fae1e0 y `mal` #fae0df, a distancia 1 en un canal. Una insignia «Conforme» y
    // una «Vencida» se pintaban sobre el mismo fondo, o sea que el color dejaba de decir nada.
    // Duele mas que en el azul: el azul mal rotado se ve feo; cuatro semanticos rotados al mismo
    // tono borran la diferencia entre un tramite al dia y una deuda en coactiva.
    'insignia-fondo': { a: [0.93, 0.9], croma: 1.1 },
    'insignia-tinta': { a: [0.4, 0.45], croma: 0.9 },
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
    // Ver `sepia/claro`: la semantica se queda quieta (#36).
    'insignia-fondo': { a: [0.32, 0.28], croma: 1 },
    'insignia-tinta': { a: [0.88, 0.82], croma: 0.9 },
    adorno: { a: [0.58, 0.52], croma: 0.9, tono: 30 },
    velo: { a: [0, 0], croma: 1 },
  },

  // CLASICO (#56). Se deriva de SU origen —`estilos/clasico.css`—, no del artboard de
  // `institucional`: las rampas se miden sobre esa paleta, asi que los mismos tramos hablan aqui
  // de SUS grises (tinta de #333 a #666) y de SU azul, y dan otros colores. Los numeros son hoy
  // los de `institucional/oscuro` —que ya resolvieron el orden del papel y la accion legible—, y
  // medidos sobre este origen pasan las mismas guardas sin tocar ninguno. Van COPIADOS y no
  // compartidos a proposito: una regla que se afine para `institucional` no puede mover `clasico`
  // sin que su PR lo mida.
  'clasico/oscuro': {
    papel: { a: [0.13, 0.22], croma: 0.6 },
    tinta: { a: [0.96, 0.7], croma: 0.7 },
    filo: { a: [0.32, 0.42], croma: 0.7 },
    accion: { a: [0.8, 0.7], croma: 0.9 },
    'sobre-accion': { a: [0.16, 0.16], croma: 0.2 },
    barra: { a: [0.24, 0.24], croma: 0.8 },
    'sobre-barra': { a: [0.84, 0.97], croma: 0.5 },
    'insignia-fondo': { a: [0.3, 0.26], croma: 0.8 },
    'insignia-tinta': { a: [0.86, 0.8], croma: 0.9 },
    adorno: { a: [0.55, 0.5], croma: 0.7 },
    velo: { a: [0, 0], croma: 1 },
  },
};

/** Cuanto blanco lleva cada uno de los tres velos de la barra. */
interface VelosDeLaBarra {
  /** El relleno del boton de busqueda en reposo. */
  readonly control: number;
  /** El disco del avatar, el separador vertical y el filo de la tecla rapida. */
  readonly realce: number;
  /** Lo que se le echa encima a cualquier boton de la barra al pasar el raton. */
  readonly hover: number;
}

/**
 * Los tres velos de la barra, POR COMBINACION Y NO POR MODO (#41).
 *
 * <h2>El defecto que obliga a esto</h2>
 *
 * El disco del avatar se pinta con `--barra-realce` DENTRO del boton de sesion, que al pasar el
 * raton se tiñe de `--barra-hover`. O sea que bajo las iniciales hay **dos velos blancos apilados
 * sobre la barra**, y su alfa no se suma: se compone. Con los del artboard —0.20 y 0.18— eso da un
 * 34.4 % de blanco en claro, y con los del modo oscuro —0.26 y 0.24— un **43.8 %**.
 *
 * Medido antes de este cambio, `--sobre-barra` sobre esa pila:
 *
 * ```
 *   institucional/claro   4.50      alto-contraste/claro   5.81      sepia/claro   4.36
 *   institucional/oscuro  3.65      alto-contraste/oscuro  4.64      sepia/oscuro  3.63
 * ```
 *
 * Cinco de las seis por debajo de su minimo —`alto-contraste` pide 7:1, y es el tema que existe
 * para no tener excepciones—, y la sexta pasaba **por el redondeo**: 4.4973 escrito como 4.50.
 *
 * <h2>Por que POR COMBINACION, y no por modo como estaban</h2>
 *
 * Porque lo que limita el blanco no es el modo: es **cuanto admite la barra de ESA combinacion
 * antes de que las iniciales bajen de su minimo**. Y eso depende de dos cosas que el modo no
 * dice — lo oscura que la identidad deja la barra, y que minimo pide esa identidad—. Medido sobre
 * la barra ya derivada, el alfa blanco TOTAL que cada una admite:
 *
 * ```
 *   institucional/claro   0.343     alto-contraste/claro   0.290     sepia/claro   0.332
 *   institucional/oscuro  0.371     alto-contraste/oscuro  0.324     sepia/oscuro  0.373
 * ```
 *
 * Ninguna de las seis cabe en los del artboard. `alto-contraste` es la mas estrecha con diferencia
 * —0.29 contra 0.344— y no por casualidad: su minimo es el AAA de WCAG, 7:1, y ese es el precio.
 *
 * <h2>Como se repartio la rebaja, y que se protegio al repartirla</h2>
 *
 * **El reposo primero.** `--barra-control` —el boton de busqueda quieto— y `--barra-realce` —el
 * separador y el disco— se quedan donde el artboard los puso siempre que la pila quepa sin
 * tocarlos; la rebaja sale de `--barra-hover`, que es el velo del estado que este defecto rompe.
 * Por eso en `institucional/claro` y `sepia/claro` la barra EN REPOSO es byte a byte la del
 * artboard y lo unico que se mueve es el hover.
 *
 * **Y el hover tiene un suelo**, porque un velo que no se ve no es un estado: se exige que pase
 * del de reposo por un margen parecido al del artboard —0.09 en claro, 0.10 en oscuro—. Ese suelo
 * es lo que obliga a bajar tambien `--barra-realce` en los oscuros y en `alto-contraste`: con el
 * realce intacto, el unico hover que cabia era mas oscuro que el propio reposo del boton.
 *
 * En `alto-contraste/oscuro` ni asi salia, y es la unica de las seis donde `--barra-control`
 * tambien baja: su barra es casi negra (#010a16), el 7:1 deja 0.324 de presupuesto, y con el
 * control en 0.14 no quedaba sitio para un hover que se distinguiera de el.
 */
/**
 * «Los translucidos de esta combinacion son los que declara su origen, tal cual» (#56).
 *
 * El de `institucional/claro` NO puede usarlo, y es la historia de #41: su origen es el artboard de
 * V8, cuyo hover al 18 % no cabe en su barra. `clasico/claro` si, porque su origen se escribio en
 * esta libreria ya medido contra su barra, y el issue lo pide «tal cual para los 38». Es una marca
 * y no la ausencia de la entrada a proposito: una combinacion que se olvide de declarar sus velos
 * tiene que seguir reventando, y no caer en silencio en los del origen.
 */
const DEL_ORIGEN = 'del-origen';

const VELOS_DE_LA_BARRA: Readonly<Record<string, VelosDeLaBarra | typeof DEL_ORIGEN>> = {
  // Reposo intacto: 0.09 y 0.2 son los del artboard. Solo cede el hover. Pila 0.336 <= 0.343.
  'institucional/claro': { control: 0.09, realce: 0.2, hover: 0.17 },
  // Pila 0.368 <= 0.371. El realce cede para que el hover pueda quedarse en 0.2, seis puntos por
  // encima del control: con el realce en 0.26 el hover no podia pasar de 0.15, o sea del reposo.
  'institucional/oscuro': { control: 0.14, realce: 0.21, hover: 0.2 },
  // Pila 0.286 <= 0.290. El 7:1 se lleva por delante un cuarto del blanco de la barra.
  'alto-contraste/claro': { control: 0.09, realce: 0.16, hover: 0.15 },
  // Pila 0.319 <= 0.324, y el unico control que baja. Ver el javadoc.
  'alto-contraste/oscuro': { control: 0.11, realce: 0.18, hover: 0.17 },
  // Reposo intacto, como en `institucional/claro`. Pila 0.328 <= 0.332.
  'sepia/claro': { control: 0.09, realce: 0.2, hover: 0.16 },
  // Pila 0.368 <= 0.373.
  'sepia/oscuro': { control: 0.14, realce: 0.21, hover: 0.2 },
  // Los del origen, tal cual: ver `DEL_ORIGEN`.
  'clasico/claro': DEL_ORIGEN,
  'clasico/oscuro': { control: 0.14, realce: 0.21, hover: 0.2 },
};

/**
 * Los dos velos que APAGAN, que siguen declarados por modo.
 *
 * No se apilan bajo ningun texto —lo que se lee sobre un dialogo esta ENCIMA, sobre una superficie
 * opaca— asi que no consumen el presupuesto de arriba y no hay nada que repartir por combinacion.
 * Lo unico que cambia entre los dos modos es cuanto tienen que oscurecer, porque lo que tapan ya
 * es oscuro en uno de los dos.
 */
const VELOS_QUE_APAGAN: Readonly<Record<Modo, Readonly<Record<string, string>>>> = {
  claro: {
    '--velo': 'rgba(0, 54, 90, 0.4)',
    '--velo-paleta': 'rgba(22, 35, 44, 0.38)',
  },
  oscuro: {
    '--velo': 'rgba(0, 0, 0, 0.62)',
    '--velo-paleta': 'rgba(0, 0, 0, 0.58)',
  },
};

const blancoAl = (alfa: number): string => `rgba(255, 255, 255, ${String(alfa)})`;

/** Los cinco translucidos de una combinacion, ya escritos como los escribe el artboard. */
function velosDe(clave: string, base: ReadonlyMap<string, string>): ReadonlyMap<string, string> {
  const barra = VELOS_DE_LA_BARRA[clave];
  if (barra === undefined) {
    throw new Error(
      `«${clave}» no declara sus velos de barra. Las que los declaran: ` +
        `${Object.keys(VELOS_DE_LA_BARRA).join(', ')}.`,
    );
  }
  if (barra === DEL_ORIGEN) {
    return new Map([...base].filter(([nombre]) => PAPELES[nombre] === 'velo'));
  }
  const modo: Modo = clave.endsWith('/oscuro') ? 'oscuro' : 'claro';
  return new Map<string, string>([
    ['--barra-control', blancoAl(barra.control)],
    ['--barra-realce', blancoAl(barra.realce)],
    ['--barra-hover', blancoAl(barra.hover)],
    ...Object.entries(VELOS_QUE_APAGAN[modo]),
  ]);
}

const esOpaco = (v: string): boolean => /^#[0-9a-f]{6}$/i.test(v.trim());

/** Lleva `x`, que esta en [min, max], al tramo `[a, b]` proporcionalmente. */
function remapear(x: number, min: number, max: number, [a, b]: readonly [number, number]): number {
  // Con un solo valor en la rampa no hay proporcion que conservar: se pone al principio del
  // tramo. Sin esta rama saldria una division por cero y un `NaN` que acabaria en `#000000`.
  if (max - min < 1e-6) return a;
  return a + ((x - min) / (max - min)) * (b - a);
}

/**
 * Deriva una paleta entera desde la de SU origen.
 *
 * @param origenes las paletas de origen, leidas del CSS con `leerLosOrigenes()`. Se reciben todas
 *   y se elige aqui la de la identidad (`ORIGEN_DE`): quien llama no puede equivocarse de base.
 * @param clave `identidad/modo`, p. ej. `sepia/oscuro`
 */
export function derivar(origenes: Origenes, clave: string): Map<string, string> {
  const identidad = identidadDe(clave);
  const base = origenes[ORIGEN_DE[identidad]].colores;
  // El origen no pasa por ninguna regla PARA SUS COLORES OPACOS. Ver el javadoc de REGLAS — y el
  // de `VELOS_DE_LA_BARRA`, que es la excepcion: los translucidos nunca se derivaron de la paleta
  // y desde #41 se declaran por combinacion, tambien para el origen, porque lo que los limita no
  // es de donde salen sino cuanto blanco admite la barra que tienen debajo.
  const esElOrigen = clave === `${ORIGEN_DE[identidad]}/claro`;
  const velos = velosDe(clave, base);
  const reglas = REGLAS[clave];
  if (!esElOrigen && reglas === undefined) {
    throw new Error(`No hay reglas para «${clave}». Las que hay: ${Object.keys(REGLAS).join(', ')}.`);
  }

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
      const declarado = velos.get(nombre);
      if (declarado === undefined) {
        throw new Error(`El translucido «${nombre}» no esta declarado para «${clave}».`);
      }
      salida.set(nombre, declarado);
      continue;
    }
    if (esElOrigen) {
      salida.set(nombre, valor);
      continue;
    }

    const regla = (reglas as Readonly<Record<Papel, Regla>>)[papel];
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

/**
 * Las ocho combinaciones, en orden estable.
 *
 * `clasico` va AL FINAL, y no por gusto (#56): `generar()` escribe los bloques en este orden, y
 * ponerla en medio desplazaria los de `sepia` en `temas.css` — o sea que el diff de un cambio que
 * no toca `sepia` diria que lo toca. Al final, los seis bloques de antes quedan donde estaban.
 */
export const COMBINACIONES: readonly string[] = [
  'institucional/claro',
  'institucional/oscuro',
  'alto-contraste/claro',
  'alto-contraste/oscuro',
  'sepia/claro',
  'sepia/oscuro',
  'clasico/claro',
  'clasico/oscuro',
];
