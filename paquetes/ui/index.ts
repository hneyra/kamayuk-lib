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

export { TEXTOS_DE_LA_UI, TEXTOS_DEL_INTERPRETE } from './textos.tsx';
export type { TextosDeLaUi, TextosDelInterprete } from './textos.tsx';
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
export type { TablaCeldaProps } from './shadcn/tabla.tsx';
export { Alerta } from './shadcn/alerta.tsx';
export type { AlertaProps } from './shadcn/alerta.tsx';
export { Avance } from './shadcn/avance.tsx';
export type { AvanceProps } from './shadcn/avance.tsx';
export { Formulario, CampoDelFormulario, useFormContext } from './shadcn/formulario.tsx';
export type { FormularioProps, CampoDelFormularioProps } from './shadcn/formulario.tsx';
export { PIEZA_POR_TIPO, TIPOS_DE_CAMPO, seEscribe, anchoCompleto, tipoDe } from './shadcn/campos.ts';
export type { TipoDeCampo } from './shadcn/campos.ts';
export { CONTROL } from './shadcn/control.ts';
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
export type { Ausencia, Coordenada, DatosDeLaPantalla } from './interprete/datos.ts';
export type {
  CampoDeCasilla,
  CampoDeEntrada,
  CampoDeLista,
  CampoDeSoloLectura,
  ColumnaDeTabla,
  ConAnchoCompleto,
  DefinicionDeBloque,
  DefinicionDeCampo,
  DefinicionDePantalla,
  DefinicionDeTabla,
  TipoDeCampoConAncho,
  TipoDeEntrada,
  TonoDeInsignia,
} from './interprete/tipos.ts';
