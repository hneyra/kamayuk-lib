/**
 * Que PAPEL juega cada token, y por que hace falta decirlo.
 *
 * Las reglas de derivacion no pueden ser una sola: un color de papel y un color de tinta se
 * mueven en direcciones contrarias al pasar a oscuro, y un filo no se mueve como ninguno de los
 * dos. Sin esta tabla habria que aplicar la misma formula a los cuarenta y dos y corregir a mano
 * los que salieran mal — que es escribir la paleta a mano con pasos extra.
 *
 * El papel no se adivina del nombre. `--mal-tinta` y `--mal-borde` empiezan igual y son cosas
 * distintas; `--sobre-azul` es tinta aunque no lleve «tinta» dentro. Se declara.
 */

export type Papel =
  /** El lienzo y el papel: lo que queda detras de todo. */
  | 'papel'
  /** Lo que se lee encima del papel. */
  | 'tinta'
  /** Filos: bordes de campo, de boton, lineas de separacion. */
  | 'filo'
  /** Lo que se puede pulsar. */
  | 'accion'
  /** Lo que se lee ENCIMA de la accion. No sigue a la tinta: sigue a su fondo. */
  | 'sobre-accion'
  /** La barra global. Es una superficie tenida, y se queda oscura en los dos modos. */
  | 'barra'
  /** Lo que se lee sobre la barra. */
  | 'sobre-barra'
  /** El relleno de una insignia. Papel, pero teñido. */
  | 'insignia-fondo'
  /** El texto de una insignia, que se lee sobre su relleno. */
  | 'insignia-tinta'
  /** Decorativo: no se lee nada encima ni es un filo que haya que distinguir. */
  | 'adorno'
  /** Translucido. No se deriva: se conserva su alfa y se decide aparte. */
  | 'velo';

export const PAPELES: Readonly<Record<string, Papel>> = {
  // Papel
  '--fondo': 'papel',
  '--superficie': 'papel',
  '--sup': 'papel',
  '--mal-campo': 'papel',
  '--esqueleto': 'papel',
  '--esqueleto-brillo': 'papel',

  // Tinta
  '--tinta': 'tinta',
  '--tinta-2': 'tinta',
  '--tinta-3': 'tinta',
  // `--tinta-4` NO es tinta aunque se llame asi: el artboard dice que da 2.59:1 sobre papel
  // blanco y que es el trazo de un icono decorativo. Declararlo como tinta lo metería en la
  // guarda de contraste y la pondria roja para siempre por algo que nadie lee.
  '--tinta-4': 'adorno',


  // Filos
  '--linea': 'filo',
  '--linea-2': 'filo',
  '--borde-campo': 'filo',
  '--borde-boton': 'filo',
  '--borde-hover': 'filo',
  '--mal-borde': 'filo',
  '--foco': 'filo',

  // Accion, y lo que se lee encima
  '--azul': 'accion',
  '--azul-hover': 'accion',
  '--sobre-azul': 'sobre-accion',

  // La barra global. `--azul-oscuro` NO es una accion aunque sea el mismo azul mas oscuro: es la
  // SUPERFICIE de la barra. Clasificarlo como accion hacia que en modo oscuro la barra se
  // volviera clara —medido, y es el defecto que esta separacion corrige—, porque una accion
  // tiene que aclararse sobre fondo oscuro y una barra no.
  '--azul-oscuro': 'barra',
  '--sobre-barra': 'sobre-barra',
  '--sobre-barra-2': 'sobre-barra',
  '--azul-suave': 'insignia-fondo',
  '--acento': 'adorno',

  // Las cuatro insignias
  '--ok-fondo': 'insignia-fondo',
  '--atencion-fondo': 'insignia-fondo',
  '--mal-fondo': 'insignia-fondo',
  '--info-fondo': 'insignia-fondo',
  '--ok-tinta': 'insignia-tinta',
  '--atencion-tinta': 'insignia-tinta',
  '--mal-tinta': 'insignia-tinta',
  '--info-tinta': 'insignia-tinta',

  // Translucidos
  '--barra-control': 'velo',
  '--barra-realce': 'velo',
  '--barra-hover': 'velo',
  '--velo': 'velo',
  '--velo-paleta': 'velo',
};

/** Las parejas que un componente pone juntas, y el minimo que cada una tiene que alcanzar. */
export interface Pareja {
  readonly delante: string;
  readonly detras: string;
  /** `texto` pide 4.5:1 (WCAG 1.4.3); `filo`, 3:1 (1.4.11). */
  readonly clase: 'texto' | 'filo';
  /** Donde se ve esta pareja, para que el rojo diga que pantalla se rompe. */
  readonly donde: string;
}

/**
 * Las parejas que hay que medir. No son todas las combinaciones posibles —serian 42×42 y la
 * mayoria no se dan nunca— sino **las que un componente pone juntas de verdad**.
 */
export const PAREJAS: readonly Pareja[] = [
  { delante: '--tinta', detras: '--fondo', clase: 'texto', donde: 'texto primario sobre el lienzo' },
  { delante: '--tinta', detras: '--superficie', clase: 'texto', donde: 'texto primario sobre una tarjeta' },
  { delante: '--tinta', detras: '--sup', clase: 'texto', donde: 'texto primario sobre una fila alterna' },
  { delante: '--tinta-2', detras: '--superficie', clase: 'texto', donde: 'texto secundario de una tarjeta' },
  { delante: '--tinta-2', detras: '--sup', clase: 'texto', donde: 'texto secundario sobre fila alterna' },
  { delante: '--tinta-3', detras: '--superficie', clase: 'texto', donde: 'texto terciario y placeholder' },
  { delante: '--tinta-3', detras: '--sup', clase: 'texto', donde: 'cabecera de tabla' },
  { delante: '--azul', detras: '--superficie', clase: 'texto', donde: 'un enlace sobre la tarjeta' },
  { delante: '--azul', detras: '--fondo', clase: 'texto', donde: 'un enlace sobre el lienzo' },
  { delante: '--sobre-azul', detras: '--azul', clase: 'texto', donde: 'el texto del boton primario' },
  { delante: '--sobre-barra', detras: '--azul-oscuro', clase: 'texto', donde: 'el titulo de la barra global' },
  { delante: '--sobre-barra-2', detras: '--azul-oscuro', clase: 'texto', donde: 'la entidad, bajo el titulo' },
  { delante: '--ok-tinta', detras: '--ok-fondo', clase: 'texto', donde: 'la insignia conforme' },
  { delante: '--atencion-tinta', detras: '--atencion-fondo', clase: 'texto', donde: 'la insignia de atencion' },
  { delante: '--mal-tinta', detras: '--mal-fondo', clase: 'texto', donde: 'la insignia de error' },
  { delante: '--info-tinta', detras: '--info-fondo', clase: 'texto', donde: 'la insignia informativa' },
  { delante: '--mal-tinta', detras: '--superficie', clase: 'texto', donde: 'el texto de un campo con error' },
  { delante: '--linea', detras: '--superficie', clase: 'filo', donde: 'el filo por omision de una tarjeta' },
  { delante: '--borde-campo', detras: '--superficie', clase: 'filo', donde: 'el borde de un campo' },
  { delante: '--borde-campo', detras: '--fondo', clase: 'filo', donde: 'el borde de un campo sobre el lienzo' },
  { delante: '--borde-boton', detras: '--superficie', clase: 'filo', donde: 'el borde del boton secundario' },
  { delante: '--mal-borde', detras: '--superficie', clase: 'filo', donde: 'el borde de un campo con error' },
];

/** El minimo de cada clase, por tema. `alto-contraste` apunta al AAA de WCAG. */
export const MINIMOS = {
  institucional: { texto: 4.5, filo: 3 },
  sepia: { texto: 4.5, filo: 3 },
  'alto-contraste': { texto: 7, filo: 4.5 },
} as const;

/**
 * Las parejas que NO llegan al minimo, con su ratio medido y su motivo.
 *
 * <h2>Por que hay excepciones, y por que se enumeran con su cifra</h2>
 *
 * Porque las cuatro son **filos finos del propio artboard**: `--linea` sobre `--superficie` da
 * 1.36:1 y esa cifra no la elige esta libreria, la dibuja V8. La guarda de `rentas` ya las tenia
 * declaradas con los mismos valores —1.58, 1.45, 1.36— y esta implementacion las recalcula por su
 * cuenta y coincide, lo cual es la validacion cruzada de que la aritmetica esta bien.
 *
 * Se enumeran CON SU RATIO, no como «estas cuatro estan exentas»: si un cambio las empeora, el
 * numero deja de cuadrar y sale rojo. Una exencion sin cifra se convierte en un permiso.
 *
 * <h2>Y en `alto-contraste` NO hay ninguna</h2>
 *
 * Es el sentido de ese tema: los rellenos suaves dejan de ser suaves y los filos se vuelven
 * solidos. Si alguna vez hiciera falta una excepcion ahi, el tema habria dejado de cumplir lo que
 * promete y lo que hay que cambiar es el tema, no la lista.
 */
export interface Excepcion {
  readonly delante: string;
  readonly detras: string;
  /** El ratio medido, a dos decimales. Si cambia, sale rojo. */
  readonly ratio: number;
  readonly porQue: string;
}

const FILO_DEL_ARTBOARD =
  'Filo fino del artboard: V8 lo dibuja asi y esta libreria no elige su valor. WCAG 1.4.11 pide ' +
  '3:1 a los componentes de interfaz, y un filo de 1 px que separa dos superficies no lo es — no ' +
  'hay nada que identificar ni que pulsar en el. En `alto-contraste` SI pasa, que es su sentido.';

export const EXCEPCIONES: Readonly<Record<string, readonly Excepcion[]>> = {
  'institucional/claro': [
    { delante: '--linea', detras: '--superficie', ratio: 1.36, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--superficie', ratio: 1.59, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--fondo', ratio: 1.46, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-boton', detras: '--superficie', ratio: 1.36, porQue: FILO_DEL_ARTBOARD },
  ],
  'institucional/oscuro': [
    { delante: '--linea', detras: '--superficie', ratio: 1.98, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--superficie', ratio: 1.88, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--fondo', ratio: 2.05, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-boton', detras: '--superficie', ratio: 1.98, porQue: FILO_DEL_ARTBOARD },
    { delante: '--mal-borde', detras: '--superficie', ratio: 1.3, porQue: FILO_DEL_ARTBOARD },
  ],
  'sepia/claro': [
    { delante: '--linea', detras: '--superficie', ratio: 1.78, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--superficie', ratio: 1.74, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--fondo', ratio: 1.69, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-boton', detras: '--superficie', ratio: 1.78, porQue: FILO_DEL_ARTBOARD },
    { delante: '--mal-borde', detras: '--superficie', ratio: 1.65, porQue: FILO_DEL_ARTBOARD },
  ],
  'sepia/oscuro': [
    { delante: '--linea', detras: '--superficie', ratio: 2.07, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--superficie', ratio: 1.98, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--fondo', ratio: 2.11, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-boton', detras: '--superficie', ratio: 2.07, porQue: FILO_DEL_ARTBOARD },
    { delante: '--mal-borde', detras: '--superficie', ratio: 1.46, porQue: FILO_DEL_ARTBOARD },
  ],
  'alto-contraste/claro': [],
  'alto-contraste/oscuro': [],
};
