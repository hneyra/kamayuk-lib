import type { ReactNode } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
import {
  TEXTOS_DE_LAS_PIEZAS,
  TEXTOS_DEL_INTERPRETE,
  type TextosDeLaPantalla,
} from '../textos.tsx';
import { BloqueDeLaPantalla } from './BloqueDeLaPantalla.tsx';
import { eleccionDe } from './campos-en-la-ruta.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import { esBloque } from './componer.ts';
import { hijasDe, indicesDeLasPiezas, nombradosConLaHoja } from './composicion.ts';
import { useEnElMarcoOAqui } from './en-el-marco-o-aqui.ts';
import { type EntornoDelInterprete, ProveedorDelEntorno } from './entorno.tsx';
import type { HojaDelMarco } from './hoja.ts';
import { useEnCurso, useLoTecleado, valoresDelBloque } from './lo-tecleado.ts';
import { PiezaDeLaPantalla, type PiezasDelConsumidor } from './PiezaDeLaPantalla.tsx';
import { GrupoDeAcciones } from './GrupoDeAcciones.tsx';
import { tablasDe } from './reglas-de-las-tablas.ts';
import type { AccionesDeLaHoja, ActoAbierto, CicloDelActo } from './interaccion.ts';
import type {
  ManejadoresDeLasAcciones,
  ManejadoresDeLosActos,
  NavegacionDeLaPantalla,
} from './tipos-de-los-actos.ts';
import type { DefinicionDePantalla, PiezaDeLaPantalla as Pieza, TonoDeInsignia } from './tipos.ts';

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
 * · **`textos`** — las palabras que el interprete dice por su cuenta, en dos sacos: las tres de
 *   `TextosDelInterprete`, que no gana claves porque `rentas` lo construye entero, y las de
 *   `TextosDeLasPiezas` (#44), el saco hermano donde entra cada palabra nueva. Llega un `Partial`
 *   de los dos juntos, y lo que falta sale del castellano de la libreria. Ver `textos.tsx`.
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
 *
 * <h2>Desde #120, compone y dibuja; lo tecleado es de `lo-tecleado.ts`</h2>
 *
 * Donde vive lo tecleado, la marca de sucia, los campos que escriben en la ruta (#94) y en que orden
 * gana cada valor salieron a `useLoTecleado`, `useEnCurso` y `valoresDelBloque`. El acto abierto,
 * controlado o no, lo lleva `useEnElMarcoOAqui`, el mismo «en el marco o aqui» de la ruta de las
 * tablas, el maestro y las pestanas.
 *
 * <h2>Desde #125, lo que no cambia de una pieza a otra va en un contexto</h2>
 *
 * `traducir`, `textos` (ya fundidos), `tonoDeLaInsignia` y `hoja` no bajan de pieza en pieza: los
 * pone aqui `ProveedorDelEntorno` (`entorno.tsx`), y una pieza montada fuera de esta pantalla
 * revienta diciendolo. Lo que la hoja hace baja partido en `AccionesDeLaHoja` y `CicloDelActo`
 * (`interaccion.ts`). **`PantallaProps` no cambia**: lo vigila una barrera de tipo
 * (`verificaciones/tipos/barreras-de-las-props-publicas.ts`).
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

const TAL_CUAL = (texto: string): string => texto;

/** Con el acto controlado, cambiarlo es cosa de quien lo pasa: ya se entera por `alAbrirActo`. */
const LO_CAMBIA_QUIEN_LO_PASA = (): void => {};

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
  // Donde vive lo tecleado, cuando ensucia y como se vacia: `lo-tecleado.ts` (#86, #120).
  const loTecleado = useLoTecleado(definicion, hoja, alEnsuciar);
  const { tecleado, cambiarElCampo } = loTecleado;
  // Lo que se escribe en un campo que va a la ruta (#94): aparte de lo tecleado, porque no ensucia.
  const { enCurso, elegir, salirDelCampo } = useEnCurso(hoja, cambiarElCampo);
  // El acto abierto: controlado si el sistema lo pasa, aunque sea `null`; `undefined` es «no lo llevo yo».
  const { valor: abierto, cambiar: fijarAbierto } = useEnElMarcoOAqui<ActoAbierto | null, ActoAbierto | null>(
    actoAbierto === undefined ? undefined : { valor: actoAbierto, cambiar: LO_CAMBIA_QUIEN_LO_PASA },
    null,
    (_antes, nuevo) => nuevo,
  );
  const accionesDeLaHoja: AccionesDeLaHoja = {
    actos,
    alHacer,
    navegacion,
    abrirActo: (clave, parametros) => {
      fijarAbierto(clave === null ? null : { clave, ...(parametros === undefined ? {} : { parametros }) });
      alAbrirActo?.(clave, parametros);
    },
  };
  const ciclo: CicloDelActo = {
    abierto,
    alEnsuciar,
    alQuedarGuardada: () => {
      alQuedarGuardada();
      loTecleado.alGuardar();
    },
    marcarSucia: loTecleado.marcarSucia,
    alDescartar: loTecleado.alDescartar,
    tecleadoDeLosActos: loTecleado.tecleadoDeLosActos,
  };
  const palabras: TextosDeLaPantalla = { ...TEXTOS_DEL_INTERPRETE, ...TEXTOS_DE_LAS_PIEZAS, ...textos };
  const entorno: EntornoDelInterprete = { traducir, textos: palabras, tonoDeLaInsignia, hoja };

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
        piezas={piezas}
        accionesDeLaHoja={accionesDeLaHoja}
        ciclo={ciclo}
        dibujarHija={(j) => {
          const hija = hijasDe(pieza)[j];
          return hija === undefined ? null : dibujar(hija, `${sitio}.${String(j)}`);
        }}
        dibujarBloque={({ enLugarDelCuerpo, encimaDelCuerpo }) =>
          esBloque(pieza) ? (
            <BloqueDeLaPantalla
              bloque={pieza}
              valores={valoresDelBloque(i, pieza.campos, datos, hoja, tecleado, enCurso)}
              // Con los de la hoja: el bloque lee de aqui sus filas, sus tablas, su ausencia y sus
              // `nombrados`, que hasta #125 le llegaban en seis `props` sueltas.
              datos={conLaHoja}
              accionesDeLaHoja={accionesDeLaHoja}
              indice={i}
              alCambiar={(campo, valor) => {
                const definicion = pieza.campos[campo];
                if (definicion !== undefined && eleccionDe(definicion) !== undefined && typeof valor === 'string') {
                  elegir(pieza, i, campo, definicion, valor);
                  return;
                }
                cambiarElCampo(i, campo, valor);
              }}
              alSalirDelCampo={(campo) => {
                const definicion = pieza.campos[campo];
                if (definicion !== undefined) salirDelCampo(pieza, i, campo, definicion);
              }}
              enLugarDelCuerpo={enLugarDelCuerpo}
              encimaDelCuerpo={encimaDelCuerpo}
              acciones={
                pieza.acciones === undefined || pieza.acciones.length === 0 ? undefined : (
                  <GrupoDeAcciones
                    acciones={pieza.acciones}
                    nombrados={conLaHoja.nombrados}
                    accionesDeLaHoja={accionesDeLaHoja}
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
    <ProveedorDelEntorno entorno={entorno}>
      {/* Con una tabla de cabecera fija, la pantalla cede el alto que le den hasta el marco de esa
          tabla (#65). Sin ella, la de siempre. */}
      <div className={cedeElAlto(definicion) ? 'flex min-h-0 flex-1 flex-col gap-[14px]' : 'flex flex-col gap-[14px]'}>
        {/* Una vez, arriba: ver el docblock. Sin frase no hay caja: una alerta vacia es un hueco (#44). */}
        {datos.ausencia.explicacion === '' ? null : (
          <Alerta tono={datos.ausencia.tono}>{traducir(datos.ausencia.explicacion)}</Alerta>
        )}
        {definicion.bloques.map((pieza, i) => dibujar(pieza, String(i)))}
      </div>
    </ProveedorDelEntorno>
  );
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
