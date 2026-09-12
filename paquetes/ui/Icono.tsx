import { ICONOS, type NombreDeIcono } from './iconos.ts';

/**
 * Un icono del producto, dibujado desde su nombre.
 *
 * Los trazos comparten lienzo, asi que lo unico que cambia entre uno y otro es la lista de `d`.
 * `aria-hidden` y `focusable="false"` van siempre: **un icono nunca comunica solo**. Lo que dice
 * algo es el texto que lleva al lado, y por eso este componente no acepta rotulo — si hiciera
 * falta uno, la pieza que lo necesita es un boton con su texto, no un icono con `aria-label`.
 */
export interface IconoProps {
  readonly nombre: NombreDeIcono;
  /** El lado, en px. Por omision 16: el tamano al que el artboard los dibuja en el arbol. */
  readonly tamano?: number;
  /** El grosor del trazo. Por omision 1.8, que es el del artboard. */
  readonly grosor?: number;
}

export function Icono({ nombre, tamano = 16, grosor = 1.8 }: IconoProps) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONOS[nombre].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
