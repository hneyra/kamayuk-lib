import { useState, type ReactNode } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
import {
  TEXTOS_DE_LAS_PIEZAS,
  TEXTOS_DEL_INTERPRETE,
  type TextosDeLaPantalla,
} from '../textos.tsx';
import { BloqueDeLaPantalla } from './BloqueDeLaPantalla.tsx';
import { cambioAlElegir, eleccionDe, momentoDeLaEleccion, valorElegido } from './campos-en-la-ruta.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import { coordenada } from './datos.ts';
import { esBloque } from './componer.ts';
import { hijasDe, indicesDeLasPiezas, nombradosConLaHoja } from './composicion.ts';
import type { CambioDeLoTecleado, HojaDelMarco, LoTecleado, TecleadoDeUnActo } from './hoja.ts';
import { PiezaDeLaPantalla, type PiezasDelConsumidor } from './PiezaDeLaPantalla.tsx';
import { GrupoDeAcciones } from './GrupoDeAcciones.tsx';
import { tablasDe } from './reglas-de-las-tablas.ts';
import type { ActoAbierto, InteraccionDeLaPantalla, TecleadoDeLosActos } from './interaccion.ts';
import type {
  ManejadoresDeLasAcciones,
  ManejadoresDeLosActos,
  NavegacionDeLaPantalla,
} from './tipos-de-los-actos.ts';
import type {
  DefinicionDeBloque,
  DefinicionDeCampo,
  DefinicionDePantalla,
  OpcionDelCampo,
  PiezaDeLaPantalla as Pieza,
  Texto,
  TonoDeInsignia,
} from './tipos.ts';

/**
 * **El interprete**: una definicion, dibujada (#27).
 *
 * Sube de `rentas/frontend/src/pantallas/Pantalla.tsx`, donde se escribio para las cuarenta
 * pantallas de V8 y donde su propio docblock ya decia a donde iba: «las costuras de una
 * abstraccion no se conocen con un solo consumidor». Sube con el segundo, que es `caja`.
 *
 * <h2>Que dibuja, y que NO</h2>
 *
 * Dibuja **el cuerpo**: los bloques. La cabecera —miga, titulo e instruccion— y las acciones del
 * pie las pone `@kamayuk/shell`, que es quien sabe donde esta uno y a donde puede volver.
 *
 * <h2>No sabe que sistema lo monta, y lo que cambia de uno a otro entra por `props`</h2>
 *
 * Tres cosas, y cada una por un motivo:
 *
 * · **`traducir`** — las palabras de la definicion y de la ausencia son del sistema y estan en su
 *   idioma. En `rentas` pasaban por `useTranslation()` dentro de estas piezas; aqui no puede ser
 *   —`i18next` no es `peerDependency` de esta libreria, #19—, asi que el sistema pasa su `t`. Por
 *   omision no traduce nada. **Los datos no pasan por aqui**: traducir un importe seria absurdo.
 * · **`textos`** — las tres palabras que el interprete dice por su cuenta. Ver `textos.tsx`.
 * · **`tonoDeLaInsignia`** — de que color va una celda de situacion, deducido de lo que dice. Es
 *   vocabulario de cada sistema —«Vencida» en uno, «Anulado» en otro— y **es obligatoria, sin
 *   valor por omision**: uno que pintara todo de `ok` dibujaria «Vencida» en verde sin que nada lo
 *   delatara, que es el mismo motivo por el que `@kamayuk/sesion` exige su `prefijoDeClaves`.
 *
 * <h2>Los DATOS entran por parametro, y su ausencia se EXPLICA</h2>
 *
 * El interprete no pide datos y no puede. Recibe lo que se sepa —y, cuando no se sabe, por que—, y
 * lo dibuja. **La explicacion va UNA vez arriba, y no en cada hueco**: repetirla en cada campo la
 * convierte en ruido, y ponerla solo en los huecos deja una pantalla de rayas sin una palabra.
 *
 * <h2>Desde #44, `bloques` lleva piezas, y una la dibuja el sistema</h2>
 *
 * Ademas del bloque de #27, una definicion `DefinicionDePantalla<PiezaDeLaPantalla>` puede llevar
 * un aviso, el pie de operaciones y **una pieza del consumidor**: una `clave` que se busca en
 * `piezas`. Toda pieza salvo el pie puede depender de una lectura (`lectura`), existir solo si un
 * dato lo dice (`cuando`) y avisar del fallo de una vecina (`fallosDe`). Lo resuelve
 * `PiezaDeLaPantalla.tsx`, en un solo sitio.
 */

export interface PantallaProps {
  /** La de #27 —solo bloques— o una con piezas (#44). Las dos caben. */
  readonly definicion: DefinicionDePantalla<Pieza>;
  /** Lo que se sabe de los datos, y que decir donde no se sabe. */
  readonly datos: DatosDeLaPantalla;
  /** El tono de una celda de situacion, deducido de su texto. Obligatorio: ver arriba. */
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  /** Las palabras de la definicion y de la ausencia, en el idioma de la sesion. Por omision, tal cual. */
  readonly traducir?: (texto: string) => string;
  /**
   * Las palabras propias del interprete: las tres de `TEXTOS_DEL_INTERPRETE` y, desde #44, las de
   * `TEXTOS_DE_LAS_PIEZAS`. Un `TextosDelInterprete` entero sigue cabiendo.
   */
  readonly textos?: Partial<TextosDeLaPantalla>;
  /**
   * **El punto de extension** (#44, AC-2): el componente de cada `{ tipo: 'delConsumidor', clave }`.
   * Una clave sin componente dibuja un aviso visible, nunca un hueco en blanco.
   */
  readonly piezas?: PiezasDelConsumidor;
  /** Se avisa la primera vez que se toca un campo: es lo que marca la hoja como sucia. */
  readonly alEnsuciar?: () => void;

  // ── Lo que la hoja HACE (#66). Ver `tipos-de-los-actos.ts` ────────────────────────────────────
  /** Quien envia cada `{ tipo: 'acto', clave }`. Un acto sin manejador sale impedido, con su motivo. */
  readonly actos?: ManejadoresDeLosActos;
  /** Las operaciones que una accion `hace`: «Volver a leer la lista». */
  readonly alHacer?: ManejadoresDeLasAcciones;
  /** Como ir a otra hoja: lo da el marco (`useNavegacion()` de `@kamayuk/shell`). Sin ella, `va` sale impedida. */
  readonly navegacion?: NavegacionDeLaPantalla;
  /**
   * El acto abierto, si lo lleva la ruta (#67). **Sin esta `prop` la pantalla lo guarda en su estado**;
   * con ella —`null` incluido— manda quien la pasa, y abrir o cerrar solo avisa `alAbrirActo`.
   */
  readonly actoAbierto?: ActoAbierto | null;
  readonly alAbrirActo?: (clave: string | null, parametros?: Readonly<Record<string, string>>) => void;
  /** Se avisa cuando el sistema acepta una escritura: lo que marca la hoja como guardada. */
  readonly alQuedarGuardada?: () => void;
  /**
   * **La ruta y el marco de la hoja** (#67). `useHoja()` de `@kamayuk/shell` ya tiene esta forma:
   * `<Pantalla hoja={useHoja()} … />`. Con ella, lo que se elige en un maestro o en unas pestanas
   * se escribe en la ruta y se restituye de ella, y `nombrados` gana `ruta.*` y `marco.*`. Sin
   * ella, las dos piezas guardan la eleccion en su estado.
   */
  readonly hoja?: HojaDelMarco;
}

/** `bloque|campo` -> lo que se esta escribiendo en un campo que aun no lo ha llevado a la ruta (#94). */
type EnCurso = Record<string, string>;

const TAL_CUAL = (texto: string): string => texto;

/**
 * Nada tecleado. Uno solo, para no cambiar en cada pintada. Lo tecleado en los campos va por
 * `bloque|campo`, plano a proposito: una pantalla no anida mas.
 */
const NADA_TECLEADO: LoTecleado = { campos: {}, actos: {} };

/** Lo tecleado sin lo de una apertura de un acto. */
function sinElActo(tecleado: LoTecleado, apertura: string): LoTecleado {
  if (!Object.hasOwn(tecleado.actos, apertura)) return tecleado;
  const actos = { ...tecleado.actos };
  delete actos[apertura];
  return { ...tecleado, actos };
}

export function Pantalla({
  definicion,
  datos,
  tonoDeLaInsignia,
  traducir = TAL_CUAL,
  textos,
  piezas,
  alEnsuciar = () => {},
  actos,
  alHacer,
  navegacion,
  actoAbierto,
  alAbrirActo,
  alQuedarGuardada = () => {},
  hoja,
}: PantallaProps) {
  /**
   * **Donde vive lo tecleado** (#86, `lo-tecleado-y-la-negativa-sobreviven`).
   *
   * En el estado de la pantalla, como desde #27, salvo que la definicion pida conservarlo y la hoja
   * traiga donde: entonces vive en el marco, junto a la marca de sucia y con la misma clave, y la
   * `key` por destino ya no lo vacia mientras la hoja siga sucia. Ver `hoja.ts`.
   */
  const [tecleadoAqui, setTecleadoAqui] = useState<LoTecleado>(NADA_TECLEADO);
  const alTeclearEnLaHoja = hoja?.alTeclear;
  const enLaHoja = definicion.hoja?.conservaLoTecleado === 'soloSiSucia' ? alTeclearEnLaHoja : undefined;
  const tecleado: LoTecleado = enLaHoja === undefined ? tecleadoAqui : (hoja?.tecleado ?? NADA_TECLEADO);
  const teclear = (cambio: (antes: LoTecleado) => LoTecleado): void => {
    if (enLaHoja === undefined) {
      setTecleadoAqui(cambio);
      return;
    }
    const enElMarco: CambioDeLoTecleado = (antes) => cambio(antes ?? NADA_TECLEADO);
    enLaHoja(enElMarco);
  };
  const suciaAlTeclear = definicion.hoja?.suciaAlTeclear === true;
  /** Cada cambio que ensucia, con `suciaAlTeclear` (#86). Idempotente en el marco: no cuesta pintar. */
  const marcarSucia = (): void => {
    if (suciaAlTeclear) hoja?.marcarSucia?.();
  };
  // Aparte de `tecleado` a proposito (#94): lo que se escribe en un campo que va a la ruta NO
  // ensucia la hoja —no es trabajo sin guardar, es un filtro—, y mezclarlo con lo demas habria
  // dejado a `alEnsuciar` sin avisar nunca despues de tocar un filtro, porque solo avisa la
  // primera vez que el saco pasa de vacio a lleno.
  const [enCurso, setEnCurso] = useState<EnCurso>({});
  const [abiertoAqui, setAbiertoAqui] = useState<ActoAbierto | null>(null);
  const interaccion: InteraccionDeLaPantalla = {
    actos,
    alHacer,
    navegacion,
    // Controlado si el sistema lo pasa, aunque sea `null`: `undefined` es «no lo llevo yo».
    abierto: actoAbierto === undefined ? abiertoAqui : actoAbierto,
    abrirActo: (clave, parametros) => {
      if (actoAbierto === undefined) {
        setAbiertoAqui(clave === null ? null : { clave, ...(parametros === undefined ? {} : { parametros }) });
      }
      alAbrirActo?.(clave, parametros);
    },
    alEnsuciar,
    alQuedarGuardada: () => {
      alQuedarGuardada();
      // Guardado, la hoja vuelve a estar limpia y lo tecleado se vacia: asi PUEDE volver a
      // ensuciarse (#86). Sin `suciaAlTeclear`, lo de siempre: avisar y nada mas.
      if (!suciaAlTeclear) return;
      teclear(() => NADA_TECLEADO);
      hoja?.marcarGuardada?.();
    },
    marcarSucia,
    alDescartar: (apertura) => {
      // Limpia solo si lo del acto era lo unico tecleado: descartar un acto no puede dar por
      // guardados los campos de un bloque que siguen escritos.
      const queda = sinElActo(tecleado, apertura);
      if (Object.keys(queda.campos).length === 0 && Object.keys(queda.actos).length === 0) {
        hoja?.marcarGuardada?.();
      }
    },
    tecleadoDeLosActos: enLaHoja === undefined ? undefined : tecleadoDeLosActos(tecleado, teclear),
  };
  const palabras: TextosDeLaPantalla = { ...TEXTOS_DEL_INTERPRETE, ...TEXTOS_DE_LAS_PIEZAS, ...textos };

  const cambiar = (bloque: number, campo: number, valor: string | boolean) => {
    const clave = `${String(bloque)}|${String(campo)}`;
    // Con `suciaAlTeclear`, CADA cambio (#86): el aviso de la primera tecla no vuelve a salir si lo
    // tecleado no se vacia, y una hoja que alguien marco guardada por su cuenta quedaba limpia con
    // cambios dentro. En el marco es idempotente, y no cuesta un renderizado por tecla.
    marcarSucia();
    if (enLaHoja !== undefined) {
      // Fuera del cambio, y no dentro: el cambio lo aplica el marco en SU estado, y avisar desde
      // ahi seria cambiar otro estado mientras se calcula el suyo.
      if (Object.keys(tecleado.campos).length === 0) alEnsuciar();
      teclear((antes) => ({ ...antes, campos: { ...antes.campos, [clave]: valor } }));
      return;
    }
    setTecleadoAqui((antes) => {
      // El aviso va UNA vez, en la primera tecla, y no en cada pulsacion: quien escucha esto
      // marca la hoja como sucia, y marcarla cuarenta veces seguidas es cuarenta renderizados.
      if (Object.keys(antes.campos).length === 0) alEnsuciar();
      return { ...antes, campos: { ...antes.campos, [clave]: valor } };
    });
  };

  /**
   * Lo que pasa al tocar un campo QUE ESCRIBE EN LA RUTA (#94), y que es distinto en dos cosas.
   *
   * · **No ensucia la hoja.** Un filtro no es trabajo sin guardar: vive en la barra de direcciones,
   *   y avisar de que «hay cambios sin guardar» por haber acotado una lista manda a guardar algo
   *   que no existe.
   * · **`alElegir` no pasa por el estado de la pantalla**: mueve la ruta y ya esta. La ruta ES el
   *   valor, y guardar ademas una copia aqui deja dos sitios que se pueden desincronizar —el de
   *   atras del navegador contra el de la pantalla—.
   */
  const elegir = (
    bloque: DefinicionDeBloque<Texto, OpcionDelCampo>,
    indiceDelBloque: number,
    indiceDelCampo: number,
    campo: DefinicionDeCampo<OpcionDelCampo>,
    valor: string,
  ) => {
    const eleccion = eleccionDe(campo);
    // Sin `hoja` no hay donde escribir: se queda en la pantalla, como antes de #94.
    if (eleccion === undefined || hoja === undefined) {
      cambiar(indiceDelBloque, indiceDelCampo, valor);
      return;
    }
    if (momentoDeLaEleccion(campo) === 'alElegir') {
      hoja.moverLaRuta(cambioAlElegir(bloque, eleccion, valor));
      return;
    }
    setEnCurso((antes) => ({ ...antes, [coordenada(indiceDelBloque, indiceDelCampo)]: valor }));
  };

  /**
   * Salir de un campo `alSalir` —o pulsar Intro en el— lleva lo escrito a la ruta, **una vez**.
   *
   * Y lo saca del saco de en curso, para que lo que se vea salga de la ruta: dos sitios con el
   * mismo valor son dos sitios que pueden discrepar, y el que manda es el que se puede compartir.
   */
  const salirDelCampo = (
    bloque: DefinicionDeBloque<Texto, OpcionDelCampo>,
    indiceDelBloque: number,
    indiceDelCampo: number,
    campo: DefinicionDeCampo<OpcionDelCampo>,
  ) => {
    const eleccion = eleccionDe(campo);
    if (eleccion === undefined || hoja === undefined) return;
    const escrito = enCurso[coordenada(indiceDelBloque, indiceDelCampo)];
    // Nada escrito desde la ultima vez: salir del campo no puede volver a pedir lo mismo.
    if (escrito === undefined) return;
    setEnCurso((antes) => {
      const despues = { ...antes };
      delete despues[coordenada(indiceDelBloque, indiceDelCampo)];
      return despues;
    });
    hoja.moverLaRuta(cambioAlElegir(bloque, eleccion, escrito));
  };

  const valoresDe = (
    bloque: number,
    campos: readonly DefinicionDeCampo<OpcionDelCampo>[],
  ): Record<number, string | boolean> => {
    const salida: Record<number, string | boolean> = {};
    // Primero lo que se sepa de la API; despues lo que diga la ruta (#94), y por ultimo lo tecleado,
    // porque un campo que alguien esta escribiendo no puede saltar hacia atras cuando llegue una
    // respuesta.
    campos.forEach((campo, i) => {
      const sabido = datos.valores?.get(coordenada(bloque, i));
      if (sabido !== undefined) salida[i] = sabido;
      const enLaRuta = hoja === undefined ? undefined : valorElegido(campo, hoja.ruta);
      if (enLaRuta !== undefined) salida[i] = enLaRuta;
    });
    for (const [clave, valor] of Object.entries({ ...tecleado.campos, ...enCurso })) {
      const [b, c] = clave.split('|');
      if (b === String(bloque) && c !== undefined) salida[Number(c)] = valor;
    }
    return salida;
  };

  // Los de la hoja van DEBAJO de los del sistema (#67). Sin hoja, `datos` es el mismo objeto.
  const conLaHoja: DatosDeLaPantalla =
    hoja === undefined ? datos : { ...datos, nombrados: nombradosConLaHoja(hoja, datos.nombrados) };
  const indices = indicesDeLasPiezas(definicion);

  /**
   * Una pieza en su sitio. Recursiva desde #67: las pestanas y el detalle de un maestro dibujan sus
   * hijas por aqui, con el indice que les da `indicesDeLasPiezas` —en anchura, asi que los de
   * primer nivel son los de siempre—.
   */
  const dibujar = (pieza: Pieza, sitio: string): ReactNode => {
    const i = indices.get(sitio) ?? -1;
    return (
      <PiezaDeLaPantalla
        // Un bloque conserva la clave de #27, su titulo, por lo que dice abajo. Lo demas, su tipo
        // y su sitio: una pieza oculta por `cuando` NO se saca de la lista, asi que el sitio de
        // las demas no se mueve.
        key={clavePara(pieza, i)}
        pieza={pieza}
        indice={i}
        datos={conLaHoja}
        traducir={traducir}
        textos={palabras}
        piezas={piezas}
        interaccion={interaccion}
        hoja={hoja}
        tonoDeLaInsignia={tonoDeLaInsignia}
        dibujarHija={(j) => {
          const hija = hijasDe(pieza)[j];
          return hija === undefined ? null : dibujar(hija, `${sitio}.${String(j)}`);
        }}
        dibujarBloque={({ enLugarDelCuerpo, encimaDelCuerpo }) =>
          esBloque(pieza) ? (
            <BloqueDeLaPantalla
              bloque={pieza}
              valores={valoresDe(i, pieza.campos)}
              filas={datos.filas?.get(i)}
              conteo={datos.conteos?.get(i)}
              datosDeLasTablas={datos.tablas}
              interaccion={interaccion}
              ausencia={datos.ausencia}
              ausenciaPorCampo={datos.ausenciaPorCampo}
              indice={i}
              alCambiar={(campo, valor) => {
                const definicion = pieza.campos[campo];
                if (definicion !== undefined && eleccionDe(definicion) !== undefined && typeof valor === 'string') {
                  elegir(pieza, i, campo, definicion, valor);
                  return;
                }
                cambiar(i, campo, valor);
              }}
              alSalirDelCampo={(campo) => {
                const definicion = pieza.campos[campo];
                if (definicion !== undefined) salirDelCampo(pieza, i, campo, definicion);
              }}
              traducir={traducir}
              textos={palabras}
              tonoDeLaInsignia={tonoDeLaInsignia}
              nombrados={conLaHoja.nombrados}
              hoja={hoja}
              enLugarDelCuerpo={enLugarDelCuerpo}
              encimaDelCuerpo={encimaDelCuerpo}
              acciones={
                pieza.acciones === undefined || pieza.acciones.length === 0 ? undefined : (
                  <GrupoDeAcciones
                    acciones={pieza.acciones}
                    nombrados={conLaHoja.nombrados}
                    traducir={traducir}
                    textos={palabras}
                    interaccion={interaccion}
                  />
                )
              }
            />
          ) : null
        }
      />
    );
  };

  return (
    // Con una tabla de cabecera fija, la pantalla cede el alto que le den hasta el marco de esa tabla
    // (#65). Sin ella, la de siempre.
    <div className={cedeElAlto(definicion) ? 'flex min-h-0 flex-1 flex-col gap-[14px]' : 'flex flex-col gap-[14px]'}>
      {/* Una vez, arriba: ver el docblock. Sin frase no hay caja: una alerta vacia es un hueco (#44). */}
      {datos.ausencia.explicacion === '' ? null : (
        <Alerta tono={datos.ausencia.tono}>{traducir(datos.ausencia.explicacion)}</Alerta>
      )}
      {definicion.bloques.map((pieza, i) => dibujar(pieza, String(i)))}
    </div>
  );
}

/** Lo tecleado en los actos, leido y cambiado dentro de lo tecleado de la hoja (#86). */
function tecleadoDeLosActos(
  tecleado: LoTecleado,
  teclear: (cambio: (antes: LoTecleado) => LoTecleado) => void,
): TecleadoDeLosActos {
  return {
    leer: (apertura) => (Object.hasOwn(tecleado.actos, apertura) ? tecleado.actos[apertura] : undefined),
    cambiar: (apertura, cambio) => {
      teclear((antes) => {
        const previo: TecleadoDeUnActo | undefined = Object.hasOwn(antes.actos, apertura)
          ? antes.actos[apertura]
          : undefined;
        const nuevo = cambio(previo);
        return nuevo === undefined ? sinElActo(antes, apertura) : { ...antes, actos: { ...antes.actos, [apertura]: nuevo } };
      });
    },
  };
}

/** Si alguna tabla de la pantalla tiene la cabecera fija: su marco necesita el alto de la hoja (#65). */
function cedeElAlto(definicion: DefinicionDePantalla<Pieza>): boolean {
  return definicion.bloques.some((pieza) => esBloque(pieza) && tablasDe(pieza).some((tabla) => tabla.cabeceraFija === true));
}

/**
 * La clave de React de una pieza. El titulo de un bloque es unico dentro de cada pantalla, y con el
 * indice reordenar los bloques dejaria a React reusando el estado del anterior (#27).
 */
function clavePara(pieza: Pieza, indice: number): string {
  if (esBloque(pieza) && typeof pieza.titulo === 'string') {
    return pieza.titulo;
  }
  return `${pieza.tipo ?? 'bloque'}|${String(indice)}`;
}
