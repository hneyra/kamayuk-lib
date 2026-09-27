/**
 * LA MUESTRA de `los-arneses-de-prueba-no-se-copian`. Viola la regla A PROPOSITO.
 *
 * Es lo que habia hasta #127 en `descargar.test.ts` y en siete suites del interprete: `problema` y
 * `SIN_FRASE` escritos otra vez en vez de importados, y el remiendo de `ResizeObserver` pegado de
 * las once formas que la guarda reconoce —las siete ultimas, desde la segunda vuelta de #127—. Si alguien "arregla" este archivo, la guarda se queda
 * sin demostracion y sale roja sola.
 *
 * Lleva a proposito un comentario y una cadena que NOMBRAN la copia sin hacerla:
 * `globalThis.ResizeObserver = class {}` y `function problema(` aqui no cuentan.
 */
import { vi } from 'vitest';

describe('una suite que se copio el arnes', () => {
  function problema(estado: number, codigo: string, mensaje: string): Response {
    return new Response(JSON.stringify({ status: estado, title: mensaje, codigo, mensaje }), {
      status: estado,
      headers: { 'content-type': 'application/problem+json' },
    });
  }

  const SIN_FRASE = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

  beforeAll(() => {
    class Observador {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = Observador as unknown as typeof ResizeObserver;
    (window as unknown as Record<string, unknown>)['ResizeObserver'] = Observador;
    vi.stubGlobal('ResizeObserver', Observador);
    Object.defineProperty(globalThis, 'ResizeObserver', { value: Observador });
    globalThis.ResizeObserver ??= Observador as unknown as typeof ResizeObserver;
    globalThis.ResizeObserver ||= Observador as unknown as typeof ResizeObserver;
    globalThis.ResizeObserver &&= Observador as unknown as typeof ResizeObserver;
    Object.assign(globalThis, { ResizeObserver: Observador });
    Object.assign(window, { ['ResizeObserver']: Observador });
    Object.defineProperties(globalThis, { ResizeObserver: { value: Observador } });
    Reflect.set(globalThis, 'ResizeObserver', Observador);
    // globalThis.ResizeObserver = Observador;  <- comentario: no cuenta
    const nombre = 'globalThis.ResizeObserver = Observador;';
    return nombre;
  });

  it('usa lo copiado', () => {
    expect(problema(404, 'X', 'y').status).toBe(404);
    expect(SIN_FRASE.enElCampo).toBe('—');
  });
});
