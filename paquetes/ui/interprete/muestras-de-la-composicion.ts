import type { Muestra } from './muestras.ts';

/**
 * **Un ejemplo por cada hueco de #67 que vive en el interprete**: el maestro-detalle y las pestanas.
 *
 * Van aparte de `MUESTRAS_DEL_INTERPRETE` porque aquella lista es la tabla de #44 y su centinela
 * exige esas ocho claves, ni una mas. Las mismas reglas: vocabulario neutro, la cita de donde lo
 * hacia la V6 de `catastro` en `22e6d2e`, y montadas una a una por `composicion.test.tsx`, que
 * exige estas dos claves.
 *
 * Los otros cuatro huecos de #67 son del marco y no del interprete —`estado-en-la-ruta`,
 * `parametro-del-marco`, `acceso-por-hoja` y `hoja-a-sangre`—: su ejemplo es el catalogo de
 * `shell/estado-en-la-ruta.test.tsx`.
 */

const SIN_FRASE_DE_PANTALLA = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

export const MUESTRAS_DE_LA_COMPOSICION = {
  'maestro-detalle': {
    deDonde: 'frontend/src/modulos/catastro/Catastro.tsx:855 (y Territorio, :1853)',
    definicion: {
      instruccion: 'Elija un registro de la lista.',
      bloques: [
        {
          tipo: 'maestroDetalle',
          enLaRuta: 'sujeto',
          maestro: {
            rotulo: 'Registros',
            filas: 'registros',
            fila: { titulo: '{nombre}', linea: '{tipo} · {codigo}', insignia: '{estado}' },
            vacio: 'Ningun registro coincide.',
            lectura: { clave: 'lista' },
          },
          detalle: {
            sinEleccion: 'Elija uno de la lista.',
            noEstaEnLaLista: 'El elegido no esta en esta pagina de la lista.',
            cabecera: { titulo: { plantilla: 'Registro {ruta.sujeto}' }, subtitulo: { desde: 'direccion' } },
            bloques: [{ titulo: 'Lo que se sabe', nota: '', campos: [{ etiqueta: 'Codigo', tipo: 'r' }] }],
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      lecturas: new Map([['lista', { estado: 'con-datos' }]]),
      listas: new Map([
        [
          'registros',
          [
            { clave: '41', campos: { nombre: 'Primero', tipo: 'Uno', codigo: 'A-41', estado: 'ACTIVO' } },
            { clave: '42', campos: { nombre: 'Segundo', tipo: 'Dos', codigo: 'A-42', estado: 'BAJA' } },
          ],
        ],
      ]),
      nombrados: new Map([['direccion', 'Calle Uno 123']]),
    },
  },

  pestanas: {
    deDonde: 'frontend/src/modulos/catastro/Catastro.tsx:1333 (y Valores, :2548)',
    definicion: {
      instruccion: 'Consulte el registro.',
      bloques: [
        {
          tipo: 'pestanas',
          enLaRuta: 'ver',
          rotulo: 'Vistas del registro',
          pestanas: [
            { clave: 'vigente', rotulo: 'Vigente', bloques: [{ titulo: 'La version vigente', nota: '', campos: [] }] },
            {
              clave: 'historial',
              rotulo: { plantilla: 'Movimientos ({movimientos})' },
              bloques: [
                {
                  titulo: 'El historial',
                  nota: '',
                  campos: [],
                  tabla: { titulo: 'Movimientos', columnas: [{ rotulo: 'Fecha', alineadoDerecha: false }] },
                },
              ],
            },
          ],
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      nombrados: new Map([['movimientos', '3']]),
      // El bloque de la segunda pestana es la pieza 2: en anchura, detras de la tira (0) y del
      // bloque de la primera (1). Ver `indicesDeLasPiezas`.
      filas: new Map([[2, [['06/09/2026']]]]),
    },
  },
} as const satisfies Record<string, Muestra>;
