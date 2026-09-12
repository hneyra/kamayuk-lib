/**
 * Los trazos SVG del producto, con NOMBRE GENERICO.
 *
 * <h2>Por que el nombre es generico y no el del modulo</h2>
 *
 * Porque el dibujo es comun y el mapeo NO: que «Coactiva» se dibuje con una balanza es negocio de
 * un contexto, y ADR-0030 §4 lo deja fuera de una libreria comun. Aqui vive el trazo —`balanza`—
 * y el sistema que lo consume decide a que modulo suyo se lo pone. Lo vigila
 * `sin-suponer-un-sistema`, que prohibe los codigos de catalogo en estos paquetes.
 *
 * Todos comparten el mismo lienzo —`viewBox="0 0 24 24"`, `fill="none"`,
 * `stroke="currentColor"`, `stroke-linecap="round"`, `stroke-linejoin="round"`— asi que lo que
 * cambia entre uno y otro es solo la lista de `d`.
 *
 * <h2>El `alerta`, y el defecto que corrige</h2>
 *
 * Medido el 2026-09-12 sobre los cuatro clones: el triangulo de alerta **no era el mismo trazo**
 * en los tres sistemas que lo tenian, y los tres lo usaban para el caso `error` de su `Aviso`:
 *
 *     rentas     ['M12 4.2 20.8 19.6H3.2z', 'M12 7.6V13M12 16.4h.02']
 *     normativa  ['M12 4.2 20.8 19.6H3.2z', 'M12 9.8v4.4', 'M12 17.1h.02']
 *     catastro   idem que normativa
 *
 * O sea que **la misma pantalla de error se veia distinta**. El artboard RentasV8 lo dirime: su
 * icono de «Infracciones administrativas» es el de `normativa` y `catastro`. El raro era `rentas`,
 * y este es el que queda.
 */

/** Los trazos de un icono. Uno o varios `d` sobre el mismo lienzo de 24×24. */
export type Trazos = readonly string[];

export const ICONOS = {
  /** Barras de un panel de indicadores. */
  panel: ['M4 19.5h16', 'M6.5 19.5V9', 'M11 19.5V5.5', 'M15.5 19.5v-7', 'M20 19.5v-11'],
  /** Un tejado sobre su planta: el inicio. */
  casa: ['M3 10.6 12 3.5l9 7.1', 'M5.6 9.6V20.5h12.8V9.6', 'M10 20.5v-5.4h4v5.4'],
  /** Una hoja con su esquina doblada y dos renglones. */
  documento: ['M6.5 3.5h7.5l4 4v13h-11.5z', 'M14 3.5v4h4', 'M9.5 12.5h5', 'M9.5 16.5h3.5'],
  /** La hoja con un renglon y un sello: un valor emitido. */
  valor: [
    'M6.5 3.5h7.5l4 4v13h-11.5z',
    'M14 3.5v4h4',
    'M9.5 11.5h5',
    'M15.6 16.4a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0',
  ],
  /** Un portapapeles con su visto: la inspeccion. */
  portapapeles: [
    'M9.5 4.5H8A1.5 1.5 0 0 0 6.5 6v13A1.5 1.5 0 0 0 8 20.5h8a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 16 4.5h-1.5',
    'M9.5 3.2h5v2.8h-5z',
    'M9.6 13.2l2 2 3.4-4',
  ],
  /** Un vehiculo de perfil. */
  vehiculo: [
    'M5 15.8v-3.2l1.9-4.4h10.2l1.9 4.4v3.2',
    'M3.6 15.8h16.8',
    'M8.4 18.4a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0',
    'M18.8 18.4a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0',
  ],
  /** El triangulo de alerta. Ver el javadoc: es el de V8, y dirime una divergencia. */
  alerta: ['M12 4.2 20.8 19.6H3.2z', 'M12 9.8v4.4', 'M12 17.1h.02'],
  /** La lupa. */
  lupa: ['M17.4 11a6.4 6.4 0 1 1-12.8 0 6.4 6.4 0 0 1 12.8 0', 'M15.8 15.8 20.6 20.6'],
  /** Una balanza: el procedimiento. */
  balanza: [
    'M12 4.4v3.2',
    'M5 8.6h14',
    'M5 8.6 2.8 14.4h4.4z',
    'M19 8.6 16.8 14.4h4.4z',
    'M8.4 20h7.2',
  ],
  /** Un local con su toldo: la licencia de funcionamiento. */
  local: ['M4.4 9.6V20h15.2V9.6', 'M3.2 9.6 5.2 4.6h13.6l2 5z', 'M9.6 20v-5.4h4.8V20'],
  /** El escudo con su visto: la seguridad. */
  escudo: [
    'M12 3.4 19 5.9v5.6c0 4.1-3 7.2-7 9.1-4-1.9-7-5-7-9.1V5.9z',
    'M9.4 12.1l1.9 1.9 3.5-3.6',
  ],
  /** Capas apiladas: el padron. */
  capas: ['M3.5 6.6 9 4.2l6 2.4 5.5-2.4v13.2L15 19.8l-6-2.4-5.5 2.4z', 'M9 4.2v13.2'],
  /** Cuatro celdas: el territorio. */
  cuadricula: [
    'M4.5 4.5h6v6h-6z',
    'M13.5 4.5h6v6h-6z',
    'M4.5 13.5h6v6h-6z',
    'M13.5 13.5h6v6h-6z',
  ],
  /** El candado. El mismo trazo en los cuatro sistemas, medido. */
  candado: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5.5 11h13v9.5h-13z'],
  /** La cruz de cerrar. */
  cerrar: ['M6 6l12 12M18 6L6 18'],
  /** El mas de anadir. */
  mas: ['M12 5v14M5 12h14'],
  /** El visto. */
  visto: ['M5 12.5l4.5 4.5L19 7'],
  /** El galon hacia abajo. */
  chevronAbajo: ['M6 9l6 6 6-6'],
  /** El galon hacia la derecha, que es el del arbol al desplegar. */
  chevronDerecha: ['M9 6l6 6-6 6'],
  /** Las tres rayas del menu. */
  menu: ['M4 7h16M4 12h16M4 17h16'],
  /** La campana de los avisos. */
  campana: [
    'M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9',
    'M13.7 19.5a2 2 0 0 1-3.4 0',
  ],
  /**
   * La «i» en su circulo: el aviso que informa y no pide nada.
   *
   * Comparte lienzo y proporcion con `alerta` a proposito — los dos encabezan un aviso y uno al
   * lado del otro tienen que pesar lo mismo; si el triangulo fuera mayor, el aviso informativo se
   * leeria como menos importante de lo que es.
   */
  informacion: ['M20.4 12a8.4 8.4 0 1 1-16.8 0 8.4 8.4 0 0 1 16.8 0', 'M12 11.2v5', 'M12 7.9h.02'],
} as const satisfies Record<string, Trazos>;

/** El nombre de un icono publicado. */
export type NombreDeIcono = keyof typeof ICONOS;
