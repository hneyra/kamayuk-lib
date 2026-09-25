/**
 * `@kamayuk/sesion` — OIDC con PKCE, y la escalera que traduce un fallo a lo que hay que decir.
 *
 * Es lo que ADR-0030 §4 llama `@kamayuk/sesion`. Medido el 2026-09-12 sobre los cuatro clones:
 * **PKCE lo implementaba uno solo** —`rentas`— y `caja`, `catastro` y `normativa` no se
 * autenticaban en absoluto. Nada dentro del flujo nombraba a `rentas`, asi que era «la pieza
 * mas limpia de compartir de los cuatro repositorios»; lo unico que lo ataba eran tres datos, y
 * los tres son ahora parametros de `crearIdentidad`:
 *
 *   1. **el nombre del global** de configuracion (`window.__KAMAYUK_RENTAS__`), que ya no se
 *      lee aqui: la configuracion entra entera como argumento;
 *   2. **el destino por omision** (`'#panel'`), que cada sistema tiene distinto;
 *   3. **el prefijo de las claves de `sessionStorage`**, sin el cual dos interfaces del
 *      producto servidas del mismo origen se pisan el verificador PKCE.
 *
 * <h2>Lo que ya hace</h2>
 *
 *   · **La ida a la puerta**: codigo de autorizacion con PKCE S256, el reto calculado y no
 *     escrito, y el `redirect_uri` en la raiz de la APLICACION que el sistema declara.
 *   · **La sonda del emisor** (#42, de `rentas#112`): `entrar()` pregunta al documento de
 *     descubrimiento —`no-cors`, sin cache y sin credenciales— antes de mandar el navegador, y
 *     devuelve `FallaDeLaPuerta` si no contesta. Una ida que no ocurrio no gasta del tope.
 *   · **El canje**, con tope de espera, comprobando el `state`, limpiando la URL siempre y
 *     explicando cada fallo con su motivo (`Vuelta`) en vez de un `false` mudo. **Sus dieciseis
 *     frases son dato** (#118): `TEXTOS_DE_LA_PUERTA`, segundo argumento opcional de
 *     `crearIdentidad`.
 *   · **El token en memoria** y en ningun almacenamiento; el `id_token` tambien, para
 *     `id_token_hint` al salir y para `quienEntro()`.
 *   · **Quien entro** (#70): `quienEntro()` devuelve el `nombre`, el `usuario` y la
 *     `municipalidad` que el emisor puso en el `id_token` del ultimo canje —en memoria, `null`
 *     antes del canje y despues de `salir()`, y **sin validar la firma**, porque es para dibujar y
 *     el backend es quien valida—. Un `id_token` ilegible o ausente da `null` y **no rompe el
 *     canje**: el `access_token` sigue sirviendo, que es el que abre la API.
 *   · **Los dos frenos del rebote**: el tope de idas y la marca de salida.
 *   · **Salir en el emisor**, con `id_token_hint`, para que el siguiente arranque no entre solo.
 *   · **La consola de la cuenta** (#42, de `rentas#115`): `urlDeLaCuenta()` y `abrirLaCuenta()`
 *     para «Mi perfil» y «Cambiar la contrasena», derivadas del realm y en otra pestana.
 *   · **La escalera** (`peldanoDe`): de un fallo de la API a lo que hay que decir y a quien.
 *     **Nueve peldanos desde #52** —el 409 y el 422 `ORDEN_NO_ADMITIDO` dejaron de compartir
 *     respuesta con otros—, cada uno con `esAveria`, `reintentable` y la `incidencia` del 500 como
 *     campo; y **sus treinta palabras como dato** (`TEXTOS_DE_LA_ESCALERA`), que es el segundo
 *     argumento opcional de `peldanoDe`.
 *
 * <h2>Lo que ADR-0030 le sigue encargando y todavia no hace</h2>
 *
 * De §3: la **renovacion silenciosa con `prompt=none`** —el primer sistema que se abre hace el
 * login y los otros tres obtienen su token contra la sesion del navegador—, las **audiencias**
 * pedidas por sistema cuando un frontend llama a la API de otro, y el ***back-channel logout***
 * del realm, que es «salir de uno sale de los cuatro». `salir()` ya cierra en el emisor con
 * `id_token_hint`, que es la mitad del tercero. Y de §4, que enumera el paquete: el **selector de
 * municipalidad**.
 *
 * Los cuatro son de la etapa en que haya un segundo frontend conectado a la PUERTA de este
 * paquete, y hoy no hay ninguno: medido en `rentas@ac379ac`, su codigo de aplicacion sigue usando
 * su copia (`src/api/identidad.ts`) y solo importa `peldanoDe` desde una prueba de enlace.
 * Escribir el salto entre sistemas sin nadie al otro lado seria escribirlo a ciegas.
 *
 * **La ESCALERA si tiene su primer consumidor de verdad** (medido el 2026-09-20 sobre
 * `normativa@ab1e02e`): `frontend/src/datos/useDatosDeLaHoja.ts` la llama para toda lectura de sus
 * hojas, y es lo que destapo los dos peldanos que faltaban (#52).
 */

export { crearIdentidad } from './identidad.ts';
export type {
  ConfiguracionDeIdentidad,
  FallaDeLaPuerta,
  Identidad,
  PaginaDeLaCuenta,
  Vuelta,
} from './identidad.ts';
export type { QuienEntro } from './quien-entro.ts';
export { peldanoDe } from './escalera.ts';
export type { Peldano } from './escalera.ts';
export { TEXTOS_DE_LA_ESCALERA, TEXTOS_DE_LA_PUERTA } from './textos.ts';
export type { TextosDeLaEscalera, TextosDeLaPuerta } from './textos.ts';
