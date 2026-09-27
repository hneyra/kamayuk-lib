import { useId, useRef, useState, type FormEvent } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
import { avisar } from '../shadcn/avisos.tsx';
import { BotonConMotivo } from '../shadcn/boton-con-motivo.tsx';
import { Tarjeta, TarjetaCabecera, TarjetaNota } from '../shadcn/tarjeta.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { atiende, motivoDelActo, siempreTieneValor, valoresQueViajan, type ValoresDelActo } from './acciones.ts';
import { estrecharElCampo } from './campo-estrechado.ts';
import { type Nombrados, resolverTexto } from './componer.ts';
import { useEnElMarcoOAqui } from './en-el-marco-o-aqui.ts';
import { useEnVuelo } from './en-vuelo.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import { FalloDeUnaLectura } from './EstadoDeLaLectura.tsx';
import type { TecleadoDeUnActo } from './hoja.ts';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import { ActoHecho, CamposDelActo, ConfirmacionDelActo, SalidasDelActo } from './PartesDelActo.tsx';
import { ProsaConMarcas } from './ProsaConMarcas.tsx';
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
 *   · **`notaConMarcas`**: la nota con `code` y `strong` dentro de la frase. Gana a `nota`.
 *
 * <h2>Desde #120, el estado aqui y el dibujo en sus partes</h2>
 *
 * Lo que queda en esta funcion es lo que decide: la fase, el vuelo, el rechazo, lo descartado y lo
 * tecleado —en el marco o aqui, con `useLoTecleadoDelActo` sobre `useEnElMarcoOAqui`, el mismo de la
 * pantalla y la ruta—. Lo hecho, los campos, las salidas y la confirmacion se dibujan en
 * `PartesDelActo.tsx` con lo ya decidido.
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

/**
 * El valor con el que nace un campo: el que el desplegable ensena, y no un hueco que no se ve.
 *
 * La lista se reconoce por su tipo —`estrecharElCampo`, que trae sus opciones sin preguntar si
 * estan— y la casilla por `siempreTieneValor`, la columna de `COMPORTAMIENTO_POR_TIPO` (#124): el
 * que siempre tiene valor nace con el suyo, `false`, que es el unico que una casilla admite.
 */
function valoresIniciales(campos: readonly CampoDelActo[]): ValoresDelActo {
  const salida: Record<string, string | boolean> = {};
  for (const campo of campos) {
    const estrechado = estrecharElCampo(campo);
    if (estrechado.letra === 's') {
      const primera: unknown = estrechado.campo.opciones[0];
      if (typeof primera === 'string') salida[campo.nombre] = primera;
    }
    if (siempreTieneValor(campo)) salida[campo.nombre] = false;
  }
  return salida;
}

/** Lo que un acto trae al abrirse por primera vez: nada escrito, y nada intentado. */
const inicialDe = (campos: readonly CampoDelActo[]): TecleadoDeUnActo => ({
  valores: valoresIniciales(campos),
  observacion: '',
  intentado: false,
});

/** Lo que `useLoTecleadoDelActo` da al acto. */
interface LoTecleadoDelActo {
  /** Lo que se lleva lo tecleado: la clave del acto y los parametros con que se abrio. */
  readonly apertura: string;
  readonly tecleado: TecleadoDeUnActo;
  /** `undefined` es «nada escrito»: fuera, quita la apertura; aqui, vuelve al inicial. */
  readonly cambiarLoTecleado: (cambio: (antes: TecleadoDeUnActo) => TecleadoDeUnActo | undefined) => void;
  readonly marcarIntentado: () => void;
}

/**
 * **Donde guarda un acto lo tecleado** (#86; con `useEnElMarcoOAqui` desde #120): en el marco, por
 * apertura, si `interaccion.tecleadoDeLosActos` lo da; si no, en su estado, como en #66.
 */
function useLoTecleadoDelActo(acto: DefinicionDeActo, interaccion: InteraccionDeLaPantalla): LoTecleadoDelActo {
  // Lo que se lleva lo tecleado es la APERTURA: el mismo acto abierto sobre otra fila es otro
  // formulario, por lo mismo que `PiezaDeLaPantalla` lo remonta con esa `key`.
  const apertura = `${acto.clave}|${JSON.stringify(interaccion.abierto?.parametros ?? {})}`;
  const fuera = interaccion.tecleadoDeLosActos;
  type Cambio = (antes: TecleadoDeUnActo | undefined) => TecleadoDeUnActo | undefined;
  // `undefined` es lo inicial, fuera y aqui: lo que no se ha escrito no se guarda.
  const { valor, cambiar } = useEnElMarcoOAqui<TecleadoDeUnActo | undefined, Cambio>(
    fuera === undefined
      ? undefined
      : {
          valor: fuera.leer(apertura),
          cambiar: (cambio) => {
            fuera.cambiar(apertura, cambio);
          },
        },
    undefined,
    (antes, cambio) => cambio(antes),
  );
  const cambiarLoTecleado: LoTecleadoDelActo['cambiarLoTecleado'] = (cambio) => {
    cambiar((antes) => cambio(antes ?? inicialDe(acto.campos)));
  };
  return {
    apertura,
    tecleado: valor ?? inicialDe(acto.campos),
    cambiarLoTecleado,
    marcarIntentado: () => {
      cambiarLoTecleado((antes) => (antes.intentado ? antes : { ...antes, intentado: true }));
    },
  };
}

export function ActoDeLaPantalla({ acto, datos, traducir, textos, interaccion }: ActoDeLaPantallaProps) {
  const raiz = useId();
  const { apertura, tecleado, cambiarLoTecleado, marcarIntentado } = useLoTecleadoDelActo(acto, interaccion);
  const { valores, observacion } = tecleado;
  const [rechazado, setRechazado] = useState(false);
  const [fase, setFase] = useState<Fase>('escribiendo');
  const [confirmando, setConfirmando] = useState(false);
  /** Se acaba de descartar: la region viva lo dice hasta el siguiente cambio (#86). */
  const [descartado, setDescartado] = useState(false);
  // La segunda pulsacion de un doble clic llega antes de que se pinte «en curso»: `useEnVuelo` la
  // corta con una referencia. Sin ella, dos pulsaciones son dos altas, y la segunda contesta «ya existe».
  const enVuelo = useEnVuelo<'envio'>();
  const enCurso = enVuelo.enCurso('envio');
  const ensuciada = useRef(false);

  // Lo que la accion que lo abrio le dio, por encima de los datos de la pantalla: una fila manda.
  const parametros = interaccion.abierto?.parametros ?? {};
  const nombrados: Nombrados = new Map([...(datos.nombrados ?? []), ...Object.entries(parametros)]);
  const texto = (t: Parameters<typeof resolverTexto>[0]) => resolverTexto(t, nombrados, traducir, textos.datoAusente);

  const atendido = atiende(interaccion.actos, acto.clave);
  const motivo = motivoDelActo(acto, { valores, observacion, enCurso, nombrados, traducir, textos, atendido });

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
    if (manejador === undefined) return;
    // Lanzar en sincrono es acabar mal, como una promesa rechazada: `useEnVuelo` lo captura (#117).
    const acabar = (bien: boolean) => {
      if (bien) {
        setFase('hecho');
        interaccion.alQuedarGuardada();
        if (acto.alTerminar !== undefined) avisar(texto(acto.alTerminar.aviso));
      } else {
        setRechazado(true);
        if (acto.alFallar !== undefined) avisar.error(texto(acto.alFallar.aviso));
      }
    };
    enVuelo.lanzar(
      'envio',
      () => {
        setRechazado(false);
        return manejador({
          valores: valoresQueViajan(acto.campos, valores),
          observacion: observacion.trim(),
          parametros,
        });
      },
      acabar,
    );
  };

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    marcarIntentado();
    if (motivo !== undefined) return;
    if (acto.advertencia === undefined) enviar();
    else setConfirmando(true);
  };

  const fallo = datos.lecturas?.get(acto.clave);

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
      {acto.notaConMarcas !== undefined && acto.notaConMarcas.length > 0 ? (
        // Gana a `nota` (#86, `texto-con-marcas`), con los datos de la pantalla y los de la fila.
        <TarjetaNota>
          <ProsaConMarcas marcas={acto.notaConMarcas} nombrados={nombrados} traducir={traducir} ausente={textos.datoAusente} />
        </TarjetaNota>
      ) : acto.nota === undefined || acto.nota === '' ? null : (
        <TarjetaNota>{texto(acto.nota)}</TarjetaNota>
      )}

      {fase === 'hecho' ? (
        <ActoHecho acto={acto} nombrados={nombrados} traducir={traducir} texto={texto} textos={textos} interaccion={interaccion} />
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
          <CamposDelActo
            acto={acto}
            tecleado={tecleado}
            nombrados={nombrados}
            ausencia={datos.ausencia}
            alCambiar={(cambio) => {
              ensuciar();
              cambiarLoTecleado(cambio);
            }}
            traducir={traducir}
            texto={texto}
            textos={textos}
          />
          <SalidasDelActo
            acto={acto}
            motivo={motivo}
            idDelMotivo={`${raiz}-motivo`}
            enCurso={enCurso}
            descartado={descartado}
            alPulsarImpedido={marcarIntentado}
            descartar={descartar}
            texto={texto}
            textos={textos}
          />
        </form>
      )}

      {acto.advertencia === undefined ? null : (
        <ConfirmacionDelActo
          advertencia={texto(acto.advertencia)}
          abierta={confirmando}
          cerrar={() => {
            setConfirmando(false);
          }}
          confirmar={() => {
            setConfirmando(false);
            enviar();
          }}
          textos={textos}
        />
      )}
    </Tarjeta>
  );
}
