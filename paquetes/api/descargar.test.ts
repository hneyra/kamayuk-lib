// @vitest-environment node
//
// SIN DOM, y es la mitad de lo que se prueba (#43, AC1 y AC2): `descargar()` devuelve el documento
// y no lo entrega. En este entorno no hay `document`, asi que si el cliente creara el enlace por
// su cuenta —como hacia la version de la que sale— estas pruebas moririan con
// «ReferenceError: document is not defined» antes de llegar a ninguna asercion.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorDeLaApi, NoEsUnDocumento, crearCliente, type Cliente } from './cliente.ts';

/**
 * `Cliente.descargar()`: un documento binario por la misma puerta que una lectura.
 *
 * Sale de la interfaz anterior de un sistema del producto (`22e6d2e`,
 * `frontend/src/api/cliente.ts:516-564`), que ya bajaba la ficha de un sujeto en PDF y habia
 * aprendido tres cosas a golpes. Cada una es un bloque de aqui:
 *
 *   1. un error sigue viniendo en `problem+json`, y dice lo mismo que el de una lectura;
 *   2. un 200 con JSON **no es un documento**, y entregarlo guarda un `.pdf` con JSON dentro;
 *   3. el nombre lo propone el backend en `Content-Disposition`.
 *
 * Y una que alli estaba al reves: el argumento mandaba sobre la cabecera. Aqui manda la cabecera,
 * porque el nombre lo decide quien genera el archivo y sabe su extension.
 */

const PREFIJO = '/un-sistema/api/v1';

let elToken: string | null = null;
let cliente: Cliente;

/** Clona en cada llamada: un `Response` solo se lee una vez (lo mismo que en `cliente.test.ts`). */
function fetchQueContesta(respuesta: Response) {
  const espia = vi.fn<typeof fetch>(() => Promise.resolve(respuesta.clone()));
  vi.stubGlobal('fetch', espia);
  return espia;
}

/** Los primeros bytes de un PDF de verdad: `%PDF-1.7` y un binario que no es texto. */
const BYTES_DE_PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0xe2, 0xe3, 0xcf, 0xd3]);

function unPdf(cabeceras: Record<string, string> = {}): Response {
  return new Response(BYTES_DE_PDF, {
    status: 200,
    headers: { 'content-type': 'application/pdf', ...cabeceras },
  });
}

/** Un `problem+json` con la forma que publica la cadena de identidad: CUATRO miembros. */
function problema(estado: number, codigo: string, mensaje: string): Response {
  return new Response(JSON.stringify({ status: estado, title: mensaje, codigo, mensaje }), {
    status: estado,
    headers: { 'content-type': 'application/problem+json' },
  });
}

beforeEach(() => {
  elToken = null;
  cliente = crearCliente({ prefijo: PREFIJO, token: () => elToken });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('«descargar» sale por la misma puerta que «solicitar»', () => {
  it('cuelga la ruta del prefijo, con su consulta tal cual', async () => {
    const espia = fetchQueContesta(unPdf());

    await cliente.descargar('/reportes/42/resumen.pdf?formato=PDF');

    expect(espia.mock.calls[0]?.[0]).toBe('/un-sistema/api/v1/reportes/42/resumen.pdf?formato=PDF');
    expect(espia.mock.calls[0]?.[1]?.method).toBe('GET');
  });

  it('con token manda Authorization, que es lo que un <a href> no puede', async () => {
    elToken = 'un-token-de-prueba';
    const espia = fetchQueContesta(unPdf());

    await cliente.descargar('/reportes/42/resumen.pdf');

    const cabeceras = espia.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(cabeceras['Authorization']).toBe('Bearer un-token-de-prueba');
  });

  it('sin token no manda la cabecera, y el token se lee en CADA descarga', async () => {
    const espia = fetchQueContesta(unPdf());

    await cliente.descargar('/reportes/42/resumen.pdf');
    elToken = 'el-de-despues';
    await cliente.descargar('/reportes/42/resumen.pdf');

    expect((espia.mock.calls[0]?.[1]?.headers as Record<string, string>)['Authorization']).toBeUndefined();
    expect((espia.mock.calls[1]?.[1]?.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer el-de-despues',
    );
  });

  it('no pide JSON: lo que espera no lo es', async () => {
    const espia = fetchQueContesta(unPdf());

    await cliente.descargar('/reportes/42/resumen.pdf');

    const cabeceras = espia.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(cabeceras['Accept']).toBeUndefined();
  });

  it('pasa la senal de cancelacion', async () => {
    const espia = fetchQueContesta(unPdf());
    const controlador = new AbortController();

    await cliente.descargar('/reportes/42/resumen.pdf', { senal: controlador.signal });

    expect(espia.mock.calls[0]?.[1]?.signal).toBe(controlador.signal);
  });

  it('no anade nada que nombre la municipalidad (regla 2, ADR-0005)', async () => {
    elToken = 'un-token';
    const espia = fetchQueContesta(unPdf());

    await cliente.descargar('/reportes/42/resumen.pdf?formato=PDF');

    const [url, opciones] = espia.mock.calls[0] ?? [];
    const todo = String(url) + JSON.stringify(opciones?.headers) + String(opciones?.body ?? '');
    expect(todo.toLowerCase()).not.toContain('municipalidad');
  });
});

describe('devuelve el documento entero, y NO lo entrega', () => {
  it('el contenido son los bytes que llegaron, y el tipo de medio el que llego', async () => {
    fetchQueContesta(unPdf({ 'content-disposition': 'attachment; filename="resumen-42.pdf"' }));

    const documento = await cliente.descargar('/reportes/42/resumen.pdf?formato=PDF');

    expect(documento.nombre).toBe('resumen-42.pdf');
    expect(documento.tipoDeMedio).toBe('application/pdf');
    expect(documento.contenido).toBeInstanceOf(Blob);
    expect(new Uint8Array(await documento.contenido.arrayBuffer())).toEqual(BYTES_DE_PDF);
  });
});

describe('LECCION 1: un error sigue viniendo en problem+json y dice lo mismo que el de una lectura', () => {
  it.each([
    [401, 'NO_AUTENTICADO', 'La peticion no trae un token valido'],
    [403, 'SIN_PRIVILEGIO', 'No tiene el privilegio necesario'],
    [500, 'ERROR_INTERNO', 'Error interno. Incidencia 7f3a'],
  ])('un %i %s lanza ErrorDeLaApi con su estado y su codigo', async (estado, codigo, mensaje) => {
    fetchQueContesta(problema(estado, codigo, mensaje));

    const fallo = await cliente.descargar('/reportes/42/resumen.pdf').catch((e: unknown) => e);

    expect(fallo).toBeInstanceOf(ErrorDeLaApi);
    expect(fallo).not.toBeInstanceOf(NoEsUnDocumento);
    expect(fallo).toMatchObject({ estado, codigo, mensaje });
  });

  it.each([401, 403, 500])(
    'y el %i es CAMPO POR CAMPO el que lanzaria «solicitar» sobre la misma respuesta',
    async (estado) => {
      fetchQueContesta(problema(estado, 'UN_CODIGO', 'Lo que dijo el backend'));

      const alBajar = (await cliente.descargar('/x').catch((e: unknown) => e)) as ErrorDeLaApi;
      const alLeer = (await cliente.solicitar('/x').catch((e: unknown) => e)) as ErrorDeLaApi;

      // Si difirieran en algo, la pantalla tendria que saber por cual de las dos llego el fallo
      // para explicarlo, y `peldanoDe()` dejaria de servir para las descargas.
      const campos = (e: ErrorDeLaApi) => ({
        clase: e.constructor,
        estado: e.estado,
        codigo: e.codigo,
        mensaje: e.mensaje,
        titulo: e.titulo,
        detalle: e.detalle,
        operacion: e.operacion,
        message: e.message,
      });
      expect(campos(alBajar)).toEqual(campos(alLeer));
    },
  );

  it('un error sin cuerpo legible no tapa el estado', async () => {
    fetchQueContesta(new Response('<!doctype html><html></html>', { status: 502 }));

    await expect(cliente.descargar('/reportes/42/resumen.pdf')).rejects.toMatchObject({
      estado: 502,
      codigo: null,
      operacion: 'GET /reportes/42/resumen.pdf',
    });
  });
});

describe('LECCION 2: un 200 con JSON no es un documento, y LANZA en vez de entregarse', () => {
  it.each(['application/json', 'application/json;charset=UTF-8', 'application/problem+json'])(
    'un 200 con «%s» lanza NoEsUnDocumento, que es un ErrorDeLaApi',
    async (tipo) => {
      // La misma ruta que sirve el archivo con `?formato=` sirve los DATOS sin el. Olvidar el
      // parametro devuelve un 200 perfecto, y sin la guarda se guardaria como `resumen.pdf`.
      fetchQueContesta(
        new Response(JSON.stringify({ sujeto: '42', predios: [] }), {
          status: 200,
          headers: {
            'content-type': tipo,
            'content-disposition': 'attachment; filename="resumen-42.pdf"',
          },
        }),
      );

      const fallo = await cliente.descargar('/reportes/42/resumen.pdf').catch((e: unknown) => e);

      expect(fallo).toBeInstanceOf(NoEsUnDocumento);
      expect(fallo).toBeInstanceOf(ErrorDeLaApi);
      expect(fallo).toMatchObject({
        estado: 200,
        codigo: null,
        tipoDeMedio: tipo,
        operacion: 'GET /reportes/42/resumen.pdf',
      });
    },
  );
});

describe('LECCION 3: el nombre sale de Content-Disposition si lo hay, y del argumento si no', () => {
  it('con cabecera, manda la cabecera AUNQUE la pantalla haya dado otro', async () => {
    fetchQueContesta(unPdf({ 'content-disposition': 'attachment; filename="resumen-42.xls"' }));

    const documento = await cliente.descargar('/reportes/42/resumen.pdf?formato=XLS', {
      nombre: 'resumen.pdf',
    });

    // Quien genera el archivo sabe su extension. Con el argumento mandando, pedir XLS guardaria
    // una hoja de calculo llamada `.pdf`.
    expect(documento.nombre).toBe('resumen-42.xls');
  });

  it('sin cabecera, el del argumento', async () => {
    fetchQueContesta(unPdf());

    const documento = await cliente.descargar('/reportes/42/resumen.pdf', { nombre: 'mi-resumen.pdf' });

    expect(documento.nombre).toBe('mi-resumen.pdf');
  });

  it('sin cabecera y sin argumento, el ultimo tramo de la ruta, sin la consulta', async () => {
    fetchQueContesta(unPdf());

    const documento = await cliente.descargar('/reportes/42/resumen%20anual.pdf?formato=PDF');

    expect(documento.nombre).toBe('resumen anual.pdf');
  });

  it('una cabecera sin nombre cuenta como si no viniera', async () => {
    fetchQueContesta(unPdf({ 'content-disposition': 'attachment' }));

    const documento = await cliente.descargar('/reportes/42/resumen.pdf', { nombre: 'mi-resumen.pdf' });

    expect(documento.nombre).toBe('mi-resumen.pdf');
  });

  it.each([
    ['attachment; filename="resumen-42.pdf"', 'resumen-42.pdf'],
    ['attachment; filename=resumen-42.pdf', 'resumen-42.pdf'],
    ['attachment; filename="con \\"comillas\\".pdf"', 'con "comillas".pdf'],
    ["attachment; filename*=UTF-8''a%C3%B1o-2026.pdf", 'año-2026.pdf'],
    // Las dos formas a la vez: gana `filename*` (RFC 6266 §4.3). Una sola expresion
    // `filename="?([^";]+)"?` devolveria aqui `*=UTF-8''…` como nombre del archivo.
    ["attachment; filename=\"ano-2026.pdf\"; filename*=UTF-8''a%C3%B1o-2026.pdf", 'año-2026.pdf'],
    ["attachment; filename*=UTF-8''a%C3%B1o-2026.pdf; filename=\"ano-2026.pdf\"", 'año-2026.pdf'],
  ])('lee «%s» como «%s»', async (cabecera, esperado) => {
    fetchQueContesta(unPdf({ 'content-disposition': cabecera }));

    const documento = await cliente.descargar('/reportes/42/otro.pdf', { nombre: 'no-este.pdf' });

    expect(documento.nombre).toBe(esperado);
  });
});
