import { coordenada } from './datos.ts';
import type { Muestra } from './muestras.ts';

/**
 * **Un ejemplo por cada hueco de #65**: los campos y las tablas que `catastro` dibuja en dos hojas
 * o mas, con la definicion y los datos con que se dibujan.
 *
 * Van en su archivo, y no en `muestras.ts`, porque #66 y #67 anaden las suyas a la vez: tres
 * issues escribiendo en el mismo objeto se pisan, y el centinela de cada uno cuenta sus claves.
 * La forma es la misma —`Muestra`— y son lo mismo: **la forma de uso** que `catastro`
 * (catastro#119), `identidad` (#55) y `normativa` (#61) copian, en vocabulario neutro. `deDonde`
 * cita donde lo hacia la V6 de `catastro`, en `22e6d2e`.
 *
 * **Las monta `campos-y-tablas.test.tsx`, una a una**, y su centinela exige las diez claves de la
 * tabla de #65, ni una mas ni una menos.
 *
 * No se exporta desde `index.ts`: es documentacion ejecutable, y no viaja en ningun paquete servido.
 */

const SIN_FRASE_DE_PANTALLA = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

/** Las diez, por el nombre del hueco en `catastro/frontend/diseno/HUECOS.md`. */
export const MUESTRAS_DE_CAMPOS_Y_TABLAS = {
  'tabla-con-vacio': {
    deDonde: 'frontend/src/modulos/fiscalizacion/Fiscalizacion.tsx:328 (y trece hojas)',
    definicion: {
      instruccion: 'Consulte las evidencias del registro.',
      bloques: [
        {
          titulo: 'Evidencias',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Evidencias',
            clave: 'evidencias',
            columnas: [
              { rotulo: 'Tipo', alineadoDerecha: false },
              { rotulo: 'Fecha', alineadoDerecha: false },
            ],
            vacio: { plantilla: 'El registro {registroId} no tiene ninguna evidencia.' },
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      nombrados: new Map([['registroId', '42']]),
      tablas: new Map([['evidencias', { filas: [] }]]),
    },
  },

  marcador: {
    deDonde: 'frontend/src/modulos/riesgo/Riesgo.tsx:14 (y once hojas)',
    definicion: {
      instruccion: 'Escriba el identificador.',
      bloques: [
        {
          titulo: 'Buscar',
          nota: '',
          campos: [
            { etiqueta: 'Identificador', tipo: '', marcador: 'El numero que devolvio el alta' },
            { etiqueta: 'Desde', tipo: 'd', marcador: 'Cualquier dia' },
          ],
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'insignia-con-tono-por-regla': {
    deDonde: 'frontend/src/modulos/fiscalizacion/Fiscalizacion.tsx:611',
    definicion: {
      instruccion: 'Revise los registros.',
      bloques: [
        {
          titulo: 'Registros',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Registros',
            clave: 'registros',
            columnas: [
              { rotulo: 'Codigo', alineadoDerecha: false },
              // El valor mismo decide: `FIRME` en `ok` y cualquier otro en `mal`.
              {
                rotulo: 'Estado',
                alineadoDerecha: false,
                insignia: { casos: { FIRME: { tono: 'ok' } }, otro: { tono: 'mal' } },
              },
              // Otro dato de la fila decide, y la frase la pone la regla.
              {
                rotulo: 'Vigencia',
                alineadoDerecha: false,
                insignia: {
                  segun: 'activa',
                  casos: { true: { tono: 'ok', texto: 'Vigente' } },
                  otro: { tono: 'mal', texto: 'Retirada' },
                },
              },
              // Y el tono ya viene decidido en los datos.
              { rotulo: 'Pendientes', alineadoDerecha: true, insignia: { tonoDesde: 'tono', siNoTrae: 'info' } },
            ],
            vacio: 'Ningun registro.',
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([
        [
          'registros',
          {
            filas: [
              {
                celdas: ['R-1', 'FIRME', '', '0'],
                datos: new Map<string, string | boolean | null>([
                  ['activa', true],
                  ['tono', 'atencion'],
                ]),
              },
              {
                celdas: ['R-2', 'ANULADO', '', '3'],
                datos: new Map<string, string | boolean | null>([
                  ['activa', false],
                  ['tono', 'mal'],
                ]),
              },
            ],
          },
        ],
      ]),
    },
  },

  'dato-con-insignia': {
    deDonde: 'frontend/src/modulos/parametros/Parametros.tsx:16',
    definicion: {
      instruccion: 'Revise el estado del ejercicio.',
      bloques: [
        {
          titulo: 'El ejercicio',
          nota: '',
          campos: [
            { etiqueta: 'Ejercicio', tipo: 'r' },
            {
              etiqueta: 'Cerrado',
              tipo: 'r',
              insignia: {
                casos: { true: { tono: 'ok', texto: 'Si' } },
                otro: { tono: 'atencion', texto: 'Todavia no' },
              },
            },
          ],
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      valores: new Map([
        [coordenada(0, 0), '2026'],
        [coordenada(0, 1), 'false'],
      ]),
    },
  },

  'opciones-con-valor-y-rotulo': {
    deDonde: 'frontend/src/modulos/catastro/Catastro.tsx:963',
    definicion: {
      instruccion: 'Filtre la lista.',
      bloques: [
        {
          titulo: 'Filtros',
          nota: '',
          campos: [
            {
              etiqueta: 'Tipo',
              tipo: 's',
              opciones: [
                { valor: '', rotulo: 'Todos' },
                { valor: 'UNO', rotulo: 'Tipo uno' },
                { valor: 'DOS', rotulo: 'Tipo dos' },
              ],
            },
          ],
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'acciones-por-fila': {
    deDonde: 'frontend/src/modulos/fiscalizacion/Fiscalizacion.tsx:345',
    definicion: {
      instruccion: 'Decida sobre lo detectado.',
      bloques: [
        // El acto que abre la accion de la fila: el de #66, con su observacion. Recibe el codigo de
        // la fila en `envio.parametros.registro`.
        {
          tipo: 'acto',
          clave: 'aprobar',
          titulo: 'Aprobar',
          campos: [],
          observacion: { etiqueta: 'Observacion', largo: { minimo: 5, maximo: 500 } },
        },
        {
          titulo: 'Detectados',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Detectados',
            clave: 'detectados',
            columnas: [
              { rotulo: 'Codigo', alineadoDerecha: false },
              { rotulo: 'Estado', alineadoDerecha: false },
            ],
            vacio: 'No se detecto nada.',
            accionesPorFila: {
              columna: 'Acciones',
              // Las acciones de #66: abrir un acto con la fila, o ir a otra hoja con ella de sujeto.
              acciones: [
                { clave: 'aprobar', rotulo: 'Aprobar', abre: 'aprobar', con: { registro: { desde: 'codigo' } } },
                { clave: 'descartar', rotulo: 'Descartar', va: { hoja: 'otra/lista', sujeto: { desde: 'codigo' } } },
              ],
              segun: { dato: 'estado', ofrece: { PENDIENTE: ['aprobar', 'descartar'], CERRADO: [] } },
              sinAcciones: 'Sin acciones',
              nombreDelGrupo: { plantilla: 'Registro {codigo} · {estado}' },
            },
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([
        [
          'detectados',
          {
            filas: [
              {
                celdas: ['D-1', 'PENDIENTE'],
                datos: new Map([
                  ['codigo', 'D-1'],
                  ['estado', 'PENDIENTE'],
                ]),
              },
              {
                celdas: ['D-2', 'CERRADO'],
                datos: new Map([
                  ['codigo', 'D-2'],
                  ['estado', 'CERRADO'],
                ]),
                realzada: true,
              },
            ],
          },
        ],
      ]),
    },
  },

  'ayuda-en-una-lista': {
    deDonde: 'frontend/src/modulos/consultas/Consultas.tsx:187',
    definicion: {
      instruccion: 'Ordene la lista.',
      bloques: [
        {
          titulo: 'Orden',
          nota: '',
          campos: [
            {
              etiqueta: 'Ordenar por',
              tipo: 's',
              opciones: ['Codigo', 'Nombre'],
              ayuda: 'Solo los campos que el servidor admite',
            },
          ],
        },
      ],
    },
    datos: { ausencia: SIN_FRASE_DE_PANTALLA },
  },

  'varias-tablas-en-un-bloque': {
    deDonde: 'frontend/src/modulos/riesgo/Riesgo.tsx:39',
    definicion: {
      instruccion: 'Consulte el detalle.',
      bloques: [
        {
          titulo: 'Detalle',
          nota: '',
          campos: [],
          tablas: [
            {
              clave: 'zonas',
              titulo: 'Zonas',
              columnas: [{ rotulo: 'Zona', alineadoDerecha: false }],
              vacio: 'No cae en ninguna zona.',
            },
            {
              clave: 'franjas',
              titulo: 'Franjas',
              columnas: [{ rotulo: 'Franja', alineadoDerecha: false }],
              vacio: 'No cae en ninguna franja.',
              nota: 'Una franja no es una zona: se leen por separado.',
            },
          ],
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([
        ['zonas', { filas: [{ celdas: ['Z-1'] }] }],
        ['franjas', { filas: [] }],
      ]),
    },
  },

  'detalle-de-fila': {
    deDonde: 'frontend/src/modulos/fiscalizacion/Fiscalizacion.tsx:638',
    definicion: {
      instruccion: 'Revise lo verificado.',
      bloques: [
        {
          titulo: 'Verificados',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Verificados',
            clave: 'verificados',
            columnas: [
              { rotulo: 'Codigo', alineadoDerecha: false },
              { rotulo: 'Estado', alineadoDerecha: false },
            ],
            vacio: 'Nada verificado todavia.',
            detalleDeFila: {
              texto: { plantilla: 'Anulacion: {motivo} · Anulado por {quien} · Anulado el {cuando}' },
              cuando: { dato: 'motivo', hay: true },
            },
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([
        [
          'verificados',
          {
            filas: [
              { celdas: ['V-1', 'FIRME'], datos: new Map([['motivo', null]]) },
              {
                celdas: ['V-2', 'ANULADO'],
                datos: new Map([
                  ['motivo', 'Duplicado'],
                  ['quien', 'inspector.3'],
                  ['cuando', '02/09/2026'],
                ]),
              },
            ],
          },
        ],
      ]),
    },
  },

  'tabla-de-cabecera-fija': {
    deDonde: 'frontend/src/modulos/catastro/Catastro.tsx:1999',
    definicion: {
      instruccion: 'Recorra el catalogo.',
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
              { rotulo: 'Cantidad', alineadoDerecha: true },
            ],
            vacio: 'El catalogo esta vacio.',
            cabeceraFija: true,
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
              { celdas: ['C-01', '12'] },
              { celdas: ['C-02', '7'] },
            ],
          },
        ],
      ]),
    },
  },
} as const satisfies Record<string, Muestra>;
