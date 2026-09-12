import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * El `cn()` de shadcn: compone clases y deja ganar a la ultima.
 *
 * `clsx` junta lo que se le pase —cadenas, condiciones, listas— y `tailwind-merge` resuelve los
 * conflictos: con `px-2 px-4` deja `px-4`, en vez de dejar los dos y que gane el que la hoja de
 * estilos ponga despues. Sin eso, una prop `className` que quiera pisar el relleno del componente
 * unas veces funciona y otras no, segun el orden en que Tailwind emitio las dos reglas.
 */
export function cn(...clases: ClassValue[]): string {
  return twMerge(clsx(clases));
}
