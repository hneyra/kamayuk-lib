import { useId } from 'react';

import { Cajon, NotaDelCajon, PanelDelCajon, TituloDelCajon } from '../shadcn/cajon.tsx';
import { TEXTOS_DEL_MANDO_DE_TEMA, type TextosDelMandoDeTema } from '../textos.tsx';
import { cn } from '../utilidades.ts';
import { IDENTIDADES, MODOS, type Identidad, type Modo } from './ejes.ts';
import { useTema } from './ProveedorDeTema.tsx';

/**
 * **El mando de los temas** (`rentas`#111; sube a la libreria en #53).
 *
 * <h2>Lo que tiene que poner quien lo monta, y nada mas</h2>
 *
 *     <ProveedorDeTema configuracion={{ identidadPorOmision, prefijoDeClaves }}>   <- por ENCIMA
 *       …
 *       <Armazon opcionesDeSesion={[…, { rotulo: 'Preferencias', al: () => abrir() }, …]} />
 *       <MandoDeTema abierto={abierto} alCerrar={cerrar} textos={…} />
 *     </ProveedorDeTema>
 *
 * · **El `ProveedorDeTema` por encima.** El mando no guarda nada: lee y fija con `useTema()`, y
 *   fuera del proveedor revienta diciendolo en vez de dibujar un mando que no hace nada.
 * · **La opcion que lo abre**, en `opcionesDeSesion` del armazon. El armazon **no sabe que existe
 *   un tema** —ninguna de sus piezas lo necesita— y por eso el mando va como HERMANO del
 *   `<Armazon>` y no dentro: lo suyo es ofrecer la opcion y avisar de que se pulso.
 * · **`abierto` y `alCerrar`**: el cajon es controlado. `alCerrar` llega con Escape, con el velo y
 *   con cualquier otra salida de Radix; quien lo monta pone su estado a `false`.
 * · **`textos`, si traduce.** Sin ellos se ve el castellano de `TEXTOS_DEL_MANDO_DE_TEMA`, que es
 *   lo que `rentas` ensenaba. Un sistema con `i18next` pasa el saco entero por su `t()`.
 *
 * <h2>Por que un cajon y no una pantalla</h2>
 *
 * Porque V8 **no dibuja ninguna pantalla de preferencias**, y las cuarenta que dibuja estan
 * comparadas campo por campo contra el artboard en `rentas`. Inventar la cuarenta y uno seria
 * meter una pantalla que el artboard no tiene. El menu de sesion **si** trae «Preferencias», asi
 * que el mando cuelga de ahi.
 *
 * El cajon es la pieza de esta libreria que corresponde: sale por un lado, se cierra con Escape y
 * es un dialogo de verdad para el lector de pantalla. No hace falta pieza nueva.
 *
 * <h2>Los dos ejes se ofrecen SEPARADOS, porque son dos cosas distintas</h2>
 *
 *     Identidad visual   institucional | alto-contraste | sepia | clasico   <- de que servicio es esto
 *     Apariencia         claro | oscuro | el del sistema            <- como lo quiere ver quien mira
 *
 * Una sola lista —«claro, oscuro, alto contraste, sepia claro, sepia oscuro»— obliga a escribir
 * cada cruce y a repensarlo cada vez que entre una identidad. Cruzados son cuatro por tres, y el
 * tercero del segundo eje —«el del sistema»— no es un tema: es **no elegir**, y por eso vale `null`
 * y quita el atributo en vez de ponerlo en claro.
 *
 * <h2>Las opciones salen de `ejes.ts`, no de una lista de aqui</h2>
 *
 * `IDENTIDADES` y `MODOS` son las mismas listas de las que salen los tipos. Escribirlas aqui a mano
 * dejaria este mando corto el dia que entre una quinta identidad, y **sin que nada lo dijera**: el
 * tema existiria, su CSS viajaria en el paquete, y aqui no habria como elegirlo. Lo unico propio es
 * el rotulo con que se leen, que es texto, va en el saco y esta atado al tipo: una identidad sin
 * rotulo no compila.
 *
 * <h2>Y son `<input type="radio">` de verdad</h2>
 *
 * Un `<button aria-checked>` dibuja lo mismo y deja fuera el recorrido con flechas, el grupo con
 * nombre y el anuncio «2 de 3» del lector de pantalla. El aspecto se pinta sobre la etiqueta —con
 * los tokens del artboard, nunca con un color escrito aqui—, asi que no se pierde nada. `jsx-a11y`
 * **no lo vigila** —medido en #53: con un `<button role="radio" aria-checked>` o un
 * `<div role="radio">` en su sitio, el lint sale en verde—; lo vigilan las pruebas de accesibilidad
 * y de teclado de `MandoDeTema.test.tsx`.
 */

/** Lo que se ofrece por cada eje: su clave estable, su rotulo y el valor que fija. */
interface Opcion<T> {
  /** Estable y sin tildes: es lo que el arnes usa para apuntar a la opcion. */
  readonly clave: string;
  readonly rotulo: string;
  readonly valor: T;
}

function deLaIdentidad(rotulos: TextosDelMandoDeTema['identidades']): readonly Opcion<Identidad>[] {
  return IDENTIDADES.map((identidad) => ({
    clave: identidad,
    rotulo: rotulos[identidad],
    valor: identidad,
  }));
}

function delModo(
  rotulos: TextosDelMandoDeTema['modos'],
  elDelSistema: string,
): readonly Opcion<Modo | null>[] {
  return [
    ...MODOS.map((modo) => ({ clave: modo, rotulo: rotulos[modo], valor: modo })),
    // El tercero es **no elegir**, y por eso su valor es `null` y no una tercera paleta.
    { clave: 'sistema', rotulo: elDelSistema, valor: null },
  ];
}

function Eje<T>({
  rotulo,
  nota,
  opciones,
  elegido,
  al,
}: {
  readonly rotulo: string;
  readonly nota: string;
  readonly opciones: readonly Opcion<T>[];
  readonly elegido: T;
  readonly al: (valor: T) => void;
}) {
  // El `name` del grupo tiene que ser unico en el documento: con el mismo en los dos ejes, marcar
  // una identidad desmarcaria el modo — son el mismo grupo de radios para el navegador.
  const grupo = useId();

  return (
    <fieldset data-slot="eje-del-tema" className="m-0 border-0 p-0">
      <legend className="mb-[7px] p-0 text-[12.5px] font-bold text-tinta-3">{rotulo}</legend>
      <div className="grid gap-[6px]">
        {opciones.map((opcion) => {
          const marcada = opcion.valor === elegido;
          return (
            <label
              key={opcion.clave}
              data-slot="opcion-del-tema"
              data-opcion={opcion.clave}
              data-elegida={marcada ? '1' : '0'}
              className={cn(
                'flex cursor-pointer items-center gap-[9px] rounded-sm border px-[10px] py-2 text-[13.5px] transition-colors',
                marcada
                  ? 'border-azul bg-azul-suave font-bold text-info-tinta'
                  : 'border-borde-campo bg-superficie text-tinta-2 hover:border-borde-hover',
              )}
            >
              <input
                type="radio"
                name={grupo}
                value={opcion.clave}
                checked={marcada}
                onChange={() => {
                  al(opcion.valor);
                }}
                className="size-4 shrink-0 accent-azul"
              />
              <span>{opcion.rotulo}</span>
            </label>
          );
        })}
      </div>
      {/* `text-tinta-3` y NO `text-tinta-4` (`rentas`#140). El artboard y la libreria lo declaran
          los dos en su hoja: `--tinta-4` **no es color de texto** —2,39:1 sobre el lienzo, y WCAG
          1.4.3 pide 4,5:1—; es el trazo de un icono decorativo, y por eso los tres usos de la
          libreria llevan `aria-hidden`. Esta frase se lee: es la unica que dice que hace «El del
          sistema». `tinta-3` pasa el umbral en las SEIS combinaciones que `rentas` mide —de
          4,88:1 en sepia/claro a 16,71:1 en alto-contraste/claro— y es el mismo token con que la
          libreria pinta `NotaDelCajon`, que es la frase de encima y va al mismo tamano. Lo mide en
          el navegador `rentas/frontend/e2e/los-temas-llegan-al-navegador.spec.ts`, sobre las dos
          `nota-del-eje`: aqui no hay CSS aplicado que medir. */}
      <p
        data-slot="nota-del-eje"
        className="mt-[7px] mb-0 text-[12px] leading-[1.5] text-tinta-3"
      >
        {nota}
      </p>
    </fieldset>
  );
}

export interface MandoDeTemaProps {
  readonly abierto: boolean;
  readonly alCerrar: () => void;
  /**
   * Las palabras del mando. Lo que no se pase sale en el castellano de `TEXTOS_DEL_MANDO_DE_TEMA`.
   * `identidades` y `modos` van enteros o no van: son un `Record` de su tipo, y uno a medias no
   * compila.
   */
  readonly textos?: Partial<TextosDelMandoDeTema>;
}

export function MandoDeTema({ abierto, alCerrar, textos }: MandoDeTemaProps) {
  const { identidad, modo, fijarIdentidad, fijarModo } = useTema();
  const dicho: TextosDelMandoDeTema = { ...TEXTOS_DEL_MANDO_DE_TEMA, ...textos };

  return (
    <Cajon
      open={abierto}
      onOpenChange={(abre) => {
        if (!abre) alCerrar();
      }}
    >
      {/* El cajon de la libreria mide 262 px, que es el ancho del carril. Aqui dentro van dos
          listas con sus rotulos, y a 262 px las tres opciones del modo salen partidas. */}
      <PanelDelCajon lado="derecha" className="w-[min(360px,92vw)]">
        <TituloDelCajon>{dicho.titulo}</TituloDelCajon>
        <NotaDelCajon>{dicho.nota}</NotaDelCajon>
        {/* El `data-slot` va en el cuerpo y NO en el panel: el panel ya lleva el suyo
            —`panel-del-cajon`, de la libreria— y pisarselo dejaria sin nombre a la pieza que lo
            dibuja, que es la que sus propias pruebas apuntan. */}
        <div
          data-slot="mando-de-tema"
          className="flex flex-col gap-[18px] overflow-y-auto px-[15px] pb-[15px]"
        >
          <Eje
            rotulo={dicho.ejeDeLaIdentidad}
            nota={dicho.notaDeLaIdentidad}
            opciones={deLaIdentidad(dicho.identidades)}
            elegido={identidad}
            al={fijarIdentidad}
          />
          <Eje
            rotulo={dicho.ejeDelModo}
            nota={dicho.notaDelModo}
            opciones={delModo(dicho.modos, dicho.elDelSistema)}
            elegido={modo}
            al={fijarModo}
          />
        </div>
      </PanelDelCajon>
    </Cajon>
  );
}
