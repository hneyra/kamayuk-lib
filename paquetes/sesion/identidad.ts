/**
 * La puerta de identidad: codigo de autorizacion con PKCE S256 contra Keycloak.
 *
 * <h2>El token vive en memoria, y esa es la decision de este archivo</h2>
 *
 * El monolito `sgtm` hacia este mismo flujo contra este mismo realm y guardaba lo que canjeaba
 * en `localStorage.setItem('sgtm.token', …)`. Aqui eso esta **prohibido** —la prohibicion
 * `token-en-almacenamiento` de `@kamayuk/verificaciones`, con su muestra que la viola— y el
 * motivo no es purismo: en una PC de ventanilla que tres turnos comparten, un token persistido
 * sobrevive al cierre del navegador, y el del turno de la manana sigue sirviendo por la tarde.
 * Asi que el token vive en el cierre de esta instancia: se muere con la pestana, que es
 * exactamente lo que se quiere.
 *
 * Lo que si sobrevive al rebote es el **verificador PKCE**, y tiene que sobrevivir: el navegador
 * se va a Keycloak y vuelve, y sin el no hay canje. No es una credencial —es el secreto de un
 * solo uso que demuestra que quien canja es quien pidio—, asi que va en `sessionStorage`. Su
 * clave no lleva ninguna de las palabras que la prohibicion vigila, y **no por esquivarla**:
 * llamarlo `…token.verificador` seria pedirle a quien lea el codigo dentro de seis meses que
 * distinga dos cosas que se llaman igual.
 *
 * <h2>Lo que cuesta no guardar el token: nada, porque hay SSO</h2>
 *
 * Un token dura minutos. En vez de guardar un `refresh_token` —que es una credencial de vida
 * larga, y el problema de arriba otra vez— se vuelve a pedir un codigo: con la sesion de
 * Keycloak viva el navegador va y vuelve sin ensenar nada, y si no lo esta, se ve el formulario,
 * que es lo que hay que ver. La renovacion silenciosa sale gratis de tener SSO.
 *
 * <h2>Por que es una FABRICA y no un modulo con estado</h2>
 *
 * Porque los cuatro sistemas del producto pueden servirse del mismo origen —`/rentas/`,
 * `/caja/`, `/catastro/`, `/normativa/` detras del mismo Traefik (ADR-0030 §2)— y entonces
 * **comparten `sessionStorage`**. Con las claves fijas que este archivo tenia mientras vivio en
 * `rentas`, abrir dos interfaces del producto en la misma pestana hacia que la segunda pisara el
 * verificador de la primera, y el canje de la primera fallaba con «La vuelta no cuadra con la
 * ida» sin que nada dijera por que. El `prefijoDeClaves` es lo que lo impide, y por eso es
 * obligatorio y no tiene valor por omision.
 *
 * <h2>Lo que `rentas` aprendio en su copia despues de la mudanza, y sube aqui (#42)</h2>
 *
 * Este archivo salio de `rentas/frontend/src/api/identidad.ts` en `efada07` (2026-09-12). Al dia
 * siguiente `rentas` le anadio dos cosas **en su copia** y la libreria no se entero:
 *
 *   · **la sonda del emisor** (`hneyra/rentas#112`): `entrar()` pregunta si el emisor esta ANTES
 *     de mandarle el navegador, y devuelve `FallaDeLaPuerta` cuando no contesta, en vez de dejar
 *     la pestana en blanco;
 *   · **la consola de la cuenta** (`hneyra/rentas#115`): `urlDeLaCuenta()` y `abrirLaCuenta()`,
 *     derivadas del realm, para «Mi perfil» y «Cambiar la contrasena».
 *
 * Suben las dos con su docblock, que es la medicion que se hizo alli. Lo unico que cambia es de
 * donde sale el emisor: alli de `configuracion('oidcRealm')`, aqui del `realm` que entra por
 * argumento. Y la sonda sube con una linea mas que la de `rentas` —`credentials: 'omit'`—, medida
 * y explicada en `laPuertaContesta()`.
 */

/**
 * Lo que un sistema tiene que decir para tener puerta. Nada de esto se adivina.
 *
 * <h2>Se lee UNA vez, al construir, y eso le toca vigilarlo a quien construye</h2>
 *
 * La copia de `rentas` resuelve el emisor **en cada llamada** —`realm()` es una funcion que lee
 * `configuracion('oidcRealm')`— por un motivo que su docblock mide (#44 de `rentas`): una
 * constante evaluada al importar se fija en el orden de carga de los modulos, y si se importara
 * antes de que `configuracion.js` corriera congelaria el valor por omision.
 *
 * Aqui no se lee ningun global —el nombre del global lleva el sistema dentro, y
 * `sin-suponer-un-sistema` lo prohibe—, asi que la configuracion entra ya resuelta y la instancia
 * la guarda. El orden de carga pasa a ser del sistema que llama a `crearIdentidad`: tiene que
 * hacerlo **despues** de que sus senas del ambiente esten puestas. Con el `index.html` de `rentas`
 * —`configuracion.js` como guion clasico antes del modulo— eso ya es cierto al evaluar cualquier
 * modulo; construirla dentro del arranque lo hace cierto sin depender de esa linea.
 */
export interface ConfiguracionDeIdentidad {
  /**
   * El realm completo: `https://…/realms/kamayuk`. Se configura por ambiente.
   *
   * De el salen **todas** las URL del emisor que este paquete usa: autorizacion, canje, fin,
   * descubrimiento (la sonda) y consola de la cuenta. No hay una segunda sena que mantener.
   */
  readonly realm: string;
  /** El cliente publico de la SPA. Sin secreto: un secreto en un bundle no es un secreto. */
  readonly cliente: string;
  /** El alcance que se pide, p. ej. `'openid profile'`. */
  readonly alcance: string;
  /**
   * La URI de retorno: **siempre la raiz DE LA APLICACION**, aunque se entrara por una ruta
   * profunda. Es una sola URI que declarar en el cliente, y el destino viaja aparte en
   * `sessionStorage`. Declarar una por pantalla seria una lista que ampliar cada vez que nace
   * una seccion, y el sintoma de olvidarse es «Invalid parameter: redirect_uri».
   *
   * **La raiz de la aplicacion no es la del sitio, y confundirlas costo el acceso a `prod`.**
   * Medido el 2026-09-12 en `rentas`: valia `origin + '/'`, que es correcto para una aplicacion
   * servida en la raiz, pero esa se sirve bajo `/rentas/` porque ADR-0030 §2 pone el sistema
   * delante de la ruta. Quien se autenticaba volvia a `https://<dominio>/` y recibia un **404**,
   * con el `code` y el `iss` correctos — o sea que la autenticacion funcionaba y el retorno no.
   *
   * Con Vite, lo que hay que pasar es `window.location.origin + import.meta.env.BASE_URL`: de
   * ahi ya salen los activos, asi que no hay un segundo sitio que mantener.
   */
  readonly retorno: string;
  /**
   * A donde volver cuando la vuelta no dice a donde: `'#panel'` en `rentas`, `'#nor-panel'` en
   * `normativa`. Cada sistema arranca en la suya, asi que no hay omision razonable.
   */
  readonly destinoPorOmision: string;
  /**
   * El prefijo de las cinco claves del rebote: `'kamayuk.rentas'`, `'kamayuk.caja'`…
   *
   * **Obligatorio, y sin valor por omision a proposito.** Ver la cabecera: dos sistemas del
   * mismo origen con el mismo prefijo se pisan el verificador.
   */
  readonly prefijoDeClaves: string;
  /**
   * Cuantas idas seguidas a la puerta se admiten antes de parar y explicarse. Por omision, 3.
   *
   * Tres idas sin canjear son un bucle, no mala suerte. Sin tope, el arranque rebota sin fin:
   * pagina en blanco parpadeando, ninguna traza, y el emisor recibiendo la rafaga.
   */
  readonly topeDeIdas?: number;
}

/** Lo que paso al volver de Keycloak. */
export type Vuelta =
  | { readonly estado: 'sin-vuelta' }
  | { readonly estado: 'canjeado' }
  | { readonly estado: 'fallo'; readonly motivo: string; readonly detalle: string };

/**
 * Por que no se pudo ni mandar a la puerta: quien no contesto, a que URL, y con que palabras.
 *
 * Es lo que se ensena en pantalla, asi que lleva las tres cosas que hacen falta para arreglarlo
 * y ninguna mas. El `motivo` va **en palabras del navegador** —«Failed to fetch»,
 * «TimeoutError»— porque son las que se pueden buscar y las que aparecen en su consola.
 */
export interface FallaDeLaPuerta {
  /** El emisor, tal como entro en `ConfiguracionDeIdentidad.realm`. Lo primero que hay que mirar. */
  readonly emisor: string;
  /** La URL exacta que se pidio para saber si estaba. */
  readonly url: string;
  /** Lo que dijo el navegador, o que se agoto la espera. */
  readonly motivo: string;
}

/**
 * **Las dos paginas de la cuenta, que NO son de ningun sistema del producto** (`hneyra/rentas#115`).
 *
 * <h2>Por que salen de la puerta y no de una pantalla</h2>
 *
 * Porque ni el perfil ni la contrasena son de un sistema. La autorizacion es de `identidad` desde
 * ADR-0039 —ningun sistema da de alta un usuario, afilia a nadie ni fija un permiso— y la
 * contrasena **nunca llega a ninguno**: la guarda Keycloak, que es quien la pide en su formulario.
 * Dibujar un formulario de perfil o de clave seria prometer una escritura que ningun backend del
 * producto puede atender.
 *
 * <h2>La URL se DERIVA del emisor, no se escribe</h2>
 *
 * Sale del `realm` de la configuracion, que es exactamente de donde salen la autorizacion, el
 * canje y el fin. Y eso trae la garantia que hace honesto mandar ahi: **si ese origen no fuera
 * alcanzable desde el navegador, nadie habria entrado al sistema**, porque el formulario de
 * identificacion se sirve del mismo sitio. No es una URL mas que pueda estar mal puesta: es la
 * misma que ya funciono.
 *
 * <h2>Las dos rutas, medidas contra el Keycloak que la plataforma fija</h2>
 *
 * Medidas en `hneyra/rentas#115`, no aqui: `despliegue/plataforma.compose.yaml` fija
 * `quay.io/keycloak/keycloak:26.0`, y contra el codigo de esa version:
 *
 *   · `RealmsResource.java:191` — `@Path("{realm}/account")`: la consola de cuenta cuelga del
 *     realm, asi que basta con anadir un segmento al emisor que ya se lee;
 *   · `AccountConsole.java:119` — el `baseUrl` que el servidor le pasa a la consola es esa misma
 *     ruta **con barra final**, y `AccountConsole.getMainPage()` esta en `@Path("{any:.*}")`: la
 *     consola se sirve para cualquier sub-ruta, o sea que un enlace profundo entra;
 *   · `js/apps/account-ui/src/routes.tsx` — `PersonalInfoRoute` es la ruta **indice** (de ahi la
 *     barra final para «Mi perfil») y `SigningInRoute` es `account-security/signing-in`, que es
 *     donde se cambia la clave. Y `main.tsx` monta un `createBrowserRouter`: las rutas son de
 *     camino y no de `#`, asi que el enlace profundo es el que se escribe abajo.
 *   · `RealmManager.java:558` — `if (!hasAccountManagementClient(rep)) setupAccountManagement(realm)`
 *     al importar: `realm-kamayuk.json` declara dos clientes —`kamayuk-backoffice` y
 *     `kamayuk-verificacion`— y **ninguno** es `account`, asi que Keycloak los crea al sembrar el
 *     realm. La consola no se queda sin su cliente por no estar en el volcado.
 *
 * **Lo que NO se midio, y se dice**: que una instalacion levantada las sirva. `rentas#115` no tenia
 * motor de contenedores y este puesto tampoco, asi que ninguna de las dos URL se pidio de verdad.
 * Lo comprobado es el codigo de la version que el compose fija, no un 200.
 */
export type PaginaDeLaCuenta = 'perfil' | 'contrasena';

export interface Identidad {
  /** El token de esta pestana, o `null` si todavia no hay. */
  token(): string | null;
  /**
   * Fija el token a mano.
   *
   * Existe para las pruebas y para pegar un token de verificacion en desarrollo sin montar el
   * rebote entero. No lo persiste: eso es justo lo que este archivo no hace.
   */
  fijarToken(nuevo: string | null, identidad?: string | null): void;
  /** Sin `crypto.subtle` no hay S256, y el navegador no lo expone fuera de un origen seguro. */
  hayPuerta(): boolean;
  /** Si se puede volver a la puerta, o hay que pararse y explicarse. */
  puedeIrALaPuerta(): boolean;
  /** Se acaba de cerrar sesion: el arranque NO debe volver a entrar solo. */
  vieneDeSalir(): boolean;
  /** Vuelve a permitir la ida. Es el «Volver a identificarse» de la pantalla parada. */
  olvidarLaParada(): void;
  /**
   * Manda al formulario de Keycloak, guardando a donde habia que volver.
   *
   * Devuelve `null` cuando el navegador se va —que es el caso de siempre— y **la falla cuando no
   * se pudo ni llegar al emisor**, para que quien llama monte y la explique en vez de dejar la
   * pagina en blanco. `null` se lee al reves de lo que parece: es que todo fue bien y la pagina se
   * va, asi que quien llama NO debe montar nada detras.
   */
  entrar(): Promise<FallaDeLaPuerta | null>;
  /** Si venimos de Keycloak, canjea el codigo por un token. */
  canjearSiVuelve(): Promise<Vuelta>;
  /** Cierra la sesion aqui y en Keycloak. */
  salir(): void;
  /** A donde lleva cada opcion de la cuenta. Derivada del `realm`; ver `PaginaDeLaCuenta`. */
  urlDeLaCuenta(pagina: PaginaDeLaCuenta): string;
  /** Abre la pagina de la cuenta **en otra pestana**, y si el navegador la niega, va en esta. */
  abrirLaCuenta(pagina: PaginaDeLaCuenta): void;
}

/**
 * Lo que se espera al emisor antes de darlo por caido.
 *
 * Ocho segundos y no tres: una municipalidad con la plataforma al otro lado de un enlace lento
 * tarda, y dar por caido lo que solo iba despacio manda a la pantalla de error a quien si podia
 * entrar. Y no treinta: mas alla de unos segundos, quien mira ya cree que la pagina esta rota.
 *
 * Es la cifra de `rentas#112` y no es parametro: ningun sistema ha pedido otra. Si alguno la
 * pide, entra como `topeDeIdas`, opcional y con esta de omision.
 */
const ESPERA_DE_LA_SONDA = 8_000;

/** Lo que se le anade al emisor para llegar a cada pagina. Ver `PaginaDeLaCuenta`. */
const RUTA_DE_LA_CUENTA: Readonly<Record<PaginaDeLaCuenta, string>> = {
  // Con barra final: es la ruta indice de la consola, y la misma que el servidor le pasa como
  // `baseUrl`. Sin ella el camino que el enrutador compara no es el que le dijeron que era.
  perfil: 'account/',
  contrasena: 'account/account-security/signing-in',
};

/** Lo que paso, dicho como el navegador lo dice. Ver `FallaDeLaPuerta.motivo`. */
function enPalabrasDelNavegador(falla: unknown): string {
  if (!(falla instanceof Error)) return 'la peticion no llego a completarse';
  if (falla.name === 'TimeoutError') {
    return `no contesto en ${String(ESPERA_DE_LA_SONDA / 1000)} s`;
  }
  return falla.message === '' ? falla.name : falla.message;
}

function motivoDelEmisor(error: string): string {
  switch (error) {
    case 'access_denied':
      return 'No se completo la entrada';
    case 'invalid_scope':
      return 'El alcance que se pide no existe en el emisor';
    case 'unauthorized_client':
    case 'invalid_client':
      return 'El emisor no reconoce a este cliente';
    case 'temporarily_unavailable':
    case 'server_error':
      return 'El emisor tuvo un problema';
    default:
      return 'El emisor no dejo entrar';
  }
}

function aleatorio(largo: number): string {
  const bytes = new Uint8Array(largo);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** El reto S256: `BASE64URL(SHA256(ASCII(verificador)))`, tal cual lo pide RFC 7636 §4.2. */
async function reto(verificador: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
  return base64url(new Uint8Array(resumen));
}

function base64url(bytes: Uint8Array): string {
  let texto = '';
  bytes.forEach((b) => (texto += String.fromCharCode(b)));
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** La puerta de identidad de UN sistema. Cada interfaz construye la suya una vez. */
export function crearIdentidad(configuracion: ConfiguracionDeIdentidad): Identidad {
  const { realm, cliente, alcance, retorno, destinoPorOmision, prefijoDeClaves } = configuracion;
  const topeDeIdas = configuracion.topeDeIdas ?? 3;

  const autorizacion = `${realm}/protocol/openid-connect/auth`;
  const canje = `${realm}/protocol/openid-connect/token`;
  const fin = `${realm}/protocol/openid-connect/logout`;
  const descubrimiento = `${realm}/.well-known/openid-configuration`;

  /**
   * Las cinco claves del rebote.
   *
   * Ninguna lleva `token`, `jwt`, `bearer`, `credencial`, `contrasena`, `acceso` ni `sesion`: lo
   * que se guarda aqui no es ninguna de esas cosas.
   */
  const VERIFICADOR = `${prefijoDeClaves}.pkce.verificador`;
  const ESTADO = `${prefijoDeClaves}.pkce.estado`;
  const DESTINO = `${prefijoDeClaves}.pkce.destino`;
  const IDAS = `${prefijoDeClaves}.pkce.idas`;
  const SALIDA = `${prefijoDeClaves}.pkce.salida`;

  /** El token. En el cierre y en ningun otro sitio: al cerrar la pestana desaparece. */
  let enMemoria: string | null = null;
  /**
   * El `id_token`, tambien en memoria. Solo se usa para `id_token_hint` al salir.
   *
   * Sin el, cerrar sesion deja viva la sesion del emisor y el siguiente arranque entra solo con
   * la misma cuenta sin que nadie haya tecleado nada.
   */
  let identidadEnMemoria: string | null = null;

  const idas = (): number => Number(sessionStorage.getItem(IDAS) ?? 0);

  const hayPuerta = (): boolean => typeof crypto !== 'undefined' && crypto.subtle !== undefined;

  const fijarToken = (nuevo: string | null, identidad: string | null = null): void => {
    enMemoria = nuevo;
    identidadEnMemoria = identidad;
  };

  /**
   * **Si el emisor esta, ANTES de mandarle el navegador entero** (`hneyra/rentas#112`).
   *
   * <h2>El defecto que esto cierra</h2>
   *
   * `entrar()` termina en `location.assign(...)`, y quien la llama no monta nada despues **a
   * proposito**: la pagina se va. Pero cuando la navegacion se RECHAZA —el emisor apagado, un DNS
   * que no resuelve, un cortafuegos que traga— no hay documento nuevo *ni* aplicacion. Medido en
   * `rentas` con `yarn dev` y nada mas levantado: `body.innerText` vacio, `body.innerHTML` vacio y
   * la consola con dos lineas de Vite, ni un error. Nada que leer en ninguna parte.
   *
   * <h2>Por que una sonda y no un tiempo de espera despues de navegar</h2>
   *
   * Porque despues de `assign` ya es tarde: Chromium **cambia de documento** —se midio el marco
   * principal navegando a `chrome-error://chromewebdata/`—, asi que un `setTimeout` que montara la
   * aplicacion correria sobre un documento que el navegador acaba de tirar. Y en el camino bueno
   * haria lo contrario de lo que se quiere: pintar la pantalla justo antes de que la navegacion
   * buena se la lleve, o sea un parpadeo.
   *
   * Preguntando ANTES, el camino bueno no cambia en nada: `assign` sigue siendo lo ultimo que pasa.
   *
   * <h2>Se pregunta al documento de descubrimiento, y NO se lee</h2>
   *
   * `/.well-known/openid-configuration` es publico, barato y no abre ninguna sesion; pedir el
   * `authorization_endpoint` como sonda seria abrir una peticion de autorizacion de verdad —con su
   * rastro en el emisor— para tirarla.
   *
   * Y va con `mode: 'no-cors'` **a proposito**: la respuesta no se lee. La pregunta no es «que
   * contesta el emisor» sino «llega el navegador hasta el», que es exactamente lo que decide si
   * `assign` va a aterrizar. Leyendo el cuerpo haria falta que el emisor publicara CORS, y un
   * intermediario que no lo publique convertiria un emisor VIVO en esta pantalla de error.
   *
   * <h2>Y sin credenciales, dicho y no heredado: la unica linea que la de `rentas` no tiene</h2>
   *
   * La de `rentas` no dice `credentials`, y `fetch` pone entonces `'same-origin'`: **manda las
   * cookies cuando el emisor comparte origen con la interfaz**. Y en el cluster lo comparte: el
   * emisor es `https://<dominio>/keycloak/realms/kamayuk` y las interfaces se sirven en
   * `https://<dominio>/<sistema>/` (ADR-0030 §2). No es una suposicion: el registro de
   * `infrastructure` anota que `vmd205066` sirve `/rentas/` y `/catastro/` con 200 y que su
   * descubrimiento dice `issuer: https://vmd205066.contaboserver.net/keycloak/realms/kamayuk`. Medido
   * en Chromium 151 contra un servidor que pone una cookie en la pagina y anota lo que le llega en
   * el descubrimiento, del mismo origen: la sonda de `rentas` tal cual llego con
   * `Cookie: KEYCLOAK_SESSION=…`; la misma con `credentials: 'omit'`, sin cabecera `Cookie`. Las dos
   * sin `Authorization`, porque ninguna manda cabeceras.
   *
   * La sonda no necesita nada de eso para saber si el emisor contesta, y mandarle a un documento
   * publico la sesion de quien mira es regalar lo que no se pidio. Por eso aqui se dice.
   */
  async function laPuertaContesta(): Promise<FallaDeLaPuerta | null> {
    try {
      await fetch(descubrimiento, {
        mode: 'no-cors',
        // Sin cache: una respuesta guardada diria que el emisor esta cuando ya no.
        cache: 'no-store',
        credentials: 'omit',
        signal: AbortSignal.timeout(ESPERA_DE_LA_SONDA),
      });
      return null;
    } catch (falla) {
      return { emisor: realm, url: descubrimiento, motivo: enPalabrasDelNavegador(falla) };
    }
  }

  const urlDeLaCuenta = (pagina: PaginaDeLaCuenta): string =>
    `${realm}/${RUTA_DE_LA_CUENTA[pagina]}`;

  return {
    token: () => enMemoria,
    fijarToken,
    hayPuerta,
    puedeIrALaPuerta: () => idas() < topeDeIdas,
    vieneDeSalir: () => sessionStorage.getItem(SALIDA) === '1',
    olvidarLaParada: () => {
      sessionStorage.removeItem(IDAS);
      sessionStorage.removeItem(SALIDA);
    },

    /**
     * La sonda va antes de tocar `sessionStorage`: una ida que no llego a ocurrir no es una ida, y
     * contarla en el tope gastaria los tres intentos contra un emisor que nunca los recibio.
     */
    async entrar(): Promise<FallaDeLaPuerta | null> {
      const falla = await laPuertaContesta();
      if (falla !== null) return falla;

      const verificador = aleatorio(64);
      const estado = aleatorio(24);
      sessionStorage.setItem(VERIFICADOR, verificador);
      sessionStorage.setItem(ESTADO, estado);
      sessionStorage.setItem(DESTINO, window.location.hash || destinoPorOmision);
      sessionStorage.setItem(IDAS, String(idas() + 1));
      sessionStorage.removeItem(SALIDA);

      const parametros = new URLSearchParams({
        response_type: 'code',
        client_id: cliente,
        redirect_uri: retorno,
        scope: alcance,
        state: estado,
        code_challenge: await reto(verificador),
        code_challenge_method: 'S256',
      });
      window.location.assign(`${autorizacion}?${parametros.toString()}`);
      return null;
    },

    /**
     * Devuelve **por que** no se pudo, y no un `false` mudo. Quien la llama tiene que decidir
     * entre volver a la puerta y pararse a explicarse, y con un `false` para todo un `?error=`
     * del emisor se trataria igual que «esta URL no traia codigo»: el arranque volveria a la
     * puerta, que devolveria el mismo error, sin fin.
     */
    async canjearSiVuelve(): Promise<Vuelta> {
      const url = new URL(window.location.href);
      const codigo = url.searchParams.get('code');
      const fallo = url.searchParams.get('error');

      if (codigo === null && fallo === null) return { estado: 'sin-vuelta' };

      const verificador = sessionStorage.getItem(VERIFICADOR);
      const esperado = sessionStorage.getItem(ESTADO);
      const destino = sessionStorage.getItem(DESTINO) ?? destinoPorOmision;
      sessionStorage.removeItem(VERIFICADOR);
      sessionStorage.removeItem(ESTADO);
      sessionStorage.removeItem(DESTINO);

      // La URL se limpia SIEMPRE, saliera bien o mal: un codigo ya usado no vale dos veces, y
      // dejarlo en la barra hace que recargar de un error que no tiene nada que ver con lo que
      // paso.
      const limpiar = () => {
        window.history.replaceState(null, '', url.pathname + destino);
      };

      if (fallo !== null) {
        limpiar();
        return {
          estado: 'fallo',
          motivo: motivoDelEmisor(fallo),
          detalle: url.searchParams.get('error_description') ?? `El emisor contesto «${fallo}».`,
        };
      }

      // El estado es lo unico que distingue nuestra vuelta de un codigo que alguien nos hizo
      // llegar. Sin comprobarlo, la puerta acepta cualquier codigo.
      if (
        codigo === null ||
        verificador === null ||
        esperado === null ||
        url.searchParams.get('state') !== esperado
      ) {
        limpiar();
        return {
          estado: 'fallo',
          motivo: 'La vuelta no cuadra con la ida',
          detalle:
            'El codigo llego sin el estado que se guardo al salir. Suele pasar al abrir un ' +
            'enlace de vuelta antiguo o en otra pestana; tambien es lo que se ve si alguien ' +
            'intenta colar un codigo ajeno.',
        };
      }

      let respuesta: Response;
      try {
        // Con tope. Sin el, un emisor que no contesta deja la aplicacion SIN DIBUJAR NADA para
        // siempre —ni un error ni un esqueleto—, porque el arranque espera aqui antes de montar.
        respuesta = await fetch(canje, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: cliente,
            code: codigo,
            redirect_uri: retorno,
            code_verifier: verificador,
          }).toString(),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        limpiar();
        return {
          estado: 'fallo',
          motivo: 'El emisor no contesto',
          detalle:
            'La peticion del canje no llego a completarse. El emisor puede estar apagado o no ' +
            'ser alcanzable desde este puesto.',
        };
      }

      limpiar();
      if (!respuesta.ok) {
        return {
          estado: 'fallo',
          motivo: 'El emisor rechazo el canje',
          detalle:
            `La peticion del canje volvio con ${String(respuesta.status)}. Suele ser la URI de ` +
            'retorno o el cliente.',
        };
      }

      const cuerpo = (await respuesta.json().catch(() => ({}))) as {
        access_token?: string;
        id_token?: string;
      };
      if (cuerpo.access_token === undefined) {
        return {
          estado: 'fallo',
          motivo: 'El emisor no devolvio ningun token',
          detalle: 'La respuesta del canje no trae «access_token».',
        };
      }

      fijarToken(cuerpo.access_token, cuerpo.id_token ?? null);
      // Salio bien: la cuenta de idas vuelve a cero, para que el tope proteja de una racha de
      // fallos y no de haber entrado muchas veces en el dia.
      sessionStorage.removeItem(IDAS);
      return { estado: 'canjeado' };
    },

    salir(): void {
      const identidad = identidadEnMemoria;
      fijarToken(null);
      sessionStorage.removeItem(IDAS);
      // La marca es lo que impide volver a entrar solo al instante: `post_logout_redirect_uri`
      // trae de vuelta sin token, y el arranque veia eso y llamaba a `entrar()` — con la sesion
      // del emisor viva, el usuario acababa DENTRO OTRA VEZ con la misma cuenta sin haber hecho
      // nada.
      sessionStorage.setItem(SALIDA, '1');

      if (!hayPuerta()) {
        window.location.reload();
        return;
      }
      const parametros = new URLSearchParams({ post_logout_redirect_uri: retorno });
      if (identidad !== null) parametros.set('id_token_hint', identidad);
      window.location.assign(`${fin}?${parametros.toString()}`);
    },

    urlDeLaCuenta,

    /**
     * <h2>Por que otra pestana</h2>
     *
     * Porque el token vive EN MEMORIA —es la decision de la cabecera de este archivo— y se muere
     * con el documento. Irse a Keycloak en esta misma pestana tiraria la sesion de trabajo: al
     * volver, el arranque tendria que rebotar otra vez por la puerta. Con una pestana nueva, quien
     * mira el perfil vuelve al sistema y sigue donde estaba.
     *
     * <h2>Por que se mira lo que devuelve, y por que NO lleva «noopener» en las opciones</h2>
     *
     * Porque el sintoma que `rentas#115` vino a quitar es **que no pase nada**. Un bloqueador de
     * ventanas emergentes puede negar la pestana, y entonces `window.open` devuelve `null`: sin
     * mirarlo, el boton volveria a ser un `al: () => {}`, esta vez sin que se vea en el codigo. Con
     * el `null` mirado, el peor caso es irse en esta pestana, que es feo y es visible.
     *
     * Y por eso mismo `noopener` **no** puede ir en la cadena de opciones: HTML manda devolver
     * `null` cuando se pide, asi que la comprobacion de arriba daria siempre positivo y la pestana
     * nueva no se usaria nunca. Se consigue lo mismo soltando el `opener` despues.
     */
    abrirLaCuenta(pagina: PaginaDeLaCuenta): void {
      const url = urlDeLaCuenta(pagina);
      const otra = window.open(url, '_blank');
      if (otra === null) {
        window.location.assign(url);
        return;
      }
      // La pestana nueva no necesita poder tocar esta. Ver arriba: aqui y no en las opciones.
      otra.opener = null;
    },
  };
}
