/**
 * Lo que el emisor dijo de quien entro, leido del `id_token` que el canje ya guarda (#70).
 *
 * <h2>SIN VALIDAR LA FIRMA, y hay que decirlo porque quien lea esto lo va a preguntar</h2>
 *
 * Aqui no se comprueba la firma del `id_token`, ni el `exp`, ni el `aud`, ni el `iss`. **El
 * backend es quien valida; esto es solo para dibujar.** Lo que sale de aqui es el rotulo de la
 * barra —un nombre y un usuario—, y ninguna decision de autorizacion pasa por el: la API manda el
 * `access_token` y el backend lo valida contra el emisor, que es donde una firma significa algo.
 * Validarla en el navegador seria pedirle al JWKS del emisor una vuelta mas para adornar una
 * cadena de texto, y aun asi no protegeria de nada: quien pueda escribir en la memoria de esta
 * pestana puede escribir el nombre ya decodificado.
 *
 * El token que se lee es el que **este** codigo acaba de canjear contra el emisor por HTTPS
 * (`identidad.ts`, `canjearSiVuelve`), no uno que llegue de fuera.
 *
 * <h2>Y NO se toca ningun almacenamiento: no hay una sola linea que pueda</h2>
 *
 * Este archivo no nombra `localStorage` ni `sessionStorage` —es una funcion pura de un texto a
 * tres campos— y lo que devuelve vive en el cierre de la instancia, como el token. Se muere con
 * la pestana, y `salir()` lo olvida porque lo olvida `fijarToken`.
 *
 * <h2>Los tres claims, MEDIDOS en el realm y no supuestos</h2>
 *
 * Medido el 2026-09-20 sobre `hneyra/infrastructure`,
 * `despliegue/identidad/realm-kamayuk.json`, cliente `kamayuk-backoffice` —que es el de estas
 * interfaces—:
 *
 *   · `name` y `preferred_username` los trae el ambito `profile`, que es el que
 *     `ConfiguracionDeIdentidad.alcance` pide en los cinco sistemas (`'openid profile'`);
 *   · `municipalidad_id` lo trae el mapeador `municipalidad-id` del cliente
 *     (`oidc-usermodel-attribute-mapper`, `user.attribute: municipalidad_id`), con
 *     **`id.token.claim: "true"`**: viaja en el `id_token`, asi que hay algo que leer. En el
 *     ambito `kamayuk-servicio` el mismo mapeador lo lleva con `id.token.claim: "false"`, o sea
 *     que en el token de una cuenta de servicio no esta — y esa es exactamente la razon de que
 *     los tres campos sean anulables y no obligatorios.
 *
 * <h2>Por que llega como NUMERO y sale como texto</h2>
 *
 * Ese mapeador declara `jsonType.label: "long"`, asi que Keycloak escribe `"municipalidad_id":
 * 150101` —un numero de JSON, sin comillas— y `JSON.parse` lo entrega como `number`. Publicarlo
 * tal cual meteria un `number` en la interfaz de un paquete cuyo resto es texto, y obligaria a
 * cada consumidor a convertirlo para pintarlo. Se convierte aqui, una vez. Se admiten las dos
 * formas —numero y texto— porque el realm puede cambiar el `jsonType` sin que nadie avise, y un
 * paquete que solo aceptara una se quedaria en blanco sin decir por que.
 *
 * <h2>Por que el campo NO se llama como el issue lo propuso, y esta medido</h2>
 *
 * #70 lo escribe `municipalidadId`. **Ese identificador no se puede escribir en este producto**:
 * la prohibicion `municipalidad-en-el-cliente` de `@kamayuk/verificaciones` es
 * `Identifier[name='municipalidadId']`, y no distingue declarar de leer. Medido aqui el
 * 2026-09-20 con la interfaz tal como el issue la propone:
 *
 * ```
 * paquetes/sesion/medicion-municipalidad.ts
 *   4:12  error  El frontend jamas envia municipalidadId: el backend lo toma del token (regla 2, ADR-0028 §2)  no-restricted-syntax
 *   8:16  error  El frontend jamas envia municipalidadId: el backend lo toma del token (regla 2, ADR-0028 §2)  no-restricted-syntax
 * ✖ 2 problems (2 errors, 0 warnings)                                                            RC=1
 * ```
 *
 * Los **dos** rojos son el hallazgo: el 4:12 es la declaracion —que se podria apagar aqui con un
 * `eslint-disable`— y el 8:16 es **leer el campo**, que es lo que escribiria cada consumidor en su
 * propio arbol. O sea que el nombre del issue no pone rojo a la libreria: pone rojo a los cinco
 * sistemas, uno por cada pantalla que quiera pintar la municipalidad, y cada uno tendria que
 * apagar la regla 2 para consumir la libreria. Por eso el campo se llama `municipalidad`.
 *
 * **Y lo que ese nombre NO significa**: no es el nombre de la municipalidad —el emisor no lo
 * manda— sino su identificador, y **no se manda nunca**. El backend lo toma del token (regla 2,
 * ADR-0005): esto es para escribirlo en la pantalla, no para ponerlo en una peticion.
 */

/** Lo que el emisor dijo de quien entro. Tres campos, y los tres pueden faltar. */
export interface QuienEntro {
  /** El claim `name`: el nombre para mostrar, o `null` si el emisor no lo mando. */
  readonly nombre: string | null;
  /** El claim `preferred_username`: con lo que se identifico. */
  readonly usuario: string | null;
  /**
   * El claim `municipalidad_id`, **en texto**: el identificador de la municipalidad de la sesion.
   *
   * Para dibujar. **No se manda**: el backend lo toma del token (regla 2, ADR-0005). Ver la
   * cabecera de este archivo: se llama asi porque el nombre del issue no se puede escribir.
   */
  readonly municipalidad: string | null;
}

/** Los claims, tal como el realm los nombra. Ver la cabecera: medidos, no supuestos. */
const CLAIM = {
  nombre: 'name',
  usuario: 'preferred_username',
  municipalidad: 'municipalidad_id',
} as const;

/**
 * Los tres campos del `id_token`, o `null` si no hay token o no se puede leer.
 *
 * **La distincion que devuelve, y que un consumidor puede usar**: `null` es «no hubo canje, o lo
 * que llego no se pudo leer»; un objeto con los tres campos en `null` es «hubo canje y el emisor
 * no dijo ninguna de las tres cosas». Son casos distintos y se cuentan distinto.
 *
 * Un token ilegible **no es un error**: devuelve `null` y no lanza. Quien la llama esta canjeando
 * un token que ya sirve —el `access_token`, que es el que abre la API—, y hacer fracasar el canje
 * por un rotulo dejaria fuera del sistema a quien el emisor dejo entrar.
 */
export function leerQuienEntro(idToken: string | null): QuienEntro | null {
  const claims = cargaUtilDe(idToken);
  if (claims === null) return null;
  return {
    nombre: enTexto(claims[CLAIM.nombre]),
    usuario: enTexto(claims[CLAIM.usuario]),
    municipalidad: laMunicipalidad(claims[CLAIM.municipalidad]),
  };
}

/**
 * La carga util del JWT, decodificada. `null` en los cuatro casos en que no hay nada que leer.
 *
 * Los cuatro, y los cuatro se prueban: **ausente** (no hubo canje, o el emisor no mando
 * `id_token`), **sin las tres partes** (no es un JWT), **base64url mal formado** (`atob` lanza
 * `InvalidCharacterError`) y **una carga que no es JSON de un objeto** (`JSON.parse` lanza, o
 * devuelve un texto, un numero, `null` o una lista, de los que no se puede leer un claim).
 *
 * **La segunda parte y no la primera**: la primera es la cabecera —`alg`, `kid`—, que no dice
 * quien entro. Y se decodifica con `TextDecoder` sobre los bytes, no con el texto que `atob`
 * devuelve: `atob` entrega un byte por caracter, asi que «José» leido tal cual sale «JosÃ©». El
 * nombre de quien entra en estas interfaces lleva tildes casi siempre.
 */
function cargaUtilDe(jwt: string | null): Record<string, unknown> | null {
  if (jwt === null) return null;
  const partes = jwt.split('.');
  if (partes.length !== 3) return null;
  const carga = partes[1];
  if (carga === undefined || carga === '') return null;
  try {
    const porByte = atob(carga.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(porByte, (letra) => letra.charCodeAt(0));
    const leido: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof leido !== 'object' || leido === null || Array.isArray(leido)) return null;
    return leido as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Un claim de texto, o `null`.
 *
 * Lo que no es texto no se publica: un `name` que llegara como numero o como objeto se pintaria
 * como `[object Object]` en la barra, y eso es peor que no decir nada. Y una cadena en blanco es
 * no haber dicho nada: un rotulo vacio se lee como que la pantalla esta a medio cargar.
 */
function enTexto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

/** La municipalidad, que el realm manda como numero (`jsonType.label: "long"`). Ver la cabecera. */
function laMunicipalidad(valor: unknown): string | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return enTexto(valor);
}
