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
  /**
   * El fondo: un token opaco, o **una PILA de capas** de arriba abajo, con la opaca al final.
   *
   * La pila existe porque un estado compuesto NO se ve con el color de ninguno de sus tokens:
   * `--barra-hover` es blanco al 18 % y lo que se ve es esa mezcla sobre la barra. Medir el token
   * de reposo contesta otra pregunta — y de hecho la contesta mejor de lo que es, porque el hover
   * BAJA el contraste (#38).
   */
  readonly detras: string | readonly string[];
  /** `texto` pide 4.5:1 (WCAG 1.4.3); `filo`, 3:1 (1.4.11). */
  readonly clase: 'texto' | 'filo';
  /** Donde se ve esta pareja, para que el rojo diga que pantalla se rompe. */
  readonly donde: string;
}

/** Las capas de una pareja, de arriba abajo. Un token suelto es una pila de una. */
export const capasDe = (detras: Pareja['detras']): readonly string[] =>
  typeof detras === 'string' ? [detras] : detras;

/** El nombre del fondo de una pareja, que es la llave con que se le busca excepcion. */
export const nombreDelFondo = (detras: Pareja['detras']): string =>
  capasDe(detras).join(' sobre ');

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

  // ==========================================================================================
  // LAS QUE EL ARMAZON PONE JUNTAS EN TODAS LAS PANTALLAS, Y QUE NADIE MEDIA (#38)
  //
  // Las veintidos de arriba se escribieron POR TOKEN, preguntando «¿sobre que papel suele ir
  // este?». Lo que se escapa de esa pregunta es lo que solo existe COMPUESTO: un estado
  // (`hover`), una variante de fondo (`--azul-suave`) o un token que no tenia pareja declarada
  // (`--foco`). Tres colores que el producto pone juntos en cada pantalla, y uno ya estaba roto.
  // ==========================================================================================

  // (a) La nota del modulo ACTIVO. `ArbolDeModulos` pinta `bg-azul-suave` cuando esta abierto y
  // la nota sigue en `text-tinta-3`: la lista solo medía `--tinta-3` sobre `--superficie` y sobre
  // `--sup`, o sea el modulo CERRADO. A 10.5 px y en las 40 pantallas.
  { delante: '--tinta-3', detras: '--azul-suave', clase: 'texto', donde: 'la nota del modulo ACTIVO en el carril' },

  // (b) El halo de foco. Tenia papel de `filo` y CERO parejas: un color que nadie medía.
  { delante: '--foco', detras: '--superficie', clase: 'filo', donde: 'el halo de foco sobre una tarjeta' },
  { delante: '--foco', detras: '--fondo', clase: 'filo', donde: 'el halo de foco sobre el lienzo' },

  // (c) La barra CON HOVER. El fondo es el translucido ya mezclado, no el de reposo — y mezclado
  // es mas claro, asi que un texto claro encima contrasta MENOS. El avatar lleva dos capas.
  { delante: '--sobre-barra-2', detras: ['--barra-control', '--azul-oscuro'], clase: 'texto', donde: 'la entidad en el boton de busqueda, en reposo' },
  { delante: '--sobre-barra-2', detras: ['--barra-hover', '--azul-oscuro'], clase: 'texto', donde: 'la entidad en el boton de busqueda, CON HOVER' },
  { delante: '--sobre-barra', detras: ['--barra-hover', '--azul-oscuro'], clase: 'texto', donde: 'el titulo y los iconos de la barra, CON HOVER' },

  // ==========================================================================================
  // Y LOS QUE QUEDABAN CON PAPEL Y CERO PAREJAS
  //
  // La regla de abajo —`SIN_PAREJA`— los puso rojos a todos de golpe. Estos son los que SI
  // tienen una pareja de verdad, casi todos porque son ESTADOS COMPUESTOS: el hover de un boton
  // primario, el hover de un filo, el papel de un campo con error. Que un estado no tuviera
  // pareja es el mismo hueco que (c), servido por token en vez de por capa.
  // ==========================================================================================
  { delante: '--sobre-azul', detras: '--azul-hover', clase: 'texto', donde: 'el texto del boton primario, CON HOVER' },
  { delante: '--borde-hover', detras: '--superficie', clase: 'filo', donde: 'el filo de un campo o boton, CON HOVER' },
  { delante: '--borde-hover', detras: '--fondo', clase: 'filo', donde: 'el filo de un campo sobre el lienzo, CON HOVER' },
  { delante: '--linea-2', detras: '--superficie', clase: 'filo', donde: 'el filo entre dos filas de una tabla' },
  { delante: '--tinta', detras: '--mal-campo', clase: 'texto', donde: 'lo tecleado en un campo con error' },
];

/**
 * Los tokens que NO mide nadie, y **por que**.
 *
 * <h2>La regla, y el hueco que tapa</h2>
 *
 * Un token con papel declarado y cero parejas es un color que nadie mide: se puede mover hasta
 * volverlo ilegible y ninguna guarda se entera. Hasta #38 habia quince asi, y uno era `--foco`
 * —el anillo de foco— que daba **1.13:1** en el tema por omision.
 *
 * Asi que la guarda exige que **todo token de la base este en alguna pareja, o este aqui con su
 * motivo**. Y en las dos direcciones: un token que este aqui Y en una pareja tambien sale rojo,
 * porque la exencion ya no describe la verdad.
 *
 * <h2>Por que una lista y no «los `adorno` y los `velo` no se miden»</h2>
 *
 * Porque el papel dice **como se deriva** un color, no si hay que leerlo. `--esqueleto` es
 * `papel` porque se deriva como el papel, y aun asi no hay nada que leer encima; `--foco` es
 * `filo` y SI habia que medirlo. Colgar la obligacion del papel mezcla dos preguntas distintas y
 * deja fuera justo el caso que este issue encontro.
 */
export const SIN_PAREJA: Readonly<Record<string, string>> = {
  '--tinta-4':
    'No es color de texto y lo dice el artboard: 2.59:1 sobre papel blanco. Es el trazo de un ' +
    'icono decorativo —el separador de la miga, la flecha del desplegable, los dias de fuera del ' +
    'calendario—, y nada de eso se lee.',
  '--acento':
    'No lo pinta ningun componente todavia. El artboard lo reserva para un realce decorativo; el ' +
    'dia que algo lo use encima de un papel, esa es su pareja y sale de aqui.',
  '--esqueleto':
    'Es el hueco que espera al dato, no el dato. Nada se lee encima y no separa dos superficies ' +
    'que haya que distinguir: es una silueta que dice «todavia no». Medirlo a 3:1 lo convertiria ' +
    'en una barra solida en las seis, incluida `alto-contraste`, donde da 1.09:1.',
  '--esqueleto-brillo':
    'La segunda raya del mismo hueco. Su contraste CONTRA `--esqueleto` es 1.05:1 en ' +
    '`alto-contraste` a proposito: es una textura que se mueve, y una raya que contrastara seria ' +
    'una cebra parpadeando mientras carga la pantalla.',
  '--velo':
    'Lo que APAGA la pantalla detras de un dialogo. No hay nada que leer a traves de el —lo que ' +
    'se lee esta encima, sobre una superficie opaca—, y su trabajo es justo el contrario del de ' +
    'un color legible: cuanto menos se distinga lo de abajo, mejor cumple.',
  '--velo-paleta': 'El mismo velo, mas suave, para la paleta de mando. Mismo motivo.',
  '--barra-realce':
    'Un filo decorativo sobre la barra: el separador vertical entre bloques y el borde de la ' +
    'tecla rapida. Separa dos trozos de la MISMA barra, asi que no es un componente de 1.4.11 — ' +
    'no hay nada que identificar ni que pulsar en el: 1.81:1 en el tema por omision y 1.84:1 en ' +
    '`alto-contraste`, donde la barra se queda oscura a proposito y por eso alli tampoco llegaria. ' +
    'DONDE SI HAY ALGO QUE LEER es el disco del avatar, que lo usa de fondo — y eso NO se mide ' +
    'contra este token sino contra la pila. Medido: `--sobre-barra` sobre ' +
    '`--barra-realce + --barra-hover + --azul-oscuro` da 4.50 / 3.65 / 5.81 / 4.64 / 4.36 / 3.63 ' +
    'en las seis, o sea que falla en cuatro. No entra aqui como pareja porque arreglarlo pide ' +
    'declarar los velos POR COMBINACION y no por modo —en `alto-contraste` pide 7:1 y ese tema no ' +
    'admite excepciones—, que es un cambio de forma y su propio issue.',
};

/**
 * Los cuatro fondos semanticos, que tienen que DISTINGUIRSE ENTRE SI (#36).
 *
 * Es otra pregunta que la del contraste, y por eso es otra lista. El contraste mide si el texto
 * de una insignia se lee sobre su relleno, y en `sepia` los cuatro rellenos pasaban esa medida
 * perfectamente... siendo **el mismo rosa**: `ok` daba `#fae1e0` y `mal` `#fae0df`, a distancia 1
 * en un canal. Una insignia «Conforme» y una «Vencida» se pintaban igual. Un color puede pasar
 * contraste y no significar nada.
 */
export const SEMANTICOS: readonly string[] = [
  '--ok-fondo',
  '--atencion-fondo',
  '--mal-fondo',
  '--info-fondo',
];

/**
 * Lo lejos que tienen que estar dos fondos semanticos, en el plano cromatico de OKLab.
 *
 * <h2>De donde sale el 0.012, medido y no elegido</h2>
 *
 * De los temas que YA son correctos. La distancia cromatica mas corta entre dos de los cuatro
 * fondos, en las cuatro combinaciones de `institucional` y `alto-contraste`, es:
 *
 * ```
 *   institucional/claro    ok vs info   0.0282
 *   institucional/oscuro   ok vs info   0.0218
 *   alto-contraste/claro   ok vs info   0.0147
 *   alto-contraste/oscuro  ok vs info   0.0140   <- el minimo de lo correcto
 * ```
 *
 * El umbral se pone **justo por debajo de ese minimo**. Mas alto pondria rojo a
 * `alto-contraste/oscuro`, que es correcto —ese tema apaga el croma a proposito, y sus cuatro
 * fondos se distinguen igual porque conservan cuatro tonos—; mas bajo dejaria de morder. Y lo
 * que tiene que cazar esta dos ordenes de magnitud por debajo: en `sepia` la distancia entre `ok`
 * y `mal` era **0.0011**.
 *
 * <h2>Por que cromatica y no la distancia entera de OKLab</h2>
 *
 * Ver `distanciaCromatica()` en `color.ts`: incluyendo la luminosidad, `ok` y `atencion` en el
 * `sepia` roto salian a 0.0325 —mas lejos que `ok` y `mal` en `alto-contraste`, que es correcto—
 * y la guarda no habria cazado nada. Lo que dice «conforme» o «vencida» es el tono, no lo palido
 * que sea el relleno.
 */
export const DISTANCIA_SEMANTICA_MINIMA = 0.012;

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
  /** El fondo, con el nombre que le da `nombreDelFondo()`: un token, o la pila unida por «sobre». */
  readonly detras: string;
  /** El ratio medido, a dos decimales. Si cambia, sale rojo. */
  readonly ratio: number;
  readonly porQue: string;
}

const FILO_DEL_ARTBOARD =
  'Filo fino del artboard: V8 lo dibuja asi y esta libreria no elige su valor. WCAG 1.4.11 pide ' +
  '3:1 a los componentes de interfaz, y un filo de 1 px que separa dos superficies no lo es — no ' +
  'hay nada que identificar ni que pulsar en el. En `alto-contraste` SI pasa, que es su sentido.';

/**
 * El halo de foco, desde que el contorno existe (#37).
 *
 * Hasta #37 `--foco` era el UNICO indicador de foco de todo lo que no es campo, y con 1.13:1 en
 * el tema por omision eso era un defecto de verdad: quien tabula no veia donde estaba. Desde #37
 * el indicador es el CONTORNO —2 px de `--azul`, que da entre 4.58:1 y 16.28:1 en las seis, y lo
 * mide `shadcn/foco.test.ts`—, y el halo es lo que lo engorda.
 *
 * Un halo blando alrededor de un contorno solido no es «el componente» que 1.4.11 identifica, asi
 * que se queda. Pero se queda MEDIDO Y CON SU CIFRA: el dia que alguien quite el contorno y deje
 * solo el halo, estas cuatro combinaciones vuelven a ser lo que eran y nadie se enteraria si esta
 * lista dijera «exento» a secas.
 */
const HALO_CON_CONTORNO_DETRAS =
  'El halo blando, que acompana al contorno de foco desde #37 y ya no identifica el foco por si ' +
  'solo. Quien identifica es el contorno de 2 px en `--azul`, medido aparte en las seis. La ' +
  'cifra se queda para que quitar el contorno vuelva a poner esto rojo.';

/**
 * La entidad sobre el boton de busqueda, con el raton encima, en el tema por omision.
 *
 * Es la unica de las seis que no se puede mover desde aqui: `institucional/claro` ES el origen,
 * asi que tanto `--sobre-barra-2` (#9fc6df) como el blanco al 18 % del hover son valores que
 * dibuja el artboard y que esta libreria no elige. En las otras cinco si se movio la regla —el
 * tramo bajo de `sobre-barra` subio de 0.82 a 0.84— y `institucional/oscuro` paso de 4.40 a 4.72.
 */
const COMPUESTO_DEL_ARTBOARD =
  'La composicion es del artboard y el origen no pasa por ninguna regla: `--sobre-barra-2` y el ' +
  'blanco al 18 % del hover son los dos de V8. A 11 px, 4.08:1 no llega a los 4.5:1 de WCAG ' +
  '1.4.3, y arreglarlo pide tocar el artboard, que es una decision de `rentas` y no de aqui. Se ' +
  'declara con su cifra para que no pueda empeorar sin que nadie se entere.';

export const EXCEPCIONES: Readonly<Record<string, readonly Excepcion[]>> = {
  'institucional/claro': [
    { delante: '--linea', detras: '--superficie', ratio: 1.36, porQue: FILO_DEL_ARTBOARD },
    { delante: '--linea-2', detras: '--superficie', ratio: 1.22, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--superficie', ratio: 1.59, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--fondo', ratio: 1.46, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-boton', detras: '--superficie', ratio: 1.36, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-hover', detras: '--fondo', ratio: 2.84, porQue: FILO_DEL_ARTBOARD },
    { delante: '--foco', detras: '--superficie', ratio: 1.23, porQue: HALO_CON_CONTORNO_DETRAS },
    { delante: '--foco', detras: '--fondo', ratio: 1.13, porQue: HALO_CON_CONTORNO_DETRAS },
    {
      delante: '--sobre-barra-2',
      detras: '--barra-hover sobre --azul-oscuro',
      ratio: 4.08,
      porQue: COMPUESTO_DEL_ARTBOARD,
    },
  ],
  'institucional/oscuro': [
    { delante: '--linea', detras: '--superficie', ratio: 1.98, porQue: FILO_DEL_ARTBOARD },
    { delante: '--linea-2', detras: '--superficie', ratio: 2.05, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--superficie', ratio: 1.88, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--fondo', ratio: 2.05, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-boton', detras: '--superficie', ratio: 1.98, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-hover', detras: '--superficie', ratio: 1.59, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-hover', detras: '--fondo', ratio: 1.73, porQue: FILO_DEL_ARTBOARD },
    { delante: '--mal-borde', detras: '--superficie', ratio: 1.3, porQue: FILO_DEL_ARTBOARD },
    { delante: '--foco', detras: '--superficie', ratio: 2.04, porQue: HALO_CON_CONTORNO_DETRAS },
    { delante: '--foco', detras: '--fondo', ratio: 2.22, porQue: HALO_CON_CONTORNO_DETRAS },
  ],
  'sepia/claro': [
    { delante: '--linea', detras: '--superficie', ratio: 1.78, porQue: FILO_DEL_ARTBOARD },
    { delante: '--linea-2', detras: '--superficie', ratio: 1.82, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--superficie', ratio: 1.74, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--fondo', ratio: 1.69, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-boton', detras: '--superficie', ratio: 1.78, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-hover', detras: '--superficie', ratio: 1.6, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-hover', detras: '--fondo', ratio: 1.55, porQue: FILO_DEL_ARTBOARD },
    { delante: '--mal-borde', detras: '--superficie', ratio: 1.65, porQue: FILO_DEL_ARTBOARD },
    { delante: '--foco', detras: '--superficie', ratio: 1.81, porQue: HALO_CON_CONTORNO_DETRAS },
    { delante: '--foco', detras: '--fondo', ratio: 1.76, porQue: HALO_CON_CONTORNO_DETRAS },
  ],
  'sepia/oscuro': [
    { delante: '--linea', detras: '--superficie', ratio: 2.07, porQue: FILO_DEL_ARTBOARD },
    { delante: '--linea-2', detras: '--superficie', ratio: 2.12, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--superficie', ratio: 1.98, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-campo', detras: '--fondo', ratio: 2.11, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-boton', detras: '--superficie', ratio: 2.07, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-hover', detras: '--superficie', ratio: 1.71, porQue: FILO_DEL_ARTBOARD },
    { delante: '--borde-hover', detras: '--fondo', ratio: 1.83, porQue: FILO_DEL_ARTBOARD },
    { delante: '--mal-borde', detras: '--superficie', ratio: 1.46, porQue: FILO_DEL_ARTBOARD },
    { delante: '--foco', detras: '--superficie', ratio: 2.12, porQue: HALO_CON_CONTORNO_DETRAS },
    { delante: '--foco', detras: '--fondo', ratio: 2.26, porQue: HALO_CON_CONTORNO_DETRAS },
  ],
  'alto-contraste/claro': [],
  'alto-contraste/oscuro': [],
};
