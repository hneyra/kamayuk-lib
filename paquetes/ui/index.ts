/**
 * `@kamayuk/ui` — el sistema de diseno del producto.
 *
 * Es lo que ADR-0030 §4 llama `@kamayuk/ui`. **Capa 1** (`kamayuk-lib`#6): la paleta, los tres
 * componentes que el dominio ata y los trazos de icono. **Capa 2** (#8): los tres temas por dos
 * modos. **Capa 3** (#11): las once piezas de shadcn que el interprete de V8 pide en cada
 * pantalla, y la tabla de que pieza dibuja cada uno de los siete tipos de campo. **Capa 4**
 * (#13): las SIETE piezas que el armazon de V8 necesita —`Miga`, `Plegable`, `Menu`,
 * `Confirmacion`, `Cajon`, `PaletaDeMando` y `Avisos`—, que dibuja `@kamayuk/shell`. **Capa 5**
 * (#27): el interprete de pantallas, que sube de `rentas` cuando llega el segundo consumidor.
 *
 * <h2>Lo que NO trae todavia, dicho aqui y no descubierto luego</h2>
 *
 * · **`Chart` y `DataTable`.** Cada uno arrastra una libreria entera —recharts, TanStack Table— y
 *   el artboard los declara para PANTALLAS CONCRETAS, no para la espina del interprete. Entran con
 *   la pantalla que los pide.
 * · **Las caras tipograficas, y aqui NO hay promesa escrita (#24).** El artboard no carga ninguna
 *   webfont: pide `Arial, Helvetica, sans-serif`, y el unico consumidor de hoy —`rentas`— tiene
 *   una guarda propia que le prohibe las webfonts, asi que nadie las pide. Hasta #24, `exports`
 *   declaraba `"./fuentes": "./fuentes/fuentes.css"` **sin que `fuentes/` existiera**: quien
 *   escribiera `@import '@kamayuk/ui/fuentes'` no recibia una fuente sin cara, recibia un fallo de
 *   resolucion. La entrada SALIO, y lo que queda dicho es lo que hay: aqui no viaja ni un `woff2`.
 *   Los dos de Source Sans 3 que `normativa` y `catastro` duplican byte a byte —**88 840 B**—
 *   siguen en sus dos repositorios, y quien decide si esta entrada hace falta es **el segundo
 *   consumidor** (#28 AC-3), que es la misma regla con la que #11 dejo fuera `Chart` y `DataTable`:
 *   entra con su archivo y con quien lo pida, no como promesa.
 */

export { TEXTOS_DE_LA_UI, TEXTOS_DEL_INTERPRETE, TEXTOS_DE_LAS_PIEZAS } from './textos.tsx';
export type {
  TextosDeLaUi,
  TextosDelInterprete,
  TextosDeLasPiezas,
  TextosDeLaPantalla,
} from './textos.tsx';
export { Importe } from './Importe.tsx';
export type { ImporteProps } from './Importe.tsx';
export { Insignia } from './Insignia.tsx';
export type { InsigniaProps } from './Insignia.tsx';
export { FechaDeCalculo } from './FechaDeCalculo.tsx';
export type { FechaDeCalculoProps } from './FechaDeCalculo.tsx';
export { Icono } from './Icono.tsx';
export type { IconoProps } from './Icono.tsx';
export { ICONOS } from './iconos.ts';
export type { NombreDeIcono, Trazos } from './iconos.ts';
// El indicador de foco, para que el armazon pinte el MISMO y no una copia que se desincronice.
export {
  CONTORNO_DE_FOCO,
  CONTORNO_DE_FOCO_EN_LA_BARRA,
  FOCO,
  FOCO_EN_LA_BARRA,
  HALO_DE_FOCO,
  TOKEN_DEL_CONTORNO,
  TOKEN_DEL_CONTORNO_EN_LA_BARRA,
} from './shadcn/foco.ts';
export { Boton } from './shadcn/boton.tsx';
export type { BotonProps } from './shadcn/boton.tsx';
export {
  Tarjeta,
  TarjetaCabecera,
  TarjetaNota,
  TarjetaCampos,
  TarjetaBarraDeTabla,
  TarjetaPie,
} from './shadcn/tarjeta.tsx';
export { Etiqueta } from './shadcn/etiqueta.tsx';
export type { EtiquetaProps } from './shadcn/etiqueta.tsx';
export { Campo, Area, Dato } from './shadcn/campo.tsx';
export type { CampoProps, AreaProps, DatoProps } from './shadcn/campo.tsx';
export { Casilla } from './shadcn/casilla.tsx';
export type { CasillaProps } from './shadcn/casilla.tsx';
export { Desplegable, Opcion } from './shadcn/desplegable.tsx';
export type { DesplegableProps, OpcionProps } from './shadcn/desplegable.tsx';
export { Emergente, DisparadorEmergente, Capa } from './shadcn/emergente.tsx';
export type { CapaProps } from './shadcn/emergente.tsx';
export { Calendario } from './shadcn/calendario.tsx';
export type { CalendarioProps } from './shadcn/calendario.tsx';
export { Separador } from './shadcn/separador.tsx';
export type { SeparadorProps } from './shadcn/separador.tsx';
export {
  Tabla,
  TablaCabecera,
  TablaCuerpo,
  TablaFila,
  TablaRotulo,
  TablaCelda,
  TablaNota,
} from './shadcn/tabla.tsx';
export type { TablaCeldaProps, TablaProps } from './shadcn/tabla.tsx';
export { Alerta } from './shadcn/alerta.tsx';
export type { AlertaProps } from './shadcn/alerta.tsx';
export { Avance } from './shadcn/avance.tsx';
export type { AvanceProps } from './shadcn/avance.tsx';
export { Formulario, CampoDelFormulario, useFormContext } from './shadcn/formulario.tsx';
export type { FormularioProps, CampoDelFormularioProps } from './shadcn/formulario.tsx';
export { PIEZA_POR_TIPO, TIPOS_DE_CAMPO, seEscribe, anchoCompleto, tipoDe } from './shadcn/campos.ts';
export type { TipoDeCampo } from './shadcn/campos.ts';
export { CONTROL } from './shadcn/control.ts';
// La pila de capas. Sale del paquete porque el armazon dibuja la barra global, que es parte de
// ella: si su numero viviera en `shell`, la pila volveria a estar en dos sitios. Ver `capas.ts`.
export {
  CAPA_CABECERA_FIJA,
  CAPA_BARRA_GLOBAL,
  CAPA_VELO_DE_LA_PALETA,
  CAPA_PANEL_DE_LA_PALETA,
  CAPA_VELO_DEL_CAJON,
  CAPA_PANEL_DEL_CAJON,
  CAPA_VELO_DE_CONFIRMACION,
  CAPA_PANEL_DE_CONFIRMACION,
  CAPA_FLOTANTE,
} from './shadcn/capas.ts';
export { cn } from './utilidades.ts';
export { ProveedorDeTema, useTema, IDENTIDADES, MODOS } from './temas/ProveedorDeTema.tsx';
export type { ConfiguracionDeTema, Modo } from './temas/ProveedorDeTema.tsx';
export type { Identidad } from './temas/derivar.ts';
export { Miga, PasoDeLaMiga } from './shadcn/miga.tsx';
export type { MigaProps, PasoDeLaMigaProps } from './shadcn/miga.tsx';
export { Plegable, DisparadorDelPlegable, CuerpoDelPlegable } from './shadcn/plegable.tsx';
export type {
  PlegableProps,
  DisparadorDelPlegableProps,
  CuerpoDelPlegableProps,
} from './shadcn/plegable.tsx';
export { Menu, DisparadorDelMenu, ListaDelMenu, OpcionDelMenu, SeparadorDelMenu } from './shadcn/menu.tsx';
export type { ListaDelMenuProps, OpcionDelMenuProps, SeparadorDelMenuProps } from './shadcn/menu.tsx';
export {
  Confirmacion,
  DisparadorDeConfirmacion,
  PanelDeConfirmacion,
  TituloDeConfirmacion,
  NotaDeConfirmacion,
  SalidasDeConfirmacion,
  HuecoDeConfirmacion,
  Confirmar,
  Descartar,
  Cancelar,
} from './shadcn/confirmacion.tsx';
export type {
  PanelDeConfirmacionProps,
  TituloDeConfirmacionProps,
  NotaDeConfirmacionProps,
  SalidasDeConfirmacionProps,
  ConfirmarProps,
  DescartarProps,
  CancelarProps,
} from './shadcn/confirmacion.tsx';
export {
  Cajon,
  DisparadorDelCajon,
  CerrarElCajon,
  PanelDelCajon,
  TituloDelCajon,
  NotaDelCajon,
} from './shadcn/cajon.tsx';
export type { PanelDelCajonProps, TituloDelCajonProps, NotaDelCajonProps } from './shadcn/cajon.tsx';
export {
  PaletaDeMando,
  BuscadorDeLaPaleta,
  ListaDeLaPaleta,
  OpcionDeLaPaleta,
  VacioDeLaPaleta,
} from './shadcn/paleta-de-mando.tsx';
export type {
  PaletaDeMandoProps,
  BuscadorDeLaPaletaProps,
  ListaDeLaPaletaProps,
  OpcionDeLaPaletaProps,
  VacioDeLaPaletaProps,
} from './shadcn/paleta-de-mando.tsx';
export { Avisos, avisar } from './shadcn/avisos.tsx';
export type { AvisosProps } from './shadcn/avisos.tsx';
// El interprete de pantallas (#27): una definicion `[titulo, nota, campos, tabla]`, dibujada. Sube
// de `rentas` con el segundo consumidor. Las piezas de dentro —el bloque, el campo, la tabla— NO se
// exportan: nadie dibuja medio interprete.
export { Pantalla } from './interprete/Pantalla.tsx';
export type { PantallaProps } from './interprete/Pantalla.tsx';
export { coordenada } from './interprete/datos.ts';
export type {
  Ausencia,
  Coordenada,
  DatoConNombre,
  DatosDeLaPantalla,
  DatosDeUnaTabla,
  EstadoDeUnaLectura,
  FilaDeLaTabla,
  PeldanoDeUnFallo,
} from './interprete/datos.ts';
export type {
  CampoDeCasilla,
  CampoDeEntrada,
  CampoDeLista,
  CampoDeSoloLectura,
  ColumnaDeTabla,
  ComunDeUnaPieza,
  ConAnchoCompleto,
  Condicion,
  DefinicionDeAviso,
  DefinicionDeBloque,
  DefinicionDeCampo,
  DefinicionDePantalla,
  DefinicionDePiezaDelConsumidor,
  DefinicionDelPie,
  DefinicionDeTabla,
  LecturaDeUnaPieza,
  PiezaDeLaPantalla,
  Texto,
  TipoDeCampoConAncho,
  TipoDeEntrada,
  TonoDeInsignia,
} from './interprete/tipos.ts';
// El punto de extension y las tres reglas puras de #44. Las piezas de dentro —el estado de la
// lectura, el pie, el despachador— NO se exportan, por lo mismo que el bloque: nadie dibuja medio
// interprete. Las reglas si, para que una pieza del consumidor use las mismas y no una copia.
export type { PiezasDelConsumidor, PropsDeUnaPiezaDelConsumidor } from './interprete/PiezaDeLaPantalla.tsx';
export { esBloque, piezasSinRegistrar, resolverTexto, seCumple } from './interprete/componer.ts';
// Lo que la hoja HACE (#66): actos con observacion, acciones con su motivo y navegacion entre hojas.
// Las piezas de dentro —el acto, el grupo de acciones— NO se exportan, por lo mismo que el bloque.
// `BotonConMotivo` si: el pie de `@kamayuk/shell` tiene el mismo `disabled` mudo (#55, #61).
export type {
  CampoDelActo,
  DefinicionDeAccion,
  DefinicionDeActo,
  DestinoDeUnaAccion,
  EnvioDeUnActo,
  HechoDelActo,
  Impedimento,
  ManejadoresDeLasAcciones,
  ManejadoresDeLosActos,
  NavegacionDeLaPantalla,
  ObservacionDelActo,
  PeticionDeNavegacion,
} from './interprete/tipos-de-los-actos.ts';
export type { ActoAbierto } from './interprete/interaccion.ts';
export { motivoDeLaAccion, motivoDelActo } from './interprete/acciones.ts';
export { BotonConMotivo } from './shadcn/boton-con-motivo.tsx';
export type { BotonConMotivoProps } from './shadcn/boton-con-motivo.tsx';
// Los campos y las tablas de #65: sus tipos y sus tres reglas puras, por lo mismo que las de #44.
export type {
  AccionDeFila,
  AccionesPorFila,
  CasoDeInsignia,
  DefinicionDeTablaConClave,
  DetalleDeFila,
  OpcionDeLista,
  OpcionDelCampo,
  ReglaDeLaInsignia,
} from './interprete/tipos.ts';
export type { InsigniaResuelta } from './interprete/reglas-de-las-tablas.ts';
export { accionesQueOfrece, resolverInsignia, tablasSinVacio } from './interprete/reglas-de-las-tablas.ts';
// La composicion de la hoja (#67): el maestro-detalle y las pestanas son piezas de `bloques`, y
// sus tipos van con los demas de la definicion. Lo que el interprete necesita del marco para leer y
// escribir la ruta es una FORMA —`HojaDelMarco`—, que `useHoja()` de `@kamayuk/shell` ya cumple.
export type {
  DefinicionDeMaestroDetalle,
  DefinicionDePestanas,
  PestanaDeLaPantalla,
} from './interprete/tipos.ts';
export type { FilaDeUnaLista } from './interprete/datos.ts';
export type {
  CambioDeLaRuta,
  CambioDeLoTecleado,
  EnLaRuta,
  HojaDelMarco,
  LoTecleado,
  RutaDeLaHoja,
  TecleadoDeUnActo,
} from './interprete/hoja.ts';
// La marca de sucia y lo tecleado como dato de la hoja (#86).
export type { ComportamientoDeLaHoja, InsigniaDeLaCabecera, MensajesDelCampo } from './interprete/tipos.ts';
// La frase con `code` y `strong` dentro (#86, `texto-con-marcas`), y sus dos reglas puras: lo que
// dice cada tramo y que datos lee, para la guarda del sistema que calcula que poner en `nombrados`.
export type { TextoConMarcas, TramoConMarca } from './interprete/tipos.ts';
export type { TramoResuelto } from './interprete/componer.ts';
export { datosQueLee, resolverMarcas } from './interprete/componer.ts';
export { EL_SUJETO, actoEnLaRuta, cambioEn, valorEnLaRuta } from './interprete/hoja.ts';
export type { PiezaEnSuSitio } from './interprete/composicion.ts';
export {
  hijasDe,
  indicesDeLasPiezas,
  nombradosConLaHoja,
  pestanaAbierta,
  recorrerLasPiezas,
} from './interprete/composicion.ts';
// Las tablas de #61: la pagina y el orden en la ruta, la celda que puede no traer dato, el vacio con
// su salida y las filas que viajan en la definicion. Los mandos —`MandoDeOrden`, `MandoDePaginas`—
// NO se exportan, por lo mismo que la tabla: nadie dibuja medio interprete. Las reglas puras si.
export type {
  CampoDeOrden,
  OrdenDeLaTabla,
  PaginacionDeLaTabla,
  VacioDeLaTabla,
} from './interprete/tipos.ts';
export type { CeldaDeLaTabla } from './interprete/datos.ts';
export type { PaginaDeUnaTabla } from './interprete/reglas-de-las-tablas.ts';
export { notaDeLaCelda, paginaDeLaTabla, textoDeLaCelda } from './interprete/reglas-de-las-tablas.ts';
export { cambiosEn } from './interprete/hoja.ts';
// Lo que se elige en un campo, en la ruta de la hoja (#94). Las cuatro reglas son puras, por lo
// mismo que las de las tablas: un sistema recorre sus definiciones con ellas —para comprobar que
// cada `enLaRuta` de un campo esta declarado en el `Destino` de su hoja— sin montar una pantalla.
export type { EleccionDelCampo, MomentoDeLaEleccion } from './interprete/tipos.ts';
export { cambioAlElegir, eleccionDe, momentoDeLaEleccion, valorElegido } from './interprete/campos-en-la-ruta.ts';
// Como viaja una fecha —ISO— y como se lee —`dd/mm/aaaa`—: dejaron de ser la misma cadena cuando lo
// elegido en un campo empezo a viajar en una ruta (#94).
export { diaDeUnaFecha, fechaDeUnDia, fechaLeida } from './shadcn/fecha.ts';
