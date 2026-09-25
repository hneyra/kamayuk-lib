/**
 * **Las cuentas del PKCE S256, y `base64url` en los dos sentidos** (#122).
 *
 * Salen de `identidad.ts`, donde vivian dentro del mismo archivo que la fabrica —`aleatorio`,
 * `reto` y `base64url`—, mientras que la vuelta de `base64url` se escribia aparte en
 * `quien-entro.ts`: dos archivos del mismo paquete con las dos mitades de la misma codificacion.
 * Aqui estan juntas, y sin estado: nada de esto sabe de un emisor, de un almacenamiento ni de una
 * URL.
 */

/**
 * Los bytes aleatorios del verificador PKCE.
 *
 * RFC 7636 §4.1 pide entre 43 y 128 caracteres; 64 bytes en `base64url` son 86, en medio del
 * intervalo, y con la entropia que §7.1 recomienda de sobra (256 bits bastan; aqui van 512).
 */
export const LARGO_DEL_VERIFICADOR = 64;

/**
 * Los bytes aleatorios del `state` de OAuth: 24, que son 32 caracteres en `base64url`.
 *
 * No tiene minimo en la norma. Es lo que distingue nuestra vuelta de un codigo que alguien nos hizo
 * llegar, y 192 bits no se adivinan.
 */
export const LARGO_DEL_ESTADO = 24;

/** `largo` bytes de `crypto.getRandomValues`, en `base64url`. */
export function aleatorio(largo: number): string {
  const bytes = new Uint8Array(largo);
  crypto.getRandomValues(bytes);
  return codificarBase64url(bytes);
}

/** El reto S256: `BASE64URL(SHA256(ASCII(verificador)))`, tal cual lo pide RFC 7636 §4.2. */
export async function reto(verificador: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
  return codificarBase64url(new Uint8Array(resumen));
}

/** Bytes a `base64url` sin relleno (RFC 4648 §5): `+` es `-`, `/` es `_` y no hay `=`. */
export function codificarBase64url(bytes: Uint8Array): string {
  let texto = '';
  bytes.forEach((b) => (texto += String.fromCharCode(b)));
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * `base64url` a bytes. **Lanza** si el texto no es `base64url` —`atob` lanza
 * `InvalidCharacterError`—, y es a proposito: quien la llama decide que significa eso, y
 * `quien-entro.ts` lo convierte en `null`.
 *
 * Devuelve los bytes y no un texto porque `atob` entrega un byte por caracter: «José» leido tal cual
 * sale «JosÃ©». Quien quiera texto le pasa los bytes a `TextDecoder`.
 */
export function decodificarBase64url(texto: string): Uint8Array {
  const porByte = atob(texto.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(porByte, (letra) => letra.charCodeAt(0));
}
