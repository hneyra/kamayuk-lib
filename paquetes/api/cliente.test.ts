import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorDeLaApi, NoEsUnDocumento, crearCliente, type Cliente } from './cliente.ts';

/**
 * El cliente HTTP de una interfaz del producto.
 *
 * <h2>Lo que se anade al mudarse a `kamayuk-lib`</h2>
 *
 * El ultimo bloque. Mientras esto vivio en `rentas` el prefijo era una constante privada
 * —`'/rentas/api/v1'`— y no habia nada que comprobar; aqui es un parametro, y que lo sea es
 * justo lo que ADR-0030 §2 pide: la ruta dice quien responde. Un prefijo que se colara fijo
 * haria que `catastro` preguntara al backend de `rentas` y recibiera 404 de una ruta que si
 * existe en el sistema correcto — el sintoma mas caro de leer que hay.
 */

const PREFIJO = '/rentas/api/v1';

/** El token que este cliente lee en cada peticion. Se mueve dentro de la prueba a proposito. */
let elToken: string | null = null;
let cliente: Cliente;

const solicitar = <T,>(ruta: string, opciones?: Parameters<Cliente['solicitar']>[1]) =>
  cliente.solicitar<T>(ruta, opciones);

/**
 * Sustituye `fetch` por uno que contesta lo que se le diga, y devuelve el espia.
 *
 * **Clona en cada llamada.** Un `Response` solo se puede leer una vez, asi que devolver el mismo
 * objeto dos veces hace que la segunda peticion muera con «Body has already been read» — un rojo
 * que habla del arnes y no de lo que se estaba midiendo.
 */
function fetchQueContesta(respuesta: Response) {
  const espia = vi.fn<typeof fetch>(() => Promise.resolve(respuesta.clone()));
  vi.stubGlobal('fetch', espia);
  return espia;
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
  elToken = null;
});

describe('el cliente cuelga la ruta del prefijo de SU sistema', () => {
  it('cuelga la ruta del prefijo, porque la ruta dice quien responde', async () => {
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/contribuyentes');

    expect(espia.mock.calls[0]?.[0]).toBe('/rentas/api/v1/contribuyentes');
  });

  it('convierte una respuesta de error en ErrorDeLaApi, con su estado', async () => {
    fetchQueContesta(new Response('', { status: 403 }));

    await expect(solicitar('/contribuyentes')).rejects.toBeInstanceOf(ErrorDeLaApi);
    await expect(solicitar('/contribuyentes')).rejects.toMatchObject({ estado: 403 });
  });
});

describe('«solicitar» manda el token, y es el unico que lo hace', () => {
  it('con token, manda Authorization: Bearer', async () => {
    elToken = 'un-token-de-prueba';
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/seguridad/sesion');

    const cabeceras = espia.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(cabeceras['Authorization']).toBe('Bearer un-token-de-prueba');
  });

  it('sin token NO manda la cabecera, en vez de mandar «Bearer null»', async () => {
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/seguridad/sesion');

    const cabeceras = espia.mock.calls[0]?.[1]?.headers as Record<string, string>;
    // Un «Bearer null» es un token invalido, y el backend contestaria 401 igual — pero ese 401
    // diria «el token no vale» donde la verdad es «no hay token». Son dos peldanos distintos de
    // la escalera, y este es el unico sitio donde se pueden separar sin adivinar.
    expect(cabeceras['Authorization']).toBeUndefined();
  });

  it('el token se lee en CADA peticion, no se congela al construir el cliente', async () => {
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/seguridad/sesion');
    elToken = 'el-de-despues';
    await solicitar('/seguridad/sesion');

    // Si el token se leyera una sola vez, renovar la sesion dejaria a la aplicacion mandando
    // para siempre el token caducado, y el sintoma seria un 401 que no se arregla entrando.
    // Por eso `token` entra como FUNCION y no como valor.
    const segunda = espia.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(segunda['Authorization']).toBe('Bearer el-de-despues');
  });
});

describe('el cliente jamas manda municipalidadId (regla 2, ADR-0005)', () => {
  const RUTAS = [
    '/seguridad/sesion',
    '/seguridad/sesion/municipalidad',
    '/rentas/contribuyentes',
    '/coactiva/deudas',
  ];

  it.each(RUTAS)('ni en la ruta ni en la consulta: %s', async (ruta) => {
    elToken = 'un-token';
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar(ruta);

    const url = String(espia.mock.calls[0]?.[0]);
    expect(url.toLowerCase()).not.toContain('municipalidadid');
    expect(url.toLowerCase()).not.toContain('municipalidad_id');
  });

  it('ni en las cabeceras, ni en un cuerpo que el cliente componga', async () => {
    elToken = 'un-token';
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/rentas/contribuyentes', { metodo: 'POST', cuerpo: { nombre: 'Rosa' } });

    const opciones = espia.mock.calls[0]?.[1];
    const todo = JSON.stringify(opciones?.headers) + String(opciones?.body ?? '');
    expect(todo.toLowerCase()).not.toContain('municipalidad');
    // Y la propiedad de fondo: el cuerpo que sale es EXACTAMENTE el que le dieron. Esta
    // funcion no compone nada, asi que no tiene donde meter el inquilino aunque quisiera.
    expect(String(opciones?.body)).toBe(JSON.stringify({ nombre: 'Rosa' }));
  });

  it('la ruta de la municipalidad NO es una excepcion: dice de cual es la SESION', async () => {
    elToken = 'un-token';
    const espia = fetchQueContesta(Response.json({ id: 9 }));

    await solicitar('/seguridad/sesion/municipalidad');

    // La palabra esta en la ruta y eso no es enviar el inquilino: es preguntar por el que el
    // backend ya fijo desde el token. Lo prohibido es DECIRLE cual, no preguntarselo.
    expect(espia.mock.calls[0]?.[0]).toBe('/rentas/api/v1/seguridad/sesion/municipalidad');
    expect(String(espia.mock.calls[0]?.[0]).toLowerCase()).not.toContain('municipalidadid');
  });
});

describe('ErrorDeLaApi conserva codigo y mensaje del problem+json', () => {
  it('el 401 de la cadena de identidad llega entero', async () => {
    fetchQueContesta(problema(401, 'NO_AUTENTICADO', 'La peticion no trae un token valido'));

    await expect(solicitar('/seguridad/sesion')).rejects.toMatchObject({
      estado: 401,
      codigo: 'NO_AUTENTICADO',
      mensaje: 'La peticion no trae un token valido',
      titulo: 'La peticion no trae un token valido',
    });
  });

  it('los dos 403 se distinguen por su codigo, que es lo que antes se tiraba', async () => {
    fetchQueContesta(problema(403, 'SIN_MUNICIPALIDAD', 'El token no identifica una municipalidad'));
    await expect(solicitar('/seguridad/sesion')).rejects.toMatchObject({
      estado: 403,
      codigo: 'SIN_MUNICIPALIDAD',
    });

    vi.unstubAllGlobals();
    fetchQueContesta(problema(403, 'SIN_PRIVILEGIO', 'No tiene el privilegio necesario'));
    await expect(solicitar('/consultas/deuda')).rejects.toMatchObject({
      estado: 403,
      codigo: 'SIN_PRIVILEGIO',
    });
  });

  it('el mensaje del error es lo que dijo el backend, no «GET /ruta»', async () => {
    fetchQueContesta(
      problema(404, 'NO_ENCONTRADO', "El token identifica a 'x', que no es un usuario"),
    );

    await expect(solicitar('/seguridad/sesion')).rejects.toThrow(
      "El token identifica a 'x', que no es un usuario",
    );
  });

  it('con `detail` y `type` puestos —el 404 de una ruta que no existe— tambien', async () => {
    fetchQueContesta(
      new Response(
        JSON.stringify({
          type: 'https://kamayuk.gob.pe/errores/no_encontrado',
          title: 'No se encontro lo solicitado',
          status: 404,
          detail: 'No se encontro lo solicitado',
          instance: '/rentas/api/v1/no-existe',
          codigo: 'NO_ENCONTRADO',
          mensaje: 'No se encontro lo solicitado',
        }),
        { status: 404, headers: { 'content-type': 'application/problem+json' } },
      ),
    );

    await expect(solicitar('/no-existe')).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
      detalle: 'No se encontro lo solicitado',
    });
  });

  it('un cuerpo que no es JSON no tapa el error: se queda con lo que se pidio', async () => {
    // Es lo que devuelve el servidor de Vite sin `server.proxy`: el `index.html` de la
    // aplicacion. Un `await respuesta.json()` sin proteger lanzaria «Unexpected token <» y esa
    // excepcion SUSTITUIRIA al ErrorDeLaApi — la pantalla acabaria ensenando un fallo de
    // parseo en lugar de «no tienes permiso».
    fetchQueContesta(new Response('<!doctype html><html></html>', { status: 200 }));
    await expect(solicitar('/seguridad/sesion')).rejects.toBeInstanceOf(SyntaxError);

    vi.unstubAllGlobals();
    fetchQueContesta(new Response('<!doctype html><html></html>', { status: 500 }));
    await expect(solicitar('/seguridad/sesion')).rejects.toMatchObject({
      estado: 500,
      codigo: null,
      mensaje: null,
      operacion: 'GET /seguridad/sesion',
    });
  });
});

describe('«solicitarRespuesta» devuelve los bytes que llegaron, y no una reserializacion', () => {
  /**
   * Un cuerpo cuya reserializacion NO da lo mismo, con las cuatro diferencias a la vez:
   * espacios, un `1.0` que vuelve `1`, un escape `ó` que vuelve la letra y una tilde
   * literal. `JSON.stringify(JSON.parse(ESTE))` da `{"a":1,"b":"ó Resolución"}` — otro texto, y
   * por tanto otra huella.
   */
  const FIRMADO = '{"a": 1.0, "b": "\\u00f3 Resolución"}';

  /** La respuesta de un recurso firmado: su cuerpo, su huella en el `ETag` y su cache. */
  function unRecursoFirmado(cabeceras: Record<string, string> = {}): Response {
    return new Response(FIRMADO, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        etag: '"3d5a7c1e"',
        'cache-control': 'public, max-age=31536000, immutable',
        ...cabeceras,
      },
    });
  }

  it('el texto es identico al que se sirvio, sin JSON.parse, sin JSON.stringify y sin trim', async () => {
    fetchQueContesta(unRecursoFirmado());

    const respuesta = await cliente.solicitarRespuesta('/recursos/42');

    expect(respuesta.texto).toBe(FIRMADO);
    // Y la propiedad de fondo, dicha al reves: pasar por el objeto cambia el texto. Si esta
    // funcion interpretara y volviera a escribir, la huella del cuerpo dejaria de cuadrar con la
    // que el servidor anuncio — y el consumidor concluiria que su copia esta corrupta.
    expect(JSON.stringify(JSON.parse(respuesta.texto) as unknown)).not.toBe(FIRMADO);
  });

  it('el estado y las cabeceras llegan, que es lo que «solicitar» no puede dar', async () => {
    fetchQueContesta(unRecursoFirmado());

    const respuesta = await cliente.solicitarRespuesta('/recursos/42');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cabeceras.get('ETag')).toBe('"3d5a7c1e"');
    expect(respuesta.cabeceras.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('una cabecera que no vino se lee como null, no como cadena vacia', async () => {
    fetchQueContesta(new Response('{}', { status: 200 }));

    const respuesta = await cliente.solicitarRespuesta('/recursos/42');

    expect(respuesta.cabeceras.get('ETag')).toBeNull();
  });

  it('un 200 con JSON es su caso NORMAL: lo contrario que «descargar»', async () => {
    fetchQueContesta(unRecursoFirmado());

    // `descargar()` ante esto lanza `NoEsUnDocumento`, y hace bien: un `.pdf` con JSON dentro es
    // el peor desenlace. Aqui el `Content-Type` ni se mira, porque lo que se pide ES datos.
    await expect(cliente.solicitarRespuesta('/recursos/42')).resolves.toMatchObject({
      estado: 200,
    });
    await expect(cliente.descargar('/recursos/42')).rejects.toBeInstanceOf(NoEsUnDocumento);
  });

  it('un cuerpo vacio es cadena vacia, y no revienta como reventaria «solicitar»', async () => {
    // `null` y no `''`: un 204 no admite cuerpo, y el constructor de `Response` lo rechaza
    // —«Invalid response status code 204»—, que es un rojo del arnes y no de lo que se mide.
    fetchQueContesta(new Response(null, { status: 204 }));

    await expect(cliente.solicitarRespuesta('/recursos/42')).resolves.toMatchObject({
      estado: 204,
      texto: '',
    });
  });

  it('comparte el prefijo y el token con «solicitar», porque es la misma peticion', async () => {
    elToken = 'un-token-de-prueba';
    const espia = fetchQueContesta(unRecursoFirmado());

    await cliente.solicitarRespuesta('/recursos/42');

    expect(espia.mock.calls[0]?.[0]).toBe('/rentas/api/v1/recursos/42');
    const cabeceras = espia.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(cabeceras['Authorization']).toBe('Bearer un-token-de-prueba');
    expect(cabeceras['Accept']).toBe('application/json');
  });

  it('un no-2xx lanza ErrorDeLaApi con su estado, su codigo y su mensaje', async () => {
    fetchQueContesta(problema(403, 'SIN_PRIVILEGIO', 'No tiene el privilegio necesario'));

    await expect(cliente.solicitarRespuesta('/recursos/42')).rejects.toMatchObject({
      estado: 403,
      codigo: 'SIN_PRIVILEGIO',
      mensaje: 'No tiene el privilegio necesario',
      operacion: 'GET /recursos/42',
    });
  });

  it('pasa la senal de cancelacion', async () => {
    const espia = fetchQueContesta(unRecursoFirmado());
    const controlador = new AbortController();

    await cliente.solicitarRespuesta('/recursos/42', { senal: controlador.signal });

    expect(espia.mock.calls[0]?.[1]?.signal).toBe(controlador.signal);
  });

  it('no anade nada que nombre la municipalidad (regla 2, ADR-0005)', async () => {
    elToken = 'un-token';
    const espia = fetchQueContesta(unRecursoFirmado());

    await cliente.solicitarRespuesta('/recursos/42?ejercicio=2026');

    const [url, opciones] = espia.mock.calls[0] ?? [];
    const todo = String(url) + JSON.stringify(opciones?.headers) + String(opciones?.body ?? '');
    expect(todo.toLowerCase()).not.toContain('municipalidad');
  });
});

describe('la clave de idempotencia se manda, y en blanco no sale nada al cable', () => {
  /** Las cabeceras que le llegaron a `fetch` en la llamada `n`. */
  const cabecerasDe = (espia: ReturnType<typeof fetchQueContesta>, n = 0) =>
    espia.mock.calls[n]?.[1]?.headers as Record<string, string>;

  it('con clave, «solicitar» manda Idempotency-Key tal cual', async () => {
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/convenios', {
      metodo: 'POST',
      cuerpo: { cuotas: 12 },
      claveDeIdempotencia: '0f8c2a11-4e3b-4b7e-9a2d-1c6f5e4d3b2a',
    });

    expect(cabecerasDe(espia)['Idempotency-Key']).toBe('0f8c2a11-4e3b-4b7e-9a2d-1c6f5e4d3b2a');
  });

  it('y «solicitarRespuesta» tambien: la opcion es de las dos', async () => {
    const espia = fetchQueContesta(new Response('{}', { status: 200 }));

    await cliente.solicitarRespuesta('/convenios', {
      metodo: 'POST',
      cuerpo: { cuotas: 12 },
      claveDeIdempotencia: 'la-misma-clave',
    });

    expect(cabecerasDe(espia)['Idempotency-Key']).toBe('la-misma-clave');
  });

  it('sin clave, la cabecera NO sale', async () => {
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/convenios', { metodo: 'POST', cuerpo: { cuotas: 12 } });

    expect(cabecerasDe(espia)['Idempotency-Key']).toBeUndefined();
  });

  it.each(['', '   ', '\t\n'])(
    'una clave en blanco (%j) lanza ANTES de llamar a fetch',
    async (enBlanco) => {
      const espia = fetchQueContesta(Response.json({ ok: true }));

      // El backend trata una clave en blanco como si no hubiera clave
      // (`EmitirCertificado.java:151` de `rentas`), asi que mandarla vacia no falla en ningun
      // sitio: el reintento emite un segundo certificado. Por eso el error es AQUI, y por eso
      // tiene que ser antes de que salga la peticion — una excepcion despues del POST llegaria
      // tarde para lo unico que importa, que es que la escritura no se haya hecho ya.
      await expect(
        solicitar('/convenios', {
          metodo: 'POST',
          cuerpo: { cuotas: 12 },
          claveDeIdempotencia: enBlanco,
        }),
      ).rejects.toThrow(/clave de idempotencia esta en blanco/i);

      expect(espia).not.toHaveBeenCalled();
    },
  );

  it('el conjunto de cabeceras es EXACTAMENTE {Accept, Authorization, Content-Type, Idempotency-Key}', async () => {
    elToken = 'un-token';
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/convenios', {
      metodo: 'POST',
      cuerpo: { cuotas: 12 },
      claveDeIdempotencia: 'una-clave',
    });

    // No es «contiene»: es la lista entera. Una cabecera de mas aqui seria justo el sitio por
    // donde se colaria el inquilino sin que ninguna prohibicion lo viera (regla 2, ADR-0005).
    expect(Object.keys(cabecerasDe(espia)).sort()).toEqual([
      'Accept',
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
    ]);
  });

  it('y sin token, sin cuerpo y sin clave es EXACTAMENTE {Accept}', async () => {
    const espia = fetchQueContesta(Response.json({ ok: true }));

    await solicitar('/convenios');

    expect(Object.keys(cabecerasDe(espia))).toEqual(['Accept']);
  });
});

describe('el prefijo es de quien construye el cliente, y no de esta libreria', () => {
  it.each([
    ['/rentas/api/v1', '/rentas/api/v1/contribuyentes'],
    ['/catastro/api/v1', '/catastro/api/v1/contribuyentes'],
    ['/caja/api/v1', '/caja/api/v1/contribuyentes'],
    ['/normativa/api/v1', '/normativa/api/v1/contribuyentes'],
  ])('con prefijo %s pide %s', async (prefijo, esperada) => {
    const espia = fetchQueContesta(Response.json({ ok: true }));
    const suyo = crearCliente({ prefijo, token: () => null });

    await suyo.solicitar('/contribuyentes');

    expect(espia.mock.calls[0]?.[0]).toBe(esperada);
  });

  it('dos clientes a la vez no se confunden: cada uno con su prefijo y su token', async () => {
    const espia = fetchQueContesta(Response.json({ ok: true }));
    const deRentas = crearCliente({ prefijo: '/rentas/api/v1', token: () => 'el-de-rentas' });
    const deCaja = crearCliente({ prefijo: '/caja/api/v1', token: () => 'el-de-caja' });

    await deRentas.solicitar('/x');
    await deCaja.solicitar('/x');

    expect(espia.mock.calls[0]?.[0]).toBe('/rentas/api/v1/x');
    expect((espia.mock.calls[0]?.[1]?.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer el-de-rentas',
    );
    expect(espia.mock.calls[1]?.[0]).toBe('/caja/api/v1/x');
    expect((espia.mock.calls[1]?.[1]?.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer el-de-caja',
    );
  });
});

/**
 * **Las CINCO extensiones del contrato llegan enteras** (#52, AC2).
 *
 * Hasta #52 `ErrorDeLaApi` guardaba dos —`codigo` y `mensaje`— y tiraba las otras tres, que ya
 * llegaban por el cable. Medido el 2026-09-20 sobre los cinco `ManejadorDeErrores.java`, las
 * cinco son las mismas en los cinco sistemas: `CAMPO_CODIGO`, `CAMPO_MENSAJE`, `CAMPO_DETALLES`,
 * `CAMPO_INCIDENCIA` y `CAMPO_PARAMETRO_QUE_FALTA` —`:46-60` en `identidad`, `catastro`, `caja` y
 * `normativa`, `:47-61` en `rentas`—.
 *
 * **Los cuerpos son copias de lo que emite el backend**, y se miden **a traves de `solicitar()`**
 * y no construyendo el error a mano: lo que se quiere demostrar es que el camino completo
 * —`fetch`, `problemaDe`, el constructor— no pierde nada por el medio. Un `new ErrorDeLaApi(...)`
 * en la prueba saltaria justo el trozo donde se perdian.
 */
describe('#52 AC2 — ErrorDeLaApi conserva incidencia, detalles y parametroQueFalta', () => {
  /** Lo que `ManejadorDeErrores.interno()` emite: `cuerpoDe` mas `incidencia` (`:288-296`). */
  const EL_500 = {
    type: 'https://kamayuk.gob.pe/errores/error_interno',
    title: 'No se pudo completar la operacion',
    status: 500,
    detail: 'No se pudo completar la operacion',
    codigo: 'ERROR_INTERNO',
    mensaje: 'No se pudo completar la operacion',
    incidencia: '2f0f7f2e-9a1c-4f1e-9a55-1c3f5c2f0a11',
  };

  /** Lo que `ManejadorDeErrores.ordenNoAdmitido()` emite (`:75-81`). */
  const EL_422_DEL_ORDEN = {
    type: 'https://kamayuk.gob.pe/errores/orden_no_admitido',
    title: 'No se puede ordenar por ese campo',
    status: 422,
    detail: 'No se puede ordenar por ese campo',
    codigo: 'ORDEN_NO_ADMITIDO',
    mensaje: 'No se puede ordenar por ese campo',
    detalles: ['Campo pedido: selladoPor'],
  };

  /** Un 404 con `parametroQueFalta`, tal como lo compone `ParametroQueFalta.comoMiembro()`. */
  const EL_404_SIN_PUBLICAR = {
    title: 'No se encontro lo solicitado',
    status: 404,
    detail: 'No hay ningun conjunto sellado para el ejercicio 2027',
    codigo: 'NO_ENCONTRADO',
    mensaje: 'No hay ningun conjunto sellado para el ejercicio 2027',
    parametroQueFalta: { ejercicio: 2027 },
  };

  function contesta(cuerpo: Record<string, unknown>): void {
    fetchQueContesta(
      new Response(JSON.stringify(cuerpo), {
        status: cuerpo['status'] as number,
        headers: { 'content-type': 'application/problem+json' },
      }),
    );
  }

  async function elFalloDe(cuerpo: Record<string, unknown>): Promise<ErrorDeLaApi> {
    contesta(cuerpo);
    try {
      await solicitar('/algo');
    } catch (error) {
      return error as ErrorDeLaApi;
    }
    throw new Error('la peticion no fallo, y esta prueba mide un fallo');
  }

  it('el 500 llega con su incidencia, que es lo unico con lo que soporte encuentra la causa', async () => {
    const fallo = await elFalloDe(EL_500);

    expect(fallo).toBeInstanceOf(ErrorDeLaApi);
    expect(fallo.incidencia).toBe('2f0f7f2e-9a1c-4f1e-9a55-1c3f5c2f0a11');
    // Y lo que ya llegaba sigue llegando.
    expect(fallo.estado).toBe(500);
    expect(fallo.codigo).toBe('ERROR_INTERNO');
  });

  it('el 422 ORDEN_NO_ADMITIDO llega con sus detalles, que es donde viaja el campo', async () => {
    const fallo = await elFalloDe(EL_422_DEL_ORDEN);

    // El `mensaje` de ese codigo es fijo: sin `detalles` no hay forma de decir por que campo se
    // pidio ordenar.
    expect(fallo.detalles).toEqual(['Campo pedido: selladoPor']);
  });

  it('el 404 de un ejercicio sin publicar llega con parametroQueFalta, TAL CUAL', async () => {
    const fallo = await elFalloDe(EL_404_SIN_PUBLICAR);

    // Es lo que separa este 404 del 404 de una ruta que no existe: los dos llegan con
    // `codigo: 'NO_ENCONTRADO'`, y leerlos del mensaje en castellano es lo que el catalogo de
    // errores prohibe (`normativa`#66 y #67).
    expect(fallo.parametroQueFalta).toEqual({ ejercicio: 2027 });
    // Y no se interpreta aqui: `llave` no esta porque el backend no la escribe cuando falta el
    // conjunto del ano entero, y no llega como `null` (`ParametroQueFalta.comoMiembro()`).
    expect(fallo.parametroQueFalta?.llave).toBeUndefined();
  });

  it('y con «llave» tambien, que es el otro caso que el backend compone', async () => {
    const fallo = await elFalloDe({
      ...EL_404_SIN_PUBLICAR,
      parametroQueFalta: { ejercicio: 2026, llave: 'UIT:VALOR' },
    });

    expect(fallo.parametroQueFalta).toEqual({ ejercicio: 2026, llave: 'UIT:VALOR' });
  });

  it('las tres AUSENCIAS se dicen distinto, y ninguna es una cadena vacia', async () => {
    // El 401 de la cadena de identidad trae CUATRO miembros y ninguna de las tres. Que
    // `detalles` sea `[]` y no `null` es a proposito: el backend no escribe el miembro con la
    // lista vacia (`ManejadorDeErrores.java:65-67`), asi que su ausencia significa «este rechazo
    // no publica ninguna cifra» y nunca «no se sabe».
    const fallo = await elFalloDe({
      status: 401,
      title: 'No autenticado',
      codigo: 'NO_AUTENTICADO',
      mensaje: 'La peticion no trae un token valido',
    });

    expect(fallo.incidencia).toBeNull();
    expect(fallo.detalles).toEqual([]);
    expect(fallo.parametroQueFalta).toBeNull();
  });

  it('un cuerpo que no es JSON tampoco deja las tres en un estado raro', async () => {
    fetchQueContesta(
      new Response('<html>502 Bad Gateway</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }),
    );

    await expect(solicitar('/algo')).rejects.toMatchObject({
      estado: 502,
      incidencia: null,
      detalles: [],
      parametroQueFalta: null,
    });
  });
});
