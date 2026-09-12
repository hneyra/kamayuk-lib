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
 */

/** Lo que un sistema tiene que decir para tener puerta. Nada de esto se adivina. */
export interface ConfiguracionDeIdentidad {
  /** El realm completo: `https://…/realms/kamayuk`. Se configura por ambiente. */
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
  /** Manda al formulario de Keycloak, guardando a donde habia que volver. */
  entrar(): Promise<void>;
  /** Si venimos de Keycloak, canjea el codigo por un token. */
  canjearSiVuelve(): Promise<Vuelta>;
  /** Cierra la sesion aqui y en Keycloak. */
  salir(): void;
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

    async entrar(): Promise<void> {
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
  };
}
