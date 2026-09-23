import type { KeyboardEvent, ReactElement } from 'react';

import { Calendario } from '../shadcn/calendario.tsx';
import { Area, Campo, Dato } from '../shadcn/campo.tsx';
import { anchoCompleto, tipoDe } from '../shadcn/campos.ts';
import { Casilla } from '../shadcn/casilla.tsx';
import { Desplegable, Opcion } from '../shadcn/desplegable.tsx';
import { CONTROL } from '../shadcn/control.ts';
import { Capa, DisparadorEmergente, Emergente } from '../shadcn/emergente.tsx';
import { Etiqueta } from '../shadcn/etiqueta.tsx';
import { diaDeUnaFecha, fechaDeUnDia, fechaLeida } from '../shadcn/fecha.ts';
import { Insignia } from '../Insignia.tsx';
import type { TextosDelInterprete } from '../textos.tsx';
import { cn } from '../utilidades.ts';
import type { Nombrados } from './componer.ts';
import type { Ausencia } from './datos.ts';
import { resolverInsignia } from './reglas-de-las-tablas.ts';
import type { DefinicionDeCampo, OpcionDelCampo } from './tipos.ts';

/**
 * Un campo de la definicion, dibujado con la pieza que le toca (#27).
 *
 * <h2>El reparto sale de `shadcn/campos.ts`, no de aqui</h2>
 *
 * `tipoDe()` pela la marca de ancho y devuelve una de las siete letras, y **revienta** con una
 * octava en vez de caer en «campo de texto». Una definicion con el tipo mal escrito dibujada como
 * texto se ve perfecta, y lo que era un desplegable de lista cerrada pasa a ser un cuadro donde se
 * teclea cualquier cosa.
 *
 * <h2>Por que el `switch` es exhaustivo y no lleva `default` — y que lo hace cierto (#111)</h2>
 *
 * Anadir un octavo tipo a `TipoDeCampo` deja este archivo **sin compilar**, que es donde se quiere
 * que salte, **porque la funcion declara que devuelve `ReactElement`**. El `switch` sin `default` no
 * bastaba: hasta #111 este parrafo lo afirmaba sin el tipo de retorno, y era falso. Medido: con `'x'`
 * en `TipoDeCampo` y en `PIEZA_POR_TIPO`, `tsc` daba RC=0 —ni `strict` ni este `tsconfig` llevan
 * `noImplicitReturns`—, la funcion devolvia `undefined` y el campo no se dibujaba, sin ningun aviso.
 *
 * Con el retorno anotado, la rama que falta sale como **TS2366** («Function lacks ending return
 * statement and return type does not include 'undefined'»), y sale **con el `tsconfig` de cada
 * consumidor**, que compila esta fuente con el suyo: basta `strictNullChecks`, que trae `strict`. Un
 * flag en el `tsconfig` de aqui no protegeria a nadie mas. Ademas, `switch-exhaustiveness-check`
 * lo senala en el lint de este repositorio (ver `eslint.config.js`).
 *
 * Con `default`, compilaria y dibujaria el tipo nuevo como texto.
 *
 * <h2>El de solo lectura NO se dibuja como campo desactivado</h2>
 *
 * Es un `Dato`: filo discontinuo y `<output>`. No es un campo que «ahora no se puede escribir»: es
 * un valor que esta pantalla no decide, y esa diferencia evita que alguien intente corregir aqui
 * una cifra que se corrige en otro sitio.
 *
 * <h2>Y cuando no hay dato, lo DICE</h2>
 *
 * Nunca una cifra, y nunca un cero: **un cero es una afirmacion**, y no saber no lo es.
 *
 * <h2>Desde #65: marcador, ayuda en una lista, opciones con valor y rotulo, e insignia</h2>
 *
 * · **Lo que viaja es el `valor` de la opcion, y nunca pasa por `traducir`**: lo que se lee, si.
 *   Radix no admite `value=""` en un `Select.Item`, y «Todos» con valor vacio es legitimo, asi que
 *   el vacio se codifica por dentro (`VALOR_VACIO`) y sale como `''`.
 * · **Un dato de solo lectura con `insignia`** se pinta con el tono de la regla. Sin valor, dice su
 *   ausencia como cualquier otro: no se pinta un estado que nadie ha leido.
 *
 * <h2>Desde #86: lo opcional es un dato, el error llega de fuera, y el de solo lectura tiene ayuda</h2>
 *
 * · **«(opcional)» sale de `campo.opcional`, y ya no de la ayuda** (`obligatorio-u-opcional-por-campo`).
 *   Se deducia con `/opcional/i` sobre la ayuda sin traducir, y fallaba por los dos lados: una ayuda
 *   que no nombraba la palabra —o que venia en otro idioma en la definicion— dejaba sin marca un
 *   campo opcional, y «no es opcional» lo marcaba. Y en un acto habia DOS fuentes: `opcional` decidia
 *   si se podia enviar en blanco y la ayuda decidia la marca, asi que podian contradecirse.
 * · **`error`** lo pone quien sabe que esta mal —el acto, tras el primer intento
 *   (`errores-tras-el-primer-intento`)— y va a la `Etiqueta`, que ya lo sabia colgar con
 *   `aria-invalid` y `aria-describedby`.
 * · **La ayuda de un campo de solo lectura se dibuja** (`ayuda-en-un-campo-de-solo-lectura`). La
 *   casilla sigue sin ella: su texto es la etiqueta de la marca.
 */

/**
 * Como viaja `''` por dentro del `Select` de Radix, que lo rechaza con «A <Select.Item /> must have
 * a value prop that is not an empty string». Un caracter de control: ninguna opcion de una
 * definicion lo escribe, y nunca sale de este archivo.
 */
const VALOR_VACIO = '\u0000';
const haciaRadix = (valor: string): string => (valor === '' ? VALOR_VACIO : valor);
const desdeRadix = (valor: string): string => (valor === VALOR_VACIO ? '' : valor);
const valorDe = (opcion: OpcionDelCampo): string => (typeof opcion === 'string' ? opcion : opcion.valor);
const rotuloDe = (opcion: OpcionDelCampo): string => (typeof opcion === 'string' ? opcion : opcion.rotulo);

export interface CampoDelBloqueProps {
  readonly campo: DefinicionDeCampo<OpcionDelCampo>;
  /** Lo tecleado, o —en un campo de solo lectura— lo que se sepa de la API. */
  readonly valor?: string | boolean;
  /** Que decir en el hueco de un campo de solo lectura cuando no hay valor. */
  readonly ausencia: Ausencia;
  /** Y si ESTE campo tiene su propio motivo, el suyo. Ver `datos.ts`. */
  readonly enElCampo?: string;
  readonly alCambiar: (valor: string | boolean) => void;
  /**
   * Se salio del campo, o se pulso Intro en el (#94). Solo lo atan los campos que escriben en la
   * ruta `alSalir`: el resto no tiene nada que hacer al salir.
   */
  readonly alSalir?: () => void;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDelInterprete;
  /** Los datos con nombre de la pantalla, para la insignia que decide por uno de ellos (#65). */
  readonly nombrados?: Nombrados;
  /** Que esta mal, ya en el idioma de la sesion (#86). Pinta el control invalido y se lee al enfocarlo. */
  readonly error?: string;
}

export function CampoDelBloque({
  campo,
  valor,
  ausencia,
  enElCampo,
  alCambiar,
  alSalir,
  traducir,
  textos,
  nombrados,
  error,
}: CampoDelBloqueProps): ReactElement {
  const tipo = tipoDe(campo.tipo);
  const ancho = anchoCompleto(campo.tipo);
  const ayuda = 'ayuda' in campo ? campo.ayuda : undefined;
  const marcador = 'marcador' in campo && campo.marcador !== undefined ? traducir(campo.marcador) : undefined;
  // Un dato de la definicion, y no una palabra de la ayuda (#86): ver el javadoc.
  const opcional = 'opcional' in campo && campo.opcional === true;

  const comun = {
    // El nombre del campo del contrato va JUNTO a la etiqueta y no dentro de ella (#61,
    // `cabecera-con-campo-y-dominio`, N5 de normativa#52): «Registro `registroId`». No se traduce
    // —es codigo, como las operaciones del pie de #44—, y por eso no puede ser parte de la cadena
    // que se traduce.
    rotulo:
      campo.campo === undefined ? (
        traducir(campo.etiqueta)
      ) : (
        <>
          {traducir(campo.etiqueta)} <code data-slot="campo-del-contrato">{campo.campo}</code>
        </>
      ),
    ancho,
    ayuda: ayuda === undefined ? undefined : traducir(ayuda),
    opcional,
    // Se pasa SIEMPRE, y no solo cuando `opcional` es cierto: una propiedad que se pone a veces es
    // una propiedad que un dia se olvida.
    marcaDeOpcional: textos.opcional,
    error,
  } as const;

  switch (tipo) {
    case 's': {
      const opciones = 'opciones' in campo ? campo.opciones : [];
      return (
        <Etiqueta {...comun}>
          <Desplegable
            value={haciaRadix(typeof valor === 'string' ? valor : valorDe(opciones[0] ?? ''))}
            onValueChange={(elegido) => {
              alCambiar(desdeRadix(elegido));
            }}
          >
            {opciones.map((o) => (
              // El VALOR es la opcion tal cual la escribe la definicion; lo que se lee, traducido.
              // Si el valor se tradujera, cambiar de idioma cambiaria lo que se envia.
              <Opcion key={valorDe(o)} value={haciaRadix(valorDe(o))}>
                {traducir(rotuloDe(o))}
              </Opcion>
            ))}
          </Desplegable>
        </Etiqueta>
      );
    }
    case 'r': {
      const hayDato = typeof valor === 'string' && valor !== '';
      const insignia =
        'insignia' in campo && campo.insignia !== undefined
          ? resolverInsignia(campo.insignia, hayDato ? valor : undefined, nombrados, traducir)
          : undefined;
      return (
        // Con su ayuda desde #86: de donde sale el dato, o por que aqui no se corrige.
        <Etiqueta {...comun}>
          <Dato
            // `data-sin-dato` no es decoracion: es lo que permite a una guarda contar los huecos
            // de una pantalla sin leer el texto, que cambia con quien la monta.
            data-sin-dato={hayDato ? undefined : ''}
            className={hayDato ? undefined : 'text-tinta-3 italic'}
          >
            {/* El valor NO se traduce: es un dato. La palabra del hueco si, porque es una frase. */}
            {insignia !== undefined ? (
              <Insignia tono={insignia.tono}>{insignia.texto}</Insignia>
            ) : hayDato ? (
              valor
            ) : (
              traducir(enElCampo ?? ausencia.enElCampo)
            )}
          </Dato>
        </Etiqueta>
      );
    }
    case 'c':
      return (
        <Etiqueta {...comun} ayuda={undefined}>
          <Casilla
            rotulo={'casilla' in campo ? traducir(campo.casilla) : ''}
            checked={valor === true}
            onCheckedChange={(marcado) => {
              alCambiar(marcado === true);
            }}
          />
        </Etiqueta>
      );
    case 'd': {
      // Lo que VIAJA es ISO y lo que se LEE es `dd/mm/aaaa`, desde #94: ver `shadcn/fecha.ts`.
      const fecha = typeof valor === 'string' ? valor : '';
      const elegido = fecha === '' ? undefined : diaDeUnaFecha(fecha);
      return (
        <Etiqueta {...comun}>
          <Emergente>
            {/* El disparador ES el control: es lo que la etiqueta apunta y lo que se enfoca con el
                tabulador. La capa solo lleva el calendario. */}
            {/* El filo y el foco son los de `CONTROL`, como en los otros tres controles del artboard.
                En `rentas` estaban escritos a mano con las mismas clases, y la guarda de
                `shadcn/foco.test.ts` lo destapo al subir: un anillo escrito a mano es un foco que
                ninguna guarda mide. */}
            <DisparadorEmergente className={cn(CONTROL, 'text-left')}>
              {fecha === '' ? (marcador ?? textos.marcadorDeFecha) : fechaLeida(fecha)}
            </DisparadorEmergente>
            <Capa>
              <Calendario
                mode="single"
                // El dia que lleva el campo sale marcado: abrir el calendario de una fecha puesta
                // sin nada marcado obliga a buscar en el mes cual era.
                {...(elegido === undefined ? {} : { selected: elegido, defaultMonth: elegido })}
                onSelect={(dia) => {
                  alCambiar(dia === undefined ? '' : fechaDeUnDia(dia));
                }}
              />
            </Capa>
          </Emergente>
        </Etiqueta>
      );
    }
    case 'a':
      return (
        <Etiqueta {...comun}>
          <Area
            placeholder={marcador}
            value={typeof valor === 'string' ? valor : ''}
            onChange={(e) => {
              alCambiar(e.target.value);
            }}
            // En un area Intro es una linea nueva, asi que aqui solo cuenta salir del campo.
            {...(alSalir === undefined ? {} : { onBlur: alSalir })}
          />
        </Etiqueta>
      );
    case '':
    case 't':
      return (
        <Etiqueta {...comun}>
          <Campo
            placeholder={marcador}
            value={typeof valor === 'string' ? valor : ''}
            onChange={(e) => {
              alCambiar(e.target.value);
            }}
            {...(alSalir === undefined
              ? {}
              : {
                  onBlur: alSalir,
                  // Intro tambien: teclear y pulsar Intro es como se filtra una lista desde que hay
                  // listas, y obligar a salir del campo con el raton o con el tabulador para que
                  // pase algo se lee como que el campo no hace nada.
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key === 'Enter') alSalir();
                  },
                })}
          />
        </Etiqueta>
      );
  }
}
