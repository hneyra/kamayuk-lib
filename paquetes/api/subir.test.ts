import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArchivoRechazado, ErrorDeLaApi, crearCliente, type Cliente } from './cliente.ts';

/**
 * `Cliente.subir()`: un archivo por `multipart/form-data`, con avance y con cancelacion.
 *
 * <h2>Lo que estas pruebas tienen que sujetar, y por que</h2>
 *
 * La primera y la mas importante es que **el `Content-Type` no se fije a mano**. Es el defecto
 * clasico de toda subida y no da un fallo legible: la cabecera sale sin `boundary`, el servidor
 * contesta «no multipart boundary found» y el rojo manda a mirar el backend. Es tambien el
 * defecto que mas probablemente vuelva, porque la linea que lo introduce parece obviamente
 * correcta. Por eso se comprueba **la lista entera de cabeceras**, y no solo que falte una.
 *
 * Las demas: que el token viaje como en las otras dos operaciones y se lea en cada llamada; que
 * el avance salga con las cifras del navegador; que cancelar rechace con lo mismo que rechaza
 * `fetch`; y que los tres desenlaces que la pantalla tiene que poder distinguir —pesa de mas, no
 * es del tipo que es, y el 422 de validacion de esta casa— lleguen distinguidos.
 *
 * <h2>El arnes</h2>
 *
 * `XMLHttpRequest` se sustituye entero. Es lo mismo que hacen `cliente.test.ts` y
 * `descargar.test.ts` con `fetch`, y por lo mismo: lo que se mide es **lo que sale por el cable**,
 * no que jsdom sepa hablar HTTP.
 */

const PREFIJO = '/un-sistema/api/v1';

/** Un `File` como el que sale de un `<input type="file">`, con su nombre y su tipo. */
const TIPO_DE_HOJA = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const unArchivo = (nombre = 'padron.xlsx', tipo = TIPO_DE_HOJA, bytes = 1024): File =>
  new File([new Uint8Array(bytes)], nombre, { type: tipo });

/**
 * El `XMLHttpRequest` de mentira: apunta todo lo que le piden y contesta cuando la prueba diga.
 *
 * No hereda de nada ni implementa la interfaz entera a proposito: implementa **lo que el codigo
 * de produccion usa**, que es lo que se quiere medir. Un miembro que aparezca manana sale rojo
 * aqui como «no es una funcion», y eso es informacion.
 */
class XhrEspia {
  static creadas: XhrEspia[] = [];

  metodo = '';
  url = '';
  readonly cabeceras: Record<string, string> = {};
  enviado: FormData | null = null;
  responseType = '';
  status = 0;
  response: unknown = '';
  abortado = false;

  readonly upload = new EventTarget();
  private readonly propios = new EventTarget();

  constructor() {
    XhrEspia.creadas.push(this);
  }

  open(metodo: string, url: string): void {
    this.metodo = metodo;
    this.url = url;
  }

  setRequestHeader(clave: string, valor: string): void {
    this.cabeceras[clave] = valor;
  }

  addEventListener(tipo: string, oyente: EventListener): void {
    this.propios.addEventListener(tipo, oyente);
  }

  removeEventListener(tipo: string, oyente: EventListener): void {
    this.propios.removeEventListener(tipo, oyente);
  }

  send(cuerpo: FormData): void {
    this.enviado = cuerpo;
  }

  abort(): void {
    this.abortado = true;
    this.propios.dispatchEvent(new Event('abort'));
    this.propios.dispatchEvent(new Event('loadend'));
  }

  // — lo que maneja la prueba, y no el codigo de produccion —

  contesta(status: number, cuerpo = ''): void {
    this.status = status;
    this.response = cuerpo;
    this.propios.dispatchEvent(new Event('load'));
    this.propios.dispatchEvent(new Event('loadend'));
  }

  problema(status: number, codigo: string, mensaje: string): void {
    this.contesta(status, JSON.stringify({ status, title: mensaje, codigo, mensaje }));
  }

  seCorta(): void {
    this.propios.dispatchEvent(new Event('error'));
    this.propios.dispatchEvent(new Event('loadend'));
  }

  avanza(loaded: number, total: number, lengthComputable = true): void {
    this.upload.dispatchEvent(new ProgressEvent('progress', { lengthComputable, loaded, total }));
  }
}

/** La ultima peticion creada. Es sincrona: `subir()` construye el XHR antes de devolver nada. */
const laPeticion = (): XhrEspia => {
  const ultima = XhrEspia.creadas.at(-1);
  if (ultima === undefined) throw new Error('el arnes no creo ninguna peticion');
  return ultima;
};

/** Las cabeceras, buscadas SIN mirar mayusculas: `Content-Type` y `content-type` son la misma. */
const cabecera = (peticion: XhrEspia, nombre: string): string | undefined =>
  Object.entries(peticion.cabeceras).find(
    ([clave]) => clave.toLowerCase() === nombre.toLowerCase(),
  )?.[1];

let elToken: string | null = null;
let cliente: Cliente;

beforeEach(() => {
  XhrEspia.creadas = [];
  elToken = null;
  cliente = crearCliente({ prefijo: PREFIJO, token: () => elToken });
  vi.stubGlobal('XMLHttpRequest', XhrEspia);
});

afterEach(() => {
  vi.unstubAllGlobals();
  XhrEspia.creadas = [];
});

describe('«subir» sale por la misma puerta que «solicitar» y «descargar»', () => {
  it('cuelga la ruta del prefijo de SU sistema, y por omision con POST', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, JSON.stringify({ id: 7 }));
    await subida;

    expect(laPeticion().url).toBe('/un-sistema/api/v1/cargas');
    expect(laPeticion().metodo).toBe('POST');
  });

  it('el prefijo es de quien construye el cliente, y no de esta libreria', async () => {
    const suyo = crearCliente({ prefijo: '/otro-sistema/api/v1', token: () => null });
    const subida = suyo.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '{}');
    await subida;

    expect(laPeticion().url).toBe('/otro-sistema/api/v1/cargas');
  });

  it('admite PUT y PATCH, y la operacion del error lo dice', async () => {
    const subida = cliente.subir('/cargas/7', { archivo: unArchivo(), metodo: 'PUT' });
    laPeticion().problema(422, 'VALIDACION', 'No');

    await expect(subida).rejects.toMatchObject({ operacion: 'PUT /cargas/7' });
    expect(laPeticion().metodo).toBe('PUT');
  });

  it('no anade nada que nombre la municipalidad (regla 2, ADR-0005)', async () => {
    elToken = 'un-token';
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo(),
      campos: { observacion: 'Carga del ejercicio 2026' },
    });
    laPeticion().contesta(200, '{}');
    await subida;

    const partes = [...(laPeticion().enviado ?? new FormData()).keys()].join(' ');
    const todo = laPeticion().url + JSON.stringify(laPeticion().cabeceras) + partes;
    expect(todo.toLowerCase()).not.toContain('municipalidad');
  });
});

describe('EL DEFECTO CLASICO: el «Content-Type» lo pone el navegador, no este codigo', () => {
  it('no se fija ninguna cabecera de tipo de contenido, escrita como se escriba', async () => {
    elToken = 'un-token';
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '{}');
    await subida;

    // Un `setRequestHeader('Content-Type', 'multipart/form-data')` manda la cabecera SIN el
    // `boundary` —que solo conoce quien serializa las partes— y el servidor contesta un 400 o un
    // 500 que habla de «no multipart boundary found»: un rojo que manda a mirar el backend
    // cuando el defecto esta en esta linea. Con un `FormData` como cuerpo, el navegador pone la
    // cabecera con su separador; lo unico que hay que hacer es no estorbarle.
    expect(
      cabecera(laPeticion(), 'Content-Type'),
      'alguien fijo el Content-Type a mano: la peticion sale sin «boundary»',
    ).toBeUndefined();
  });

  it('LA LISTA ENTERA de cabeceras: «Accept» y el token, y ninguna mas', async () => {
    elToken = 'un-token';
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '{}');
    await subida;

    // Se comprueba la lista entera y no la ausencia de una: asi, cualquier cabecera nueva
    // —`Content-Type` la primera— tiene que declararse aqui, que es donde se lee por que esta.
    expect(Object.keys(laPeticion().cabeceras).sort()).toEqual(['Accept', 'Authorization']);
  });

  it('y el cuerpo que se manda es el FormData, que es lo que hace que el navegador lo ponga', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '{}');
    await subida;

    // Si alguien serializara el archivo a otra cosa —base64 en un JSON, por ejemplo— el
    // navegador ya no pondria el `boundary` y la prueba de arriba seguiria en verde sin que la
    // subida funcionara.
    expect(laPeticion().enviado).toBeInstanceOf(FormData);
  });
});

describe('el token viaja como en el resto del cliente', () => {
  it('con token, manda Authorization: Bearer', async () => {
    elToken = 'un-token-de-prueba';
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '{}');
    await subida;

    expect(cabecera(laPeticion(), 'Authorization')).toBe('Bearer un-token-de-prueba');
  });

  it('sin token NO manda la cabecera, en vez de mandar «Bearer null»', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '{}');
    await subida;

    expect(cabecera(laPeticion(), 'Authorization')).toBeUndefined();
  });

  it('el token se lee en CADA subida: si la sesion se refresca, esta se entera', async () => {
    elToken = 'el-de-antes';
    const primera = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '{}');
    await primera;

    elToken = 'el-de-despues';
    const segunda = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '{}');
    await segunda;

    // Si el token se congelara al construir el cliente, esta seria la unica operacion que
    // seguiria mandando el caducado — y el sintoma, un 401 que no se arregla entrando.
    expect(cabecera(XhrEspia.creadas[0] as XhrEspia, 'Authorization')).toBe('Bearer el-de-antes');
    expect(cabecera(XhrEspia.creadas[1] as XhrEspia, 'Authorization')).toBe('Bearer el-de-despues');
  });
});

describe('el multipart lleva el archivo y las demas partes', () => {
  it('la parte del archivo se llama «archivo» por omision, que es como la nombra el backend', async () => {
    const archivo = unArchivo();
    const subida = cliente.subir('/cargas', { archivo });
    laPeticion().contesta(200, '{}');
    await subida;

    const parte = laPeticion().enviado?.get('archivo');
    expect(parte).toBeInstanceOf(File);
    expect((parte as File).name).toBe('padron.xlsx');
  });

  it('pero se puede nombrar de otra forma, porque la nombra el backend y no esta libreria', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo(), campo: 'planilla' });
    laPeticion().contesta(200, '{}');
    await subida;

    expect(laPeticion().enviado?.get('planilla')).toBeInstanceOf(File);
    expect(laPeticion().enviado?.get('archivo')).toBeNull();
  });

  it('los demas campos viajan como texto: por ahi va la observacion (regla 10)', async () => {
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo(),
      campos: { observacion: 'Carga del padron 2026', origen: 'ventanilla' },
    });
    laPeticion().contesta(200, '{}');
    await subida;

    expect(laPeticion().enviado?.get('observacion')).toBe('Carga del padron 2026');
    expect(laPeticion().enviado?.get('origen')).toBe('ventanilla');
  });

  it('el nombre del argumento manda sobre el del File', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo(), nombre: 'otro.xlsx' });
    laPeticion().contesta(200, '{}');
    await subida;

    expect((laPeticion().enviado?.get('archivo') as File).name).toBe('otro.xlsx');
  });

  it('un Blob sin nombre y sin argumento viaja como «blob», que es lo que hace FormData', async () => {
    const soloBytes = new Blob([new Uint8Array(10)], { type: 'text/csv' });
    const subida = cliente.subir('/cargas', { archivo: soloBytes });
    laPeticion().contesta(200, '{}');
    await subida;

    // No se inventa un nombre aqui: se deja el del navegador y se dice en el docblock que hay
    // que dar uno. Inventarlo —`archivo.bin`, por ejemplo— seria peor, porque el backend
    // validaria una extension que nadie eligio.
    expect((laPeticion().enviado?.get('archivo') as File).name).toBe('blob');
  });
});

describe('EL AVANCE: lo que el navegador dice, con nombre', () => {
  it('llama a «alAvanzar» con los bytes y la fraccion', async () => {
    const avances: unknown[] = [];
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo(),
      alAvanzar: (avance) => avances.push(avance),
    });

    laPeticion().avanza(256, 1024);
    laPeticion().avanza(1024, 1024);
    laPeticion().contesta(200, '{}');
    await subida;

    expect(avances).toEqual([
      { bytesEnviados: 256, bytesDeLaSubida: 1024, fraccion: 0.25 },
      { bytesEnviados: 1024, bytesDeLaSubida: 1024, fraccion: 1 },
    ]);
  });

  it('si el navegador no sabe cuanto falta, lo dice con null en vez de fingir un cero', async () => {
    const avances: { fraccion: number | null; bytesDeLaSubida: number | null }[] = [];
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo(),
      alAvanzar: (avance) => avances.push(avance),
    });

    laPeticion().avanza(256, 0, false);
    laPeticion().contesta(200, '{}');
    await subida;

    // Una barra que dibuja 0 % para siempre es indistinguible de una subida colgada. Con `null`
    // la pantalla puede ensenar la barra indeterminada, que es lo que hay que ensenar.
    expect(avances).toEqual([{ bytesEnviados: 256, bytesDeLaSubida: null, fraccion: null }]);
  });

  it('sin «alAvanzar» no se escucha nada, y la subida va igual', async () => {
    const subida = cliente.subir<{ id: number }>('/cargas', { archivo: unArchivo() });
    laPeticion().avanza(256, 1024);
    laPeticion().contesta(200, JSON.stringify({ id: 7 }));

    await expect(subida).resolves.toEqual({ id: 7 });
  });
});

describe('SE PUEDE CANCELAR, y se cancela como cancela «fetch»', () => {
  it('abortar la senal corta la peticion', async () => {
    const controlador = new AbortController();
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo(),
      senal: controlador.signal,
    });

    controlador.abort();

    await expect(subida).rejects.toMatchObject({ name: 'AbortError' });
    expect(laPeticion().abortado).toBe(true);
  });

  it('rechaza con el «reason» de la senal, que es lo que entrega fetch', async () => {
    const controlador = new AbortController();
    const motivo = new Error('la ventanilla cerro la pantalla');
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo(),
      senal: controlador.signal,
    });

    controlador.abort(motivo);

    // Y no un error propio: una pantalla que ya distingue «lo cancele yo» de «fallo» en una
    // lectura no tiene que aprender un segundo caso para las subidas.
    await expect(subida).rejects.toBe(motivo);
  });

  it('una senal YA abortada no abre ninguna peticion', async () => {
    const controlador = new AbortController();
    controlador.abort();

    const subida = cliente.subir('/cargas', {
      archivo: unArchivo(),
      senal: controlador.signal,
    });

    await expect(subida).rejects.toMatchObject({ name: 'AbortError' });
    expect(XhrEspia.creadas).toHaveLength(0);
  });

  it('cancelar despues de terminar no hace nada: el oyente se retira al acabar', async () => {
    const controlador = new AbortController();
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo(),
      senal: controlador.signal,
    });
    laPeticion().contesta(200, '{}');
    await subida;

    controlador.abort();

    // Sin el `removeEventListener` del `loadend`, cada subida dejaria su oyente colgado de la
    // senal: con una senal de larga vida —la de una pantalla entera— se acumulan, y el `abort`
    // llamaria a `abort()` sobre peticiones ya terminadas.
    expect(laPeticion().abortado).toBe(false);
  });
});

describe('LOS TRES DESENLACES QUE LA PANTALLA TIENE QUE DISTINGUIR', () => {
  it('pesa de mas: se rechaza AQUI, sin mandar un solo byte', async () => {
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo('padron.xlsx', TIPO_DE_HOJA, 4096),
      limiteDeBytes: 1024,
    });

    const fallo = (await subida.catch((e: unknown) => e)) as ArchivoRechazado;

    expect(fallo).toBeInstanceOf(ArchivoRechazado);
    expect(fallo).toBeInstanceOf(ErrorDeLaApi);
    expect(fallo).toMatchObject({
      motivo: 'demasiado-grande',
      bytes: 4096,
      limiteDeBytes: 1024,
      estado: 0,
    });
    // Lo caro de no comprobarlo aqui: subir 30 MB por la conexion de una municipalidad para
    // recibir, hoy, un 500 «No se pudo completar la operacion».
    expect(XhrEspia.creadas).toHaveLength(0);
  });

  it('no es del tipo que es: tambien aqui, y con la gramatica del «accept»', async () => {
    const subida = cliente.subir('/cargas', {
      archivo: unArchivo('padron.xls', 'application/vnd.ms-excel'),
      admite: ['.xlsx'],
    });

    await expect(subida).rejects.toMatchObject({
      name: 'ArchivoRechazado',
      motivo: 'tipo-no-admitido',
      estado: 0,
    });
    expect(XhrEspia.creadas).toHaveLength(0);
  });

  it('el 422 de esta casa llega con su codigo y su mensaje, que es la regla concreta', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().problema(
      422,
      'VALIDACION',
      'El archivo no se pudo leer como una hoja de calculo .xlsx',
    );

    const fallo = (await subida.catch((e: unknown) => e)) as ErrorDeLaApi;

    // NO es un `ArchivoRechazado`: el 422 de esta casa es el peldano «no valido» de la escalera,
    // y su texto es el dato —la regla que se incumplio, con su cifra dentro— y no un respaldo.
    expect(fallo).toBeInstanceOf(ErrorDeLaApi);
    expect(fallo).not.toBeInstanceOf(ArchivoRechazado);
    expect(fallo).toMatchObject({
      estado: 422,
      codigo: 'VALIDACION',
      mensaje: 'El archivo no se pudo leer como una hoja de calculo .xlsx',
    });
  });

  it.each([
    [413, 'demasiado-grande'],
    [415, 'tipo-no-admitido'],
  ])('y si es el servidor quien lo rechaza, el %i tambien se distingue', async (estado, motivo) => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().problema(estado, 'UN_CODIGO', 'Lo que dijo el backend');

    // Sin esto caen en el ultimo peldano de la escalera —«avise a soporte»—, que es mentira dos
    // veces: el sistema contesto, y soporte no puede hacer nada con un archivo que pesa de mas.
    await expect(subida).rejects.toMatchObject({
      name: 'ArchivoRechazado',
      motivo,
      estado,
      codigo: 'UN_CODIGO',
      mensaje: 'Lo que dijo el backend',
      limiteDeBytes: null,
    });
  });

  it.each(['mensaje', 'detail', 'title'])(
    '#121 — un 413 con «%s: null» no dijo nada, igual para ArchivoRechazado que para ErrorDeLaApi',
    async (miembro) => {
      const subida = cliente.subir('/cargas', { archivo: unArchivo() });
      laPeticion().contesta(413, JSON.stringify({ status: 413, [miembro]: null }));

      // Hasta #121 el orden `mensaje ?? detail ?? title` se escribia dos veces en `errores.ts` y
      // las dos no coincidian aqui: `ErrorDeLaApi` tomaba el `null` por «no dijo nada» y
      // `ArchivoRechazado` por «dijo algo», y su `message` se quedaba en «POST /cargas», sin el
      // motivo que es lo unico con lo que se entiende en un registro.
      await expect(subida).rejects.toMatchObject({
        name: 'ArchivoRechazado',
        motivo: 'demasiado-grande',
        message: 'POST /cargas -> demasiado-grande',
      });
    },
  );
});

describe('«admite» usa la gramatica del atributo accept de HTML', () => {
  const casos: [string, string, readonly string[], boolean][] = [
    ['padron.xlsx', TIPO_DE_HOJA, ['.xlsx'], true],
    // El caso que obliga a admitir extensiones: segun el equipo, el navegador da el tipo de una
    // hoja de calculo como cadena vacia. Con solo tipos de medio se rechazaria un archivo bueno.
    ['padron.xlsx', '', ['.xlsx'], true],
    ['padron.xlsx', '', [TIPO_DE_HOJA], false],
    ['padron.XLSX', '', ['.xlsx'], true],
    ['plano.pdf', 'application/pdf', ['application/pdf'], true],
    ['plano.pdf', 'application/pdf;charset=binary', ['application/pdf'], true],
    ['foto.png', 'image/png', ['image/*'], true],
    ['plano.pdf', 'application/pdf', ['image/*'], false],
  ];

  it.each(casos)('«%s» (%s) contra %j: %s', async (nombre, tipo, admite, pasa) => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo(nombre, tipo), admite });
    if (pasa) laPeticion().contesta(200, '{}');

    if (pasa) {
      await expect(subida).resolves.toEqual({});
    } else {
      await expect(subida).rejects.toMatchObject({ motivo: 'tipo-no-admitido' });
    }
  });

  it('un Blob sin nombre contra una extension se rechaza, porque nadie puede decir que es', async () => {
    const soloBytes = new Blob([new Uint8Array(10)], { type: '' });

    await expect(
      cliente.subir('/cargas', { archivo: soloBytes, admite: ['.xlsx'] }),
    ).rejects.toMatchObject({ motivo: 'tipo-no-admitido' });
  });

  it('sin «admite» no se comprueba nada: el limite lo pone el backend', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo('cualquiera.bin', '') });
    laPeticion().contesta(200, '{}');

    await expect(subida).resolves.toEqual({});
  });
});

describe('la respuesta se interpreta como la de «solicitar», con un caso mas', () => {
  it('un 200 con JSON devuelve el cuerpo ya interpretado', async () => {
    const subida = cliente.subir<{ id: number; estado: string }>('/cargas', {
      archivo: unArchivo(),
    });
    laPeticion().contesta(200, JSON.stringify({ id: 7, estado: 'OK' }));

    await expect(subida).resolves.toEqual({ id: 7, estado: 'OK' });
  });

  it.each([201, 204])('un %i SIN cuerpo resuelve, en vez de reventar al interpretarlo', async (estado) => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(estado, '');

    // Es el caso que `solicitar()` no tiene: una lectura sin cuerpo no tiene sentido, y una
    // subida que solo acusa recibo si. Con `JSON.parse('')` saldria un `SyntaxError` que parece
    // un fallo del servidor.
    await expect(subida).resolves.toBeUndefined();
  });

  it('un 200 que no trae JSON lanza el mismo SyntaxError que en una lectura', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(200, '<!doctype html><html></html>');

    await expect(subida).rejects.toBeInstanceOf(SyntaxError);
  });

  it('un error con cuerpo ilegible no tapa el estado', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().contesta(502, '<!doctype html><html></html>');

    await expect(subida).rejects.toMatchObject({
      estado: 502,
      codigo: null,
      mensaje: null,
      operacion: 'POST /cargas',
    });
  });

  it('#121 — un error cuyo cuerpo es el JSON `null` tampoco tapa el estado', async () => {
    // `JSON.parse('null')` no lanza, y `typeof null === 'object'`: es el cuerpo que distingue una
    // lectura del `problem+json` que mira `!== null` de una que no. Sin esa comprobacion el
    // constructor lee `null.mensaje` y la subida rechaza con un `TypeError`, que `peldanoDe()`
    // clasificaria como corte de red.
    //
    // Y no rechaza con nada: el `TypeError` salta DENTRO del oyente de `load`, que lo traga, y la
    // promesa se queda pendiente para siempre —la barra quieta, sin fallo que ensenar—. Por eso se
    // mira el desenlace tras una vuelta del bucle y no con `await subida`, que acabaria en un
    // `Test timed out` que no dice que paso.
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    let desenlace: unknown = 'pendiente';
    subida.then(
      () => {
        desenlace = 'resuelta';
      },
      (fallo: unknown) => {
        desenlace = fallo;
      },
    );
    laPeticion().contesta(500, 'null');
    await new Promise((listo) => setTimeout(listo, 0));

    expect(desenlace, 'la subida no llego a rechazar: se quedo sin desenlace').toBeInstanceOf(
      ErrorDeLaApi,
    );
    expect(desenlace).toMatchObject({
      estado: 500,
      codigo: null,
      mensaje: null,
      operacion: 'POST /cargas',
    });
  });

  it('un corte de red lanza un TypeError, que es lo que lanzaria fetch', async () => {
    const subida = cliente.subir('/cargas', { archivo: unArchivo() });
    laPeticion().seCorta();

    // `peldanoDe()` clasifica como averia todo lo que no sea `ErrorDeLaApi`. Un `ErrorDeLaApi`
    // con un estado inventado diria que el servidor contesto algo, y no contesto nada.
    await expect(subida).rejects.toBeInstanceOf(TypeError);
  });
});

describe('el error de una subida es, campo por campo, el de una lectura', () => {
  it.each([401, 403, 500])('el %i dice lo mismo por las dos puertas', async (estado) => {
    const cuerpo = JSON.stringify({
      status: estado,
      title: 'Lo que dijo el backend',
      codigo: 'UN_CODIGO',
      mensaje: 'Lo que dijo el backend',
    });

    const subida = cliente.subir('/x', { archivo: unArchivo() });
    laPeticion().contesta(estado, cuerpo);
    const alSubir = (await subida.catch((e: unknown) => e)) as ErrorDeLaApi;

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(cuerpo, {
            status: estado,
            headers: { 'content-type': 'application/problem+json' },
          }),
        ),
      ),
    );
    const alLeer = (await cliente
      .solicitar('/x', { metodo: 'POST' })
      .catch((e: unknown) => e)) as ErrorDeLaApi;

    // Si difirieran en algo, la pantalla tendria que saber por cual de las dos llego el fallo
    // para explicarlo, y `peldanoDe()` dejaria de servir para las subidas.
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
    expect(campos(alSubir)).toEqual(campos(alLeer));
  });
});
