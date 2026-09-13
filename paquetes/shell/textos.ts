import { TEXTOS_DE_LA_UI } from '../ui/index.ts';

/**
 * **Las treinta y dos palabras que el armazón dice por su cuenta** (#19).
 *
 * <h2>El problema, que no es «falta i18n» sino algo peor</h2>
 *
 * Un sistema que traduce sus pantallas y monta este marco se queda con **la pantalla a medias**: el
 * cuerpo en el idioma que sea y el marco en castellano —«Volver», «Guardar», «Buscar», «Seguir
 * editando»—. Eso no se lee como un marco sin traducir: se lee como una traducción rota. Y la mitad
 * que falta es justo la que está en todas las pantallas.
 *
 * <h2>Por qué un saco de datos y NO `react-i18next`</h2>
 *
 * Porque `i18next` y `react-i18next` pasarían a ser `peerDependencies` de la librería, y entonces
 * **cualquiera de los cuatro sistemas tendría que montar i18next antes de dibujar un botón**. Una
 * librería de componentes no puede exigir eso: la traducción es una decisión del sistema, no del
 * marco. Así que las palabras entran como dato —`<Armazon textos={…} />`— y quien las quiera
 * traducidas las llena con su propio `t()`. Quien no pase nada, sigue viendo lo de hoy.
 *
 * Se comprueba que no costó una dependencia: `verificaciones/el-texto-visible-es-dato.test.ts`.
 *
 * <h2>UNO solo, y no uno por pieza</h2>
 *
 * El armazón son ocho componentes, pero es **un solo árbol con una sola entrada**: `<Armazon>`. Un
 * saco por pieza obligaría a enhebrar siete objetos por cinco niveles de `props`, y —lo que de
 * verdad importa— dejaría la pregunta del AC2 sin poder contestarse: «¿está completo?» sólo tiene
 * respuesta si hay **un** inventario que comparar contra **un** árbol montado.
 *
 * <h2>Ocho de las treinta y dos NO se dibujan, y son las que se pierden solas</h2>
 *
 * Seis son nombres accesibles —el botón del carril, el menú de sesión, la miga, el diálogo de la
 * paleta, su lista y la región viva de los avisos— y dos son marcadores de una caja de texto.
 * Mirando la pantalla no se ven, así que un inventario hecho a ojo se los deja; y dos de ellas ya
 * habían llegado **en inglés** desde la librería que las monta —`Notifications alt+T` de `sonner`
 * (#13) y `Suggestions` de `cmdk` (#19)— sin que nadie lo notara. Por eso la guarda del AC2 recorre
 * también los atributos y no sólo los nodos de texto.
 *
 * Así que el saco viaja por su propio contexto (`contexto.tsx`), y ese contexto tiene los valores
 * por omisión como valor por defecto. Es deliberado y no es lo que `useArmazon()` hace: las siete
 * piezas se publican sueltas —`BarraGlobal`, `CarrilDeModulos`, `ArbolDeModulos`…— y una pieza
 * suelta que reventara por no tener proveedor de TEXTOS sería un marco que exige configurar el
 * idioma para dibujar un árbol. Sin proveedor, castellano.
 *
 * <h2>Lo que NO entra aquí, y por qué</h2>
 *
 * · **El catálogo.** Los rótulos de los módulos y de las hojas, sus notas y sus instrucciones son
 *   del sistema que consume, y ya entran por parámetro desde #13. El armazón no los traduce: se los
 *   dan traducidos.
 * · **El título, la entidad, la cuenta y las opciones de sesión.** Lo mismo: son datos de quien
 *   monta.
 * · **Los mensajes de `useArmazon()` y `useHoja()`.** No son texto de pantalla: son excepciones que
 *   revientan en el arranque de quien está programando. Traducirlas sería traducir un `stack trace`.
 *
 * <h2>Las cuatro funciones son funciones porque llevan un dato dentro</h2>
 *
 * Un número, un filtro o el rótulo de una hoja caen en distinto sitio en cada idioma, y partir la
 * frase en dos cadenas decide por el traductor dónde va. Como función, el dato entra donde el
 * idioma lo ponga — y el plural, que en castellano es una `s` y en otros no, se decide dentro.
 */

export interface TextosDelArmazon {
  // ── La barra global ──────────────────────────────────────────────────────────────────────────
  /** El nombre accesible del botón que abre y cierra el carril. No se dibuja. */
  readonly alternarElCarril: string;
  /** El botón que abre la paleta. */
  readonly buscar: string;
  /** El atajo, escrito DENTRO del botón. Ver `BarraGlobal.tsx`: un atajo que no se escribe no se aprende. */
  readonly atajoDeLaPaleta: string;
  /** Lo que anuncia la campana. Lleva la cuenta dentro, así que decide su propio plural. */
  readonly avisosSinLeer: (cuantos: number) => string;
  /** El nombre accesible del menú de sesión. No se dibuja. */
  readonly opcionesDeLaSesion: string;
  /** El nombre accesible de la región viva de los avisos. Ver `ui/shadcn/avisos.tsx`. */
  readonly avisos: string;

  // ── El carril de módulos ─────────────────────────────────────────────────────────────────────
  /** La caja de filtro de arriba del carril. Es a la vez su marcador y su nombre accesible. */
  readonly filtrarElCarril: string;
  /** Cómo se llama el carril: su nombre accesible en ancho, y el título del cajón en estrecho. */
  readonly modulos: string;
  /** La nota del cajón, que en ancho no se dibuja. */
  readonly elijaUnDestino: string;
  /** Cuando el filtro no deja nada. Lleva dentro lo que se escribió. */
  readonly nadaCasaEnElArbol: (filtro: string) => string;
  /** La marca de una hoja con cambios sin guardar. Va en minúscula: es una marca, no un título. */
  readonly sinGuardar: string;

  // ── La paleta de mando ───────────────────────────────────────────────────────────────────────
  /** El nombre accesible del diálogo de la paleta. No se dibuja. */
  readonly buscarUnDestino: string;
  /** El nombre accesible de su lista. Tampoco se dibuja, y sin él `cmdk` lo pone en inglés. */
  readonly sugerenciasDeLaPaleta: string;
  /** El marcador de la caja de la paleta. */
  readonly marcadorDeLaPaleta: string;
  /** La tecla que la cierra, escrita a la derecha de la caja. */
  readonly cerrarLaPaleta: string;
  /** Cuando no casa ningún destino. */
  readonly nadaCasaEnLaPaleta: string;
  /**
   * El pie: cuántos casan sobre cuántos hay. Ver `busqueda.ts`: N es los que casan, no los que se
   * ven.
   *
   * El segundo no se llama `total` y eso **lo decidió una regla, no el gusto**: la prohibición
   * `importe-declarado-number` salió roja sobre `total: number` la primera vez que se lintó este
   * archivo. En este producto `total…` es un nombre de dinero (regla 1, RNF-055) y sólo
   * `totalElementos` y `totalPaginas` están exceptuados. Aquí se cuentan destinos, así que el
   * nombre correcto es el que dice qué se cuenta.
   */
  readonly cuantosDestinos: (casan: number, ofrecidos: number) => string;

  // ── El cuerpo ────────────────────────────────────────────────────────────────────────────────
  /** Lo que se ve sin ninguna hoja abierta. */
  readonly sinDestinoAbierto: string;
  /** Lo que se ve cuando el hash pide algo que el catálogo no ofrece. */
  readonly destinoNoOfrecido: string;
  /** El nombre accesible de la miga de la cabecera. No se dibuja. */
  readonly ruta: string;

  // ── Las acciones al pie ──────────────────────────────────────────────────────────────────────
  readonly volver: string;
  readonly limpiar: string;
  readonly guardar: string;
  readonly exportar: string;
  readonly imprimir: string;
  /** El aviso del medio en una pantalla que se escribe. */
  readonly nadaSeEscribeTodavia: string;
  /** El aviso del medio en una de sólo consulta. */
  readonly datosDeHoy: string;

  // ── El aviso de cambios sin guardar ──────────────────────────────────────────────────────────
  /** El título. Lleva dentro el rótulo de la hoja sucia, que es dato del catálogo. */
  readonly hayCambiosSinGuardar: (rotulo: string) => string;
  readonly losCambiosSePierden: string;
  /** La salida que descarta. Se pinta en la tinta del error. */
  readonly salirYPerderLosCambios: string;
  /** La salida inocua. Es donde cae `Esc`, medido en #13. */
  readonly seguirEditando: string;
  readonly guardarYCerrar: string;
}

/**
 * Lo que hoy se ve, palabra por palabra. Quien no pase `textos`, sigue viendo esto.
 *
 * Las tres que `@kamayuk/ui` también dice por su cuenta —el nombre de la miga, el de la región de
 * avisos y el de la lista de la paleta— salen de su saco y no se copian aquí: una palabra escrita en
 * dos sitios se traduce en uno.
 */
export const TEXTOS_DEL_ARMAZON: TextosDelArmazon = {
  alternarElCarril: 'Mostrar u ocultar el menu',
  buscar: 'Buscar',
  atajoDeLaPaleta: 'Ctrl K',
  avisosSinLeer: (cuantos) =>
    cuantos === 1 ? '1 aviso sin leer' : `${String(cuantos)} avisos sin leer`,
  opcionesDeLaSesion: 'Opciones de la sesion',
  avisos: TEXTOS_DE_LA_UI.avisos,

  filtrarElCarril: 'Filtrar modulos y destinos',
  modulos: 'Modulos',
  elijaUnDestino: 'Elija el destino que quiere abrir.',
  nadaCasaEnElArbol: (filtro) => `Ningun modulo ni destino coincide con «${filtro}».`,
  sinGuardar: 'sin guardar',

  buscarUnDestino: 'Buscar un destino',
  sugerenciasDeLaPaleta: TEXTOS_DE_LA_UI.sugerencias,
  marcadorDeLaPaleta: 'Un modulo o un destino…',
  cerrarLaPaleta: 'Esc',
  nadaCasaEnLaPaleta: 'Ningun destino coincide con lo que escribio.',
  cuantosDestinos: (casan, ofrecidos) =>
    `${String(casan)} de ${String(ofrecidos)} ${ofrecidos === 1 ? 'destino' : 'destinos'}`,

  sinDestinoAbierto: 'No hay ningun destino abierto. Elija uno en el arbol de la izquierda.',
  destinoNoOfrecido:
    'Esa direccion no corresponde a ningun destino disponible para esta cuenta. Elija uno en el ' +
    'arbol de la izquierda.',
  ruta: TEXTOS_DE_LA_UI.ruta,

  volver: 'Volver',
  limpiar: 'Limpiar',
  guardar: 'Guardar',
  exportar: 'Exportar',
  imprimir: 'Imprimir',
  nadaSeEscribeTodavia: 'Nada se escribe hasta que pulse Guardar.',
  datosDeHoy: 'Los datos son los que figuran a la fecha de hoy.',

  hayCambiosSinGuardar: (rotulo) => `${rotulo} tiene cambios sin guardar`,
  losCambiosSePierden:
    'Si cierra la pantalla se pierden. Guardelos primero o cierrela descartandolos: eso no se ' +
    'puede deshacer.',
  salirYPerderLosCambios: 'Salir y perder los cambios',
  seguirEditando: 'Seguir editando',
  guardarYCerrar: 'Guardar y cerrar',
};
