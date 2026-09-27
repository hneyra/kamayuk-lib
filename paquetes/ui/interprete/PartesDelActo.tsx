import { Alerta } from '../shadcn/alerta.tsx';
import { BotonConMotivo } from '../shadcn/boton-con-motivo.tsx';
import { Area } from '../shadcn/campo.tsx';
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
import { TarjetaCampos, TarjetaNota } from '../shadcn/tarjeta.tsx';
import { camposQueFaltan, motivoDeLaObservacion, seEscribeElCampo } from './acciones.ts';
import { CampoDelBloque } from './CampoDelBloque.tsx';
import type { Nombrados } from './componer.ts';
import type { Ausencia, EstadoDeUnaLectura } from './datos.ts';
import { useEntorno } from './entorno.tsx';
import { FalloDeUnaLectura } from './EstadoDeLaLectura.tsx';
import { GrupoDeAcciones } from './GrupoDeAcciones.tsx';
import type { TecleadoDeUnActo } from './hoja.ts';
import type { AccionesDeLaHoja } from './interaccion.ts';
import { ProsaConMarcas } from './ProsaConMarcas.tsx';
import type { CampoDelActo, DefinicionDeActo } from './tipos-de-los-actos.ts';
import type { Texto } from './tipos.ts';

/**
 * **Las partes de un acto: la nota, el fallo, lo hecho, los campos, las salidas y la confirmacion**
 * (#66, #86; aparte de `ActoDeLaPantalla` desde #120).
 *
 * `ActoDeLaPantalla` tenia 301 lineas, seis `useState` y dos `useRef` en una funcion. El estado se
 * queda alli —la fase, el vuelo, el rechazo, lo tecleado—; aqui solo se dibuja, con lo que ya esta
 * decidido. El porque de cada parte, en el docblock de `ActoDeLaPantalla`.
 */

/** Un texto de la definicion, resuelto con los datos de la pantalla y los de la fila. */
type Resolver = (t: Texto) => string;

/** La nota del acto: con marcas, si las trae, que ganan a `nota` (#86, `texto-con-marcas`). */
export function NotaDelActo({
  acto,
  nombrados,
  texto,
}: {
  readonly acto: DefinicionDeActo;
  readonly nombrados: Nombrados;
  readonly texto: Resolver;
}) {
  if (acto.notaConMarcas !== undefined && acto.notaConMarcas.length > 0) {
    // Con los datos de la pantalla y los de la fila.
    return (
      <TarjetaNota>
        <ProsaConMarcas marcas={acto.notaConMarcas} nombrados={nombrados} />
      </TarjetaNota>
    );
  }
  return acto.nota === undefined || acto.nota === '' ? null : <TarjetaNota>{texto(acto.nota)}</TarjetaNota>;
}

/**
 * El fallo, encima del formulario, que sigue con lo escrito: se corrige y se vuelve a enviar. El del
 * sistema, si lo puso en `datos.lecturas` con la clave del acto; si rechazo sin ponerlo, un aviso
 * que lo dice —nunca un rechazo mudo—.
 */
export function FalloDelActo({
  clave,
  fallo,
  rechazado,
}: {
  readonly clave: string;
  readonly fallo: EstadoDeUnaLectura | undefined;
  readonly rechazado: boolean;
}) {
  const { textos } = useEntorno();
  return (
    <>
      {fallo?.estado === 'fallo' ? (
        <div data-fallo-de={clave}>
          <FalloDeUnaLectura fallo={fallo} />
        </div>
      ) : null}
      {rechazado && fallo?.estado !== 'fallo' ? (
        <div className="px-[15px] pt-[14px]">
          <Alerta tono="atencion" data-rechazo-sin-fallo={clave}>
            {textos.rechazoSinFallo(clave)}
          </Alerta>
        </div>
      ) : null}
    </>
  );
}

/** El acto aceptado: lo que dice, y a donde se puede ir desde ahi. */
export function ActoHecho({
  acto,
  nombrados,
  texto,
  accionesDeLaHoja,
}: {
  readonly acto: DefinicionDeActo;
  readonly nombrados: Nombrados;
  readonly texto: Resolver;
  readonly accionesDeLaHoja: AccionesDeLaHoja;
}) {
  const { textos } = useEntorno();
  return (
    <div data-fase-del-acto="hecho" className="flex flex-col gap-[10px] px-[15px] py-[14px]">
      <Alerta tono="ok" titulo={acto.hecho === undefined ? textos.actoHecho : texto(acto.hecho.titulo)}>
        {acto.hecho?.texto === undefined ? undefined : texto(acto.hecho.texto)}
      </Alerta>
      {acto.hecho?.acciones === undefined ? null : (
        <GrupoDeAcciones
          acciones={acto.hecho.acciones}
          nombrados={nombrados}
          accionesDeLaHoja={accionesDeLaHoja}
        />
      )}
    </div>
  );
}

/**
 * Los campos del acto y su observacion. Los errores, solo tras el primer intento: los de los campos
 * si la definicion los pide (#86, H07) —los MISMOS que el motivo del primario enumera: la regla es
 * `camposQueFaltan`, y no una segunda—, y el de la observacion siempre.
 */
export function CamposDelActo({
  acto,
  tecleado,
  nombrados,
  ausencia,
  alCambiar,
  texto,
}: {
  readonly acto: DefinicionDeActo;
  readonly tecleado: TecleadoDeUnActo;
  /** Los de la pantalla con los de la fila encima: un campo de solo lectura ensena el suyo. */
  readonly nombrados: NonNullable<Nombrados>;
  readonly ausencia: Ausencia;
  /** Un cambio de lo tecleado: ensucia, y se aplica sobre lo que habia. */
  readonly alCambiar: (cambio: (antes: TecleadoDeUnActo) => TecleadoDeUnActo) => void;
  readonly texto: Resolver;
}) {
  const { traducir, textos } = useEntorno();
  const { valores, observacion, intentado } = tecleado;
  const errorDeLaObservacion = intentado ? motivoDeLaObservacion(acto, observacion, textos) : undefined;
  const faltan = acto.errores === 'trasElPrimerIntento' && intentado ? camposQueFaltan(acto.campos, valores) : [];
  const errorDelCampo = (campo: CampoDelActo): string | undefined => {
    if (!faltan.includes(campo)) return undefined;
    const propio = 'mensajes' in campo ? campo.mensajes?.obligatorio : undefined;
    return propio === undefined ? textos.campoObligatorio : texto(propio);
  };
  return (
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
          ausencia={ausencia}
          error={errorDelCampo(campo)}
          alCambiar={(valor) => {
            alCambiar((antes) => ({ ...antes, valores: { ...antes.valores, [campo.nombre]: valor } }));
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
            const escrita = evento.target.value;
            alCambiar((antes) => ({ ...antes, observacion: escrita }));
          }}
        />
      </Etiqueta>
    </TarjetaCampos>
  );
}

/**
 * El primario —impedido con su motivo, que pulsado cuenta como intento—, `descartar` si la
 * definicion lo trae, el parrafo del motivo y la region viva de lo descartado.
 */
export function SalidasDelActo({
  acto,
  motivo,
  idDelMotivo,
  enCurso,
  descartado,
  alPulsarImpedido,
  descartar,
  texto,
}: {
  readonly acto: DefinicionDeActo;
  readonly motivo: string | undefined;
  readonly idDelMotivo: string;
  readonly enCurso: boolean;
  /** Se acaba de descartar: la region viva lo dice. */
  readonly descartado: boolean;
  readonly alPulsarImpedido: () => void;
  readonly descartar: () => void;
  readonly texto: Resolver;
}) {
  const { textos } = useEntorno();
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-t border-linea-2 px-[15px] py-3">
        <BotonConMotivo
          type="submit"
          variante="primario"
          motivo={motivo}
          idDelMotivo={idDelMotivo}
          enCurso={enCurso}
          alPulsarImpedido={() => {
            alPulsarImpedido();
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
    </>
  );
}

/**
 * Lo irreversible, confirmado aparte: la `Confirmacion` de `AvisoDeCambios`, que enfoca «Cancelar»
 * al abrir y cierra con `Esc` sin enviar. Nunca un `confirm()` del navegador.
 */
export function ConfirmacionDelActo({
  advertencia,
  abierta,
  cerrar,
  confirmar,
}: {
  /** La advertencia, ya resuelta. */
  readonly advertencia: string;
  readonly abierta: boolean;
  readonly cerrar: () => void;
  readonly confirmar: () => void;
}) {
  const { textos } = useEntorno();
  return (
    <Confirmacion
      open={abierta}
      onOpenChange={(sigueAbierta) => {
        if (!sigueAbierta) cerrar();
      }}
    >
      <PanelDeConfirmacion>
        <TituloDeConfirmacion>{textos.estoNoSeDeshace}</TituloDeConfirmacion>
        <NotaDeConfirmacion>{advertencia}</NotaDeConfirmacion>
        <SalidasDeConfirmacion>
          <HuecoDeConfirmacion />
          <Cancelar onClick={cerrar}>{textos.cancelar}</Cancelar>
          <Confirmar onClick={confirmar}>{textos.siConfirmar}</Confirmar>
        </SalidasDeConfirmacion>
      </PanelDeConfirmacion>
    </Confirmacion>
  );
}
