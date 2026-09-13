import { HALO_DE_FOCO } from './foco.ts';

/**
 * El aspecto COMUN de un control de formulario, en un solo sitio.
 *
 * El artboard lo escribe una vez y lo reparte a los cuatro controles que dibuja —campo de texto,
 * desplegable, area y fecha— en una constante que llama `CTRL`. Aqui igual, y por el mismo motivo
 * que alli: cuatro copias del mismo filo se desincronizan, y la que se queda vieja es la que
 * alguien esta mirando.
 *
 * El foco NO viene de la paleta por omision de shadcn: `--foco` es un token del artboard.
 */
export const CONTROL =
  'w-full box-border border border-borde-campo rounded-sm px-[10px] py-2 bg-superficie text-[13.5px] ' +
  'text-tinta outline-none transition-colors placeholder:text-tinta-3 ' +
  // El campo lleva la OTRA regla del artboard —`input:focus { border-color: var(--azul); ...;
  // outline: none }`—, asi que aqui `outline-none` es lo que V8 dibuja y no un descuido: su
  // indicador es el borde que pasa a azul, no un contorno. El halo si sale de la constante, para
  // que no haya dos copias del mismo anillo.
  `hover:border-borde-hover focus-visible:border-azul ${HALO_DE_FOCO} ` +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  // El campo con error se ve mal ANTES de que nadie lea el mensaje: filo y papel cambian los dos.
  'aria-invalid:border-mal-borde aria-invalid:bg-mal-campo';
