/**
 * `@kamayuk/shell` — **el armazón**: lo que rodea a la pantalla y es igual en los cuatro sistemas.
 *
 * Es lo que ADR-0030 §4 llama `@kamayuk/shell` y la única de las seis piezas que **se escribe nueva
 * y no se extrae**. Medido: hay cuatro implementaciones divergentes del mismo marco —445 líneas de
 * diferencia sólo entre dos de ellas, y una tercera con todo dentro de un archivo de 1 238—.
 * Compartir exige reescribir.
 *
 * <h2>La regla que aquí se pone a prueba de verdad</h2>
 *
 * *«Una librería común no puede contener lógica de negocio de un contexto»* (ADR-0030 §4). El
 * armazón es donde cuesta: la barra sabe que hay módulos, el árbol sabe que hay hojas y la paleta
 * sabe que hay destinos. **Nada de eso puede saber cuáles.** El catálogo entra por parámetro —ver
 * `catalogo.ts`— y el sistema que consume es el que lo compone, ya filtrado por lo que su cuenta
 * puede abrir.
 *
 * <h2>Lo que NO trae, dicho aquí y no descubierto luego</h2>
 *
 * · **El intérprete de pantallas** —bloques, campos, tablas—. El armazón recibe una función que
 *   dibuja la pantalla de un destino y no sabe lo que hay dentro.
 * · **Los datos.** No llama a ninguna API: recibe el catálogo ya compuesto.
 * · **i18n.** Lo que trae desde #19 es **el saco de textos**: las treinta y una palabras que el
 *   marco dice por su cuenta entran por `textos`, con el castellano por omisión. Lo que NO trae, a
 *   propósito, es un motor de traducción: `i18next` sería una `peerDependency` de la librería y
 *   obligaría a los cuatro sistemas a montarlo antes de dibujar un botón. Ver `textos.ts`.
 */

export { Armazon } from './Armazon.tsx';
export type { ArmazonProps } from './Armazon.tsx';
export { ArbolDeModulos } from './ArbolDeModulos.tsx';
export type { ArbolDeModulosProps } from './ArbolDeModulos.tsx';
export { BarraGlobal } from './BarraGlobal.tsx';
export type { BarraGlobalProps } from './BarraGlobal.tsx';
export { CarrilDeModulos } from './CarrilDeModulos.tsx';
export type { CarrilDeModulosProps } from './CarrilDeModulos.tsx';
export { PaletaDelArmazon } from './PaletaDelArmazon.tsx';
export type { PaletaDelArmazonProps } from './PaletaDelArmazon.tsx';
export { CabeceraDePantalla } from './CabeceraDePantalla.tsx';
export type { CabeceraDePantallaProps } from './CabeceraDePantalla.tsx';
export { AccionesAlPie } from './AccionesAlPie.tsx';
export type { AccionesAlPieProps } from './AccionesAlPie.tsx';
export { AvisoDeCambios } from './AvisoDeCambios.tsx';
export type { AvisoDeCambiosProps } from './AvisoDeCambios.tsx';
export { useArmazon, useHoja, useTextos, ProveedorDeLosTextos } from './contexto.tsx';
// Ir a otra hoja desde una pantalla, por el mismo `irA` que el arbol (#66).
export { useNavegacion, ProveedorDeLaNavegacion, ubicacionDe } from './navegacion.tsx';
export type { NavegacionDelArmazon, ResultadoDeIr, ExtraDeLaPeticion } from './navegacion.tsx';
export type {
  ConfiguracionDelArmazon,
  CuentaEnLaBarra,
  OpcionDeSesion,
  AccionesDelSistema,
  HojaAbierta,
} from './contexto.tsx';
export {
  slugDe,
  indiceDelCatalogo,
  destinoDeSlug,
  destinosOfrecidos,
  cuantosDestinos,
} from './catalogo.ts';
export type { Catalogo, ModuloDelCatalogo, Destino, HojaDelCatalogo } from './catalogo.ts';
export { modulosQueCasan, resultadosDelMando, pieDeLaPaleta, RESULTADOS_DE_LA_PALETA } from './busqueda.ts';
export type { ModuloFiltrado, ResultadoDelMando } from './busqueda.ts';
export { accionesDelPie, avisoDelPie } from './acciones.ts';
export type { AccionDelPie, ActoDelPie } from './acciones.ts';
export { TEXTOS_DEL_ARMAZON } from './textos.ts';
export type { TextosDelArmazon } from './textos.ts';
// El estado de una hoja en la ruta (#67): `#/<slug>/<sujeto>?<parametro>=<valor>`. Las funciones son
// puras y se publican para que un sistema escriba un enlace a una hoja sin montar el marco.
export { accesosDe } from './catalogo.ts';
export type { AvisoDeLaRuta } from './contexto.tsx';
export { RUTA_VACIA, aplicarElCambio, escribirLaRuta, leerLaRuta, rutaDeLaHoja } from './ruta.ts';
export type { Ignorados, RutaLeida } from './ruta.ts';
