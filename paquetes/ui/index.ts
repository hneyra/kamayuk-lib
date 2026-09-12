/**
 * `@kamayuk/ui` — el sistema de diseno del producto.
 *
 * Es lo que ADR-0030 §4 llama `@kamayuk/ui`. **Capa 1** (`kamayuk-lib`#6): la paleta, los tres
 * componentes que el dominio ata y los trazos de icono. **Capa 2** (#8): los tres temas por dos
 * modos. **Capa 3** (#11): las once piezas de shadcn que el interprete de V8 pide en cada
 * pantalla, y la tabla de que pieza dibuja cada uno de los siete tipos de campo.
 *
 * <h2>Lo que NO trae todavia, dicho aqui y no descubierto luego</h2>
 *
 * · **`Chart` y `DataTable`.** Cada uno arrastra una libreria entera —recharts, TanStack Table— y
 *   el artboard los declara para PANTALLAS CONCRETAS, no para la espina del interprete. Entran con
 *   la pantalla que los pide.
 * · **Las piezas del marco** —`Command`, `AlertDialog`, `DropdownMenu`, `Breadcrumb`,
 *   `Collapsible`, `Sheet`, `Sonner`—: son del armazon y van con `@kamayuk/shell`.
 * · **Las caras tipograficas.** El artboard no carga ninguna webfont: pide
 *   `Arial, Helvetica, sans-serif`. Los dos `woff2` de Source Sans 3 que `normativa` y `catastro`
 *   duplican byte a byte entraran como punto de entrada aparte, para quien los quiera.
 */

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
