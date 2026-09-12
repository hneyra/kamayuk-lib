import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, RouterProvider, createHashRouter, useLocation, useNavigate } from 'react-router-dom';

import { Avisos } from '../ui/index.ts';

import { AccionesAlPie } from './AccionesAlPie.tsx';
import { AvisoDeCambios } from './AvisoDeCambios.tsx';
import { BarraGlobal } from './BarraGlobal.tsx';
import { CabeceraDePantalla } from './CabeceraDePantalla.tsx';
import { CarrilDeModulos } from './CarrilDeModulos.tsx';
import { PaletaDelArmazon } from './PaletaDelArmazon.tsx';
import { destinoDeSlug, indiceDelCatalogo, slugDe, type Catalogo, type HojaDelCatalogo } from './catalogo.ts';
import {
  ProveedorDeLaConfiguracion,
  ProveedorDeLaHoja,
  useArmazon,
  useHoja,
  type ConfiguracionDelArmazon,
} from './contexto.tsx';

/**
 * **El armazón**: lo que rodea a la pantalla y es igual en los cuatro sistemas (#13).
 *
 * <h2>El enrutado es por HASH, y con `createHashRouter` (AC5)</h2>
 *
 * No se pasa a rutas de verdad, y el motivo no es de comodidad. Las cuatro interfaces las sirve el
 * mismo Traefik bajo su propio prefijo (ADR-0030 §2): una ruta real obligaría al servidor a
 * reescribir cualquier profundidad hacia `index.html`, en los cuatro. Y el retorno de la
 * autenticación es **la raíz de la aplicación** (`rentas`#73), con la URI de vuelta escrita en el
 * realm de Keycloak: con rutas reales, cada destino enlazable exigiría su propia URI de retorno
 * registrada, o la vuelta perdería la pantalla.
 *
 * La forma canónica es `#/<slug>`. Se navega con `replace` y jamás con `push`: abrir un destino no
 * es navegar, es cambiar de pantalla dentro de la misma aplicación, y en un turno de ventanilla se
 * abren decenas. Con `push`, el «atrás» del navegador habría que pulsarlo cuarenta veces para salir,
 * lo que convierte ese botón en una trampa.
 *
 * <h2>Las rutas SALEN DEL CATÁLOGO, y eso es la mitad estructural del AC4</h2>
 *
 * Hay una ruta por destino ofrecido y una `*` para todo lo demás. Un hash que nombre algo que el
 * catálogo no trae **no tiene ruta que lo reciba**: cae en la `*` y se dibuja un aviso, en vez de
 * abrirse. No es una comprobación que alguien tenga que acordarse de escribir en cada pantalla: es
 * la forma de la tabla de rutas.
 *
 * Lo que la cuenta no puede abrir tampoco sale en el árbol, ni en la paleta, ni en la miga, y por
 * la misma razón: las tres recorren el catálogo y no hay otro que recorrer.
 *
 * <h2>Y nada de aquí dentro nombra un sistema (AC2)</h2>
 *
 * Ni un módulo, ni un rótulo, ni una ruta de API, ni un slug. Todo lo que se dibuja entra por la
 * configuración. Lo vigila `sin-suponer-un-sistema`, que barre este paquete entero.
 */

/** El ancho por debajo del cual el carril se va a un cajón. Es el mismo del artboard. */
const ANCHO_ESTRECHO = 1040;

/**
 * Si la pantalla es estrecha.
 *
 * El `typeof` no es superstición: en una prueba o en un renderizado de servidor puede no haber
 * `matchMedia`, y un armazón que reventara por preguntar por el ancho dejaría sin marco a quien
 * sólo quería dibujar una pantalla. Sin respuesta, se supone ancha — que es la forma que no esconde
 * nada.
 */
function useEsEstrecho(): boolean {
  const [estrecho, setEstrecho] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const consulta = window.matchMedia(`(max-width: ${String(ANCHO_ESTRECHO)}px)`);
    const alCambiar = (): void => {
      setEstrecho(consulta.matches);
    };
    alCambiar();
    if (typeof consulta.addEventListener !== 'function') {
      return;
    }
    consulta.addEventListener('change', alCambiar);
    return () => {
      consulta.removeEventListener('change', alCambiar);
    };
  }, []);
  return estrecho;
}

/** Lo que se ve cuando no hay ningún destino abierto. */
function SinDestino() {
  return (
    <div data-slot="sin-destino" className="grid flex-1 place-items-center p-[30px]">
      <p className="m-0 max-w-[44ch] text-center text-[14px] leading-[1.6] text-tinta-3 text-pretty">
        No hay ningun destino abierto. Elija uno en el arbol de la izquierda.
      </p>
    </div>
  );
}

/**
 * Lo que se ve cuando el hash pide algo que el catálogo no ofrece.
 *
 * **Se dice, no se redirige en silencio.** Un salto mudo a la raíz deja a quien siguió un enlace
 * viejo —o a quien no tiene permiso— mirando una pantalla vacía sin saber por qué; y al que depura,
 * sin nada que buscar.
 */
function DestinoNoOfrecido() {
  return (
    <div data-slot="destino-no-ofrecido" className="grid flex-1 place-items-center p-[30px]">
      <p className="m-0 max-w-[52ch] text-center text-[14px] leading-[1.6] text-tinta-3 text-pretty">
        Esa direccion no corresponde a ningun destino disponible para esta cuenta. Elija uno en el
        arbol de la izquierda.
      </p>
    </div>
  );
}

/** La pantalla del destino, que la dibuja el sistema y no el armazón. */
function Pantalla() {
  const { pantalla } = useArmazon();
  const { hoja } = useHoja();
  return <>{pantalla(hoja)}</>;
}

/** La hoja que pide la ruta actual, o `null` si la ruta no nombra ninguna. */
function useHojaDeLaRuta(catalogo: Catalogo): HojaDelCatalogo | null {
  const { pathname } = useLocation();
  return useMemo(() => {
    const slug = pathname.replace(/^\//, '');
    const clave = destinoDeSlug(catalogo, slug);
    return clave === null ? null : (indiceDelCatalogo(catalogo).get(clave) ?? null);
  }, [catalogo, pathname]);
}

/** Lo que rodea a la pantalla: la barra, el carril, la paleta, la cabecera y el pie. */
function Cascara() {
  const configuracion = useArmazon();
  const { catalogo, acciones = {}, pieDelCarril } = configuracion;
  const navegar = useNavigate();
  const hoja = useHojaDeLaRuta(catalogo);
  const estrecho = useEsEstrecho();

  const [carrilAbierto, setCarrilAbierto] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [moduloDesplegado, setModuloDesplegado] = useState<string | null>(null);
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [sucias, setSucias] = useState<ReadonlySet<string>>(() => new Set());
  /**
   * A dónde se quería ir cuando saltó el aviso. `{ hacia: null }` es «salir a la raíz».
   *
   * Envuelto en un objeto y no como `string | null` a secas: con el segundo, «no hay nada
   * pendiente» y «volver a la raíz» serían el MISMO valor, y el aviso de «Volver» no se abriría
   * nunca — que es justo la salida por la que se pierde trabajo sin que nadie la pruebe.
   */
  const [pendiente, setPendiente] = useState<{ readonly hacia: string | null } | null>(null);

  const indice = useMemo(() => indiceDelCatalogo(catalogo), [catalogo]);

  /** Deja de estar sucia. Se usa desde las tres salidas del aviso y desde la pantalla. */
  const limpiar = useCallback((clave: string) => {
    setSucias((antes) => {
      if (!antes.has(clave)) return antes;
      const quedan = new Set(antes);
      quedan.delete(clave);
      return quedan;
    });
  }, []);

  /** Lleva a un destino SIN preguntar nada. Es la mitad que no mira si hay cambios. */
  const saltarA = useCallback(
    (clave: string | null) => {
      setPaletaAbierta(false);
      if (clave === null) {
        navegar('/', { replace: true });
        return;
      }
      const destino = indice.get(clave);
      if (destino === undefined) {
        return;
      }
      navegar(`/${slugDe(destino.destino)}`, { replace: true });
    },
    [indice, navegar],
  );

  /**
   * Lleva a un destino, preguntando si la hoja de la que se sale tiene cambios.
   *
   * El `null` es «salir a la raíz», que es lo que hace «Volver». Sale por el mismo sitio a
   * propósito: salir de una pantalla sucia hacia ninguna parte pierde igual de trabajo que salir
   * hacia otra.
   */
  const irA = useCallback(
    (clave: string | null) => {
      if (hoja !== null && sucias.has(hoja.destino.clave) && clave !== hoja.destino.clave) {
        setPaletaAbierta(false);
        setPendiente({ hacia: clave });
        return;
      }
      saltarA(clave);
    },
    [hoja, sucias, saltarA],
  );

  /**
   * El arbol despliega el modulo del DESTINO, y no el que se abrio la ultima vez.
   *
   * Va en un efecto sobre el destino y no dentro de la funcion que navega, y la diferencia se ve al
   * arrancar: una direccion pegada con un destino dentro abre la pantalla sin pasar por el arbol, y
   * sin esto la hoja actual quedaria marcada dentro de un modulo plegado. O sea: el arbol diria que
   * no hay nada abierto mientras hay algo abierto.
   *
   * Y no se deriva —`moduloDesplegado ?? el del destino`— a proposito: asi, plegar a mano el modulo
   * de la pantalla en la que uno esta funciona, en vez de volver a abrirse en la siguiente pintada.
   */
  const moduloDelDestino = hoja?.modulo.clave ?? null;
  useEffect(() => {
    if (moduloDelDestino !== null) {
      setModuloDesplegado(moduloDelDestino);
    }
  }, [moduloDelDestino]);

  // El atajo de la paleta: `Ctrl+K` y `Cmd+K`, los dos (AC7).
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent): void => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setConsulta('');
        setPaletaAbierta((abierta) => !abierta);
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, []);

  const deLaHoja = useMemo(
    () =>
      hoja === null
        ? null
        : {
            hoja,
            sucia: sucias.has(hoja.destino.clave),
            marcarSucia: () => {
              setSucias((antes) =>
                antes.has(hoja.destino.clave) ? antes : new Set(antes).add(hoja.destino.clave),
              );
            },
            marcarGuardada: () => {
              limpiar(hoja.destino.clave);
            },
          },
    [hoja, sucias, limpiar],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-fondo">
      <BarraGlobal
        carrilAbierto={carrilAbierto}
        alAlternarCarril={() => {
          setCarrilAbierto((abierto) => !abierto);
        }}
        alAbrirLaPaleta={() => {
          setConsulta('');
          setPaletaAbierta(true);
        }}
      />

      <PaletaDelArmazon
        catalogo={catalogo}
        abierta={paletaAbierta}
        consulta={consulta}
        alEscribir={setConsulta}
        alCerrar={() => {
          setPaletaAbierta(false);
        }}
        alIr={irA}
      />

      <AvisoDeCambios
        rotulo={pendiente === null ? null : (hoja?.destino.rotulo ?? '')}
        alGuardarYCerrar={() => {
          if (hoja !== null) {
            acciones.guardar?.(hoja.destino.clave);
            limpiar(hoja.destino.clave);
          }
          const adonde = pendiente;
          setPendiente(null);
          saltarA(adonde?.hacia ?? null);
        }}
        alSalirSinGuardar={() => {
          if (hoja !== null) {
            limpiar(hoja.destino.clave);
          }
          const adonde = pendiente;
          setPendiente(null);
          saltarA(adonde?.hacia ?? null);
        }}
        alSeguirEditando={() => {
          setPendiente(null);
        }}
      />

      <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
        <CarrilDeModulos
          catalogo={catalogo}
          filtro={filtro}
          alFiltrar={setFiltro}
          moduloDesplegado={moduloDesplegado}
          alDesplegar={setModuloDesplegado}
          destinoActual={hoja?.destino.clave ?? null}
          sucias={sucias}
          alIr={irA}
          pie={pieDelCarril}
          enCajon={estrecho}
          abierto={carrilAbierto}
          alCerrarElCajon={() => {
            setCarrilAbierto(false);
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col overflow-auto">
            {hoja === null ? null : <CabeceraDePantalla hoja={hoja} instruccion={hoja.destino.instruccion} />}
            <div className="flex max-w-[1180px] flex-1 flex-col gap-[14px] px-[18px] pb-0 pt-4">
              {deLaHoja === null ? (
                <Outlet />
              ) : (
                <ProveedorDeLaHoja value={deLaHoja}>
                  <Outlet />
                </ProveedorDeLaHoja>
              )}
            </div>
            {hoja === null ? null : (
              <div className="max-w-[1180px]">
                <AccionesAlPie
                  destino={hoja.destino}
                  alVolver={() => {
                    irA(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Avisos />
    </div>
  );
}

/** Monta el enrutador con una ruta por destino ofrecido. Ver el javadoc del archivo. */
function crearEnrutador(catalogo: Catalogo) {
  return createHashRouter([
    {
      path: '/',
      element: <Cascara />,
      children: [
        { index: true, element: <SinDestino /> },
        ...catalogo.flatMap((modulo) =>
          modulo.destinos.map((destino) => ({
            path: slugDe(destino),
            element: <Pantalla />,
          })),
        ),
        { path: '*', element: <DestinoNoOfrecido /> },
      ],
    },
  ]);
}

export type ArmazonProps = ConfiguracionDelArmazon;

export function Armazon(configuracion: ArmazonProps) {
  const enrutador = useMemo(() => crearEnrutador(configuracion.catalogo), [configuracion.catalogo]);
  return (
    <ProveedorDeLaConfiguracion value={configuracion}>
      <RouterProvider router={enrutador} />
    </ProveedorDeLaConfiguracion>
  );
}
