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
 * **Los sistemas cuyo prefijo no puede escribir la libreria.** De aqui sale el patron de
 * `prefijo-de-un-sistema`.
 *
 * **La lista se escribe a mano y NO manda: manda `consumidores.json`** (#113). Hasta #113 decia
 * «los cinco sistemas del producto» y prometia que «anadir un sexto sistema no exija acordarse de
 * esta lista»; `consumidores.json` tenia ya seis consumidores y dos —`ciudadano` y `pcf`— no
 * estaban, asi que `'/pcf/api/v1'` escrito en `ui` pasaba la guarda en verde. Hoy
 * `sin-suponer-un-sistema.test.ts` exige que el ultimo trozo de cada `repositorio` del JSON este
 * aqui, y que lo que esta aqui y no consume se declare en `SISTEMAS_QUE_NO_CONSUMEN` con su motivo:
 * la lista se comprueba entera en los dos sentidos, no se cuenta.
 *
 * **`pcf` entra como los demas, y es una decision**: es un port —el del Catastro Fiscal del MEF—
 * y no un sistema de Kamayuk, pero tiene su backend y consume estos paquetes igual que `rentas`.
 * Una libreria que escribiera `/pcf/api` lo supondria exactamente igual que una que escribiera
 * `/rentas/api`, y el sintoma en los otros cinco seria el mismo 404. No hay motivo para dejarlo
 * pasar, y por eso no hace falta una lista aparte de «consumidores que no son sistemas».
 */
export const SISTEMAS = ['rentas', 'ciudadano', 'catastro', 'caja', 'pcf', 'normativa', 'identidad'] as const;

/**
 * **Los de `SISTEMAS` que NO estan en `consumidores.json`, cada uno con su motivo** (#113).
 *
 * Es la otra mitad de la comprobacion: sin ella, un sistema que dejara de consumir —o uno escrito
 * con una errata— se quedaria en la lista sin que nada lo dijera. La guarda exige que esta
 * declaracion sea **exactamente** la diferencia entre `SISTEMAS` y el JSON.
 */
export const SISTEMAS_QUE_NO_CONSUMEN: Readonly<Partial<Record<(typeof SISTEMAS)[number], string>>> = {
  identidad:
    'Es un sistema del producto —repositorio hermano de este, ADR-0038— que no esta en ' +
    '`consumidores.json`: esta CI no le corre la suite. Su prefijo sigue prohibido, porque la ' +
    'libreria que lo escribiera lo supondria igual.',
};

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
  {
    clave: 'vocabulario-catastral',
    // #44: el interprete aprende lo que `catastro` dibuja, y es exactamente el momento en que su
    // vocabulario se cuela. SIN `\b` en ningun lado, por la leccion de la tributaria y una mas: con
    // `predio\b`, `predioId` —el identificador que la V6 lleva en cada lectura— no casaba, porque
    // detras de `predio` viene una letra. Sin limites, `predio`, `ficha` y `catastral` casan dentro
    // de cualquier identificador; y medido sobre el codigo de produccion de hoy, sin comentarios, no
    // hay ninguna palabra comun que las lleve dentro.
    patron: /predio|ficha|catastral/i,
    porQue:
      'Es la misma frontera que la tributaria, con las palabras de `catastro` (#44, AC-4): el ' +
      'interprete sube lo que DOS hojas o mas dibujan, y lo propio —un codigo por tramos, la ficha ' +
      'por su clase— entra por el punto de extension, como pieza del consumidor. Si la libreria ' +
      'necesita saber que es un predio, esa pieza es de `catastro`.',
  },
];
