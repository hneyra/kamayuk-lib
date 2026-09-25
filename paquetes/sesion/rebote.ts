/**
 * **Lo que sobrevive al rebote por Keycloak, en UN sitio** (#122).
 *
 * El navegador se va al emisor y vuelve, y entre la ida y la vuelta la pagina se descarga entera:
 * lo unico que queda es `sessionStorage`. Ahi viven cinco claves, y hasta #122 las tocaban
 * dieciocho llamadas sueltas repartidas por `crearIdentidad`, cada una con su `getItem`, su
 * `setItem` o su `removeItem` y su nombre de clave. Aqui son un almacen con nombre: lo que la
 * puerta hace con ellas se lee en los nombres de sus metodos, y las claves no salen de este archivo.
 *
 * <h2>Las cinco, y ninguna es una credencial</h2>
 *
 *   · `pkce.verificador` y `pkce.estado`: el secreto de un solo uso que demuestra que quien canjea
 *     es quien pidio, y lo que distingue nuestra vuelta de un codigo que alguien nos hizo llegar;
 *   · `pkce.destino`: a donde habia que volver, porque la URI de retorno es una sola;
 *   · `pkce.idas`: cuantas idas seguidas sin canjear, que es el tope contra el bucle;
 *   · `pkce.salida`: la marca de que se acaba de salir, que impide volver a entrar solo.
 *
 * Ninguna lleva `token`, `jwt`, `bearer`, `credencial`, `contrasena`, `acceso` ni `sesion` —las
 * palabras de `token-en-almacenamiento`—, y **no por esquivarla**: lo que se guarda aqui no es
 * ninguna de esas cosas. El token vive en memoria, en el cierre de `crearIdentidad`, y este archivo
 * no lo ve nunca.
 *
 * <h2>Por que el prefijo entra por parametro</h2>
 *
 * Porque dos sistemas servidos del mismo origen comparten `sessionStorage`, y con las mismas claves
 * el segundo pisaria el verificador del primero. Ver la cabecera de `identidad.ts`.
 *
 * <h2>Y por que aqui no hay `fetch`</h2>
 *
 * Porque este archivo guarda y lee, y nada mas. Los dos `fetch` de la puerta —la sonda y el canje—
 * se quedan en `identidad.ts`, que es el sitio declarado; que uno aqui salga rojo lo vigila el lint
 * (`eslint.config.js`, el bloque de la puerta).
 */

/** Lo que se guarda al irse: lo que hace falta para canjear al volver, y a donde volver. */
export interface Ida {
  readonly verificador: string;
  readonly estado: string;
  readonly destino: string;
}

/**
 * Lo que se encuentra al volver. **Cada campo puede faltar**: una vuelta que no viene de nuestra
 * ida —otra pestana, un enlace con un codigo, un almacenamiento borrado— no encuentra nada, y quien
 * lo lee tiene que poder decirlo.
 */
export interface IdaGuardada {
  readonly verificador: string | null;
  readonly estado: string | null;
  readonly destino: string | null;
}

/** Lo que la puerta puede hacer con lo que sobrevive al rebote, y nada mas. */
export interface Rebote {
  /** Guarda la ida —verificador, estado y destino— antes de mandar el navegador al emisor. */
  guardarIda(ida: Ida): void;
  /**
   * **Lee la ida y la borra**, en la misma llamada. Un codigo no se canjea dos veces: si la ida
   * sobreviviera a su vuelta, recargar la pagina volveria a intentar el canje con un verificador
   * ya gastado.
   */
  tomarIda(): IdaGuardada;
  /** Cuenta una ida mas, y levanta la marca de salida: quien vuelve a la puerta ya no esta saliendo. */
  contarIda(): void;
  /** Cuantas idas seguidas van sin canjear. */
  idas(): number;
  /** La cuenta vuelve a cero: el tope es para una racha de fallos, no para el dia. */
  olvidarLasIdas(): void;
  /** Se acaba de salir: la cuenta a cero y la marca puesta, para no volver a entrar solo. */
  marcarSalida(): void;
  /** Si la marca de salida esta puesta. */
  vieneDeSalir(): boolean;
  /** Levanta los dos frenos: la cuenta de idas y la marca de salida. */
  olvidarLaParada(): void;
}

/** El valor de la marca de salida. Lo que se compara es que este, no lo que dice. */
const PUESTA = '1';

/** El almacen del rebote de UNA puerta, con sus cinco claves bajo `prefijo`. */
export function crearRebote(prefijo: string): Rebote {
  const VERIFICADOR = `${prefijo}.pkce.verificador`;
  const ESTADO = `${prefijo}.pkce.estado`;
  const DESTINO = `${prefijo}.pkce.destino`;
  const IDAS = `${prefijo}.pkce.idas`;
  const SALIDA = `${prefijo}.pkce.salida`;

  const idas = (): number => Number(sessionStorage.getItem(IDAS) ?? 0);

  return {
    guardarIda({ verificador, estado, destino }) {
      sessionStorage.setItem(VERIFICADOR, verificador);
      sessionStorage.setItem(ESTADO, estado);
      sessionStorage.setItem(DESTINO, destino);
    },

    tomarIda() {
      const ida: IdaGuardada = {
        verificador: sessionStorage.getItem(VERIFICADOR),
        estado: sessionStorage.getItem(ESTADO),
        destino: sessionStorage.getItem(DESTINO),
      };
      sessionStorage.removeItem(VERIFICADOR);
      sessionStorage.removeItem(ESTADO);
      sessionStorage.removeItem(DESTINO);
      return ida;
    },

    contarIda() {
      sessionStorage.setItem(IDAS, String(idas() + 1));
      sessionStorage.removeItem(SALIDA);
    },

    idas,

    olvidarLasIdas() {
      sessionStorage.removeItem(IDAS);
    },

    marcarSalida() {
      sessionStorage.removeItem(IDAS);
      sessionStorage.setItem(SALIDA, PUESTA);
    },

    vieneDeSalir: () => sessionStorage.getItem(SALIDA) === PUESTA,

    olvidarLaParada() {
      sessionStorage.removeItem(IDAS);
      sessionStorage.removeItem(SALIDA);
    },
  };
}
