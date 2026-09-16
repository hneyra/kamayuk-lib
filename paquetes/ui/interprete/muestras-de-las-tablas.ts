import type { Muestra } from './muestras.ts';

/**
 * **Un ejemplo por cada hueco de #61 que sube en esta serie**: las tablas.
 *
 * Son los seis de `normativa/frontend/diseno/HUECOS.md` que ni #44 ni su reparto (#65, #66, #67)
 * cubren y que caen del lado de la tabla. `deDonde` cita donde lo hacia la V6 de `normativa`, en
 * `c01fe9a`, salvo los dos que suben de `catastro`, que citan su pieza local.
 *
 * **Las claves son los nombres de los huecos de `normativa`, y eso importa**: la guarda
 * `las-piezas-locales-son-las-de-huecos` de `catastro` lee las claves de todo `MUESTRAS…` de este
 * directorio y sale roja si alguna coincide con una de sus piezas locales. Las suyas se llaman
 * `paginacion` y `orden`; estas, `paginacion-y-orden-en-el-servidor` y `tablas-grandes`. Asi la
 * subida es **aditiva**: `catastro` sigue en verde con sus piezas, y las borra cuando adopte estas
 * (catastro#144). Ver el docblock de `MandosDeLaTabla.tsx`.
 *
 * **Las monta `tablas.test.tsx`, una a una**, y su centinela exige las seis claves, ni una mas ni
 * una menos. Van en su archivo por lo mismo que las de #65: dos issues escribiendo en el mismo
 * objeto se pisan.
 *
 * No se exporta desde `index.ts`: es documentacion ejecutable, y no viaja en ningun paquete servido.
 */

const SIN_FRASE_DE_PANTALLA = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

/** Las seis, por el nombre del hueco en `normativa/frontend/diseno/HUECOS.md`. */
export const MUESTRAS_DE_LAS_TABLAS = {
  'paginacion-y-orden-en-el-servidor': {
    deDonde: 'c01fe9a:frontend/src/secciones/Ediciones.tsx:411 (y catastro: piezas/paginacion.tsx, piezas/orden.tsx)',
    definicion: {
      instruccion: 'Recorra las versiones.',
      bloques: [
        {
          titulo: 'Versiones',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Versiones',
            clave: 'versiones',
            columnas: [
              { rotulo: 'Registro', alineadoDerecha: false, campo: 'id' },
              { rotulo: 'Anno', alineadoDerecha: false, campo: 'anno' },
              { rotulo: 'Situacion', alineadoDerecha: false, campo: 'situacion' },
            ],
            vacio: 'Ninguna version todavia.',
            // La pagina y el tamano viajan en la ruta con el nombre que el backend pide; quien lee
            // la ruta es el sistema, y esta tabla no pide nada.
            paginacion: {
              en: 'servidor',
              enLaRuta: 'pagina',
              tamano: 20,
              tamanos: [20, 50, 100],
              tamanoEnLaRuta: 'tamano',
              hayMas: 'hayMas',
              paginas: 'totalPaginas',
            },
            // Lista blanca: exactamente lo que el servidor admite. `campo` ata cada uno a su columna,
            // que es la que lleva `aria-sort`.
            orden: {
              campos: [
                { valor: 'anno', rotulo: 'Anno' },
                { valor: 'situacion', rotulo: 'Situacion' },
                { valor: 'id', rotulo: 'Registro' },
              ],
              enLaRuta: 'ordenarPor',
              sentidoEnLaRuta: 'direccion',
              ascendente: 'ASCENDENTE',
              descendente: 'DESCENDENTE',
            },
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      nombrados: new Map<string, string | boolean | null>([
        ['hayMas', true],
        ['totalPaginas', '3'],
      ]),
      tablas: new Map([
        [
          'versiones',
          {
            filas: [
              { celdas: ['R-1', '2026', 'ABIERTA'] },
              { celdas: ['R-2', '2026', 'CERRADA'] },
            ],
          },
        ],
      ]),
    },
  },

  'tablas-grandes': {
    deDonde: 'c01fe9a:frontend/src/secciones/Tabla.tsx:140 (18 043 lineas y 54 129 filas)',
    definicion: {
      instruccion: 'Recorra el catalogo nacional.',
      bloques: [
        {
          titulo: 'Catalogo',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Catalogo',
            clave: 'catalogo',
            columnas: [
              { rotulo: 'Codigo', alineadoDerecha: false },
              { rotulo: 'Valor', alineadoDerecha: true },
            ],
            vacio: 'El catalogo esta vacio.',
            // Las filas llegan TODAS —decenas de miles— y aqui se monta una sola pagina.
            paginacion: { en: 'cliente', enLaRuta: 'pagina', tamano: 100 },
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([
        [
          'catalogo',
          {
            filas: [
              { celdas: ['C-01', '1 200.00'] },
              { celdas: ['C-02', '980.50'] },
            ],
          },
        ],
      ]),
    },
  },

  'celda-nula-con-palabra-y-nota': {
    deDonde: 'c01fe9a:frontend/src/secciones/Tabla.tsx:85 («Donde no hay dato va —, no una celda en blanco»)',
    definicion: {
      instruccion: 'Consulte los tramos.',
      bloques: [
        {
          titulo: 'Tramos',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Tramos',
            clave: 'tramos',
            columnas: [
              { rotulo: 'Desde', alineadoDerecha: true },
              { rotulo: 'Hasta', alineadoDerecha: true },
            ],
            vacio: 'Ningun tramo.',
            // La palabra de ESTA tabla, y por que. Sin ella, la del saco.
            sinDato: { texto: '—', nota: 'Ninguna operacion publica este dato.' },
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([
        [
          'tramos',
          {
            filas: [
              { celdas: ['0.00', '15.00'] },
              // El ultimo tramo no tiene tope: llega `null`, y se dice con su propia nota.
              { celdas: ['15.00', { texto: null, nota: 'Llega como nulo: este tramo no tiene tope.' }] },
            ],
          },
        ],
      ]),
    },
  },

  'cabecera-con-campo-y-dominio': {
    deDonde: 'c01fe9a:frontend/src/secciones/Tabla.tsx:120 y :122; Publicacion.tsx:176',
    definicion: {
      instruccion: 'Consulte lo publicado.',
      bloques: [
        {
          titulo: 'Lo publicado',
          nota: '',
          // Lo mismo en la etiqueta de un campo, y no solo en la cabecera de una columna (N5).
          campos: [{ etiqueta: 'Registro', campo: 'registroId', tipo: 'r' }],
          tabla: {
            titulo: 'Partidas',
            clave: 'partidas',
            columnas: [
              { rotulo: 'Partida', alineadoDerecha: false, campo: 'partida', dominio: 'A · B · C' },
              { rotulo: 'Categoria', alineadoDerecha: false, campo: 'categoria', dominio: 'A … J' },
              { rotulo: 'Valor', alineadoDerecha: true, campo: 'valor' },
            ],
            vacio: 'Ninguna partida.',
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([['partidas', { filas: [{ celdas: ['A', 'C', '120.00'] }] }]]),
    },
  },

  'vacio-con-su-salida': {
    deDonde: 'c01fe9a:frontend/src/secciones/Ediciones.tsx:376 y Panel.tsx:231',
    definicion: {
      instruccion: 'Recorra las versiones.',
      bloques: [
        {
          titulo: 'Versiones',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Versiones',
            clave: 'versiones',
            columnas: [{ rotulo: 'Registro', alineadoDerecha: false }],
            // El vacio lleva su salida DENTRO: la frase sola no dice a donde ir.
            vacio: {
              titulo: 'Ninguna version todavia',
              texto: 'Lo siguiente es abrir la primera.',
              acciones: [{ rotulo: 'Abrir la primera version', principal: true, abre: 'abrir' }],
            },
          },
        },
        {
          tipo: 'acto',
          clave: 'abrir',
          titulo: 'Abrir una version',
          campos: [],
          observacion: { etiqueta: 'Por que se abre', largo: { minimo: 5, maximo: 500 } },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([['versiones', { filas: [] }]]),
    },
  },

  'filas-de-contenido-que-viajan': {
    deDonde: 'c01fe9a:frontend/src/secciones/panel.ts:61 y Panel.tsx:285',
    definicion: {
      instruccion: 'Lea lo que este sistema no publica.',
      bloques: [
        {
          titulo: 'Lo que no incluye',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Lo que no incluye',
            columnas: [
              { rotulo: 'Fila', alineadoDerecha: false },
              { rotulo: 'Que', alineadoDerecha: false },
            ],
            // No son filas de ejemplo —esas no viajan desde `rentas`#97—: son el texto de la
            // pantalla. Pasan por `traducir` como cualquier frase, y no leen ningun dato.
            filasDeContenido: [
              ['1', 'Algo que este sistema no publica'],
              ['2', 'Otra cosa que tampoco'],
            ],
          },
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },
} as const satisfies Record<string, Muestra>;
