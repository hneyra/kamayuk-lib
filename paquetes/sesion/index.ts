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
 * <h2>Lo que ADR-0030 §3 le encarga y todavia no hace</h2>
 *
 * La **renovacion silenciosa con `prompt=none`**, las **audiencias** por sistema y el
 * ***back-channel logout*** de los cuatro. Los tres son de la etapa en que haya un segundo
 * frontend conectado: hoy hay uno, y escribir el salto entre sistemas sin nadie al otro lado
 * seria escribirlo a ciegas. `salir()` ya cierra en el emisor con `id_token_hint`, que es la
 * mitad del tercero.
 */

export { crearIdentidad } from './identidad.ts';
export type { ConfiguracionDeIdentidad, Identidad, Vuelta } from './identidad.ts';
export { peldanoDe } from './escalera.ts';
export type { Peldano } from './escalera.ts';
