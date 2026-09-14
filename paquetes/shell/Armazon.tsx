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
  ProveedorDeLosTextos,
  useArmazon,
  useHoja,
  useTextos,
  type ConfiguracionDelArmazon,
} from './contexto.tsx';
import { TEXTOS_DEL_ARMAZON, type TextosDelArmazon } from './textos.ts';
import {
  ProveedorDeLaNavegacion,
  ubicacionDe,
  type ExtraDeLaPeticion,
  type NavegacionDelArmazon,
} from './navegacion.tsx';

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
 * <h2>La tabla de rutas NO sale del catálogo, y desde #20 tampoco podría</h2>
 *
 * Hay **una sola ruta**, `*`, y lo que decide si se abre la pantalla o se dibuja el aviso es el
 * render: `useHojaDeLaRuta` busca el slug del `pathname` en el catálogo de hoy, y sin hoja se
 * dibuja `<DestinoNoOfrecido />`. La propiedad del AC4 es la misma —lo que el catálogo no trae no
 * se abre, ni por el hash— y ahora la sostiene **el mismo dato que dibuja las tres listas**, que es
 * lo que hace imposible que una diga una cosa y la otra diga otra.
 *
 * Hasta #20 había una ruta por destino ofrecido. Era correcto mientras el catálogo fuera
 * constante, y **no lo es nunca**: sale de cruzar tres operaciones del backend, así que en el
 * primer render no se sabe todavía. Un catálogo nuevo obligaba a un `createHashRouter` nuevo, y ahí
 * el armazón se caía con `useHoja() fuera de una pantalla`. La causa exacta está medida y no es
 * «el contexto se pierde»: `RouterProvider` guarda el estado del enrutador en un `useState`
 * **sembrado una sola vez**, así que con el enrutador nuevo la pintada siguiente usa todavía las
 * coincidencias del viejo, y `useRoutesImpl` las vuelve a apuntar contra el manifiesto NUEVO
 * *por el identificador de ruta* —`manifest[m.route.id] || m.route`, en `react-router@7.18.3`—.
 * Los identificadores son posicionales (`0-1`, `0-2`…), de modo que cambiar el catálogo reapunta
 * cada coincidencia a la ruta que por accidente ocupe ese hueco en la tabla nueva: donde caía una
 * ruta de destino se dibujaba `<Pantalla />` **sin que hubiera hoja**, y `useHoja()` reventaba.
 *
 * Con una ruta y nada más, el enrutador se construye **una vez** y esa ventana no existe.
 *
 * Lo que la cuenta no puede abrir tampoco sale en el árbol, ni en la paleta, ni en la miga, y por
 * la misma razón: las tres recorren el catálogo y no hay otro que recorrer.
 *
 * <h2>Y desde #19 tampoco escribe una palabra (`kamayuk-lib`#19)</h2>
 *
 * Las treinta y una cadenas que el marco decía por su cuenta —«Volver», «Guardar», «Buscar»,
 * «Seguir editando», el nombre de la región de avisos— entran por `textos`, con el castellano por
 * omisión. Sin eso, un sistema que traduzca sus pantallas se queda con **la pantalla a medias**: el
 * cuerpo traducido y el marco en castellano, que se lee como una traducción rota y no como un marco
 * sin traducir. Ver `textos.ts`.
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
  const textos = useTextos();
  return (
    <div data-slot="sin-destino" className="grid flex-1 place-items-center p-[30px]">
      <p className="m-0 max-w-[44ch] text-center text-[14px] leading-[1.6] text-tinta-3 text-pretty">
        {textos.sinDestinoAbierto}
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
  const textos = useTextos();
  return (
    <div data-slot="destino-no-ofrecido" className="grid flex-1 place-items-center p-[30px]">
      <p className="m-0 max-w-[52ch] text-center text-[14px] leading-[1.6] text-tinta-3 text-pretty">
        {textos.destinoNoOfrecido}
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
  const textos = useTextos();
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
  const [pendiente, setPendiente] = useState<{
    readonly hacia: string | null;
    /** El sujeto y los parametros con que se pidio ir, desde una pantalla (#66). */
    readonly extra?: ExtraDeLaPeticion;
  } | null>(null);

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
    (clave: string | null, extra?: ExtraDeLaPeticion) => {
      setPaletaAbierta(false);
      if (clave === null) {
        navegar('/', { replace: true });
        return;
      }
      const destino = indice.get(clave);
      if (destino === undefined) {
        return;
      }
      navegar(ubicacionDe(slugDe(destino.destino), extra), { replace: true });
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
    (clave: string | null, extra?: ExtraDeLaPeticion): 'abierta' | 'pregunta' => {
      if (hoja !== null && sucias.has(hoja.destino.clave) && clave !== hoja.destino.clave) {
        setPaletaAbierta(false);
        setPendiente({ hacia: clave, ...(extra === undefined ? {} : { extra }) });
        return 'pregunta';
      }
      saltarA(clave, extra);
      return 'abierta';
    },
    [hoja, sucias, saltarA],
  );

  /**
   * Lo que una pantalla recibe para ir a otra hoja (#66): el MISMO `irA`, precedido de la pregunta
   * al catalogo. Ver `navegacion.tsx`.
   */
  const navegacion = useMemo<NavegacionDelArmazon>(
    () => ({
      ofrece: (clave) => indice.has(clave),
      ir: ({ hoja: clave, sujeto, parametros }) => {
        // Antes que `irA`: con la hoja sucia, un destino inexistente abriria el aviso de perder los
        // cambios para ir a ninguna parte.
        if (!indice.has(clave)) return 'no-ofrecida';
        return irA(clave, {
          ...(sujeto === undefined ? {} : { sujeto }),
          ...(parametros === undefined ? {} : { parametros }),
        });
      },
    }),
    [indice, irA],
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
          saltarA(adonde?.hacia ?? null, adonde?.extra);
        }}
        alSalirSinGuardar={() => {
          if (hoja !== null) {
            limpiar(hoja.destino.clave);
          }
          const adonde = pendiente;
          setPendiente(null);
          saltarA(adonde?.hacia ?? null, adonde?.extra);
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
              <ProveedorDeLaNavegacion value={navegacion}>
                {deLaHoja === null ? (
                  <Outlet />
                ) : (
                  <ProveedorDeLaHoja value={deLaHoja}>
                    <Outlet />
                  </ProveedorDeLaHoja>
                )}
              </ProveedorDeLaNavegacion>
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

      <Avisos rotulo={textos.avisos} />
    </div>
  );
}

/**
 * Lo que hay bajo la única ruta: la pantalla si el catálogo de HOY ofrece el destino del hash, y el
 * aviso si no (AC4 de #13, sostenido desde #20 por el render y no por la tabla de rutas).
 *
 * Pregunta lo mismo que `Cascara` —el mismo catálogo, el mismo `pathname`, la misma función— así
 * que las dos respuestas no pueden discrepar: donde esto dibuja `<Pantalla />`, `Cascara` ya ha
 * puesto el proveedor de la hoja, y donde no lo ha puesto, esto dibuja el aviso.
 */
function DestinoDeLaRuta() {
  const { catalogo } = useArmazon();
  const hoja = useHojaDeLaRuta(catalogo);
  return hoja === null ? <DestinoNoOfrecido /> : <Pantalla />;
}

/**
 * Monta el enrutador. **No recibe el catálogo, y ese es el arreglo de #20**: ver el javadoc del
 * archivo.
 */
function crearEnrutador() {
  return createHashRouter([
    {
      path: '/',
      element: <Cascara />,
      children: [
        { index: true, element: <SinDestino /> },
        { path: '*', element: <DestinoDeLaRuta /> },
      ],
    },
  ]);
}

export type ArmazonProps = ConfiguracionDelArmazon;

export function Armazon(configuracion: ArmazonProps) {
  /**
   * Uno, para toda la vida del armazón.
   *
   * En un `useState` y no en un `useMemo` a propósito: `useMemo` es una **pista** —React puede
   * tirar lo memorizado y volver a calcularlo cuando le convenga— y un enrutador nuevo a media
   * vida es justo el defecto de #20. El inicializador perezoso de `useState` sí es una promesa:
   * corre una vez. No hay quien lo ponga, y por eso no se desestructura el segundo hueco.
   */
  const [enrutador] = useState(crearEnrutador);
  /**
   * Lo que se pase, encima del castellano. Es lo que hace que traducir el marco NO sea todo o
   * nada: un saco a medias deja las demás palabras como están, en vez de dejar huecos.
   */
  const textos: TextosDelArmazon = useMemo(
    () => ({ ...TEXTOS_DEL_ARMAZON, ...configuracion.textos }),
    [configuracion.textos],
  );
  return (
    <ProveedorDeLaConfiguracion value={configuracion}>
      <ProveedorDeLosTextos value={textos}>
        <RouterProvider router={enrutador} />
      </ProveedorDeLosTextos>
    </ProveedorDeLaConfiguracion>
  );
}
