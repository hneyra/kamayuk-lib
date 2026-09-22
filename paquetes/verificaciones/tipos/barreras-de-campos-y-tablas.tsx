import type {
  CampoDeLista,
  DatosDeLaPantalla,
  DefinicionDeActo,
  DefinicionDeBloque,
  DefinicionDeCampo,
  DefinicionDeTabla,
  OpcionDelCampo,
  PiezaDeLaPantalla,
  Texto,
  TextoConMarcas,
} from '../../ui/index.ts';

/**
 * LAS BARRERAS DE TIPO de los campos y las tablas de #65. Son pruebas DEL COMPILADOR, como las de
 * `barreras-de-tipos.tsx`: cada `@ts-expect-error` esta sobre algo que hoy no compila, y si manana
 * compilara, `yarn typecheck` sale rojo por la directiva no usada (TS2578).
 *
 * Van en su archivo, y no al final de aquel, porque #66 y #67 anaden las suyas a la vez.
 */

/**
 * **La definicion de hoy sigue estrecha en sus opciones**: `rentas` hace
 * `salida.push(...campo.opciones)` sobre un `string[]` (`src/i18n/catalogo-de-claves.ts:56`), y con
 * una opcion `{ valor, rotulo }` dentro deja de compilar alli. Si alguien ensanchara el valor por
 * omision, sale rojo aqui primero.
 */
export const lasOpcionesDeHoySiguenSiendoCadenas: DefinicionDeCampo = {
  etiqueta: 'Tipo',
  tipo: 's',
  // @ts-expect-error la definicion por omision solo lleva opciones de cadena; `{ valor, rotulo }` se pide con el parametro
  opciones: [{ valor: '', rotulo: 'Todos' }],
};

/** Y el bloque de hoy, igual: sus campos son los estrechos. */
export const elBloqueDeHoySigueEstrecho: DefinicionDeBloque = {
  titulo: 'B',
  nota: '',
  // @ts-expect-error en el bloque de #27 una opcion es una cadena
  campos: [{ etiqueta: 'Tipo', tipo: 's', opciones: [{ valor: 'UNO', rotulo: 'Uno' }] }],
};

/** El de las piezas SI las admite, junto a las de cadena. Sin `@ts-expect-error`: esto TIENE que compilar. */
export const elDeLasPiezasLasAdmite: PiezaDeLaPantalla = {
  titulo: 'B',
  nota: '',
  campos: [{ etiqueta: 'Tipo', tipo: 's', opciones: ['Libre', { valor: '', rotulo: 'Todos' }], ayuda: 'Una ayuda' }],
};

export const barrerasDeLosCampos: readonly CampoDeLista<OpcionDelCampo>[] = [
  // @ts-expect-error una opcion con valor y SIN rotulo no tiene que decir
  { etiqueta: 'Tipo', tipo: 's', opciones: [{ valor: 'UNO' }] },
];

/**
 * **Una regla de insignia es total**: sin `otro`, lo que no casa con ningun caso no tendria tono, y
 * lo unico que quedaria seria deducirlo del texto (AC-2).
 */
export const barrerasDeLaInsignia: DefinicionDeTabla<Texto> = {
  titulo: 'T',
  columnas: [
    // @ts-expect-error `otro` es obligatorio: una regla que no dice que pasa con el resto no es una regla
    { rotulo: 'Estado', alineadoDerecha: false, insignia: { casos: { FIRME: { tono: 'ok' } } } },
    // @ts-expect-error un tono que no es de los cuatro del artboard
    { rotulo: 'Estado', alineadoDerecha: false, insignia: { casos: {}, otro: { tono: 'bad' } } },
    // @ts-expect-error `tonoDesde` sin `siNoTrae`: un tono traido que no es de los cuatro no tendria a donde ir
    { rotulo: 'Estado', alineadoDerecha: false, insignia: { tonoDesde: 'tono' } },
  ],
};

/** Por indice, dos tablas del mismo bloque no tienen de donde sacar filas distintas: `clave` obligatoria. */
export const barreraDeVariasTablas: PiezaDeLaPantalla = {
  titulo: 'B',
  nota: '',
  campos: [],
  // @ts-expect-error una tabla de `tablas` sin `clave`
  tablas: [{ titulo: 'Zonas', columnas: [] }],
};

/** Una fila no lleva sus celdas como numeros: una cifra llega formateada (regla 1). */
export const barreraDeLasFilas: DatosDeLaPantalla = {
  ausencia: { enElCampo: '', explicacion: '', tono: 'info' },
  // @ts-expect-error una celda es texto, jamas number
  tablas: new Map([['t', { filas: [{ celdas: [1842.6] }] }]]),
};

/**
 * **LAS BARRERAS DE #94: quien puede declarar donde vive lo que se elige, y como.**
 *
 * Lo declaran **el que se teclea y el que elige de una lista**, y nadie mas: en un campo de solo
 * lectura no se elige nada, y como se escribe un booleano en una ruta lo dice el backend que lo
 * lee, no esta libreria.
 *
 * **Y se impide sin ningun `eleccion?: never`, que se escribio y sobraba.** La duda era razonable
 * —en una union la comprobacion de propiedades de mas mira todas las ramas, que es el motivo de
 * los `?: never` de `DefinicionDeAccion`—, pero `DefinicionDeCampo` esta discriminada por `tipo`:
 * TypeScript estrecha a UNA rama antes de mirar las propiedades de mas, y las dos primeras lineas
 * de aqui salen con TS2353 sin ayuda. Medido con las dos declaraciones puestas y quitadas.
 */
export const barrerasDeLaEleccion: readonly DefinicionDeCampo[] = [
  // @ts-expect-error en un campo de solo lectura no se elige nada: muestra lo que otro decidio
  { etiqueta: 'Cobrado', tipo: 'r', eleccion: { enLaRuta: 'cobrado' } },
  // @ts-expect-error una casilla no: como se escribe un booleano en una ruta lo dice el backend
  { etiqueta: 'Solo activos', tipo: 'c', casilla: 'Solo activos', eleccion: { enLaRuta: 'activos' } },
  // @ts-expect-error `enLaRuta` es obligatorio: un «cuando» sin «donde» no escribe nada
  { etiqueta: 'Buscar', tipo: 't', eleccion: { cuando: 'alSalir' } },
  // @ts-expect-error los momentos son DOS, y un tercero no lo dibuja nadie
  { etiqueta: 'Buscar', tipo: 't', eleccion: { enLaRuta: 'q', cuando: 'conRetardo' } },
];

/**
 * **LAS BARRERAS DE #86, `texto-con-marcas`: la nota que ya se lee no cambia de tipo.**
 *
 * La frase con marcas entra por `notaConMarcas`, un campo APARTE, porque ensanchar `nota` rompia lo
 * que ya la lee como `Texto` (el rojo esta en su docblock y en `HISTORY.md`). Estas tres funciones
 * son esa lectura, escrita como la escribe un sistema: si alguien metiera las marcas en `nota`,
 * dejan de compilar aqui primero. Sin `@ts-expect-error`: esto TIENE que compilar.
 */
export const laNotaDeHoySigueSiendoCadena = (bloque: DefinicionDeBloque): string => bloque.nota;
export const laNotaDeLasPiezasSigueSiendoUnTexto = (bloque: DefinicionDeBloque<Texto>): Texto => bloque.nota;
export const laNotaDelActoSigueSiendoUnTexto = (acto: DefinicionDeActo): Texto | undefined => acto.nota;

/** Un tramo es UNA cosa: texto, codigo o enfasis. Los `?: never` son los que lo impiden. */
export const barrerasDeLasMarcas: TextoConMarcas = [
  // @ts-expect-error un tramo que fuera texto Y codigo no tiene ninguna lectura
  { texto: 'Lo impide ', codigo: 'fk' },
  // @ts-expect-error y uno sin marca no dice nada
  {},
];
