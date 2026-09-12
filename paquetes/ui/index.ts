/**
 * `@kamayuk/ui` — el sistema de diseno del producto.
 *
 * Es lo que ADR-0030 §4 llama `@kamayuk/ui`. **Capa 1** (`kamayuk-lib`#6): la paleta, los tres
 * componentes que el dominio ata y los trazos de icono.
 *
 * <h2>Lo que NO trae todavia, dicho aqui y no descubierto luego</h2>
 *
 * · **Los componentes de shadcn.** El CLI los copia uno a uno al repositorio que los usa, y quien
 *   sabe cuales hacen falta es quien dibuja: `@kamayuk/shell` y el interprete de pantallas. Traer
 *   los veinticinco ahora seria meter veinticinco archivos que nadie importa —y que nadie podria
 *   probar— para tenerlos «listos». Entran cuando se usan.
 * · **Los temas.** Tres identidades por dos modos, con el oscuro derivado del claro en OKLCH y
 *   aprobado por la guarda de contraste. Es la capa 2.
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
