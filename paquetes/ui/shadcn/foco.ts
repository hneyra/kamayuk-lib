/**
 * El INDICADOR DE FOCO, en un solo sitio (#37).
 *
 * <h2>Son dos cosas, y el artboard dibuja las dos</h2>
 *
 * ```
 *   :focus-visible              { outline: 2px solid var(--azul); outline-offset: 1px }
 *   input:focus, select:focus   { border-color: var(--azul); box-shadow: 0 0 0 3px var(--foco) }
 * ```
 *
 * El CONTORNO es el que identifica: 2 px de un color que contrasta. El HALO es el que ablanda:
 * 3 px de un azul palido que no identifica nada por si solo. Hasta #37 los componentes que no son
 * campo se habian quedado **solo con el halo**, y ademas mataban el contorno con `outline-none`.
 * Medido en el navegador sobre «Volver», enfocado con teclado: el halo daba **1.13:1** contra el
 * lienzo en `institucional/claro` —el tema por omision y el modo por omision— cuando WCAG 1.4.11
 * pide 3:1. Cuatro de las seis combinaciones no llegaban.
 *
 * El campo SI lo habia reimplantado, y por eso no esta aqui: su indicador es el borde que pasa a
 * `--azul`, que es la segunda regla del artboard y vive en `control.ts`.
 *
 * <h2>Por que `outline-none` NO puede quedarse, aunque parezca inofensivo</h2>
 *
 * Porque en Tailwind v4 `outline-none` no solo apaga el contorno: escribe `--tw-outline-style:
 * none` en el elemento. Y `outline-2` emite `outline-style: var(--tw-outline-style)`. O sea que
 * con los dos puestos el contorno **no se pinta y nadie avisa** — sale una clase perfectamente
 * escrita que no produce ningun contorno. Medido compilando esta misma hoja:
 *
 * ```
 *   .outline-none                     { --tw-outline-style: none; outline-style: none }
 *   .focus-visible\:outline-2:focus-visible { outline-style: var(--tw-outline-style); ... }
 * ```
 *
 * Asi que se hacen las dos cosas, y ninguna sobra:
 *
 *   1. **`outline-none` sale** de todo lo que dibuja un contorno. Sin el, la variable vale `solid`
 *      por omision y no hay nada que deshacer.
 *   2. **`focus-visible:outline-solid` entra** en la constante. Emite `outline-style: solid`
 *      DIRECTAMENTE —no a traves de la variable— y su selector pesa `(0,2,0)` contra el `(0,1,0)`
 *      de `.outline-none`. O sea que si alguien vuelve a poner `outline-none` manana, el contorno
 *      **sigue pintandose**, y no por el orden en que Tailwind emita las reglas sino por
 *      especificidad, que es determinista.
 *
 * La (1) sola dependeria de que nadie lo vuelva a escribir; la (2) sola dejaria la variable en
 * `none` para cualquier otra utilidad de contorno. Con las dos, el contorno se pinta por regla.
 *
 * <h2>El literal va ENTERO</h2>
 *
 * Nada de `` `outline-${token}` ``: Tailwind lee el codigo como TEXTO, y una clase compuesta no
 * genera ninguna regla. Que el literal y el token que la guarda mide sean el mismo lo comprueba
 * `foco.test.ts`, que ademas COMPILA la clase y mira el CSS emitido.
 */

/** El token con que se dibuja el contorno. Es el que la guarda mide contra los dos papeles. */
export const TOKEN_DEL_CONTORNO = '--azul';

/**
 * El contorno del artboard: 2 px, `--azul`, separado 1 px.
 *
 * Va en todo lo que se enfoca y NO es un campo: botones, disparadores de plegable, dias del
 * calendario, salidas de un dialogo.
 */
export const CONTORNO_DE_FOCO =
  'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 ' +
  'focus-visible:outline-azul';

/**
 * El halo blando. **Convive con el contorno**, que es lo que hace el artboard: no se quita.
 *
 * Por si solo no identifica nada —1.13:1—, pero acompanado del contorno engorda el foco y lo
 * hace facil de seguir con el rabillo del ojo cuando se tabula deprisa.
 */
export const HALO_DE_FOCO = 'focus-visible:ring-[3px] focus-visible:ring-foco';

/** Los dos juntos, que es como se usan siempre. */
export const FOCO = `${CONTORNO_DE_FOCO} ${HALO_DE_FOCO}`;

/**
 * Y EL DE LA BARRA, QUE NO PUEDE SER EL MISMO AZUL.
 *
 * El contorno de arriba se mide contra `--superficie` y `--fondo`, que es donde se enfoca casi
 * todo. La barra global no es ninguno de los dos: es `--azul-oscuro`, y `--azul` encima de ella
 * es azul sobre azul. Medido en las seis: **1.52 · 6.20 · 1.12 · 10.06 · 1.20 · 4.86** — o sea que
 * en los tres modos CLAROS el contorno no se veria, que son justo los que mas se usan. Pintar ahi
 * el mismo token seria cambiar un indicador invisible por otro.
 *
 * Lo que si se ve sobre la barra es lo que ya se lee sobre ella: `--sobre-barra`. Medido contra la
 * barra y contra la barra CON HOVER —que es mas clara, y por tanto el caso malo—, da entre 7.03:1
 * y 10.52:1 en las seis. Lo comprueba `foco.test.ts` con las dos, igual que el otro.
 */
export const TOKEN_DEL_CONTORNO_EN_LA_BARRA = '--sobre-barra';

export const CONTORNO_DE_FOCO_EN_LA_BARRA =
  'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 ' +
  'focus-visible:outline-sobre-barra';

/** El de la barra, con su halo. */
export const FOCO_EN_LA_BARRA = `${CONTORNO_DE_FOCO_EN_LA_BARRA} ${HALO_DE_FOCO}`;
