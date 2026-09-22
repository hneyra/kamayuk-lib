/**
 * La escalera de la API, leida desde la pantalla.
 *
 * <h2>Cada peldano es un remedio distinto, y por eso no se pueden juntar</h2>
 *
 * Medido con `curl` contra la instalacion y sobre el `CodigoDeError` de los cinco sistemas, el
 * backend contesta cosas distintas a la misma peticion segun quien la haga y en que estado este
 * lo que se pide:
 *
 * <table>
 *   <tr><td>sin token</td><td><b>401</b> `NO_AUTENTICADO`</td></tr>
 *   <tr><td>token sin el claim `municipalidad_id`</td><td><b>403</b> `SIN_MUNICIPALIDAD`</td></tr>
 *   <tr><td>token sin el permiso que la operacion pide</td><td><b>403</b> `SIN_PRIVILEGIO`</td></tr>
 *   <tr><td>lo pedido no existe en esta municipalidad</td><td><b>404</b> `NO_ENCONTRADO`</td></tr>
 *   <tr><td>el estado actual no admite la operacion</td><td><b>409</b> `CONFLICTO`</td></tr>
 *   <tr><td>la pantalla pidio ordenar por un campo que no esta</td><td><b>422</b> `ORDEN_NO_ADMITIDO`</td></tr>
 *   <tr><td>el cuerpo incumple una regla del dominio</td><td><b>422</b> `VALIDACION`</td></tr>
 * </table>
 *
 * El 404 **no es «la cuenta no es usuario de esta municipalidad»**, aunque hasta #52 esta tabla lo
 * dijera: esa era la respuesta de una operacion concreta de `rentas` (`AdministrarSesion.java`),
 * y medido en `identidad` una cuenta sin alta recibe **403 `SIN_PRIVILEGIO`**
 * (`GuardiaDeAcceso.java:127-136`) mientras que el 404 dice «No hay ningun <x> con identificador
 * <id>» (`AdministrarSeguridad.java:409-412`). El 404 es «eso no existe», y nada mas.
 *
 * <h2>El quinto peldano lo trajo la primera escritura (I-3)</h2>
 *
 * Hasta #31 esta interfaz solo leia, y un 422 no podia llegar. Con
 * `PUT /seguridad/sesion/ejercicio` llega, y es **la respuesta mas probable del acto**: medido
 * contra la instalacion, una observacion de tres letras contesta «La observacion debe explicar
 * el cambio: al menos 5 caracteres…» y un ejercicio de 1800, «Ejercicio fuera de rango: 1800.
 * Se admite de 1990 a 2100». Sin este peldano las dos caian en `averia`, o sea que escribir
 * «ok» en un campo mandaba a **avisar a soporte** — y con el tono de que algo se rompio.
 *
 * <h2>Y los dos ultimos los trajo una interfaz que ESCRIBE (#52)</h2>
 *
 * Los dos son la misma leccion otra vez, medida cuando `identidad` y `normativa` fueron a dibujar
 * pantallas de escritura:
 *
 *   · **El 409 no es una averia.** Caia en la ultima rama, o sea en «Reintente en unos segundos.
 *     Si sigue igual, avise a soporte» — **el remedio contrario**, porque ninguno de los 409 de
 *     este producto se arregla reintentando: cada uno dice en su `mensaje` que hay que cambiar.
 *     «Ya hay un usuario con esa cuenta en esta municipalidad»
 *     (`identidad` `SeguridadController.java:310`); «El cambio dejaria a la municipalidad sin
 *     ningun usuario capaz de administrar permisos… Otorgue primero el privilegio a otro usuario
 *     o grupo» (`AdministrarPermisos.java:313-315`); «El conjunto N ya esta sellado; corregirlo
 *     exige una version nueva (ADR-0007)» y «El conjunto N no tiene ningun parametro: sellarlo
 *     vacio diria que el ejercicio esta parametrizado cuando no lo esta» (`normativa`
 *     `AdministrarParametros.java:311-330`).
 *   · **`ORDEN_NO_ADMITIDO` no es un `VALIDACION` mas.** Los dos son 422 y hasta #52 la rama solo
 *     miraba el estado, asi que compartian titulo y remedio. Pero `VALIDACION` es una regla que
 *     quien escribe puede cumplir —su `mensaje` la trae con su cifra— y `ORDEN_NO_ADMITIDO` lo
 *     provoca **la pantalla**, que pidio ordenar por un campo fuera de la lista blanca: su
 *     `mensaje` es fijo y el campo viaja aparte, en `detalles`. Decirle «corrija lo que dice el
 *     mensaje» a quien no escribio nada y no puede corregir nada es mandarlo a dar vueltas.
 *     Medido desde `normativa` al dibujar sus siete situaciones de error: le salieron **seis
 *     pantallas distintas, no siete** (`normativa`#63, PR `normativa`#84).
 *
 * <h2>`esAveria` y `reintentable` son DOS preguntas, y ninguna es el estado</h2>
 *
 * `esAveria` dice si esto es el sistema roto o el sistema funcionando, y decide el tono.
 * `reintentable` dice si volver a mandar la misma peticion, sin cambiar nada, puede dar otro
 * resultado — y decide si la pantalla ofrece el boton. Los dos valen `true` **solo en los dos
 * peldanos de averia**: todo 4xx que esta escalera nombra es el backend contestando lo que tenia
 * que contestar, y ninguno cambia por insistir.
 *
 * Afinar `reintentable` **entre los 5xx** —un 405 no puede funcionar nunca, y el propio catalogo
 * de `identidad` dice que no se ofrezca «Reintentar» ante el (`CodigoDeError.java:82-90`)— es
 * otro issue: 405, 501 y 503 siguen cayendo en `averia` y heredan su respuesta.
 *
 * <h2>Es una funcion pura, y eso es deliberado</h2>
 *
 * Sin React, sin `fetch` y sin reloj: entra un fallo, sale que decir. Los peldanos se prueban sin
 * montar nada, y la pantalla que los ensena se prueba una vez.
 *
 * <h2>Y sus palabras son DATO</h2>
 *
 * El segundo argumento es un `Partial<TextosDeLaEscalera>` que se funde sobre el castellano por
 * omision, igual que `<Armazon textos>` en `@kamayuk/shell`. Llamada con un solo argumento
 * contesta lo de siempre.
 */

import { ErrorDeLaApi } from '../api/index.ts';
import { TEXTOS_DE_LA_ESCALERA, type TextosDeLaEscalera } from './textos.ts';

/** Que decir, y que ofrecer, ante un fallo de la API. */
export interface Peldano {
  /** Identificador estable del peldano. Es lo que las pruebas nombran. */
  readonly clave:
    | 'sin-identidad'
    | 'sin-municipalidad'
    | 'sin-privilegio'
    | 'no-encontrado'
    | 'no-permitido'
    | 'conflicto'
    | 'orden-no-admitido'
    | 'no-valido'
    | 'averia';
  readonly titulo: string;
  /** Lo que paso, en una frase. Cuando el backend lo dice, es lo que el backend dijo. */
  readonly detalle: string;
  /** Que hacer para salir de aqui. Nunca «reintente» a secas. */
  readonly remedio: string;
  /** Si la pantalla ofrece el boton que vuelve a la puerta de identidad. */
  readonly pideIdentidad: boolean;
  /**
   * Si esto es el sistema roto o el sistema funcionando.
   *
   * `false` en **todos** los peldanos que esta escalera nombra por su estado —401, los tres 403,
   * el 404, el 409 y los dos 422—: en todos ellos el backend leyo la peticion, la entendio y
   * contesto exactamente lo que tenia que contestar. Solo un fallo de transporte o un estado que
   * esta escalera no nombra —que en la practica son los 5xx— son una averia.
   */
  readonly esAveria: boolean;
  /**
   * Si volver a mandar la misma peticion, sin cambiar nada, puede dar otro resultado.
   *
   * No es lo mismo que `esAveria`, y por eso son dos campos: un 409 no es una averia **y ademas**
   * no se arregla reintentando, mientras que un corte de red no es culpa de nadie y si. Es lo que
   * decide si la pantalla ofrece «Reintentar» — ofrecerlo donde no cambia nada es invitar a
   * repetir hasta llamar por telefono.
   */
  readonly reintentable: boolean;
  /**
   * El identificador con el que soporte encuentra la causa, o `null`.
   *
   * Es un campo y no un trozo de frase para que la pantalla lo pueda ensenar aparte —copiable,
   * junto al boton de avisar— sin recortarlo de un texto. Solo lo llevan los 500 que lo traen:
   * en todos los demas peldanos es `null`, y entonces el remedio no promete ningun numero.
   */
  readonly incidencia: string | null;
}

/** Lo que el backend dijo, o el respaldo si esa respuesta no traia texto. */
function loQueDijo(fallo: ErrorDeLaApi, respaldo: string): string {
  return fallo.mensaje ?? fallo.detalle ?? fallo.titulo ?? respaldo;
}

/**
 * En que peldano de la escalera se ha quedado esta peticion.
 *
 * @param fallo lo que lanzo `solicitar()`. No tiene por que ser un `ErrorDeLaApi`: un corte de
 *   red lanza un `TypeError`, y ese caso tambien tiene que contestar algo.
 * @param textos lo que se quiera decir en vez del castellano por omision. Es un `Partial`: lo que
 *   no se pase sigue siendo lo de siempre, asi que llamarla con un solo argumento no cambia nada.
 */
export function peldanoDe(
  fallo: unknown,
  textos: Partial<TextosDeLaEscalera> = {},
): Peldano {
  const t: TextosDeLaEscalera = { ...TEXTOS_DE_LA_ESCALERA, ...textos };

  if (!(fallo instanceof ErrorDeLaApi)) {
    return {
      clave: 'averia',
      titulo: t.elSistemaNoContesta,
      detalle: t.laPeticionNoLlego,
      remedio: t.reintenteOAviseASoporte,
      pideIdentidad: false,
      esAveria: true,
      // Nadie contesto: no hay nada escrito en el registro de ningun servidor que buscar.
      reintentable: true,
      incidencia: null,
    };
  }

  if (fallo.estado === 401) {
    return {
      clave: 'sin-identidad',
      titulo: t.hayQueVolverAIdentificarse,
      detalle: loQueDijo(fallo, t.sinTokenValido),
      remedio: t.vuelvaAIdentificarse,
      pideIdentidad: true,
      esAveria: false,
      reintentable: false,
      incidencia: null,
    };
  }

  if (fallo.estado === 403 && fallo.codigo === 'SIN_MUNICIPALIDAD') {
    return {
      clave: 'sin-municipalidad',
      titulo: t.sinMunicipalidadAsignada,
      detalle: loQueDijo(fallo, t.elTokenNoDiceLaMunicipalidad),
      remedio: t.laAsignaQuienAdministra,
      // No se ofrece volver a la puerta: entrar otra vez con la misma cuenta trae el mismo
      // token y el mismo 403. Lo que falta esta del lado del administrador, no del navegador.
      pideIdentidad: false,
      esAveria: false,
      reintentable: false,
      incidencia: null,
    };
  }

  if (fallo.estado === 403 && fallo.codigo === 'SIN_PRIVILEGIO') {
    return {
      clave: 'sin-privilegio',
      titulo: t.faltaUnPermiso,
      detalle: loQueDijo(fallo, t.sinElPrivilegioQueSePide),
      remedio: t.pidaElPermiso,
      pideIdentidad: false,
      esAveria: false,
      reintentable: false,
      incidencia: null,
    };
  }

  if (fallo.estado === 403) {
    return {
      clave: 'no-permitido',
      titulo: t.noSePermitioLaOperacion,
      detalle: loQueDijo(fallo, t.elBackendRechazoLaPeticion),
      remedio: t.reviseConQueCuentaTrabaja,
      pideIdentidad: false,
      esAveria: false,
      reintentable: false,
      incidencia: null,
    };
  }

  if (fallo.estado === 404) {
    return {
      clave: 'no-encontrado',
      // Tal cual. Un 404 de este producto nombra lo que no encontro —la cuenta, el identificador,
      // el ejercicio—, y resumirlo borraria el unico dato con el que se arregla. Cuando ademas
      // trae `parametroQueFalta`, ese dato sigue en el error para quien lo quiera leer: aqui no se
      // interpreta, porque que hacer con el es de la pantalla (`normativa`#66 y #67).
      detalle: loQueDijo(fallo, t.noSeEncontroLaOperacion(fallo.operacion)),
      titulo: t.noSeEncontroLoSolicitado,
      remedio: t.compruebeLoQueSePidio,
      pideIdentidad: false,
      esAveria: false,
      reintentable: false,
      incidencia: null,
    };
  }

  if (fallo.estado === 409) {
    return {
      clave: 'conflicto',
      titulo: t.elEstadoNoAdmiteLaOperacion,
      // Tal cual, como en el 422 de validacion y por lo mismo: el mensaje del backend es el dato.
      // Es el que dice QUE choca —«ya hay un usuario con esa cuenta», «el conjunto ya esta
      // sellado»— y a menudo por donde se sale.
      detalle: loQueDijo(fallo, t.elBackendRechazoPorElEstado),
      remedio: t.cambieLoQueDiceElMensaje,
      pideIdentidad: false,
      // El backend leyo la peticion, la entendio y la rechazo por el estado de lo que se pide.
      // Eso es el sistema funcionando, y hasta #52 se ensenaba como «algo se rompio».
      esAveria: false,
      // Y sobre todo: reintentar el mismo sellado del mismo conjunto da el mismo 409.
      reintentable: false,
      incidencia: null,
    };
  }

  if (fallo.estado === 422 && fallo.codigo === 'ORDEN_NO_ADMITIDO') {
    return {
      clave: 'orden-no-admitido',
      titulo: t.noSePuedeOrdenarPorEseCampo,
      // El `mensaje` de este codigo es fijo, y el campo viaja en `detalles`. Los dos juntos, sin
      // partir ninguno: leer «Campo pedido: » aqui para sacar el campo seria clavar una frase
      // castellana del servidor dentro del cliente.
      detalle: t.elCampoQueSePidio(
        loQueDijo(fallo, t.noSePuedeOrdenarPorEseCampo),
        fallo.detalles,
      ),
      remedio: t.loArreglaQuienHizoLaPantalla,
      pideIdentidad: false,
      esAveria: false,
      reintentable: false,
      incidencia: null,
    };
  }

  if (fallo.estado === 422) {
    return {
      clave: 'no-valido',
      titulo: t.noCumpleUnaRegla,
      // Tal cual, y esta es la respuesta de la escalera donde el texto del backend NO es un
      // respaldo sino el dato: es la regla concreta que se incumplio, con su cifra dentro
      // —«al menos 5 caracteres», «Se admite de 1990 a 2100»—, y es lo unico con lo que quien
      // esta delante puede corregir lo que escribio. Resumirla a «revise los datos» borraria
      // justo eso. Copiar la regla aqui para adelantarla seria peor: seria tener dos verdades.
      detalle: loQueDijo(fallo, t.elBackendRechazoElContenido),
      remedio: t.corrijaLoQueDiceElMensaje,
      pideIdentidad: false,
      // No es una averia: el backend leyo la peticion, la entendio y la rechazo por una regla
      // suya. Mandar a soporte por esto es mandar a soporte porque alguien escribio «ok».
      esAveria: false,
      reintentable: false,
      incidencia: null,
    };
  }

  return {
    clave: 'averia',
    titulo: t.elSistemaNoPudoContestar,
    detalle: t.loQueDijoConSuEstado(loQueDijo(fallo, fallo.operacion), fallo.estado),
    remedio: t.aviseASoporte(fallo.incidencia),
    pideIdentidad: false,
    esAveria: true,
    reintentable: true,
    // Lo unico con lo que soporte encuentra la causa. Hasta #52 llegaba al cliente y se tiraba
    // en el constructor de `ErrorDeLaApi`, asi que el remedio mandaba a «avisar con este mensaje»
    // y el mensaje era el mismo para todos los 500 de todos los sistemas.
    incidencia: fallo.incidencia,
  };
}
