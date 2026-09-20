import { describe, expect, it } from 'vitest';

import { leerQuienEntro } from './quien-entro.ts';

/**
 * **Lo que el emisor dijo de quien entro, leido del `id_token`** (#70).
 *
 * <h2>Lo que estas pruebas miran de verdad</h2>
 *
 * No que exista una funcion que decodifique base64 —eso es `atob`, y `atob` ya esta probado—, sino
 * las dos propiedades que el issue pide y que un decodificador escrito a la ligera no tiene:
 *
 *   1. **que un `id_token` ilegible devuelva `null` y no lance**, en los cuatro casos en que
 *      ilegible significa algo distinto: ausente, sin las tres partes, con la carga en base64url
 *      mal formado y con una carga que no es JSON de un objeto. Es lo mas importante del issue,
 *      porque lo que esta detras es el canje: una excepcion aqui dejaria fuera del sistema a quien
 *      el emisor acaba de dejar entrar, y el sintoma seria «el emisor no devolvio ningun token»
 *      mirando al sitio equivocado;
 *   2. **que la carga se lea como UTF-8**, no como un byte por caracter. `atob` devuelve lo
 *      segundo, asi que la version facil de este archivo pinta «JosÃ© Ã‘Ã¡Ã±ez» en la barra — y lo
 *      pinta solo para los nombres con tilde, o sea para casi todos.
 *
 * Los tokens se construyen aqui con `btoa`, sin firma que valga: **este codigo no valida la
 * firma**, y no la valida a proposito (ver la cabecera de `quien-entro.ts`). Una firma de verdad en
 * el arnes daria a entender que se comprueba.
 */

/** `BASE64URL(UTF-8(texto))`, como lo escribe un emisor. */
function base64url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let porByte = '';
  bytes.forEach((b) => (porByte += String.fromCharCode(b)));
  return btoa(porByte).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Un `id_token` con esa carga util. La cabecera y la firma son de adorno, como en el emisor. */
function tokenCon(carga: unknown): string {
  return `${base64url('{"alg":"RS256","kid":"el-kid"}')}.${base64url(JSON.stringify(carga))}.firma`;
}

describe('los tres claims salen del id_token tal como el realm los manda', () => {
  /**
   * La carga que el realm de verdad produce, medida en
   * `infrastructure:despliegue/identidad/realm-kamayuk.json` (cliente `kamayuk-backoffice`): el
   * mapeador `municipalidad-id` declara `jsonType.label: "long"`, asi que la municipalidad llega
   * **como numero de JSON**, sin comillas. Escribirla aqui como `'150101'` seria probar un token
   * que el emisor no manda.
   */
  const COMO_LO_MANDA_EL_REALM = {
    sub: '5d5e9f0a-1f9f-4a1a-9c2f-2b4f6f1c9a10',
    name: 'Rosa Quispe Mamani',
    preferred_username: 'rquispe',
    municipalidad_id: 150101,
  };

  it('lee el nombre, el usuario y la municipalidad, y la municipalidad EN TEXTO', () => {
    expect(leerQuienEntro(tokenCon(COMO_LO_MANDA_EL_REALM))).toEqual({
      nombre: 'Rosa Quispe Mamani',
      usuario: 'rquispe',
      municipalidad: '150101',
    });
  });

  it('y la lee igual si el realm la manda como texto: el jsonType puede cambiar', () => {
    const quien = leerQuienEntro(tokenCon({ ...COMO_LO_MANDA_EL_REALM, municipalidad_id: '150101' }));

    expect(quien?.municipalidad).toBe('150101');
  });

  it('la carga se lee como UTF-8: un nombre con tildes no sale roto', () => {
    const quien = leerQuienEntro(tokenCon({ name: 'José Ñáñez Gutiérrez' }));

    // Si esto se decodificara byte a byte —que es lo que `atob` devuelve— aqui saldria
    // «JosÃ© Ã‘Ã¡Ã±ez GutiÃ©rrez», y la barra lo pintaria asi para casi todos los nombres.
    expect(quien?.nombre).toBe('José Ñáñez Gutiérrez');
  });

  it('un claim que no es texto NO se publica: «[object Object]» es peor que no decir nada', () => {
    const quien = leerQuienEntro(
      tokenCon({ name: { es: 'Rosa' }, preferred_username: 42, municipalidad_id: true }),
    );

    expect(quien).toEqual({ nombre: null, usuario: null, municipalidad: null });
  });

  it('y un claim en blanco es no haber dicho nada, no un rotulo vacio', () => {
    const quien = leerQuienEntro(tokenCon({ name: '   ', preferred_username: 'rquispe' }));

    expect(quien?.nombre).toBeNull();
    expect(quien?.usuario).toBe('rquispe');
  });

  it('un token que se lee y no dice ninguna de las tres cosas NO es lo mismo que no haber canjeado', () => {
    // Las dos cosas se distinguen a proposito: el objeto con tres nulos dice «hubo canje y el
    // emisor no mando los claims» —el caso del ambito `kamayuk-servicio`, que lleva la
    // municipalidad con `id.token.claim: "false"`—, y `null` dice «no hay canje o no se pudo leer».
    expect(leerQuienEntro(tokenCon({ sub: 'solo-el-sujeto' }))).toEqual({
      nombre: null,
      usuario: null,
      municipalidad: null,
    });
    expect(leerQuienEntro(null)).toBeNull();
  });
});

/**
 * **Los cuatro casos de ilegible, uno por uno y no uno como muestra de todos.**
 *
 * Cada uno revienta por su sitio —`split`, `atob`, `JSON.parse`, la comprobacion de que lo leido
 * sea un objeto—, asi que probar uno no dice nada de los otros tres.
 */
describe('un id_token ilegible da null y NO lanza', () => {
  const ILEGIBLES: readonly (readonly [string, string | null])[] = [
    ['ausente: el emisor no mando id_token', null],
    ['no es un JWT: no tiene las tres partes', 'esto-no-es-un-jwt'],
    ['dos partes, que es el olvido tipico al recortar un token', 'cabecera.carga'],
    ['cuatro partes: un JWE, que no se puede leer sin descifrar', 'a.b.c.d'],
    ['la carga vacia', 'cabecera..firma'],
    ['base64url mal formado: atob lanza InvalidCharacterError', 'cabecera.%%%%.firma'],
    ['base64url de largo imposible: un solo caracter', 'cabecera.a.firma'],
    ['la carga no es JSON', `cabecera.${base64url('no soy json')}.firma`],
    ['la carga es JSON pero no un objeto: un texto', `cabecera.${base64url('"Rosa"')}.firma`],
    ['la carga es JSON pero no un objeto: un numero', `cabecera.${base64url('150101')}.firma`],
    ['la carga es JSON pero no un objeto: null', `cabecera.${base64url('null')}.firma`],
    ['la carga es JSON pero no un objeto: una lista', `cabecera.${base64url('["Rosa"]')}.firma`],
  ];

  it.each(ILEGIBLES)('%s', (_caso, token) => {
    expect(leerQuienEntro(token)).toBeNull();
  });

  it('y ninguno de ellos lanza: lo que esta detras es el canje', () => {
    for (const [caso, token] of ILEGIBLES) {
      expect(() => leerQuienEntro(token), caso).not.toThrow();
    }
  });
});
