import {
  Boton,
  DisparadorDelMenu,
  Icono,
  ListaDelMenu,
  Menu,
  OpcionDelMenu,
} from '../ui/index.ts';

import { useArmazon, useTextos } from './contexto.tsx';

/**
 * La barra global de V8: escudo, título, entidad, buscar, campana y menú de sesión.
 *
 * <h2>Nada de lo que dibuja sale de aquí</h2>
 *
 * Ni el título, ni la entidad, ni el escudo, ni las opciones del menú: los cuatro entran por la
 * configuración del armazón. Es lo que separa esta pieza de las cuatro barras que hoy existen
 * copiadas en los sistemas —445 líneas de diferencia sólo entre dos de ellas— y lo que hace que
 * mover una coma en el aspecto de la barra no sea un cambio en cuatro repositorios.
 *
 * <h2>El atajo se DIBUJA, y por eso vale</h2>
 *
 * `Ctrl K` sale escrito dentro del botón de buscar. Un atajo que no está escrito en ninguna parte
 * lo usa quien lo escribió, y nadie más; escrito en el sitio donde se pulsaría el botón, se aprende
 * solo. Es lo que el artboard hace y no es adorno.
 */

export interface BarraGlobalProps {
  /** Abre y cierra el carril. */
  readonly alAlternarCarril: () => void;
  readonly carrilAbierto: boolean;
  /** Abre la paleta de mando. */
  readonly alAbrirLaPaleta: () => void;
}

export function BarraGlobal({
  alAlternarCarril,
  carrilAbierto,
  alAbrirLaPaleta,
}: BarraGlobalProps) {
  const { titulo, entidad, escudo, cuenta, opcionesDeSesion, avisosSinLeer = 0, alVerAvisos } =
    useArmazon();
  const textos = useTextos();

  const avisos = textos.avisosSinLeer(avisosSinLeer);

  return (
    <div
      data-slot="barra-global"
      className="relative z-[79] flex shrink-0 flex-wrap items-stretch bg-azul-oscuro text-sobre-barra"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3 px-4 py-[9px]">
        <Boton
          variante="barra"
          tamano="icono"
          aria-label={textos.alternarElCarril}
          aria-expanded={carrilAbierto}
          onClick={alAlternarCarril}
        >
          <Icono nombre="menu" grosor={2.2} />
        </Boton>
        {escudo}
        <span className="min-w-0 leading-[1.2]">
          <span className="block truncate text-[16px] font-bold">{titulo}</span>
          <span className="block truncate text-[11.5px] text-sobre-barra-2">{entidad}</span>
        </span>
      </span>

      <button
        type="button"
        data-slot="abrir-la-paleta"
        onClick={alAbrirLaPaleta}
        className="my-[9px] flex shrink-0 cursor-pointer items-center gap-[9px] rounded-sm bg-barra-control px-[14px] text-sobre-barra-2 outline-none hover:bg-barra-hover focus-visible:ring-[3px] focus-visible:ring-foco"
      >
        <Icono nombre="lupa" grosor={1.8} tamano={15} />
        <span className="text-[13px]">{textos.buscar}</span>
        <kbd className="rounded-[3px] border border-barra-realce px-[5px] py-px font-[inherit] text-[10.5px]">
          {textos.atajoDeLaPaleta}
        </kbd>
      </button>

      <button
        type="button"
        data-slot="ver-avisos"
        aria-label={avisos}
        title={avisos}
        onClick={alVerAvisos}
        className="relative grid w-11 shrink-0 cursor-pointer place-items-center border-l border-barra-realce bg-transparent text-sobre-barra outline-none hover:bg-barra-hover focus-visible:ring-[3px] focus-visible:ring-foco"
      >
        <Icono nombre="campana" tamano={19} />
        {avisosSinLeer > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-2 top-[9px] grid h-[17px] min-w-[17px] place-items-center rounded-[9px] border-[1.5px] border-azul-oscuro bg-mal-borde px-1 text-[11px] font-bold text-sobre-azul"
          >
            {avisosSinLeer}
          </span>
        ) : null}
      </button>

      <Menu>
        <DisparadorDelMenu
          data-slot="abrir-la-sesion"
          aria-label={textos.opcionesDeLaSesion}
          className="flex shrink-0 cursor-pointer items-center gap-[10px] border-l border-barra-realce bg-transparent px-[15px] py-2 text-sobre-barra outline-none hover:bg-barra-hover data-[state=open]:bg-barra-hover focus-visible:ring-[3px] focus-visible:ring-foco"
        >
          <span
            aria-hidden="true"
            className="grid size-[27px] shrink-0 place-items-center rounded-full bg-barra-realce text-[11px] font-bold"
          >
            {cuenta.iniciales}
          </span>
          <span className="text-left leading-[1.2]">
            <span className="block whitespace-nowrap text-[12.5px] font-bold">{cuenta.nombre}</span>
            {cuenta.nota === undefined ? null : (
              <span className="block text-[11px] text-sobre-barra-2">{cuenta.nota}</span>
            )}
          </span>
          <Icono nombre="chevronAbajo" tamano={12} grosor={2.6} />
        </DisparadorDelMenu>
        <ListaDelMenu>
          {opcionesDeSesion.map((opcion) => (
            <OpcionDelMenu
              key={opcion.rotulo}
              peligrosa={opcion.peligrosa ?? false}
              onSelect={opcion.al}
            >
              {opcion.rotulo}
            </OpcionDelMenu>
          ))}
        </ListaDelMenu>
      </Menu>
    </div>
  );
}
