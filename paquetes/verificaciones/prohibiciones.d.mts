/**
 * **La FORMA de `@kamayuk/verificaciones/prohibiciones`, publicada** (#46).
 *
 * <h2>Por que este archivo existe</h2>
 *
 * Las nueve prohibiciones viajan como `prohibiciones.mjs` —JavaScript con JSDoc, y es lo
 * correcto: lo tiene que poder cargar ESLint a pelo, antes de que exista TypeScript—. Dentro de
 * este repositorio eso se tipa solo, porque el archivo se importa por ruta relativa y el
 * `allowJs` del `tsconfig` lo alcanza. **Desde un consumidor no**: llega por
 * `node_modules/@kamayuk/verificaciones/`, y TypeScript **no aplica `allowJs` a nada que cuelgue
 * de `node_modules`**. Medido en un consumidor de mentira con las opciones de `rentas`:
 *
 *     eslint.prohibiciones.mjs(71,25): error TS7016: Could not find a declaration file for module
 *       '@kamayuk/verificaciones/prohibiciones'. '…/node_modules/@kamayuk/verificaciones/
 *       prohibiciones.mjs' implicitly has an 'any' type.
 *
 * ...y con el, trece `TS7006`/`TS7031` derivados, uno por cada parametro que se queda sin tipo.
 *
 * La salida de `maxNodeModuleJsDepth` **se probo en `rentas`#137 y no vale**: abre `node_modules`
 * ENTERO al comprobador, y lo primero que sale son veintitantos errores dentro de `jsdom`
 * pidiendo `@types/whatwg-url`. Un arreglo que pone en rojo dependencias de terceros no es un
 * arreglo.
 *
 * Asi que `rentas` escribio su propio `frontend/verificaciones/tipos/kamayuk-verificaciones.d.ts`,
 * 57 lineas declarando esta misma forma — y `caja`, `catastro` e `identidad` iban a escribir cada
 * uno **su copia**, divergiendo. Que es el defecto que `rentas`#137 acababa de cerrar un piso mas
 * abajo. **Lo publica el dueno, una vez, y los cuatro lo leen.**
 *
 * <h2>Que se declara, y que NO</h2>
 *
 * **La FORMA, nunca la lista.** Aqui no hay ni una clave, ni un selector, ni un mensaje: eso es
 * el dato, vive en `prohibiciones.mjs` y se importa. Una lista declarada aqui seria el fork otra
 * vez, con tipos: el `.d.mts` prometiendo nueve claves literales y el `.mjs` publicando diez.
 *
 * <h2>Que impide que esta declaracion se separe del archivo que describe</h2>
 *
 * Que la lee **este mismo repositorio**. Con un `.d.mts` al lado, TypeScript prefiere la
 * declaracion tambien para el `import './prohibiciones.mjs'` relativo, asi que
 * `reglas-de-eslint.test.ts` —que importa los cinco exports— se typechequea CONTRA ESTE ARCHIVO.
 * Renombrar aqui un campo, o dejar de declarar un export que el `.mjs` publica, sale rojo en
 * `yarn typecheck` de esta libreria, no en el build de otro repositorio.
 *
 * Y que la entrada de `exports` que lo sirve la vigila `lo-que-exports-promete-existe.test.ts`:
 * una subruta que apunta a un `.mjs` sin su declaracion al lado sale roja ahi.
 */

/** Una prohibicion del producto, como dato. */
export interface Prohibicion {
  /**
   * Identificador estable. Tambien el nombre del archivo de su muestra en
   * `verificaciones/muestras/`, sin extension.
   */
  readonly clave: string;
  /**
   * La fila de la tabla de reglas del producto a la que sirve. Varias prohibiciones pueden
   * servir a la misma regla.
   */
  readonly regla: string;
  /**
   * Selector ESQuery que la detecta. Admite varios separados por coma, que es como una regla se
   * hace de varias formas.
   */
  readonly selector: string;
  /**
   * Lo que se le dice a quien la incumple. La prueba compara contra ESTE texto, no contra una
   * copia suya.
   */
  readonly message: string;
  /**
   * Prefijos de ruta donde la prohibicion NO aplica, **en el arbol de la libreria**.
   *
   * Es una LISTA desde #4, y por eso un consumidor puede tener un numero distinto de prefijos
   * para la misma regla sin que ninguna de las dos cifras sea un error: lo que se comparte es la
   * lista de reglas, no donde cae cada una.
   */
  readonly salvo?: readonly string[];
}

/** El unico directorio de ESTE arbol que puede llamar a `fetch`. */
export declare const CLIENTE_DE_API: string;

/** La puerta de identidad, que es el SEGUNDO sitio de ESTE arbol donde `fetch` es legitimo. */
export declare const PUERTA_DE_IDENTIDAD: string;

/** Donde `fetch` es legitimo en ESTE arbol, y en ningun otro sitio. */
export declare const DONDE_SE_LLAMA_A_FETCH: readonly string[];

/** Las prohibiciones del producto. La LISTA es el dato del `.mjs`; aqui solo su forma. */
export declare const PROHIBICIONES: readonly Prohibicion[];

/**
 * Las reglas del producto que el frontend expresa como verificacion. Es una de las dos listas
 * escritas a mano, y la que se pone roja cuando borrar una prohibicion se lleva su prueba por
 * delante.
 */
export declare const REGLAS_EXIGIDAS: readonly string[];

/**
 * Las prohibiciones que un sistema ENCIENDE si quiere (#58). **Misma forma que las obligatorias**,
 * y por eso no hay un segundo tipo: lo que cambia no es el dato sino quien decide aplicarlo.
 *
 * Van aparte de `PROHIBICIONES` porque anadirlas ahi pone rojo a `rentas` sin tocar nada suyo —su
 * prueba exige una muestra por clave **en su propio arbol**, y su ejemplo de codigo correcto es
 * justo lo que la opcional prohibe—. El motivo entero, medido, esta en `prohibiciones.mjs`.
 */
export declare const PROHIBICIONES_OPCIONALES: readonly Prohibicion[];

/**
 * Las reglas del producto que un sistema PUEDE expresar como verificacion, y que no se le exigen.
 * La segunda lista escrita a mano, y la que se pone roja cuando borrar una prohibicion opcional se
 * lleva su prueba por delante.
 */
export declare const REGLAS_OPCIONALES: readonly string[];
