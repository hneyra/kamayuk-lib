import type { Muestra } from './muestras.ts';

/**
 * **El ejemplo del hueco que cierra #94**: un campo cuyo valor sale del bloque.
 *
 * Es el caso que `rentas`#172 describe y que hasta este issue no se podia escribir: una caja de
 * busqueda encima de una tabla larga. Lo que se teclea acota la lista, y acota **en el servidor**,
 * porque el interprete no filtra filas: escribe en `?descripcion=` y quien lee la ruta pide.
 *
 * Las tres decisiones que la muestra ensena juntas, y que son el issue entero:
 *
 *   · `eleccion.enLaRuta` dice **donde** vive lo elegido;
 *   · `eleccion.cuando` dice **cuando** se escribe —aqui, al salir del campo o al pulsar Intro, que
 *     es lo que evita una direccion por tecla—;
 *   · y cambiarlo **vuelve a la primera pagina**, sin que la definicion lo pida: lo hace
 *     `cambioAlElegir` con la paginacion de las tablas del mismo bloque.
 *
 * La segunda pieza —la fecha— ensena la otra mitad: un calendario se elige de un gesto (`alElegir`,
 * su valor por omision) y **lo que viaja es ISO** aunque lo que se lea sea `dd/mm/aaaa`.
 *
 * La monta `campos-en-la-ruta.test.tsx`, y su centinela exige las dos claves, ni una mas ni una
 * menos. Va en su archivo por lo mismo que las de #61 y #65: dos issues escribiendo en el mismo
 * objeto se pisan.
 *
 * No se exporta desde `index.ts`: es documentacion ejecutable, y no viaja en ningun paquete servido.
 */

const SIN_FRASE_DE_PANTALLA = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

export const MUESTRAS_DE_LOS_CAMPOS_EN_LA_RUTA = {
  'filtro-en-la-ruta': {
    deDonde: 'rentas#172: la caja «Buscar giro o actividad» encima de un catalogo que no cabe en una lista',
    definicion: {
      instruccion: 'Acote el catalogo y elija uno.',
      bloques: [
        {
          titulo: 'Catalogo',
          nota: 'Escriba y salga del campo: lo que acote viaja en la direccion de esta hoja.',
          campos: [
            {
              etiqueta: 'Buscar',
              tipo: 't1',
              marcador: 'parte del nombre',
              ayuda: 'opcional. Acota en el servidor, no aqui.',
              eleccion: { enLaRuta: 'descripcion', cuando: 'alSalir' },
            },
          ],
          tabla: {
            titulo: 'Lo que casa',
            clave: 'casan',
            columnas: [
              { rotulo: 'Codigo', alineadoDerecha: false, campo: 'codigo' },
              { rotulo: 'Nombre', alineadoDerecha: false, campo: 'nombre' },
            ],
            vacio: 'Nada casa con lo que escribio.',
            paginacion: { en: 'servidor', enLaRuta: 'pagina', tamano: 20, hayMas: 'hayMas' },
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      nombrados: new Map([['hayMas', true]]),
      tablas: new Map([
        [
          'casan',
          {
            filas: [
              { celdas: ['4711', 'Venta al por menor en puestos'] },
              { celdas: ['4719', 'Otras ventas al por menor'] },
            ],
          },
        ],
      ]),
    },
  },
  'dia-en-la-ruta': {
    deDonde: 'caja#98: la conciliacion de un dia, que el backend exige y la pantalla no ofrecia elegir',
    definicion: {
      instruccion: 'Elija el dia.',
      bloques: [
        {
          titulo: 'El dia',
          nota: 'Lo que viaja es ISO; lo que se lee, dd/mm/aaaa.',
          campos: [{ etiqueta: 'Fecha', tipo: 'd', eleccion: { enLaRuta: 'fecha' } }],
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },
} as const satisfies Record<string, Muestra>;
