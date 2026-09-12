import { formatearFecha, type Fecha } from '../formato/index.ts';

/**
 * A que fecha estan las cifras de esta pantalla.
 *
 * **Es de la respuesta, no de un bloque de totales**, y ahi estaba el defecto que este componente
 * corrige: cuando la fecha vive dentro de la banda de totales, las pantallas que ensenan cifras en
 * una tabla y no tienen banda se quedan mostrando importes sin decir de cuando son.
 *
 * `fecha` es obligatoria por el mismo motivo que en `Importe`: no hay respuesta sin ella (regla 9,
 * RNF-075), asi que esta linea se puede dibujar siempre. Si fuera opcional, el componente tendria
 * que saber devolver `null`, y entonces una pantalla a la que se le olvido pasarla se veria
 * exactamente igual que una que no tiene cifras — que es la confusion que se quiere evitar.
 */
export interface FechaDeCalculoProps {
  readonly fecha: Fecha;
}

export function FechaDeCalculo({ fecha }: FechaDeCalculoProps) {
  return (
    <p className="m-0 text-[12.5px] text-tinta-3">
      Cifras actualizadas al <strong className="font-bold">{formatearFecha(fecha)}</strong>
    </p>
  );
}
