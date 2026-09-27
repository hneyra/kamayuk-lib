/**
 * **Los dos ejes del tema, declarados UNA vez** (#124): la identidad y el modo, y su cruce.
 *
 * <h2>El defecto</h2>
 *
 * Hasta #124 cada eje se escribia en varios sitios: `Modo` se declaraba en `derivar.ts` y otra vez
 * en `ProveedorDeTema.tsx`; `IDENTIDADES` repetia a mano la union `Identidad`; y las ocho
 * combinaciones eran una lista de cadenas sueltas (`COMBINACIONES: readonly string[]`), igual que las
 * claves de `REGLAS` y de los velos de la barra (`Record<string, …>`). Con cadenas, el compilador no
 * sabia que faltaba una combinacion: lo decian tres `throw` al derivar, en tiempo de ejecucion.
 *
 * <h2>Lo que hay ahora</h2>
 *
 * Las dos listas son la fuente, y los tipos salen de ellas: `Identidad` y `Modo` son sus elementos, y
 * `Combinacion` es su cruce como tipo de plantilla, `${Identidad}/${Modo}`. Una identidad nueva
 * entra en `LAS_IDENTIDADES` y el compilador exige sus reglas y sus velos donde se declaran.
 *
 * <h2>Por que aqui y no en `derivar.ts`</h2>
 *
 * `ProveedorDeTema.tsx` viaja al navegador y lee las dos listas para decidir que valor recordado se
 * respeta; `derivar.ts` trae las reglas, la conversion de color y los papeles, que solo hacen falta
 * para generar `temas.css`. Un modulo de dos listas se importa sin arrastrar lo demas.
 */

/**
 * Las cuatro identidades, en su orden. **El orden es el de los bloques de `temas.css`**: `clasico`
 * va al final (#56), y ponerla en medio desplazaria los de `sepia` en el archivo generado.
 */
const LAS_IDENTIDADES = ['institucional', 'alto-contraste', 'sepia', 'clasico'] as const;

/** Los dos modos, claro primero: es el que el bloque de cada identidad escribe antes. */
const LOS_MODOS = ['claro', 'oscuro'] as const;

export type Identidad = (typeof LAS_IDENTIDADES)[number];
export type Modo = (typeof LOS_MODOS)[number];

/**
 * Las identidades que un sistema puede ofrecer, y las que se respetan al recordar.
 *
 * Tipada como `readonly Identidad[]` y no como la tupla: es la forma con la que se publica, y un
 * consumidor que la guarde en una variable de ese tipo tiene que seguir compilando.
 */
export const IDENTIDADES: readonly Identidad[] = LAS_IDENTIDADES;

/** Los dos modos, con la misma forma publica que `IDENTIDADES`. */
export const MODOS: readonly Modo[] = LOS_MODOS;

/** Una combinacion de los dos ejes: `sepia/oscuro`. Es la clave de las reglas y de los velos. */
export type Combinacion = `${Identidad}/${Modo}`;

/** La clave de una combinacion, con su tipo exacto: `combinacion('sepia', 'oscuro')` es `'sepia/oscuro'`. */
export const combinacion = <I extends Identidad, M extends Modo>(identidad: I, modo: M): `${I}/${M}` =>
  `${identidad}/${modo}`;

/** Los dos ejes de una combinacion, ya separados. */
export interface EjesDeUnaCombinacion {
  readonly identidad: Identidad;
  readonly modo: Modo;
}

/**
 * Las ocho, de identidades × modos, en el orden de los bloques de `temas.css`: cada identidad con
 * su claro y su oscuro, y las identidades en su orden. Es un `Map` porque de el salen las dos cosas
 * —las claves y sus ejes— sin volver a partir una cadena.
 */
const EJES: ReadonlyMap<Combinacion, EjesDeUnaCombinacion> = new Map(
  LAS_IDENTIDADES.flatMap((identidad) =>
    LOS_MODOS.map((modo) => [combinacion(identidad, modo), { identidad, modo }] as const),
  ),
);

/** Las combinaciones, derivadas: ninguna se escribe a mano. */
export const COMBINACIONES: readonly Combinacion[] = [...EJES.keys()];

/**
 * La identidad y el modo de una combinacion, sin partir la cadena ni mirar si acaba en `/oscuro`.
 *
 * El `throw` es **inalcanzable por tipo**: `clave` es una `Combinacion`, y `EJES` tiene una entrada
 * por cada una porque sale del mismo cruce que el tipo. Esta ahi porque `Map.get` no lo sabe, y solo
 * lo alcanzaria quien le pasara una cadena a la fuerza.
 */
export function ejesDe(clave: Combinacion): EjesDeUnaCombinacion {
  const ejes = EJES.get(clave);
  if (ejes === undefined) {
    throw new Error(`«${clave}» no es una combinacion de identidad y modo. Las que hay: ${COMBINACIONES.join(', ')}.`);
  }
  return ejes;
}
