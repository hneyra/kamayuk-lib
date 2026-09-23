import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ABRE, CIERRA, marcarElSaco } from '../verificaciones/marcas.ts';
import { crearIdentidad, type FallaDeLaPuerta, type Identidad } from './identidad.ts';
import { TEXTOS_DE_LA_PUERTA } from './textos.ts';

/**
 * La puerta de identidad: **PKCE S256, y el token en memoria**.
 *
 * <h2>Lo que estas pruebas miran de verdad</h2>
 *
 * No que el parametro `code_challenge_method` diga `S256` —eso es una cadena, y una cadena se
 * puede escribir bien con el calculo mal—, sino que el reto **sea** el SHA-256 del verificador
 * que se guardo: la prueba lo recalcula por su cuenta y compara. Un reto que no cuadre lo
 * rechaza Keycloak en el canje, o sea que el sintoma llegaria en el rebote y no aqui.
 *
 * Y no que el codigo «no use localStorage» —eso lo mira ESLint por el nombre de la clave—, sino
 * que **despues del canje ningun almacenamiento del navegador contenga el token**, mire donde
 * mire y se llame como se llame la clave. Es la mitad que la prohibicion no puede ver:
 * `localStorage.setItem('kamayuk.preferencia', elToken)` pasa la prohibicion entera, porque la
 * prohibicion mira la clave.
 *
 * <h2>Lo que se anade al mudarse a `kamayuk-lib`</h2>
 *
 * El ultimo bloque, que es la razon de que este archivo sea una fabrica y no un modulo con
 * estado: **dos sistemas servidos del mismo origen no se pisan**. Sin esa propiedad, abrir
 * `/rentas/` y `/caja/` en la misma pestana rompia el canje del primero sin decir por que.
 *
 * <h2>Lo que se porta de `rentas` en #42</h2>
 *
 * Los dos ultimos bloques salen de `rentas/frontend/src/api/identidad.test.ts` (`ac379ac`): la
 * sonda (`rentas#112`) y la consola de la cuenta (`rentas#115`), adaptados a `crearIdentidad`.
 * Donde alli se cambiaba el global `__KAMAYUK_RENTAS__` para ver que las URL se movian con el
 * emisor, aqui se construye otra instancia con otro `realm`: es la misma pregunta —¿sale del
 * emisor o de un literal?— hecha a una fabrica. Y se anade lo que la copia de `rentas` no tiene:
 * que la sonda **no mande credenciales**.
 *
 * <h2>Lo que se anade en #70</h2>
 *
 * El bloque de `quienEntro()`, y con el **un segundo barrido del almacenamiento**: el de arriba
 * busca el token, que es base64 y no lleva el nombre como texto, asi que guardar los claims ya
 * decodificados lo pasaria entero. El nuevo busca los tres valores tal como se leen.
 */

const REALM = 'http://localhost:8181/realms/kamayuk';

const CONFIGURACION = {
  realm: REALM,
  cliente: 'kamayuk-backoffice',
  alcance: 'openid profile',
  retorno: 'http://localhost:5173/rentas/',
  destinoPorOmision: '#panel',
  prefijoDeClaves: 'kamayuk.rentas',
} as const;

const VERIFICADOR = 'kamayuk.rentas.pkce.verificador';
const ESTADO = 'kamayuk.rentas.pkce.estado';
const IDAS = 'kamayuk.rentas.pkce.idas';

let identidad: Identidad;

/** Sustituye `location`, que en jsdom no se puede espiar de otra manera. */
function ubicacion(href = 'http://localhost:5173/') {
  const url = new URL(href);
  const asignar = vi.fn();
  vi.stubGlobal('location', {
    origin: url.origin,
    href: url.href,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    assign: asignar,
    reload: vi.fn(),
  });
  return asignar;
}

/** `BASE64URL(SHA256(verificador))`, calculado aqui y no leido del codigo que se prueba. */
async function retoEsperado(verificador: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
  let texto = '';
  new Uint8Array(resumen).forEach((b) => (texto += String.fromCharCode(b)));
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * **El emisor contesta la sonda**, que es lo que `entrar()` pregunta antes de navegar (#42).
 *
 * Va en el `beforeEach` porque es el estado normal: con el emisor levantado, `entrar()` hace lo
 * de siempre. Sin este doble, cada `entrar()` de este archivo saldria a `localhost:8181` de
 * verdad, no encontraria nada, y la sonda diria —con razon— que no hay emisor.
 *
 * Devuelve una respuesta opaca porque la sonda va con `mode: 'no-cors'` y **no la lee**: lo unico
 * que le importa es que el `fetch` no reviente.
 */
function elEmisorContesta() {
  const espia = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
  vi.stubGlobal('fetch', espia);
  return espia;
}

/** El emisor no contesta: el `fetch` revienta como revienta en el navegador. */
function elEmisorNoContesta(falla: unknown = new TypeError('Failed to fetch')) {
  const espia = vi.fn<typeof fetch>(() => Promise.reject(falla));
  vi.stubGlobal('fetch', espia);
  return espia;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  identidad = crearIdentidad(CONFIGURACION);
  elEmisorContesta();
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

describe('la ida a la puerta es codigo de autorizacion con PKCE S256', () => {
  it('manda al realm configurado, al cliente configurado, con code y S256', async () => {
    const asignar = ubicacion();

    await identidad.entrar();

    const destino = new URL(String(asignar.mock.calls[0]?.[0]));
    expect(destino.origin + destino.pathname).toBe(`${REALM}/protocol/openid-connect/auth`);
    expect(destino.searchParams.get('response_type')).toBe('code');
    expect(destino.searchParams.get('client_id')).toBe('kamayuk-backoffice');
    expect(destino.searchParams.get('code_challenge_method')).toBe('S256');
    // La URI de retorno es la raiz DE LA APLICACION —`/rentas/`, no `/`—, y una sola: declarar
    // una por pantalla seria una lista que ampliar cada vez que nace una seccion, y el sintoma
    // de olvidarse es «Invalid parameter: redirect_uri».
    //
    // Que sea `/rentas/` y no `/` es lo que costo el acceso a `prod`: el retorno devolvia a la
    // raiz del SITIO y el usuario recibia un 404 con el `code` correcto. Aqui es un parametro
    // justamente para que cada sistema lo declare y nadie herede el de otro.
    expect(destino.searchParams.get('redirect_uri')).toBe('http://localhost:5173/rentas/');
  });

  it('y el reto ES el SHA-256 del verificador guardado, no una cadena que lo diga', async () => {
    const asignar = ubicacion();

    await identidad.entrar();

    const verificador = sessionStorage.getItem(VERIFICADOR);
    expect(verificador).not.toBeNull();
    const destino = new URL(String(asignar.mock.calls[0]?.[0]));
    expect(destino.searchParams.get('code_challenge')).toBe(await retoEsperado(verificador ?? ''));
  });

  it('dos idas dan dos verificadores distintos: no hay secreto fijo', async () => {
    ubicacion();
    await identidad.entrar();
    const primero = sessionStorage.getItem(VERIFICADOR);
    await identidad.entrar();

    expect(sessionStorage.getItem(VERIFICADOR)).not.toBe(primero);
  });

  it('las cinco claves del rebote NO nombran ninguna credencial', async () => {
    ubicacion();
    await identidad.entrar();

    // Tienen que sobrevivir al rebote, asi que van en `sessionStorage` — y por eso no llevan
    // «token», «acceso» ni «sesion»: llamarlo `…token.verificador` obligaria a quien lea esto
    // dentro de seis meses a distinguir dos cosas que se llaman igual.
    const vigiladas = /token|jwt|bearer|credencial|contrasena|acceso|sesion/i;
    const claves = Object.keys(sessionStorage);
    expect(claves.length).toBeGreaterThan(0);
    expect(claves.filter((clave) => vigiladas.test(clave))).toEqual([]);
  });

  it('hay puerta: jsdom expone crypto.subtle, que es lo que S256 necesita', () => {
    expect(identidad.hayPuerta()).toBe(true);
  });
});

describe('el canje deja el token EN MEMORIA y en ningun almacenamiento', () => {
  const TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhZG1pbmlzdHJhZG9yIn0.firma';
  const IDENTIDAD = 'eyJhbGciOiJSUzI1NiJ9.eyJpZCI6MX0.firma';

  /** Deja el navegador como si acabara de volver de Keycloak con un codigo bueno. */
  function vueltaBuena() {
    sessionStorage.setItem(VERIFICADOR, 'el-verificador');
    sessionStorage.setItem(ESTADO, 'el-estado');
    ubicacion('http://localhost:5173/?code=un-codigo&state=el-estado');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json({ access_token: TOKEN, id_token: IDENTIDAD, refresh_token: 'refresco' }),
        ),
      ),
    );
  }

  it('canjea y el token queda disponible', async () => {
    vueltaBuena();

    await expect(identidad.canjearSiVuelve()).resolves.toEqual({ estado: 'canjeado' });
    expect(identidad.token()).toBe(TOKEN);
  });

  it('manda al canje el verificador, el cliente y el grant que toca', async () => {
    vueltaBuena();

    await identidad.canjearSiVuelve();

    const espia = vi.mocked(globalThis.fetch);
    expect(String(espia.mock.calls[0]?.[0])).toBe(`${REALM}/protocol/openid-connect/token`);
    const enviado = new URLSearchParams(String(espia.mock.calls[0]?.[1]?.body));
    expect(enviado.get('grant_type')).toBe('authorization_code');
    expect(enviado.get('client_id')).toBe('kamayuk-backoffice');
    expect(enviado.get('code_verifier')).toBe('el-verificador');
    // Sin secreto: el cliente es publico, y un secreto dentro de un bundle no es un secreto.
    expect(enviado.get('client_secret')).toBeNull();
  });

  it('NADA de lo que se canjeo acaba en localStorage ni en sessionStorage', async () => {
    vueltaBuena();

    await identidad.canjearSiVuelve();

    // Se recorre el contenido y no las claves: la prohibicion de ESLint mira el NOMBRE de la
    // clave, asi que `localStorage.setItem('kamayuk.preferencia', elToken)` la pasaria entera.
    // Esta es la mitad que la prohibicion no puede ver.
    const guardado = [localStorage, sessionStorage].flatMap((donde) =>
      Object.keys(donde).map((clave) => donde.getItem(clave) ?? ''),
    );
    expect(guardado.some((valor) => valor.includes(TOKEN))).toBe(false);
    expect(guardado.some((valor) => valor.includes(IDENTIDAD))).toBe(false);
    expect(guardado.some((valor) => valor.includes('refresco'))).toBe(false);
    expect(localStorage.length).toBe(0);
  });

  it('el verificador y el estado se borran: un codigo no se canjea dos veces', async () => {
    vueltaBuena();

    await identidad.canjearSiVuelve();

    expect(sessionStorage.getItem(VERIFICADOR)).toBeNull();
    expect(sessionStorage.getItem(ESTADO)).toBeNull();
  });

  it('si el estado no cuadra con la ida, no canjea nada', async () => {
    sessionStorage.setItem(VERIFICADOR, 'el-verificador');
    sessionStorage.setItem(ESTADO, 'el-estado');
    ubicacion('http://localhost:5173/?code=un-codigo&state=OTRO');
    const espia = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', espia);

    const vuelta = await identidad.canjearSiVuelve();

    // El estado es lo unico que distingue nuestra vuelta de un codigo que alguien nos hizo
    // llegar. Sin comprobarlo, la puerta acepta cualquier codigo.
    expect(vuelta).toMatchObject({ estado: 'fallo', motivo: 'La vuelta no cuadra con la ida' });
    expect(espia).not.toHaveBeenCalled();
    expect(identidad.token()).toBeNull();
  });

  it('un ?error= del emisor se explica con su motivo, y no se vuelve a la puerta', async () => {
    ubicacion('http://localhost:5173/?error=access_denied&error_description=lo+cancelo');

    const vuelta = await identidad.canjearSiVuelve();

    expect(vuelta).toMatchObject({
      estado: 'fallo',
      motivo: 'No se completo la entrada',
      detalle: 'lo cancelo',
    });
  });

  it('sin code y sin error no ha pasado nada: «sin-vuelta»', async () => {
    ubicacion('http://localhost:5173/#panel');

    await expect(identidad.canjearSiVuelve()).resolves.toEqual({ estado: 'sin-vuelta' });
  });

  it('si el emisor no contesta, lo dice en vez de dejar la pagina en blanco', async () => {
    sessionStorage.setItem(VERIFICADOR, 'v');
    sessionStorage.setItem(ESTADO, 'e');
    ubicacion('http://localhost:5173/?code=c&state=e');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError('sin red'))),
    );

    await expect(identidad.canjearSiVuelve()).resolves.toMatchObject({
      estado: 'fallo',
      motivo: 'El emisor no contesto',
    });
  });
});

/**
 * **Quien entro, publicado del `id_token` que el canje ya guardaba** (#70).
 *
 * Lo que decodifica el token lo prueba `quien-entro.test.ts`, que es una funcion pura. Aqui se
 * prueba lo otro, que es de la instancia y no de la funcion: que los claims aparezcan **con el
 * canje**, que **se mueran con `salir()`**, que un `id_token` ilegible **no rompa el canje** —el
 * `access_token` es el que abre la API, y perderlo por un rotulo dejaria fuera a quien el emisor
 * dejo entrar— y que nada de esto acabe en un almacenamiento.
 */
describe('quien entro sale del id_token, en memoria y sin romper el canje', () => {
  const TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJyb3NhIn0.firma';
  const NOMBRE = 'Rosa Quispe Mamani';
  const USUARIO = 'rquispe';
  const MUNICIPALIDAD = '150101';

  function base64url(texto: string): string {
    const bytes = new TextEncoder().encode(texto);
    let porByte = '';
    bytes.forEach((b) => (porByte += String.fromCharCode(b)));
    return btoa(porByte).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * El `id_token` que el realm manda de verdad: la municipalidad **como numero**, porque su
   * mapeador declara `jsonType.label: "long"`
   * (`infrastructure:despliegue/identidad/realm-kamayuk.json`, cliente `kamayuk-backoffice`).
   */
  const ID_TOKEN = `${base64url('{"alg":"RS256"}')}.${base64url(
    JSON.stringify({ name: NOMBRE, preferred_username: USUARIO, municipalidad_id: 150101 }),
  )}.firma`;

  /** La vuelta de Keycloak con el cuerpo de canje que se le pase. */
  function vuelveCon(cuerpo: Record<string, unknown>) {
    sessionStorage.setItem(VERIFICADOR, 'el-verificador');
    sessionStorage.setItem(ESTADO, 'el-estado');
    ubicacion('http://localhost:5173/?code=un-codigo&state=el-estado');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(Response.json(cuerpo))),
    );
  }

  it('antes de canjear no hay nadie: null, y no un objeto con tres huecos', () => {
    expect(identidad.quienEntro()).toBeNull();
  });

  it('despues del canje dice el nombre, el usuario y la municipalidad del emisor', async () => {
    vuelveCon({ access_token: TOKEN, id_token: ID_TOKEN });

    await expect(identidad.canjearSiVuelve()).resolves.toEqual({ estado: 'canjeado' });

    expect(identidad.quienEntro()).toEqual({
      nombre: NOMBRE,
      usuario: USUARIO,
      municipalidad: MUNICIPALIDAD,
    });
  });

  it('y lo devuelve por la MISMA referencia: la barra lo lee en cada dibujado', async () => {
    vuelveCon({ access_token: TOKEN, id_token: ID_TOKEN });
    await identidad.canjearSiVuelve();

    // Un objeto nuevo en cada llamada haria que cualquier comparacion por referencia del
    // consumidor —un `useMemo`, un `React.memo`— viera un cambio donde no hay ninguno.
    expect(identidad.quienEntro()).toBe(identidad.quienEntro());
  });

  it('salir lo OLVIDA: null otra vez, como el token', async () => {
    vuelveCon({ access_token: TOKEN, id_token: ID_TOKEN });
    await identidad.canjearSiVuelve();
    expect(identidad.quienEntro()).not.toBeNull();
    ubicacion();

    identidad.salir();

    expect(identidad.quienEntro()).toBeNull();
    expect(identidad.token()).toBeNull();
  });

  it('y el de un canje nuevo sustituye al del anterior: son los del ULTIMO', async () => {
    vuelveCon({ access_token: TOKEN, id_token: ID_TOKEN });
    await identidad.canjearSiVuelve();

    const otro = `${base64url('{"alg":"RS256"}')}.${base64url(
      JSON.stringify({ name: 'Julio Ccahuana', preferred_username: 'jccahuana' }),
    )}.firma`;
    vuelveCon({ access_token: 'otro-token', id_token: otro });
    await identidad.canjearSiVuelve();

    expect(identidad.quienEntro()).toEqual({
      nombre: 'Julio Ccahuana',
      usuario: 'jccahuana',
      municipalidad: null,
    });
  });

  /**
   * **El AC-2, y es lo mas importante del issue**: los cuatro casos de ilegible, cada uno contra el
   * canje entero. No basta con que la funcion pura devuelva `null`: lo que hay que ver es que la
   * `Vuelta` siga siendo `canjeado` y que `token()` siga sirviendo, porque es el `access_token` el
   * que abre la API y el `id_token` solo pinta un rotulo.
   */
  const ID_TOKENS_ILEGIBLES: readonly (readonly [string, Record<string, unknown>])[] = [
    ['ausente: el emisor no mando id_token', { access_token: TOKEN }],
    ['no es un JWT: no tiene las tres partes', { access_token: TOKEN, id_token: 'no-es-un-jwt' }],
    [
      'base64url mal formado en la carga',
      { access_token: TOKEN, id_token: 'cabecera.%%%%.firma' },
    ],
    [
      'la carga no es JSON',
      { access_token: TOKEN, id_token: `cabecera.${base64url('no soy json')}.firma` },
    ],
  ];

  it.each(ID_TOKENS_ILEGIBLES)(
    'un id_token ilegible NO rompe el canje (%s)',
    async (_caso, cuerpo) => {
      vuelveCon(cuerpo);

      await expect(identidad.canjearSiVuelve()).resolves.toEqual({ estado: 'canjeado' });

      expect(identidad.token()).toBe(TOKEN);
      expect(identidad.quienEntro()).toBeNull();
      // Y el freno del rebote se levanta igual: un canje bueno es un canje bueno.
      expect(sessionStorage.getItem(IDAS)).toBeNull();
    },
  );

  /**
   * **El AC-3, y por que esta prueba no es la que ya habia.**
   *
   * La de arriba —«NADA de lo que se canjeo acaba en localStorage ni en sessionStorage»— barre los
   * valores buscando **el token**, que es base64: el nombre de quien entro no aparece en el como
   * texto. O sea que guardar los claims YA DECODIFICADOS —`localStorage.setItem('kamayuk.barra',
   * JSON.stringify(quienEntro()))`, que es exactamente el atajo que un consumidor pediria para no
   * perder el rotulo al recargar— pasaria esa prueba **y** la prohibicion `token-en-almacenamiento`
   * de ESLint, que mira el nombre de la clave. Esto barre los tres valores tal como se leen.
   */
  it('NI EL NOMBRE, NI EL USUARIO, NI LA MUNICIPALIDAD acaban en ningun almacenamiento', async () => {
    vuelveCon({ access_token: TOKEN, id_token: ID_TOKEN });

    await identidad.canjearSiVuelve();

    const guardado = [localStorage, sessionStorage].flatMap((donde) =>
      Object.keys(donde).flatMap((clave) => [clave, donde.getItem(clave) ?? '']),
    );
    for (const dato of [NOMBRE, USUARIO, MUNICIPALIDAD, ID_TOKEN, 'rosa', 'Quispe']) {
      expect(
        guardado.filter((valor) => valor.includes(dato)),
        `«${dato}» aparece en un almacenamiento del navegador`,
      ).toEqual([]);
    }
    expect(localStorage.length).toBe(0);
  });
});

describe('los dos frenos del rebote', () => {
  it('tres idas y para: un canje que falla siempre seria un bucle infinito', async () => {
    ubicacion();

    expect(identidad.puedeIrALaPuerta()).toBe(true);
    await identidad.entrar();
    await identidad.entrar();
    expect(identidad.puedeIrALaPuerta()).toBe(true);
    await identidad.entrar();

    expect(identidad.puedeIrALaPuerta()).toBe(false);
  });

  it('un canje bueno pone la cuenta a cero: el tope es para una racha, no para el dia', async () => {
    ubicacion();
    await identidad.entrar();
    await identidad.entrar();
    await identidad.entrar();
    expect(identidad.puedeIrALaPuerta()).toBe(false);

    sessionStorage.setItem(VERIFICADOR, 'v');
    sessionStorage.setItem(ESTADO, 'e');
    ubicacion('http://localhost:5173/?code=c&state=e');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ access_token: 'un-token' }))),
    );
    await identidad.canjearSiVuelve();

    expect(identidad.puedeIrALaPuerta()).toBe(true);
  });

  it('salir deja la marca que impide volver a entrar solo al instante', () => {
    const asignar = ubicacion();
    identidad.fijarToken('un-token', 'una-identidad');

    identidad.salir();

    expect(identidad.token()).toBeNull();
    expect(identidad.vieneDeSalir()).toBe(true);
    const destino = new URL(String(asignar.mock.calls[0]?.[0]));
    expect(destino.origin + destino.pathname).toBe(`${REALM}/protocol/openid-connect/logout`);
    // Sin `id_token_hint` el emisor no cierra SU sesion, y el siguiente arranque entraria solo
    // con la misma cuenta sin que nadie teclee nada.
    expect(destino.searchParams.get('id_token_hint')).toBe('una-identidad');
  });

  it('y «olvidarLaParada» levanta los dos frenos, que es el boton de la puerta', async () => {
    ubicacion();
    await identidad.entrar();
    await identidad.entrar();
    await identidad.entrar();
    expect(identidad.puedeIrALaPuerta()).toBe(false);

    identidad.olvidarLaParada();

    expect(identidad.puedeIrALaPuerta()).toBe(true);
    expect(identidad.vieneDeSalir()).toBe(false);
  });

  it('salir borra la cuenta de idas, y deja SOLO la marca de salida frenando', () => {
    ubicacion();
    sessionStorage.setItem(IDAS, '3');
    identidad.fijarToken('un-token');

    identidad.salir();

    // Salir no es una racha de fallos: es un gesto deliberado. Dejar el contador a tres haria
    // que la siguiente entrada del turno siguiente se encontrara la puerta cerrada por algo
    // que paso antes de cerrar sesion.
    expect(identidad.puedeIrALaPuerta()).toBe(true);
    expect(identidad.vieneDeSalir()).toBe(true);
  });
});

describe('dos sistemas del mismo origen no se pisan (lo que la fabrica existe para impedir)', () => {
  it('cada uno guarda su verificador con SU prefijo, y el del otro sigue intacto', async () => {
    const caja = crearIdentidad({ ...CONFIGURACION, prefijoDeClaves: 'kamayuk.caja' });
    ubicacion();

    await identidad.entrar();
    const deRentas = sessionStorage.getItem(VERIFICADOR);
    await caja.entrar();

    // Con el prefijo fijo que este archivo tenia mientras vivio en `rentas`, la segunda ida
    // sobrescribia el verificador de la primera y su canje fallaba con «La vuelta no cuadra
    // con la ida», sin que nada dijera por que.
    expect(deRentas).not.toBeNull();
    expect(sessionStorage.getItem(VERIFICADOR)).toBe(deRentas);
    expect(sessionStorage.getItem('kamayuk.caja.pkce.verificador')).not.toBe(deRentas);
  });

  it('el token de uno no es el del otro: el estado vive en la instancia', () => {
    const caja = crearIdentidad({ ...CONFIGURACION, prefijoDeClaves: 'kamayuk.caja' });

    identidad.fijarToken('el-de-rentas');

    expect(identidad.token()).toBe('el-de-rentas');
    expect(caja.token()).toBeNull();
  });

  it('y el tope de idas de uno no cierra la puerta del otro', async () => {
    const caja = crearIdentidad({ ...CONFIGURACION, prefijoDeClaves: 'kamayuk.caja' });
    ubicacion();

    await identidad.entrar();
    await identidad.entrar();
    await identidad.entrar();

    expect(identidad.puedeIrALaPuerta()).toBe(false);
    expect(caja.puedeIrALaPuerta()).toBe(true);
  });
});

/** Otro emisor, para ver que lo que se deriva del realm se mueve con el. */
const OTRO_REALM = 'https://identidad.catacaos.gob.pe/realms/kamayuk';

/** Una identidad de otro sistema contra OTRO emisor: lo que hace cada ambiente con la suya. */
function conOtroEmisor(): Identidad {
  return crearIdentidad({ ...CONFIGURACION, realm: OTRO_REALM, prefijoDeClaves: 'kamayuk.caja' });
}

/**
 * **La sonda: si el emisor no esta, `entrar()` no navega y lo dice** (#42, de `rentas#112`).
 *
 * El defecto que cierra no da ningun sintoma: la navegacion se rechaza, no hay documento nuevo ni
 * aplicacion, y queda la pagina de antes en blanco con la consola limpia.
 */
describe('antes de mandar el navegador, se pregunta si el emisor esta', () => {
  it('con el emisor caido NO navega, y devuelve quien no contesto y en que URL', async () => {
    const asignar = ubicacion();
    elEmisorNoContesta();

    const falla = await identidad.entrar();

    expect(asignar, 'navego hacia un emisor que no contesta').not.toHaveBeenCalled();
    expect(falla?.emisor).toBe(REALM);
    expect(falla?.url).toBe(`${REALM}/.well-known/openid-configuration`);
    expect(falla?.motivo).toBe('Failed to fetch');
  });

  it('y una espera agotada se cuenta igual, con su motivo en vez del del navegador', async () => {
    const asignar = ubicacion();
    const agotada = new Error('the operation was aborted');
    agotada.name = 'TimeoutError';
    elEmisorNoContesta(agotada);

    const falla = await identidad.entrar();

    expect(asignar).not.toHaveBeenCalled();
    expect(falla?.motivo).toContain('no contesto en');
  });

  it('una ida que no ocurrio NO gasta una del tope: el emisor no la recibio', async () => {
    ubicacion();
    elEmisorNoContesta();

    await identidad.entrar();
    await identidad.entrar();
    await identidad.entrar();

    // Si contara, tres recargas con la plataforma apagada dejarian la puerta cerrada por un tope
    // que existe para frenar un rebote — y aqui no hubo ni un rebote.
    expect(identidad.puedeIrALaPuerta()).toBe(true);
    expect(sessionStorage.getItem(IDAS)).toBeNull();
    // Y nada del rebote se escribio: la sonda va ANTES de tocar el almacenamiento, asi que un
    // verificador guardado aqui seria el de una ida que nunca salio.
    expect(Object.keys(sessionStorage)).toEqual([]);
  });

  it('con el emisor vivo la sonda pide el descubrimiento, sin leerlo y sin cache', async () => {
    ubicacion();
    const espia = elEmisorContesta();

    const falla = await identidad.entrar();

    expect(falla).toBeNull();
    const [url, opciones] = espia.mock.calls[0] ?? [];
    expect(String(url)).toBe(`${REALM}/.well-known/openid-configuration`);
    // `no-cors` porque la respuesta no se lee: la pregunta es si el navegador LLEGA, que es lo
    // mismo que decide si `assign` aterriza. Leyendola exigiria CORS del emisor, y un
    // intermediario que no lo publique convertiria un emisor vivo en una pantalla de error.
    expect(opciones?.mode).toBe('no-cors');
    expect(opciones?.cache).toBe('no-store');
  });

  it('y la sonda NO es el punto de autorizacion: no se abre una sesion para tirarla', async () => {
    ubicacion();
    const espia = elEmisorContesta();

    await identidad.entrar();

    expect(String(espia.mock.calls[0]?.[0])).not.toContain('/protocol/openid-connect/auth');
  });

  it('y NO manda credenciales: ni cookies del emisor ni el token, aunque lo haya', async () => {
    ubicacion();
    const espia = elEmisorContesta();
    // Con un token puesto, que es cuando mandarlo por descuido costaria algo.
    identidad.fijarToken('un-token', 'una-identidad');

    await identidad.entrar();

    const [, opciones] = espia.mock.calls[0] ?? [];
    // Sin esto `fetch` pone `same-origin`, y en el cluster el emisor comparte origen con la
    // interfaz (`https://<dominio>/keycloak/…`): la sonda llevaria las cookies de la sesion del
    // emisor. Medido en Chromium, no supuesto — ver `laPuertaContesta()`.
    expect(opciones?.credentials).toBe('omit');
    expect(opciones?.headers).toBeUndefined();
  });

  it('y pregunta al emisor DE ESTA instancia: la URL sale del realm, no de un literal', async () => {
    const asignar = ubicacion();
    const otra = conOtroEmisor();
    const espia = elEmisorNoContesta();

    const falla: FallaDeLaPuerta | null = await otra.entrar();

    expect(asignar).not.toHaveBeenCalled();
    expect(String(espia.mock.calls[0]?.[0])).toBe(
      `${OTRO_REALM}/.well-known/openid-configuration`,
    );
    expect(falla).toEqual({
      emisor: OTRO_REALM,
      url: `${OTRO_REALM}/.well-known/openid-configuration`,
      motivo: 'Failed to fetch',
    });
  });
});

/**
 * **La cuenta la lleva el emisor, y a ella se llega derivando** (#42, de `rentas#115`).
 *
 * Lo que se mide aqui es lo unico que se puede medir sin la plataforma levantada: que las dos URL
 * **salgan del realm configurado** y no de una cadena escrita a mano, y que pulsar haga algo
 * siempre. Que un Keycloak vivo conteste 200 en esas dos rutas NO se comprobo; lo que sostiene la
 * ruta es el codigo de `keycloak:26.0`, citado archivo y linea en `identidad.ts`. Y que el menu de
 * un sistema llegue a llamar a `abrirLaCuenta()` es de ese sistema: en `rentas` lo mide
 * `e2e/la-cuenta-la-lleva-el-emisor.spec.ts`, en un navegador.
 */
describe('«Mi perfil» y «Cambiar la contrasena» llevan a la consola del emisor', () => {
  it('las dos URL cuelgan del REALM configurado', () => {
    // El mismo prefijo del que salen `auth`, `token` y `logout`. Y eso es lo que las hace
    // honestas: si ese origen no fuera alcanzable, nadie habria entrado al sistema.
    expect(identidad.urlDeLaCuenta('perfil')).toBe(`${REALM}/account/`);
    expect(identidad.urlDeLaCuenta('contrasena')).toBe(
      `${REALM}/account/account-security/signing-in`,
    );
  });

  it('y SIGUEN al realm de la configuracion: no estan escritas a mano', () => {
    // Esta es la mitad que la comprobacion de arriba no puede hacer: un literal copiado del realm
    // de las pruebas la pasa entera. Aqui se construye otra identidad con otro emisor —lo que
    // hace cada ambiente— y las dos URL tienen que moverse con el. Si no, la libreria serviria a
    // un ambiente, que es justo lo que `rentas#44` saco de su imagen.
    const otra = conOtroEmisor();

    expect(otra.urlDeLaCuenta('perfil')).toBe(`${OTRO_REALM}/account/`);
    expect(otra.urlDeLaCuenta('contrasena')).toBe(
      `${OTRO_REALM}/account/account-security/signing-in`,
    );
    // Y la de la primera no se movio: el realm vive en la instancia.
    expect(identidad.urlDeLaCuenta('perfil')).toBe(`${REALM}/account/`);
  });

  it('«Mi perfil» lleva a la ruta INDICE, con su barra: es la que el servidor da como base', () => {
    // Sin la barra final, el camino que el navegador lleva no es el `baseUrl` que Keycloak le
    // pasa a su consola (`AccountConsole.java:119`), y el enrutador compara contra ese.
    expect(identidad.urlDeLaCuenta('perfil').endsWith('/account/')).toBe(true);
  });

  it('abre en OTRA pestana: el token vive en memoria y se muere con el documento', () => {
    const asignar = ubicacion();
    const otra = { opener: {} } as unknown as Window;
    const abrir = vi.fn(() => otra);
    vi.stubGlobal('open', abrir);

    identidad.abrirLaCuenta('contrasena');

    expect(abrir).toHaveBeenCalledWith(identidad.urlDeLaCuenta('contrasena'), '_blank');
    // Y esta pestana no se mueve: la sesion de trabajo sigue donde estaba.
    expect(asignar).not.toHaveBeenCalled();
    // Sin `noopener` en las opciones —eso haria devolver `null` siempre— pero soltando el opener.
    expect(otra.opener).toBeNull();
  });

  it('y si el navegador NIEGA la pestana, va en esta en vez de no hacer nada', () => {
    // Un bloqueador de emergentes devuelve `null`, y sin mirarlo el boton volveria a ser un
    // `al: () => {}` — esta vez sin verse en el codigo.
    const asignar = ubicacion();
    vi.stubGlobal('open', vi.fn(() => null));

    identidad.abrirLaCuenta('perfil');

    expect(asignar).toHaveBeenCalledWith(identidad.urlDeLaCuenta('perfil'));
  });
});

/**
 * **Lo que la puerta dice cuando no se pudo entrar es DATO** (#118, AC4).
 *
 * El arnes de #19 —el saco marcado clave a clave— aplicado a la puerta, como #52 lo aplico a la
 * escalera: `crearIdentidad` no dibuja, asi que no hay arbol que montar, y lo que se mira es lo que
 * devuelve para ensenar. Con el saco marcado, **lo que no salga marcado esta escrito dentro de
 * `identidad.ts`** y no se puede traducir nunca.
 *
 * Se recorren **todos** los caminos por los que la puerta explica un fallo —los siete codigos de
 * OAuth, el estado que no cuadra, el canje sin red, rechazado y sin token, y las dos sondas que no
 * traen palabras del navegador— y el ultimo caso cierra el circulo: **cada clave del saco sale en
 * alguno**. Una frase nueva de la puerta que no tenga su camino aqui sale roja con su nombre.
 */
describe('#118 AC4 — lo que la puerta dice al no poder entrar sale del saco', () => {
  const MARCADOS = marcarElSaco(TEXTOS_DE_LA_PUERTA);

  /** La vuelta de Keycloak con `?error=` y sin `error_description`: el detalle es el respaldo. */
  function vuelveConError(error: string) {
    ubicacion(`http://localhost:5173/?error=${error}`);
  }

  /** La vuelta buena de Keycloak, con el canje contestado por lo que se le pase. */
  function vuelveYElCanje(contesta: () => Promise<Response>) {
    sessionStorage.setItem(VERIFICADOR, 'el-verificador');
    sessionStorage.setItem(ESTADO, 'el-estado');
    ubicacion('http://localhost:5173/?code=un-codigo&state=el-estado');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(contesta));
  }

  /** Lo que la puerta ensena en cada camino: el motivo y, cuando lo hay, el detalle. */
  async function loQueEnsena(puerta: Identidad): Promise<readonly string[]> {
    const vuelta = await puerta.canjearSiVuelve();
    if (vuelta.estado !== 'fallo') throw new Error(`se esperaba un fallo, y fue «${vuelta.estado}»`);
    return [vuelta.motivo, vuelta.detalle];
  }

  async function loQueEnsenaLaSonda(puerta: Identidad): Promise<readonly string[]> {
    const falla = await puerta.entrar();
    if (falla === null) throw new Error('se esperaba que la sonda fallara, y navego');
    return [falla.motivo];
  }

  const LOS_CAMINOS: readonly {
    readonly nombre: string;
    readonly prepara: () => void;
    readonly ensena: (puerta: Identidad) => Promise<readonly string[]>;
  }[] = [
    ...[
      'access_denied',
      'invalid_scope',
      'unauthorized_client',
      'invalid_client',
      'temporarily_unavailable',
      'server_error',
      'un_codigo_que_nadie_nombra',
    ].map((error) => ({
      nombre: `la vuelta con ?error=${error}`,
      prepara: () => {
        vuelveConError(error);
      },
      ensena: loQueEnsena,
    })),
    {
      nombre: 'la vuelta sin el estado de la ida',
      prepara: () => {
        sessionStorage.setItem(VERIFICADOR, 'el-verificador');
        sessionStorage.setItem(ESTADO, 'el-estado');
        ubicacion('http://localhost:5173/?code=un-codigo&state=OTRO');
      },
      ensena: loQueEnsena,
    },
    {
      nombre: 'el canje que no llega',
      prepara: () => {
        vuelveYElCanje(() => Promise.reject(new TypeError('sin red')));
      },
      ensena: loQueEnsena,
    },
    {
      nombre: 'el canje rechazado',
      prepara: () => {
        vuelveYElCanje(() => Promise.resolve(new Response(null, { status: 400 })));
      },
      ensena: loQueEnsena,
    },
    {
      nombre: 'el canje sin access_token',
      prepara: () => {
        vuelveYElCanje(() => Promise.resolve(Response.json({ id_token: 'x' })));
      },
      ensena: loQueEnsena,
    },
    {
      nombre: 'la sonda que revienta sin un Error',
      prepara: () => {
        ubicacion();
        elEmisorNoContesta('no es un Error');
      },
      ensena: loQueEnsenaLaSonda,
    },
    {
      nombre: 'la sonda que agota la espera',
      prepara: () => {
        ubicacion();
        const agotada = new Error('the operation was aborted');
        agotada.name = 'TimeoutError';
        elEmisorNoContesta(agotada);
      },
      ensena: loQueEnsenaLaSonda,
    },
  ];

  it.each(LOS_CAMINOS)('$nombre dice lo suyo con el saco', async ({ prepara, ensena }) => {
    prepara();

    for (const frase of await ensena(crearIdentidad(CONFIGURACION, MARCADOS))) {
      expect(frase.startsWith(ABRE), `«${frase}» no salio del saco`).toBe(true);
    }
  });

  it('EL CIRCULO: cada frase del saco sale por algun camino, y ninguna queda sin probar', async () => {
    const vistas = new Set<string>();
    for (const { prepara, ensena } of LOS_CAMINOS) {
      prepara();
      for (const frase of await ensena(crearIdentidad(CONFIGURACION, MARCADOS))) {
        vistas.add(frase);
      }
      vi.unstubAllGlobals();
      sessionStorage.clear();
    }

    const esperadas = Object.keys(TEXTOS_DE_LA_PUERTA).map((clave) => `${ABRE}${clave}${CIERRA}`);
    expect([...vistas].sort()).toEqual([...esperadas].sort());
  });

  it('EL CENTINELA: el saco marcado NO se parece al de por omision', () => {
    // Sin esto, un `marcarElSaco` que devolviera el saco tal cual dejaria todo lo de arriba
    // pasando en verde sobre el castellano.
    expect(MARCADOS.laVueltaNoCuadraConLaIda).not.toBe(TEXTOS_DE_LA_PUERTA.laVueltaNoCuadraConLaIda);
    expect(MARCADOS.laVueltaNoCuadraConLaIda.startsWith(ABRE)).toBe(true);
  });

  it('pero lo que dijeron el emisor y el navegador NO sale del saco: es el dato', async () => {
    // El saco pone el respaldo; lo que Keycloak mando en `error_description` es lo que dijo.
    ubicacion('http://localhost:5173/?error=access_denied&error_description=lo+cancelo');
    await expect(crearIdentidad(CONFIGURACION, MARCADOS).canjearSiVuelve()).resolves.toMatchObject({
      motivo: `${ABRE}noSeCompletoLaEntrada${CIERRA}`,
      detalle: 'lo cancelo',
    });

    // Y lo que dijo el navegador es lo que se busca y lo que sale en su consola.
    ubicacion();
    elEmisorNoContesta();
    const falla = await crearIdentidad(CONFIGURACION, MARCADOS).entrar();
    expect(falla?.motivo).toBe('Failed to fetch');
  });

  it('el `Partial` se funde encima: lo que no se pasa sigue siendo lo de siempre', async () => {
    sessionStorage.setItem(VERIFICADOR, 'el-verificador');
    sessionStorage.setItem(ESTADO, 'el-estado');
    ubicacion('http://localhost:5173/?code=un-codigo&state=OTRO');

    const vuelta = await crearIdentidad(CONFIGURACION, {
      laVueltaNoCuadraConLaIda: 'The way back does not match the way in',
    }).canjearSiVuelve();

    expect(vuelta).toEqual({
      estado: 'fallo',
      motivo: 'The way back does not match the way in',
      // Y el detalle, que no se paso, sigue en castellano.
      detalle: TEXTOS_DE_LA_PUERTA.elCodigoLlegoSinSuEstado,
    });
  });
});
