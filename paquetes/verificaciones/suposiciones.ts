/**
 * Lo que una libreria comun NO puede dar por sentado, como dato.
 *
 * Lo lee la guarda `sin-suponer-un-sistema.test.ts` y lo lee su muestra. Vive aparte —y no
 * dentro de la prueba— por lo mismo que `eslint.prohibiciones.mjs` vive aparte de su config: una
 * lista que se escribe dos veces se desincroniza, y la copia que se queda vieja es la que
 * vigila.
 */

export interface Suposicion {
  /** Identificador estable. Es lo que el rojo nombra y lo que la muestra declara violar. */
  readonly clave: string;
  /** Lo que no puede aparecer en el codigo de produccion de ningun paquete. */
  readonly patron: RegExp;
  /** Por que. Va dentro del mensaje del rojo: una guarda sin motivo se acaba desactivando. */
  readonly porQue: string;
}

/**
 * Los cinco sistemas del producto. De aqui salen los patrones, para que anadir un sexto sistema
 * no exija acordarse de esta lista.
 */
export const SISTEMAS = ['rentas', 'catastro', 'caja', 'normativa', 'identidad'] as const;

export const SUPOSICIONES: readonly Suposicion[] = [
  {
    clave: 'prefijo-de-un-sistema',
    // `/rentas/api`, `/caja/api/v1`… en cualquier cadena del codigo.
    patron: new RegExp(`/(${SISTEMAS.join('|')})/api`, 'i'),
    porQue:
      'ADR-0030 §2 pone el sistema delante de la ruta para que LA RUTA DIGA QUIEN RESPONDE. Un ' +
      'prefijo escrito en la libreria haria que los otros sistemas preguntaran al backend ' +
      'equivocado, y el sintoma seria un 404 de una ruta que si existe en el sistema correcto. ' +
      'El prefijo es un parametro de `crearCliente`.',
  },
  {
    clave: 'global-de-configuracion-de-un-sistema',
    // `window.__KAMAYUK_RENTAS__` y sus hermanos.
    patron: /__KAMAYUK_[A-Z]+__/,
    porQue:
      'El nombre del global de configuracion lleva el sistema dentro. Una libreria que lo lee ' +
      'solo sirve a uno. La configuracion entra como argumento.',
  },
  {
    clave: 'catalogo-de-modulos-de-un-sistema',
    // Los codigos de modulo del catalogo de `rentas`. Son negocio de un contexto (ADR-0030 §4).
    patron: /\bRENTAS_REGISTRO\b|\bAUTORIZACIONES_Y_LICENCIAS\b|\bINFRACCIONES_ADMINISTRATIVAS\b/,
    porQue:
      'El arbol de modulos es negocio de un contexto: «una libreria comun no puede contener ' +
      'logica de negocio de un contexto» (ADR-0030 §4). El catalogo de destinos lo aporta el ' +
      'sistema que consume; lo que viaja es el marco que lo dibuja.',
  },
  {
    clave: 'vocabulario-tributario',
    // La frontera que ADR-0030 §4 dibuja con nombre propio: «si necesita saber que es un
    // arbitrio, dejo de ser comun».
    // SIN `\b` por delante, y la muestra es la que lo demostro: con el, `totalDeArbitrios` no
    // casaba —el limite de palabra no existe dentro de camelCase— y la regla habria dejado
    // pasar justo la forma en que el vocabulario se cuela de verdad, que es un identificador.
    patron: /arbitrios?\b|alicuotas?\b|autovaluo\b|predial\b|contribuyentes?\b/i,
    porQue:
      'ADR-0030 §4 lo escribe con este ejemplo exacto: «si `@kamayuk/ui` necesita saber que es ' +
      'un arbitrio, dejo de ser comun y es el monolito otra vez, repartido y sin que el build ' +
      'lo vea».',
  },
];
