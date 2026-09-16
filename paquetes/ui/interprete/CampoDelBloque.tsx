import { Calendario } from '../shadcn/calendario.tsx';
import { Area, Campo, Dato } from '../shadcn/campo.tsx';
import { anchoCompleto, tipoDe } from '../shadcn/campos.ts';
import { Casilla } from '../shadcn/casilla.tsx';
import { Desplegable, Opcion } from '../shadcn/desplegable.tsx';
import { CONTROL } from '../shadcn/control.ts';
import { Capa, DisparadorEmergente, Emergente } from '../shadcn/emergente.tsx';
import { Etiqueta } from '../shadcn/etiqueta.tsx';
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
 * <h2>Por que el `switch` es exhaustivo y no lleva `default`</h2>
 *
 * Sin `default`, anadir un octavo tipo a `TipoDeCampo` deja este archivo **sin compilar**, que es
 * donde se quiere que salte. Con `default`, compilaria y dibujaria el tipo nuevo como texto.
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
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDelInterprete;
  /** Los datos con nombre de la pantalla, para la insignia que decide por uno de ellos (#65). */
  readonly nombrados?: Nombrados;
}

export function CampoDelBloque({
  campo,
  valor,
  ausencia,
  enElCampo,
  alCambiar,
  traducir,
  textos,
  nombrados,
}: CampoDelBloqueProps) {
  const tipo = tipoDe(campo.tipo);
  const ancho = anchoCompleto(campo.tipo);
  // «(opcional)» sale de la propia ayuda, como en el artboard: no hay un campo aparte que
  // mantener, y la frase que lo dice es la que el usuario lee. Se mira la ayuda SIN traducir,
  // porque es la definicion la que decide que el campo es opcional, no el idioma de la sesion.
  const ayuda = 'ayuda' in campo ? campo.ayuda : undefined;
  const marcador = 'marcador' in campo && campo.marcador !== undefined ? traducir(campo.marcador) : undefined;
  const opcional = ayuda !== undefined && /opcional/i.test(ayuda);

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
        <Etiqueta {...comun} ayuda={undefined}>
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
    case 'd':
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
              {typeof valor === 'string' && valor !== '' ? valor : (marcador ?? textos.marcadorDeFecha)}
            </DisparadorEmergente>
            <Capa>
              <Calendario
                mode="single"
                onSelect={(dia) => {
                  alCambiar(dia === undefined ? '' : dia.toLocaleDateString('es-PE'));
                }}
              />
            </Capa>
          </Emergente>
        </Etiqueta>
      );
    case 'a':
      return (
        <Etiqueta {...comun}>
          <Area
            placeholder={marcador}
            value={typeof valor === 'string' ? valor : ''}
            onChange={(e) => {
              alCambiar(e.target.value);
            }}
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
          />
        </Etiqueta>
      );
  }
}
