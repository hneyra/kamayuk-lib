import type { Muestra } from './muestras.ts';

/**
 * **Un ejemplo por cada hueco de #95**: la fila de una tabla que se elige por si misma, y el
 * detalle de un maestro que se dibuja sin eleccion.
 *
 * Los dos se midieron al cerrar `caja`#99, donde hacia falta elegir una fila de una tabla de ocho
 * columnas —que en el maestro de #67 no cabe, porque su maestro es una lista de `titulo`/`linea`/
 * `insignia`— y hubo que rodearlo con una accion `va` a la misma hoja. `deDonde` cita eso.
 *
 * Van en su archivo, y no en `muestras-de-las-tablas.ts` ni en `muestras-de-la-composicion.ts`, por
 * lo mismo que las de #61 y #86: los centinelas de aquellos exigen **sus** claves, las de su serie,
 * ni una mas; y dos issues escribiendo en el mismo objeto se pisan. Las monta
 * `la-fila-es-elegible.test.tsx`, una a una, y su centinela exige estas dos.
 *
 * **Las claves no chocan con las piezas locales de `catastro`** —`buscador`, `chips-de-filtro`,
 * `descarga-de-documento`, `paginacion`, `orden`—, que su guarda `las-piezas-locales-son-las-de-huecos`
 * lee en todo `MUESTRAS…` de este directorio: la subida sigue siendo aditiva.
 *
 * No se exporta desde `index.ts`: es documentacion ejecutable, y no viaja en ningun paquete servido.
 */

const SIN_FRASE_DE_PANTALLA = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

/** Una fila de movimientos: sus celdas y el dato `codigo` que la eleccion escribe en la ruta. */
const movimiento = (codigo: string, fecha: string, estado: string) => ({
  celdas: [codigo, fecha, estado],
  datos: new Map([
    ['codigo', codigo],
    ['estado', estado],
  ]),
});

export const MUESTRAS_DE_LA_ELECCION = {
  'fila-elegible-en-la-ruta': {
    deDonde: 'hneyra/caja#99: la accion `va` a la misma hoja con que se rodeo que una fila no se pudiera elegir',
    definicion: {
      instruccion: 'Elija un movimiento de la tabla.',
      bloques: [
        {
          titulo: 'Movimientos',
          nota: '',
          campos: [],
          tabla: {
            titulo: 'Movimientos',
            clave: 'movimientos',
            columnas: [
              { rotulo: 'Codigo', alineadoDerecha: false, campo: 'codigo' },
              { rotulo: 'Fecha', alineadoDerecha: false, campo: 'fecha' },
              { rotulo: 'Estado', alineadoDerecha: false },
            ],
            vacio: 'Ningun movimiento todavia.',
            // Pulsar la fila escribe su `codigo` en `?movimiento=`, y la ruta la deja elegida al
            // recargar. Es otro sitio que la pagina y el orden: cambiarlos no la borra.
            eleccion: { enLaRuta: 'movimiento', desde: 'codigo' },
            paginacion: { en: 'cliente', enLaRuta: 'pagina', tamano: 3 },
            orden: {
              campos: [
                { valor: 'codigo', rotulo: 'Codigo' },
                { valor: 'fecha', rotulo: 'Fecha' },
              ],
              enLaRuta: 'ordenarPor',
              sentidoEnLaRuta: 'direccion',
              ascendente: 'ASC',
              descendente: 'DESC',
            },
            // Los botones de la fila son suyos: pulsarlos NO elige la fila.
            accionesPorFila: {
              columna: 'Acciones',
              acciones: [{ clave: 'anular', rotulo: 'Anular', hace: 'anular' }],
              segun: { dato: 'estado', ofrece: { VIGENTE: ['anular'] } },
              sinAcciones: 'Sin acciones',
              nombreDelGrupo: { plantilla: 'Movimiento {codigo}' },
            },
          },
        },
        {
          // El detalle de la misma hoja lee lo elegido como `ruta.movimiento`: no hay un segundo
          // canal, es la ruta que ya entra en `nombrados` desde #67.
          titulo: 'El movimiento elegido',
          nota: { plantilla: 'Elegido: {ruta.movimiento}' },
          campos: [],
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      tablas: new Map([
        [
          'movimientos',
          {
            filas: [
              movimiento('M-1', '01/09/2026', 'VIGENTE'),
              movimiento('M-2', '02/09/2026', 'ANULADO'),
              // Una fila sin el dato que se escribe —el saldo de apertura no es un movimiento—: se
              // lee como las demas y no se elige.
              { celdas: ['Apertura', '31/08/2026', 'CERRADO'], datos: new Map([['estado', 'CERRADO']]) },
              movimiento('M-4', '04/09/2026', 'VIGENTE'),
            ],
          },
        ],
      ]),
    },
  },

  'detalle-sin-eleccion-que-se-dibuja': {
    deDonde: 'hneyra/caja#99: el detalle de la hoja, que tenia que seguir a la vista sin nada elegido',
    definicion: {
      instruccion: 'Elija un registro de la lista.',
      bloques: [
        {
          tipo: 'maestroDetalle',
          enLaRuta: 'sujeto',
          maestro: {
            rotulo: 'Registros',
            filas: 'registros',
            fila: { titulo: '{nombre}', linea: '{codigo}' },
            vacio: 'Ningun registro coincide.',
            lectura: { clave: 'lista' },
          },
          detalle: {
            sinEleccion: 'Nada elegido todavia: el detalle se llena al elegir uno de la lista.',
            // Sin eleccion, el detalle NO se sustituye: se dibuja con su cabecera y sus piezas, y
            // cada lectura dice su espera.
            sinEleccionSeDibuja: true,
            noEstaEnLaLista: 'El elegido no esta en esta pagina de la lista.',
            cabecera: { titulo: 'Detalle del registro' },
            bloques: [
              {
                titulo: 'Lo que se sabe',
                nota: '',
                campos: [{ etiqueta: 'Codigo', tipo: 'r' }],
                lectura: { clave: 'detalle', espera: 'Elija un registro y aqui saldra lo que se sabe de el.' },
              },
            ],
          },
        },
      ],
    },
    datos: {
      ausencia: SIN_FRASE_DE_PANTALLA,
      // La lista contesto; el detalle espera, porque sin sujeto el sistema no tiene que pedir.
      lecturas: new Map([
        ['lista', { estado: 'con-datos' }],
        ['detalle', { estado: 'en-espera' }],
      ]),
      listas: new Map([
        [
          'registros',
          [
            { clave: '41', campos: { nombre: 'Primero', codigo: 'A-41' } },
            { clave: '42', campos: { nombre: 'Segundo', codigo: 'A-42' } },
          ],
        ],
      ]),
    },
  },
} as const satisfies Record<string, Muestra>;
