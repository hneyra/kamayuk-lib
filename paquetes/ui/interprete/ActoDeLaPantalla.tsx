import { useId, useRef, useState, type FormEvent } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
import { avisar } from '../shadcn/avisos.tsx';
import { BotonConMotivo } from '../shadcn/boton-con-motivo.tsx';
import { Area } from '../shadcn/campo.tsx';
import { tipoDe } from '../shadcn/campos.ts';
import {
  Cancelar,
  Confirmacion,
  Confirmar,
  HuecoDeConfirmacion,
  NotaDeConfirmacion,
  PanelDeConfirmacion,
  SalidasDeConfirmacion,
  TituloDeConfirmacion,
} from '../shadcn/confirmacion.tsx';
import { Etiqueta } from '../shadcn/etiqueta.tsx';
import { Tarjeta, TarjetaCabecera, TarjetaCampos, TarjetaNota } from '../shadcn/tarjeta.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import {
  atiende,
  camposQueFaltan,
  motivoDelActo,
  motivoDeLaObservacion,
  seEscribeElCampo,
  valoresQueViajan,
  type ValoresDelActo,
} from './acciones.ts';
import { CampoDelBloque } from './CampoDelBloque.tsx';
import { type Nombrados, resolverTexto } from './componer.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import { FalloDeUnaLectura } from './EstadoDeLaLectura.tsx';
import { GrupoDeAcciones } from './GrupoDeAcciones.tsx';
import type { TecleadoDeUnActo } from './hoja.ts';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import type { CampoDelActo, DefinicionDeActo } from './tipos-de-los-actos.ts';

/**
 * **Un acto: el formulario que escribe, con la observacion obligatoria** (#66,
 * `acto-con-observacion` y `confirmacion-de-lo-irreversible`).
 *
 * Sale del `<Acto>` de la V6 de `catastro` (`22e6d2e:frontend/src/ds/Acto.tsx`), con tres cambios que
 * son la subida misma:
 *
 *   · **Los limites de la observacion son dato** de la definicion. La V6 no copiaba ninguno —«lo
 *     demas lo dice el servidor al rechazar»— y `normativa` si (de 5 a 500); aqui los pone quien
 *     define el acto, y la libreria no tiene ninguno escrito (AC-2).
 *   · **La observacion es un area de texto, en todos los actos.** La V6 la pedia en un campo de una
 *     linea en los actos y en un area en el alta (catastro#116). Se elige el area: el largo llega a
 *     500, una linea esconde lo que no cabe a la vista, y en un area Enter no envia. La regla 10 se
 *     escribe; no se despacha con un Enter.
 *   · **El fallo no lo interpreta esta pieza.** La V6 recibia un `ErrorDeApi`; aqui el sistema pone
 *     el peldano ya resuelto en `datos.lecturas` con la clave del acto, como dejo escrito #44, y la
 *     pieza lo pinta encima del formulario, que se queda con lo escrito.
 *
 * <h2>El primario nace impedido, y dice por que</h2>
 *
 * Con **un** motivo, visible y atado con `aria-describedby` —ver `motivoDelActo`—. Pulsarlo impedido
 * no envia y cuenta como primer intento: desde ahi la observacion dice tambien su error bajo el
 * campo, con `aria-invalid`. Antes no, porque un campo en rojo antes de escribir en el se lee como
 * una reprimenda (`normativa`, H07).
 *
 * <h2>Lo irreversible se confirma aparte</h2>
 *
 * Con `advertencia`, el primario abre la `Confirmacion` que ya existe —la de `AvisoDeCambios`—, que
 * enfoca «Cancelar» al abrir y cierra con `Esc` sin enviar. Nunca un `confirm()` del navegador:
 * bloquea el hilo, no lo lee un lector de pantalla y deja colgado a quien lo prueba.
 *
 * <h2>Desde #86, mas cosas, y cada una solo si la definicion la pide</h2>
 *
 *   · **Lo tecleado puede vivir fuera** (`lo-tecleado-y-la-negativa-sobreviven`): con
 *     `interaccion.tecleadoDeLosActos`, los valores, la observacion y el intento se guardan en el
 *     marco por apertura, y volver a la hoja sucia los encuentra. Sin el, en el estado, como en #66.
 *     Lo que NO sube es la fase, el vuelo ni el rechazo: son de este envio, y la negativa del
 *     servidor ya vive en `datos.lecturas`, que es del sistema.
 *   · **`descartar`**: un secundario que vacia lo escrito y lo dice en una region viva. Impedido solo
 *     mientras la escritura viaja: vaciar un formulario cuyo envio aun puede aceptarse deja a quien
 *     mira sin saber que se guardo.
 *   · **`errores: 'trasElPrimerIntento'`**: el error de cada obligatorio vacio, bajo su campo.
 *   · **`alTerminar` y `alFallar`**: un aviso de `sonner` —`avisar`, el de `<Avisos>`, que el marco
 *     monta una vez—. No sustituye a lo de siempre: lo hecho y el fallo se siguen dibujando aqui.
 *     Descartar NO avisa por ahi: ya lo dice su propia region viva, y dos regiones diciendo lo mismo
 *     es un anuncio repetido para quien no ve.
 */

export interface ActoDeLaPantallaProps {
  readonly acto: DefinicionDeActo;
  readonly datos: DatosDeLaPantalla;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  readonly interaccion: InteraccionDeLaPantalla;
}

/** Donde esta el acto: escribiendose, o ya aceptado por el sistema. */
type Fase = 'escribiendo' | 'hecho';

/** El valor con el que nace un campo: el que el desplegable ensena, y no un hueco que no se ve. */
function valoresIniciales(campos: readonly CampoDelActo[]): ValoresDelActo {
  const salida: Record<string, string | boolean> = {};
  for (const campo of campos) {
    if (tipoDe(campo.tipo) === 's' && 'opciones' in campo) {
      const primera: unknown = campo.opciones[0];
      if (typeof primera === 'string') salida[campo.nombre] = primera;
    }
    if (tipoDe(campo.tipo) === 'c') salida[campo.nombre] = false;
  }
  return salida;
}

/** Lo que un acto trae al abrirse por primera vez: nada escrito, y nada intentado. */
const inicialDe = (campos: readonly CampoDelActo[]): TecleadoDeUnActo => ({
  valores: valoresIniciales(campos),
  observacion: '',
  intentado: false,
});

export function ActoDeLaPantalla({ acto, datos, traducir, textos, interaccion }: ActoDeLaPantallaProps) {
  const raiz = useId();
  // Lo que se lleva lo tecleado es la APERTURA: el mismo acto abierto sobre otra fila es otro
  // formulario, por lo mismo que `PiezaDeLaPantalla` lo remonta con esa `key`.
  const apertura = `${acto.clave}|${JSON.stringify(interaccion.abierto?.parametros ?? {})}`;
  const [aqui, setAqui] = useState<TecleadoDeUnActo>(() => inicialDe(acto.campos));
  const fuera = interaccion.tecleadoDeLosActos;
  const tecleado: TecleadoDeUnActo = fuera === undefined ? aqui : (fuera.leer(apertura) ?? inicialDe(acto.campos));
  const { valores, observacion, intentado } = tecleado;
  /** `undefined` es «nada escrito»: fuera, quita la apertura; aqui, vuelve al inicial. */
  const cambiarLoTecleado = (cambio: (antes: TecleadoDeUnActo) => TecleadoDeUnActo | undefined): void => {
    if (fuera === undefined) {
      setAqui((antes) => cambio(antes) ?? inicialDe(acto.campos));
      return;
    }
    fuera.cambiar(apertura, (antes) => cambio(antes ?? inicialDe(acto.campos)));
  };
  const marcarIntentado = (): void => {
    cambiarLoTecleado((antes) => (antes.intentado ? antes : { ...antes, intentado: true }));
  };
  const [enCurso, setEnCurso] = useState(false);
  const [rechazado, setRechazado] = useState(false);
  const [fase, setFase] = useState<Fase>('escribiendo');
  const [confirmando, setConfirmando] = useState(false);
  /** Se acaba de descartar: la region viva lo dice hasta el siguiente cambio (#86). */
  const [descartado, setDescartado] = useState(false);
  // La segunda pulsacion de un doble clic llega antes de que se pinte «en curso»: la referencia no
  // espera a pintar. Sin ella, dos pulsaciones son dos altas, y la segunda contesta «ya existe».
  const enVuelo = useRef(false);
  const ensuciada = useRef(false);

  // Lo que la accion que lo abrio le dio, por encima de los datos de la pantalla: una fila manda.
  const parametros = interaccion.abierto?.parametros ?? {};
  const nombrados: Nombrados = new Map([...(datos.nombrados ?? []), ...Object.entries(parametros)]);
  const texto = (t: Parameters<typeof resolverTexto>[0]) => resolverTexto(t, nombrados, traducir, textos.datoAusente);

  const atendido = atiende(interaccion.actos, acto.clave);
  const motivo = motivoDelActo(acto, { valores, observacion, enCurso, nombrados, traducir, textos, atendido });
  const errorDeLaObservacion = intentado ? motivoDeLaObservacion(acto, observacion, textos) : undefined;
  // Los de los campos, solo si la definicion los pide y tras el primer intento (#86, H07). Son los
  // MISMOS que el motivo del primario enumera: la regla es `camposQueFaltan`, y no una segunda.
  const faltan =
    acto.errores === 'trasElPrimerIntento' && intentado ? camposQueFaltan(acto.campos, valores) : [];
  const errorDelCampo = (campo: CampoDelActo): string | undefined => {
    if (!faltan.includes(campo)) return undefined;
    const propio = 'mensajes' in campo ? campo.mensajes?.obligatorio : undefined;
    return propio === undefined ? textos.campoObligatorio : texto(propio);
  };

  const ensuciar = () => {
    // CADA cambio marca, si la definicion lo pide (#86); el aviso de siempre, una vez por apertura.
    interaccion.marcarSucia();
    if (descartado) setDescartado(false);
    if (ensuciada.current) return;
    ensuciada.current = true;
    interaccion.alEnsuciar();
  };

  /** Vacia lo escrito, el intento y el rechazo, y lo dice (#86, `descartar-lo-escrito`). */
  const descartar = () => {
    cambiarLoTecleado(() => undefined);
    setRechazado(false);
    // Vacio, el acto esta como recien abierto: la siguiente tecla vuelve a ensuciar.
    ensuciada.current = false;
    setDescartado(true);
    interaccion.alDescartar(apertura);
  };

  const enviar = () => {
    const manejador = interaccion.actos?.[acto.clave];
    if (manejador === undefined || enVuelo.current) return;
    enVuelo.current = true;
    setEnCurso(true);
    setRechazado(false);
    const acabar = (bien: boolean) => {
      enVuelo.current = false;
      setEnCurso(false);
      if (bien) {
        setFase('hecho');
        interaccion.alQuedarGuardada();
        if (acto.alTerminar !== undefined) avisar(texto(acto.alTerminar.aviso));
      } else {
        setRechazado(true);
        if (acto.alFallar !== undefined) avisar.error(texto(acto.alFallar.aviso));
      }
    };
    let resultado: unknown;
    try {
      resultado = manejador({
        valores: valoresQueViajan(acto.campos, valores),
        observacion: observacion.trim(),
        parametros,
      });
    } catch {
      acabar(false);
      return;
    }
    if (resultado instanceof Promise) {
      resultado.then(
        () => {
          acabar(true);
        },
        () => {
          acabar(false);
        },
      );
    } else {
      acabar(true);
    }
  };

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    marcarIntentado();
    if (motivo !== undefined) return;
    if (acto.advertencia === undefined) enviar();
    else setConfirmando(true);
  };

  const fallo = datos.lecturas?.get(acto.clave);
  const idDelMotivo = `${raiz}-motivo`;

  return (
    <Tarjeta data-acto={acto.clave}>
      <TarjetaCabecera>{texto(acto.titulo)}</TarjetaCabecera>
      <div className="flex justify-end border-b border-linea-2 px-[15px] py-2">
        <BotonConMotivo
          type="button"
          tamano="menudo"
          onClick={() => {
            interaccion.abrirActo(null);
          }}
        >
          {textos.cerrarElActo}
        </BotonConMotivo>
      </div>
      {acto.nota === undefined || acto.nota === '' ? null : <TarjetaNota>{texto(acto.nota)}</TarjetaNota>}

      {fase === 'hecho' ? (
        <div data-fase-del-acto="hecho" className="flex flex-col gap-[10px] px-[15px] py-[14px]">
          <Alerta tono="ok" titulo={acto.hecho === undefined ? textos.actoHecho : texto(acto.hecho.titulo)}>
            {acto.hecho?.texto === undefined ? undefined : texto(acto.hecho.texto)}
          </Alerta>
          {acto.hecho?.acciones === undefined ? null : (
            <GrupoDeAcciones
              acciones={acto.hecho.acciones}
              nombrados={nombrados}
              traducir={traducir}
              textos={textos}
              interaccion={interaccion}
            />
          )}
        </div>
      ) : (
        <form data-fase-del-acto="escribiendo" noValidate onSubmit={alEnviar}>
          {/* El fallo encima, y el formulario sigue con lo escrito: se corrige y se vuelve a enviar.
              Mientras viaja otra vez, el fallo viejo no se ensena: ya no dice nada de lo que se mira. */}
          {!enCurso && fallo?.estado === 'fallo' ? (
            <div data-fallo-de={acto.clave}>
              <FalloDeUnaLectura fallo={fallo} textos={textos} />
            </div>
          ) : null}
          {!enCurso && rechazado && fallo?.estado !== 'fallo' ? (
            <div className="px-[15px] pt-[14px]">
              <Alerta tono="atencion" data-rechazo-sin-fallo={acto.clave}>
                {textos.rechazoSinFallo(acto.clave)}
              </Alerta>
            </div>
          ) : null}
          <TarjetaCampos>
            {acto.campos.map((campo) => (
              <CampoDelBloque
                key={campo.nombre}
                campo={campo}
                valor={
                  seEscribeElCampo(campo)
                    ? valores[campo.nombre]
                    : // Un campo de solo lectura ensena el dato con su nombre: lo que se esta tocando.
                      (() => {
                        const dato = nombrados.get(campo.nombre);
                        return typeof dato === 'string' ? dato : undefined;
                      })()
                }
                ausencia={datos.ausencia}
                error={errorDelCampo(campo)}
                alCambiar={(valor) => {
                  ensuciar();
                  cambiarLoTecleado((antes) => ({ ...antes, valores: { ...antes.valores, [campo.nombre]: valor } }));
                }}
                traducir={traducir}
                textos={textos}
              />
            ))}
            <Etiqueta
              data-observacion=""
              ancho
              rotulo={texto(acto.observacion.etiqueta)}
              ayuda={acto.observacion.ayuda === undefined ? undefined : texto(acto.observacion.ayuda)}
              error={errorDeLaObservacion}
            >
              <Area
                value={observacion}
                onChange={(evento) => {
                  ensuciar();
                  const escrita = evento.target.value;
                  cambiarLoTecleado((antes) => ({ ...antes, observacion: escrita }));
                }}
              />
            </Etiqueta>
          </TarjetaCampos>
          <div className="flex flex-wrap items-center gap-3 border-t border-linea-2 px-[15px] py-3">
            <BotonConMotivo
              type="submit"
              variante="primario"
              motivo={motivo}
              idDelMotivo={idDelMotivo}
              enCurso={enCurso}
              alPulsarImpedido={() => {
                marcarIntentado();
              }}
            >
              {texto(acto.titulo)}
            </BotonConMotivo>
            {acto.descartar === undefined ? null : (
              <BotonConMotivo
                type="button"
                variante="secundario"
                data-descartar={acto.clave}
                // Solo mientras viaja, y con el MISMO parrafo que el primario: los dos dicen lo mismo.
                motivo={enCurso ? textos.escribiendo : undefined}
                idDelMotivo={idDelMotivo}
                onClick={descartar}
              >
                {texto(acto.descartar.rotulo)}
              </BotonConMotivo>
            )}
            {motivo === undefined ? null : (
              <p id={idDelMotivo} data-slot="motivo" className="m-0 min-w-[180px] flex-1 text-[12.5px] leading-[1.5] text-tinta-3 text-pretty">
                {motivo}
              </p>
            )}
          </div>
          {/* La region viva existe desde que el acto se abre, vacia: un `role="status"` que aparece
              ya con el texto dentro no lo anuncian todos los lectores de pantalla. */}
          {acto.descartar === undefined ? null : (
            <p
              role="status"
              data-slot="lo-descartado"
              className={descartado ? 'm-0 px-[15px] pb-3 text-[12.5px] leading-[1.5] text-tinta-2 text-pretty' : 'm-0'}
            >
              {descartado
                ? acto.descartar.dicho === undefined
                  ? textos.loEscritoSeDescarto
                  : texto(acto.descartar.dicho)
                : null}
            </p>
          )}
        </form>
      )}

      {acto.advertencia === undefined ? null : (
        <Confirmacion
          open={confirmando}
          onOpenChange={(abierta) => {
            if (!abierta) setConfirmando(false);
          }}
        >
          <PanelDeConfirmacion>
            <TituloDeConfirmacion>{textos.estoNoSeDeshace}</TituloDeConfirmacion>
            <NotaDeConfirmacion>{texto(acto.advertencia)}</NotaDeConfirmacion>
            <SalidasDeConfirmacion>
              <HuecoDeConfirmacion />
              <Cancelar
                onClick={() => {
                  setConfirmando(false);
                }}
              >
                {textos.cancelar}
              </Cancelar>
              <Confirmar
                onClick={() => {
                  setConfirmando(false);
                  enviar();
                }}
              >
                {textos.siConfirmar}
              </Confirmar>
            </SalidasDeConfirmacion>
          </PanelDeConfirmacion>
        </Confirmacion>
      )}
    </Tarjeta>
  );
}
