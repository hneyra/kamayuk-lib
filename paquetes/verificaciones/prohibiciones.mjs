/**
 * Las prohibiciones del producto, como DATO: **nueve obligatorias y una opcional**.
 *
 * Las nueve de `PROHIBICIONES` valen en los cinco sistemas y no se eligen. La de
 * `PROHIBICIONES_OPCIONALES` la enciende el sistema que quiera, en su propio
 * `eslint.prohibiciones.mjs`; por que no puede estar en la primera lista esta medido abajo, en su
 * propio javadoc (#58).
 *
 * Vivieron en `rentas/frontend/eslint.prohibiciones.mjs` hasta que las mudo `kamayuk-lib`#4. El
 * motivo de mudarlas es un hueco medido: el codigo enlazado desde aqui **no lo lintaba nadie** —
 * `rentas/frontend/eslint.config.js:51` ignora `node_modules` entero, y en el bundle de un sistema
 * entraba codigo que formatea dinero y compone peticiones sin ninguna de las cuatro prohibiciones
 * de importes (regla 1, RNF-055), sin la del `municipalidadId` (regla 2) y sin la del token en
 * almacenamiento. No habia rojo en ningun lado y no lo iba a haber: es un hueco de cobertura, no
 * un fallo.
 *
 * Las consumen el `eslint.config.js` de este repositorio y el de cada sistema.
 *
 * **Su FORMA se publica al lado, en `prohibiciones.d.mts`** (#46). Este archivo es JavaScript con
 * JSDoc a proposito —lo tiene que poder cargar ESLint a pelo, antes de que exista TypeScript—, y
 * eso dentro de este repositorio se tipa solo; desde un consumidor no, porque TypeScript **no
 * aplica `allowJs` dentro de `node_modules` y la entrada llegaba como `any`. La declaracion dice
 * la forma y NUNCA la lista: la lista es este archivo.
 *
 * No estan escritas dentro de `eslint.config.js` a proposito. Este archivo lo leen dos
 * consumidores y tienen que leer lo mismo:
 *
 *   1. `eslint.config.js`, que las convierte en opciones de `no-restricted-syntax`, y
 *   2. `verificaciones/reglas-de-eslint.test.ts`, que exige de cada una su muestra.
 *
 * Si la prueba tuviera su propia lista, seria una copia: se anade una regla al config, la
 * lista de la prueba no se toca, y la regla nueva queda sin muestra **en verde**. Que es
 * exactamente el modo de fallo que la prueba existe para impedir. Derivadas de aqui las
 * dos, una prohibicion sin muestra sale roja sola.
 *
 * El `clave` no es decorativo: **es el nombre de su muestra**. La prueba no tiene un mapa
 * de «regla -> archivo» que alguien pueda dejar desactualizado; compone la ruta.
 */

/**
 * @typedef {object} Prohibicion
 * @property {string} clave     Identificador estable. Tambien el nombre del archivo de su
 *                              muestra en `verificaciones/muestras/`, sin extension.
 * @property {string} regla     La fila de la tabla de reglas del producto a la que sirve.
 *                              Varias prohibiciones pueden servir a la misma regla.
 * @property {string} selector  Selector ESQuery que la detecta. Admite varios separados
 *                              por coma, que es como una regla se hace de varias formas.
 * @property {string} message   Lo que se le dice a quien la incumple. La prueba compara
 *                              contra ESTE texto, no contra una copia suya.
 * @property {readonly string[]} [salvo]   Prefijos de ruta donde la prohibicion NO aplica.
 *   Es una LISTA desde `kamayuk-lib`#4: era un solo prefijo mientras el cliente HTTP y la
 *   puerta de identidad vivieron en el mismo directorio de un sistema, y al separarse en dos
 *   paquetes quedaron dos sitios donde `fetch` es legitimo. La lista se comprueba entera en
 *   `reglas-de-eslint.test.ts`, no se cuenta: anadir un prefijo exige decir cual y por que.
 */

/**
 * Nombres de campo que llevan dinero. Sobre ellos no se hace aritmetica ni se declara un
 * `number`.
 *
 * <h2>Son los del PRODUCTO, y es UNA lista (#58)</h2>
 *
 * Hasta #58 eran los de `rentas` y solo los de `rentas`: `monto`, `saldo`, `deuda`, `vuelto`,
 * `recibido`… o sea el vocabulario de una ventanilla que cobra. Con eso, `uit`, `alicuota`,
 * `arancel` y `valorUnitario` —que son NUMERIC en la base, `BigDecimal` en el backend y texto
 * decimal en el cable exactamente igual que un monto— pasaban sin vigilar en los cinco sistemas.
 * `normativa` lo habia resuelto en su V6 con **su propia lista** (`c01fe9a:frontend/eslint.
 * prohibiciones.mjs:53-54`), que es el fork que `rentas`#137 acababa de cerrar un piso mas abajo.
 *
 * Asi que la lista es **una union**, no un parametro por sistema. El motivo es el defecto que
 * cerro `rentas`#137: dos listas en verde midiendo cosas distintas. Un nombre de mas en un
 * sistema que no lo usa no cuesta nada —no hay codigo que senalar—; un nombre de menos es un
 * campo de dinero sin vigilar, y no hay rojo en ningun lado que lo diga.
 *
 * <h2>Lo que NO entra, y esta medido</h2>
 *
 * Una prohibicion que senala codigo correcto se desactiva, y una regla desactivada no protege
 * nada. Estos nombres se probaron y se quedan fuera, cada uno con su falso positivo:
 *
 *   · **`valor` a secas** — es el nombre generico de cualquier campo de un formulario, y en este
 *     mismo arbol `paquetes/ui/shadcn/avance.tsx:24` declara `readonly valor: number | null`: el
 *     avance de 0 a 100 de una barra de progreso, que es `number` con toda la razon. Entra **con
 *     apellido**: `valorUnitario`, `valorArancelario`, `valorReferencial`, `valorNumerico`,
 *     `valorM2`.
 *   · **`porcentaje` a secas** — `catastro:src/pantallas/piezas/avance-por-fila.tsx:37` declara
 *     `readonly porcentaje: number` y lo que guarda es el **indice de una columna**, no un tanto
 *     por ciento. Entra con apellido: `porcentajeDeActualizacion` esta en `CIFRAS_NORMATIVAS`.
 *   · **`base` a secas** — `baseUrl`, `baseDeDatos`, `baseline`. Entra `baseImponible`.
 *   · **`tim` y `tope`** — lo midio la V6 de `normativa` (`c01fe9a:…:81-83`): con coincidencia por
 *     prefijo, `tim` caza `timeout` y `timer`, y `tope` caza cualquier limite de la interfaz.
 *
 * Los cuatro campos decimales del snapshot de `normativa` (`docs/50-api/formas-de-la-api.json`,
 * `GET /conjuntos/{id}/snapshot`) se repartieron por ese mismo criterio: `valorNumerico` y
 * `valorM2` entran; `porcentaje` de la fila de depreciacion y `valor` de la fila del valor
 * referencial **no**, por lo de arriba. A los dos que quedan fuera no los deja sin barrera: los
 * dos llegan como `"texto"` en las formas de la API, y quien lo comprueba campo a campo contra el
 * `record` del backend es la guarda de formas de `normativa`, no ESLint. Renombrarlos para que
 * cayeran en esta lista seria cambiar el JSON que publica el backend.
 *
 * **`total` lleva una excepcion, y es de verdad la unica.** `totalElementos` y `totalPaginas`
 * son los dos contadores del envoltorio de paginacion del backend —`{ contenido, pagina,
 * tamano, totalElementos, totalPaginas, hayMas }`, que publican mas de sesenta de las 181
 * operaciones—, y son cuentas de cosas, no de dinero: llegan como `entero` en
 * `docs/50-api/formas-de-la-api.json` y tienen que declararse `number`. Sin la excepcion, toda
 * pantalla con una tabla paginada arrancaria con dos `eslint-disable`, y una regla que se
 * desactiva por costumbre deja de proteger a la tercera vez. Lo descubrio F-4 al tipar el
 * envoltorio; el resto de `total…` —`totalAPagar`, `totalDeLaDeuda`— sigue prohibido, y la
 * prueba de reglas lo comprueba por los dos lados.
 */
const CAMPOS_DE_DINERO =
  'monto|importe|saldo|deuda|total(?!Elementos|Paginas)|insoluto|interes|autovaluo|arbitrio|recargo|vuelto|recibido|pagado|abonado|' +
  'uit|alicuota|arancel|valorUnitario|valorArancelario|valorReferencial|valorNumerico|valorM2|deduccion|depreciacion|reajuste|baseImponible';

/**
 * Colecciones que no se suman en el cliente: un `reduce` sobre ellas es un total calculado aqui.
 *
 * **Gana `parametros` en #58**, porque un conjunto sellado de `normativa` es una lista de
 * parametros y sumarla en la pantalla seria componer una cifra que nadie sello.
 *
 * **`tramos` se probo y NO entra, y el falso positivo esta medido**: en
 * `catastro:src/pantallas/piezas/codigo-por-tramos.tsx:87` la linea es
 * `ajustes.tramos.reduce((suma, t) => suma + t.digitos, 0)` — la suma de los **digitos** de los
 * ocho tramos del codigo catastral, que es una longitud y no un importe. Anadirlo pone rojo a un
 * consumidor por codigo correcto, que es la familia de `tim` y `tope`. Lo peligroso de verdad
 * —clavar el tramo del predial en el codigo— lo caza la prohibicion OPCIONAL, que lleva `tramo`
 * en `CIFRAS_NORMATIVAS`.
 */
const COLECCIONES_QUE_NO_SE_SUMAN = 'cuotas|conceptos|valores|papeletas|parametros';

/**
 * Tildes y enie: prohibidas en identificadores (idioma del repositorio).
 * Copiada de `infrastructure/infra/eslint.config.mjs`, donde ya estaba escrita: la misma
 * regla en dos sitios distintos es dos reglas que divergen.
 */
const LETRAS_ACENTUADAS = 'áéíóúÁÉÍÓÚñÑüÜ';

/**
 * El unico directorio que puede llamar a `fetch`.
 *
 * Es la excepcion que da sentido a la regla: mientras toda peticion pase por `solicitar()`,
 * enchufar el token, la clave de idempotencia y el formato de error se hace en un sitio.
 * Un `fetch` suelto en una pantalla no se salta una convencion: se salta las tres.
 */
export const CLIENTE_DE_API = 'paquetes/api/';

/**
 * La puerta de identidad, que es el SEGUNDO sitio donde `fetch` es legitimo.
 *
 * Lo destapo la propia prohibicion al mudarse aqui (#4): `paquetes/sesion/identidad.ts` llama a
 * `fetch` para el canje PKCE, y ese canje **no puede pasar por `solicitar()`** — va a Keycloak,
 * con `application/x-www-form-urlencoded`, sin el token (que es justo lo que va a buscar) y sin el
 * `problem+json` del backend. Mientras las dos piezas vivieron en el mismo `src/api/` de `rentas`,
 * una sola excepcion las cubria y esto no se veia.
 *
 * Son DOS y son estas: la lista se comprueba entera, no se cuenta.
 */
export const PUERTA_DE_IDENTIDAD = 'paquetes/sesion/';

/** Donde `fetch` es legitimo, y en ningun otro sitio. */
export const DONDE_SE_LLAMA_A_FETCH = [CLIENTE_DE_API, PUERTA_DE_IDENTIDAD];

/** @type {readonly Prohibicion[]} */
export const PROHIBICIONES = [
  {
    clave: 'identificador-con-tilde',
    regla: 'sin tildes ni enie en identificadores',
    selector: `Identifier[name=/[${LETRAS_ACENTUADAS}]/]`,
    message: 'Sin tildes ni enie en identificadores. El texto con tildes va en las cadenas.',
  },
  {
    clave: 'fetch-fuera-del-cliente',
    regla: 'fetch prohibido fuera del cliente de API',
    selector: "CallExpression[callee.name='fetch']",
    message:
      'Las peticiones pasan por «solicitar» del cliente: ahi viven el token, la clave de idempotencia y el formato de error (ADR-0030 §3).',
    salvo: DONDE_SE_LLAMA_A_FETCH,
  },
  {
    clave: 'importe-declarado-number',
    regla: 'un importe es string, nunca number',
    selector:
      `TSPropertySignature[key.name=/^(${CAMPOS_DE_DINERO})/i] > TSTypeAnnotation > TSNumberKeyword, ` +
      `Identifier[name=/^(${CAMPOS_DE_DINERO})/i] > TSTypeAnnotation > TSNumberKeyword`,
    message:
      'Un importe se declara «string», nunca «number»: en coma flotante 0.1 + 0.2 no es 0.30 y el centimo se pierde antes de mostrarse (regla 1, RNF-055).',
  },
  {
    clave: 'importe-convertido-a-number',
    regla: 'un importe es string, nunca number',
    selector:
      `CallExpression[callee.name=/^(Number|parseFloat|parseInt)$/] > MemberExpression[property.name=/^(${CAMPOS_DE_DINERO})/i], ` +
      `CallExpression[callee.name=/^(Number|parseFloat|parseInt)$/] > Identifier[name=/^(${CAMPOS_DE_DINERO})/i]`,
    message:
      'Un importe es texto y pierde centimos como number. No lo conviertas: formatealo (regla 1, RNF-055).',
  },
  {
    clave: 'aritmetica-con-importes',
    regla: 'sin aritmetica sobre importes',
    selector:
      `BinaryExpression[operator=/^[-+*/%]$/] > MemberExpression[property.name=/^(${CAMPOS_DE_DINERO})/i], ` +
      `CallExpression[callee.property.name='reduce'][callee.object.property.name=/^(${CAMPOS_DE_DINERO}|${COLECCIONES_QUE_NO_SE_SUMAN})/i]`,
    message:
      'Aritmetica con un importe. El total lo calcula el backend y lo sostiene con su fecha: pidelo, no lo sumes (regla 1, regla 9).',
  },
  {
    clave: 'importe-sin-fecha',
    regla: 'un importe se muestra con su fecha de calculo',
    // `:not(:has(...))`: el elemento de apertura que NO tiene entre sus atributos
    // uno llamado `fechaCalculo`. Un `<Importe {...props} />` tambien cae, y esta
    // bien que caiga: desde el JSX no hay forma de saber si ese objeto la trae.
    selector:
      "JSXOpeningElement[name.name='Importe']:not(:has(JSXAttribute[name.name='fechaCalculo']))",
    message:
      'Un importe se muestra con la fecha a la que esta calculado: no existe «la deuda», existe la deuda a una fecha (regla 9, RNF-075).',
  },
  {
    clave: 'municipalidad-en-el-cliente',
    regla: 'municipalidadId no se manda nunca',
    selector: "Identifier[name='municipalidadId']",
    message:
      'El frontend jamas envia municipalidadId: el backend lo toma del token (regla 2, ADR-0028 §2).',
  },
  {
    clave: 'token-en-almacenamiento',
    regla: 'el token no toca localStorage ni sessionStorage',
    // La prohibicion es guardar CREDENCIALES en el navegador, no usar el almacenamiento:
    // una preferencia de la ventanilla ahi esta en su sitio. Por eso mira la clave.
    selector:
      'CallExpression[callee.object.name=/^(localStorage|sessionStorage)$/][callee.property.name=/^(setItem|getItem|removeItem)$/][arguments.0.value=/token|jwt|bearer|credencial|contrasena|acceso|sesion/i]',
    message:
      'El token vive en memoria, nunca en localStorage ni sessionStorage: en una PC de ventanilla compartida entre turnos, un token persistido sobrevive al cierre del navegador (ADR-0030 §3).',
  },
  {
    clave: 'tasa-en-vez-de-alicuota',
    regla: 'alicuota, nunca tasa',
    selector: 'Identifier[name=/^tasa(De)?(Interes|Descuento|Porcentaje|Depreciacion|Moratori)/i]',
    message: 'Un porcentaje se llama «alicuota» (regla 8). «tasa» es un tipo de tributo del manual.',
  },
];

/**
 * Las reglas del producto que el frontend expresa como verificacion, tal como las nombra
 * el issue F-1. La prueba exige que cada una tenga al menos una prohibicion que la sirva.
 *
 * ES LA LISTA ESCRITA A MANO, y es deliberado que sea la unica. `PROHIBICIONES` se deriva
 * hacia la prueba, asi que **borrar una prohibicion borraria tambien su prueba**, en
 * silencio. Esta lista es lo que se pone rojo cuando eso pasa.
 *
 * @type {readonly string[]}
 */
export const REGLAS_EXIGIDAS = [
  'sin tildes ni enie en identificadores',
  'fetch prohibido fuera del cliente de API',
  'un importe es string, nunca number',
  'un importe se muestra con su fecha de calculo',
  'sin aritmetica sobre importes',
  'municipalidadId no se manda nunca',
  'el token no toca localStorage ni sessionStorage',
  'alicuota, nunca tasa',
];

// ---------------------------------------------------------------------------------------------
// LAS OPCIONALES (#58)
// ---------------------------------------------------------------------------------------------

/**
 * Los nombres que nombran una cifra que fija una NORMA.
 *
 * No es la misma lista que `CAMPOS_DE_DINERO` aunque se solapen, y la diferencia importa: alli se
 * prohibe el TIPO —un importe es texto—, aqui se prohibe el LITERAL —la cifra no se escribe, se
 * pide—. `monto` esta en la primera y no en la segunda porque un monto lo calcula alguien; `uit`
 * esta en las dos porque la UIT es texto decimal *y* la fija un decreto supremo.
 *
 * Sale verbatim de la V6 de `normativa` (`c01fe9a:frontend/eslint.prohibiciones.mjs:85-86`), que
 * es donde se midio. **Ni `tim` ni `tope` estan, y se probo por que**: con coincidencia por
 * prefijo, `tim` caza `timeout` y `timer`, y `tope` caza cualquier limite de la interfaz.
 */
const CIFRAS_NORMATIVAS =
  'uit|alicuota|tramo|arancel|valorUnitario|valorArancelario|valorReferencial|depreciacion|deduccion|minimoImponible|factorDeActualizacion|porcentajeDeActualizacion';

/**
 * Un literal que es una cifra, la escriba quien la escriba como numero o como texto.
 *
 * Las dos formas, y hacen falta las dos: en estas interfaces **un importe es `string`** (regla 1),
 * asi que quien clave la alicuota predial no escribira `0.006` sino `'0.006'` — y una prohibicion
 * que solo mirase los numeros dejaria pasar precisamente la forma que las otras reglas obligan a
 * usar.
 */
const LITERAL_DE_CIFRA =
  ':matches(Literal[value=type(number)], Literal[value=/^-?[0-9]+([.][0-9]+)?$/])';

/** Los sitios donde un literal queda ATADO a un nombre, que es lo que lo hace una cifra. */
const ATADURAS_DE_CIFRA = [
  `VariableDeclarator[id.name=/^(${CIFRAS_NORMATIVAS})/i]`,
  `Property[key.name=/^(${CIFRAS_NORMATIVAS})/i]`,
  `PropertyDefinition[key.name=/^(${CIFRAS_NORMATIVAS})/i]`,
  `AssignmentPattern[left.name=/^(${CIFRAS_NORMATIVAS})/i]`,
];

/**
 * Las prohibiciones que un sistema ENCIENDE si quiere, y que por omision no estan.
 *
 * <h2>Por que una lista aparte y no una decima en `PROHIBICIONES`</h2>
 *
 * **Porque `rentas` saldria en rojo sin tocar nada suyo, y esta medido por dos caminos distintos:**
 *
 *   1. `rentas` deriva **todas** las prohibiciones de esta libreria (`rentas#137`), y su
 *      `verificaciones/reglas-de-eslint.test.ts` exige de cada clave **una muestra en SU propio
 *      arbol**. Su `frontend/verificaciones/muestras/` tiene nueve. Una decima aqui lo deja rojo
 *      con «La prohibicion «cifra-tributaria-literal» no tiene muestra que la viole».
 *   2. La linea `export const alicuotaPredial = '0.006';` es, **a los dos lados**, el ejemplo de
 *      codigo CORRECTO de la prueba «el codigo que las respeta pasa limpio»
 *      (`reglas-de-eslint.test.ts` de esta libreria y el de `rentas`). Encendida por omision, ese
 *      caso se pone rojo en los dos repositorios.
 *
 * Y no es que a `rentas` le falte una muestra: es que **la regla no es suya**. `rentas` consume la
 * alicuota y puede tenerla a mano; `normativa` es el sistema cuyo trabajo entero es que esas
 * cifras vivan en datos versionados, firmados a dos manos (ADR-0007) y sellados por ejercicio. La
 * misma linea es correcta en un repositorio y roja en el otro, y esa es exactamente la diferencia
 * entre consumir una cifra y publicarla.
 *
 * <h2>Como se enciende</h2>
 *
 * El sistema la anade a su lista en su `eslint.prohibiciones.mjs`, junto a las nueve derivadas.
 * Esta libreria **no la enciende para si misma**: aqui no se publica ninguna cifra normativa, y su
 * muestra vive en `muestras/`, que el `eslint.config.js` ignora.
 *
 * @type {readonly Prohibicion[]}
 */
export const PROHIBICIONES_OPCIONALES = [
  {
    clave: 'cifra-tributaria-literal',
    regla: 'ninguna cifra tributaria literal en el codigo',
    selector: ATADURAS_DE_CIFRA.map((atadura) => `${atadura} > ${LITERAL_DE_CIFRA}`).join(', '),
    message:
      'Ninguna cifra tributaria literal en el codigo: la UIT, los tramos, las alicuotas, los valores unitarios y los aranceles viven en el conjunto sellado del ejercicio y se PIDEN (regla 5, RNF-053). Escribirla aqui la publica sin las dos firmas de ADR-0007.',
  },
];

/**
 * Las reglas del producto que un sistema PUEDE expresar como verificacion, y que no se le exigen.
 *
 * Es la segunda lista escrita a mano, y existe por lo mismo que `REGLAS_EXIGIDAS`:
 * `PROHIBICIONES_OPCIONALES` se deriva hacia la prueba, asi que borrar una prohibicion opcional se
 * llevaria su prueba por delante, en silencio. Esta lista es lo que se pone rojo cuando eso pasa.
 *
 * Y va aparte de `REGLAS_EXIGIDAS` a proposito: mezclarlas diria que esta regla se le exige a los
 * cinco sistemas, que es justo lo que la medicion de arriba dice que no.
 *
 * @type {readonly string[]}
 */
export const REGLAS_OPCIONALES = ['ninguna cifra tributaria literal en el codigo'];
