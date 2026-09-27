import { describe, expect, it } from 'vitest';

import {
  aleatorio,
  codificarBase64url,
  decodificarBase64url,
  LARGO_DEL_ESTADO,
  LARGO_DEL_VERIFICADOR,
  reto,
} from './pkce.ts';

/**
 * **Las cuentas del PKCE, solas** (#122).
 *
 * `identidad.test.ts` ya recalcula el reto de una ida de verdad y lo compara; aqui se miran las
 * piezas sin la fabrica, contra los vectores de la norma y no contra otra copia del mismo calculo.
 */

/** El alfabeto de `base64url` sin relleno (RFC 4648 §5). */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

describe('los aleatorios del PKCE', () => {
  it('el verificador cabe en lo que pide RFC 7636 §4.1: entre 43 y 128 caracteres', () => {
    const verificador = aleatorio(LARGO_DEL_VERIFICADOR);

    expect(verificador).toMatch(BASE64URL);
    expect(verificador.length).toBeGreaterThanOrEqual(43);
    expect(verificador.length).toBeLessThanOrEqual(128);
    // 64 bytes son 86 caracteres: lo que se guardaba antes de #122, y lo que Keycloak ya acepta.
    expect(verificador).toHaveLength(86);
  });

  it('el estado son 24 bytes: 32 caracteres', () => {
    expect(aleatorio(LARGO_DEL_ESTADO)).toMatch(BASE64URL);
    expect(aleatorio(LARGO_DEL_ESTADO)).toHaveLength(32);
  });

  it('dos llamadas dan dos valores: no hay secreto fijo', () => {
    expect(aleatorio(LARGO_DEL_VERIFICADOR)).not.toBe(aleatorio(LARGO_DEL_VERIFICADOR));
  });
});

describe('el reto S256', () => {
  it('es el del ejemplo de RFC 7636, Apendice B, caracter por caracter', async () => {
    // El vector de la norma, y no uno calculado aqui: una prueba que recalcula con el mismo codigo
    // pasa aunque el calculo este mal en los dos sitios.
    expect(await reto('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
});

describe('`base64url` en los dos sentidos', () => {
  it('codifica sin `+`, sin `/` y sin relleno', () => {
    // 0xfb 0xff en base64 es «+/8=»: los tres caracteres que base64url cambia o quita.
    expect(codificarBase64url(new Uint8Array([0xfb, 0xff]))).toBe('-_8');
  });

  it('y decodifica lo que codifica, byte por byte', () => {
    const bytes = new Uint8Array(LARGO_DEL_VERIFICADOR);
    crypto.getRandomValues(bytes);

    expect(decodificarBase64url(codificarBase64url(bytes))).toEqual(bytes);
    expect(decodificarBase64url('-_8')).toEqual(new Uint8Array([0xfb, 0xff]));
  });

  it('devuelve BYTES: «José» vuelve entero por `TextDecoder`, no como «JosÃ©»', () => {
    const codificado = codificarBase64url(new TextEncoder().encode('José'));

    expect(new TextDecoder().decode(decodificarBase64url(codificado))).toBe('José');
  });

  it('y LANZA ante lo que no es base64url: decidir que significa es de quien la llama', () => {
    expect(() => decodificarBase64url('no es base64!')).toThrow();
  });
});
