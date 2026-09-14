import { useId, useRef, useState, type FormEvent } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
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

export function ActoDeLaPantalla({ acto, datos, traducir, textos, interaccion }: ActoDeLaPantallaProps) {
  const raiz = useId();
  const [valores, setValores] = useState<ValoresDelActo>(() => valoresIniciales(acto.campos));
  const [observacion, setObservacion] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [rechazado, setRechazado] = useState(false);
  const [fase, setFase] = useState<Fase>('escribiendo');
  const [confirmando, setConfirmando] = useState(false);
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

  const ensuciar = () => {
    if (ensuciada.current) return;
    ensuciada.current = true;
    interaccion.alEnsuciar();
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
      } else {
        setRechazado(true);
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
    setIntentado(true);
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
                alCambiar={(valor) => {
                  ensuciar();
                  setValores((antes) => ({ ...antes, [campo.nombre]: valor }));
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
                  setObservacion(evento.target.value);
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
                setIntentado(true);
              }}
            >
              {texto(acto.titulo)}
            </BotonConMotivo>
            {motivo === undefined ? null : (
              <p id={idDelMotivo} data-slot="motivo" className="m-0 min-w-[180px] flex-1 text-[12.5px] leading-[1.5] text-tinta-3 text-pretty">
                {motivo}
              </p>
            )}
          </div>
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
