import { useState } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
import { TEXTOS_DEL_INTERPRETE, type TextosDelInterprete } from '../textos.tsx';
import { BloqueDeLaPantalla } from './BloqueDeLaPantalla.tsx';
import type { DatosDeLaPantalla } from './datos.ts';
import { coordenada } from './datos.ts';
import type { DefinicionDePantalla, TonoDeInsignia } from './tipos.ts';

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
 */

export interface PantallaProps {
  readonly definicion: DefinicionDePantalla;
  /** Lo que se sabe de los datos, y que decir donde no se sabe. */
  readonly datos: DatosDeLaPantalla;
  /** El tono de una celda de situacion, deducido de su texto. Obligatorio: ver arriba. */
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  /** Las palabras de la definicion y de la ausencia, en el idioma de la sesion. Por omision, tal cual. */
  readonly traducir?: (texto: string) => string;
  /** Las tres palabras propias del interprete. Ver `TEXTOS_DEL_INTERPRETE`. */
  readonly textos?: Partial<TextosDelInterprete>;
  /** Se avisa la primera vez que se toca un campo: es lo que marca la hoja como sucia. */
  readonly alEnsuciar?: () => void;
}

/** `bloque|campo` -> lo tecleado. Plano a proposito: una pantalla no anida mas. */
type Tecleado = Record<string, string | boolean>;

const TAL_CUAL = (texto: string): string => texto;

export function Pantalla({
  definicion,
  datos,
  tonoDeLaInsignia,
  traducir = TAL_CUAL,
  textos,
  alEnsuciar = () => {},
}: PantallaProps) {
  const [tecleado, setTecleado] = useState<Tecleado>({});
  const palabras: TextosDelInterprete = { ...TEXTOS_DEL_INTERPRETE, ...textos };

  const cambiar = (bloque: number, campo: number, valor: string | boolean) => {
    setTecleado((antes) => {
      // El aviso va UNA vez, en la primera tecla, y no en cada pulsacion: quien escucha esto
      // marca la hoja como sucia, y marcarla cuarenta veces seguidas es cuarenta renderizados.
      if (Object.keys(antes).length === 0) alEnsuciar();
      return { ...antes, [`${String(bloque)}|${String(campo)}`]: valor };
    });
  };

  const valoresDe = (bloque: number, campos: number): Record<number, string | boolean> => {
    const salida: Record<number, string | boolean> = {};
    // Primero lo que se sepa de la API; lo tecleado va DESPUES y gana, porque un campo que alguien
    // esta escribiendo no puede saltar hacia atras cuando llegue una respuesta.
    for (let campo = 0; campo < campos; campo += 1) {
      const sabido = datos.valores?.get(coordenada(bloque, campo));
      if (sabido !== undefined) salida[campo] = sabido;
    }
    for (const [clave, valor] of Object.entries(tecleado)) {
      const [b, c] = clave.split('|');
      if (b === String(bloque) && c !== undefined) salida[Number(c)] = valor;
    }
    return salida;
  };

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Una vez, arriba: ver el docblock. */}
      <Alerta tono={datos.ausencia.tono}>{traducir(datos.ausencia.explicacion)}</Alerta>
      {definicion.bloques.map((bloque, i) => (
        <BloqueDeLaPantalla
          // El titulo del bloque es unico dentro de cada pantalla, y con el indice reordenar los
          // bloques dejaria a React reusando el estado del anterior.
          key={bloque.titulo}
          bloque={bloque}
          valores={valoresDe(i, bloque.campos.length)}
          filas={datos.filas?.get(i)}
          conteo={datos.conteos?.get(i)}
          ausencia={datos.ausencia}
          ausenciaPorCampo={datos.ausenciaPorCampo}
          indice={i}
          alCambiar={(campo, valor) => {
            cambiar(i, campo, valor);
          }}
          traducir={traducir}
          textos={palabras}
          tonoDeLaInsignia={tonoDeLaInsignia}
        />
      ))}
    </div>
  );
}
