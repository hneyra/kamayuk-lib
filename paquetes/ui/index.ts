/**
 * `@kamayuk/ui` — el sistema de diseno del producto.
 *
 * Es lo que ADR-0030 §4 llama `@kamayuk/ui`. **Capa 1** (`kamayuk-lib`#6): la paleta, los tres
 * componentes que el dominio ata y los trazos de icono.
 *
 * <h2>Lo que NO trae todavia, dicho aqui y no descubierto luego</h2>
 *
 * · **Los demas componentes de shadcn.** Hay UNO —`Boton`— porque hacia falta uno con el que
 *   comprobar que el `--radius` del producto gana al de shadcn. Los otros entran cuando se usen:
 *   quien sabe cuales hacen falta es quien dibuja.
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
export { cn } from './utilidades.ts';
export { ProveedorDeTema, useTema, IDENTIDADES, MODOS } from './temas/ProveedorDeTema.tsx';
export type { ConfiguracionDeTema, Modo } from './temas/ProveedorDeTema.tsx';
export type { Identidad } from './temas/derivar.ts';
