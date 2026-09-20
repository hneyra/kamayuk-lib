import { afterEach, describe, expect, it } from 'vitest';

import {
  RequestDelEntorno,
  RequestQueAceptaLaSenalDelDocumento,
  desmontarElArnesDelRequest,
  montarElArnesDelRequest,
} from './arnes-del-request.ts';

/**
 * **El arnes del `Request` hace algo, y aqui se ve que** (#92).
 *
 * Corre en `jsdom` —el entorno por omision de este repositorio— porque los dos realms son justo la
 * condicion que reproduce el defecto: el `Request` es el de `undici`, que viene dentro de Node, y
 * el `AbortController` global es el que instala jsdom. En el entorno `node` no hay dos realms y
 * estas pruebas pasarian **sin medir nada**.
 *
 * Y no se escribe aqui la anotacion que lo cambia ni para citarla, porque esta medido: Vitest la
 * busca con una expresion regular en el primer comentario del archivo, asi que NOMBRARLA en la
 * prosa la aplica. Con este docblock diciendo «no habria dos realms» con la anotacion dentro, este
 * archivo corria en `node`, `document` era `undefined` y las dos pruebas del rojo salian
 * «expected undefined to be an instance of TypeError»: la explicacion apagaba lo que explicaba.
 *
 * La primera prueba es la que importa: **ensena el rojo de verdad**, con el `Request` del entorno,
 * en vez de describirlo en un comentario.
 */

afterEach(() => {
  // El global se deja como estaba, que es lo que espera el resto del arnes.
  montarElArnesDelRequest();
});

const UNA_URL = 'https://ejemplo.invalido/una-ruta';

describe('el `Request` del arnes acepta la senal que crea el documento', () => {
  it('EL CENTINELA: esto corre con un documento, que es la condicion del defecto', () => {
    // Sin documento no hay `AbortController` de jsdom, no hay dos realms y TODO lo de abajo pasa
    // sin medir nada. Ya paso una vez, por una anotacion citada en el docblock de arriba.
    expect(typeof document, 'esta prueba no corre en `jsdom`: no mide los dos realms').toBe(
      'object',
    );
  });

  it('EL DEFECTO: el `Request` del entorno RECHAZA la senal del documento', () => {
    const controlador = new AbortController();
    let caida: unknown;
    try {
      new RequestDelEntorno(UNA_URL, { signal: controlador.signal });
    } catch (error) {
      caida = error;
    }
    // El literal medido con Node v24.10.0 y jsdom 26.1.0:
    //   TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal.
    // Se comprueba por su forma y no letra por letra —el texto es de `undici`— pero que TIENE que
    // lanzar no es negociable: si un dia deja de hacerlo, este rojo es el que dice que el arnes ya
    // no hace falta, y es la unica forma de no quedarse con un parche que nadie se atreve a quitar.
    expect(
      caida,
      'el `Request` del entorno acepto la senal de jsdom: el defecto que este arnes tapa ya no ' +
        'esta, y entonces el arnes sobra',
    ).toBeInstanceOf(TypeError);
    expect(String(caida)).toMatch(/Expected signal .* to be an instance of AbortSignal/);
  });

  it('y con el arnes montado, la MISMA senal pasa tal cual', () => {
    // «La misma» y no «una equivalente»: `react-router` lee `request.signal` para cortar sus
    // cargadores, y una senal copiada no se abortaria con la del que navega.
    const controlador = new AbortController();
    const peticion = new Request(UNA_URL, { signal: controlador.signal });
    expect(peticion.signal).toBe(controlador.signal);
    expect(peticion.signal.aborted).toBe(false);
    controlador.abort();
    expect(peticion.signal.aborted).toBe(true);
  });

  it('y sigue siendo un `Request` del entorno, con lo demas del `init` en su sitio', () => {
    // Si el arnes se llevara por delante el resto del `init`, o dejara de ser un `Request` para
    // quien lo comprueba con `instanceof`, el rojo saldria lejos de aqui.
    const controlador = new AbortController();
    const peticion = new Request(UNA_URL, {
      method: 'POST',
      headers: { 'X-Una-Cabecera': 'un-valor' },
      body: 'un cuerpo',
      signal: controlador.signal,
    });
    expect(peticion).toBeInstanceOf(RequestDelEntorno);
    expect(peticion).toBeInstanceOf(RequestQueAceptaLaSenalDelDocumento);
    expect(peticion.method).toBe('POST');
    expect(peticion.headers.get('X-Una-Cabecera')).toBe('un-valor');
    expect(peticion.url).toBe(UNA_URL);
  });

  it('y sin senal no toca nada: lo construye el del entorno', () => {
    const peticion = new Request(UNA_URL, { method: 'PUT' });
    expect(peticion.method).toBe('PUT');
    expect(peticion.signal.aborted).toBe(false);
  });

  it('LA ROTURA: desmontado el arnes, el `Request` global vuelve a reventar', () => {
    // Es el estado de los tres consumidores que todavia no lo importan, reproducido en una linea.
    desmontarElArnesDelRequest();
    const controlador = new AbortController();
    expect(() => new Request(UNA_URL, { signal: controlador.signal })).toThrow(
      /Expected signal .* to be an instance of AbortSignal/,
    );
    montarElArnesDelRequest();
    expect(new Request(UNA_URL, { signal: controlador.signal }).signal).toBe(controlador.signal);
  });

  it('y montarlo dos veces no lo apila', () => {
    // Un arnes que se apilara pondria un `Request` dentro de otro por cada import, y el que
    // acabara arriba dependeria del orden de carga, que es lo que nadie quiere depurar.
    montarElArnesDelRequest();
    montarElArnesDelRequest();
    expect(Object.getPrototypeOf(globalThis.Request)).toBe(RequestDelEntorno);
  });
});
