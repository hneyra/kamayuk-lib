import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Identidad } from './derivar.ts';

/**
 * El mando de los temas: dos ejes, tres fuentes y un orden.
 *
 * <h2>Los dos ejes no son lo mismo, y por eso son dos atributos</h2>
 *
 *     data-tema   institucional | alto-contraste | sepia      <- la IDENTIDAD, del servicio
 *     data-modo   claro | oscuro | (ausente)                  <- la APARIENCIA, de la persona
 *
 * Mezclarlos en una sola lista —«claro, oscuro, alto contraste»— obliga a escribir seis paletas a
 * mano el dia que un servicio quiera su identidad en los dos modos. Cruzados, son tres por dos.
 *
 * <h2>El orden de las tres fuentes, y por que ese</h2>
 *
 *   1. Lo que el SERVICIO trae por omision. `catastro` puede querer su verde y `rentas` su azul.
 *   2. Lo que la PERSONA eligio, guardado en este navegador. Gana a lo anterior: quien cambia el
 *      tema espera que siga cambiado manana.
 *   3. Para el modo, y solo si no eligio: lo que diga el sistema (`prefers-color-scheme`). Eso no
 *      se decide aqui — lo hacen las reglas `@media` de `temas.css`, que es donde el navegador
 *      puede reaccionar a un cambio sin que React se entere.
 *
 * Por eso `modo` admite `null`: **ausente no es «claro»**, es «lo que diga el equipo». Guardar
 * «claro» cuando nadie lo pidio congelaria en claro a quien tenga el equipo en oscuro.
 *
 * <h2>El almacenamiento puede fallar, y falla</h2>
 *
 * En una ventana privada, con las cookies bloqueadas o con el disco lleno, `localStorage` lanza al
 * LEER, no solo al escribir. Sin el `try`, la aplicacion entera no monta por no poder recordar una
 * preferencia — que es cambiar una molestia por una pantalla en blanco.
 *
 * Las dos claves —`<prefijo>.tema` y `<prefijo>.modo`— no llevan ninguna de las palabras que la
 * prohibicion `token-en-almacenamiento` vigila, y no por esquivarla: lo que se guarda aqui no es
 * una credencial.
 */

export type Modo = 'claro' | 'oscuro';

export interface ConfiguracionDeTema {
  /** La identidad que el servicio trae de fabrica. */
  readonly identidadPorOmision: Identidad;
  /**
   * El prefijo de las dos claves, p. ej. `kamayuk.rentas`.
   *
   * Obligatorio y sin valor por omision, por lo mismo que en `@kamayuk/sesion`: dos interfaces
   * del producto servidas del mismo origen comparten `localStorage`, y con el mismo prefijo
   * cambiar el tema en una se lo cambiaria a la otra.
   */
  readonly prefijoDeClaves: string;
}

interface Estado {
  readonly identidad: Identidad;
  /** `null` = el del sistema. Ver el javadoc. */
  readonly modo: Modo | null;
  fijarIdentidad: (identidad: Identidad) => void;
  fijarModo: (modo: Modo | null) => void;
}

const Contexto = createContext<Estado | null>(null);

const IDENTIDADES: readonly Identidad[] = ['institucional', 'alto-contraste', 'sepia'];
const MODOS: readonly Modo[] = ['claro', 'oscuro'];

/** Lee una clave sin dejar que el almacenamiento tumbe la aplicacion. Ver el javadoc. */
function recordar(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function anotar(clave: string, valor: string | null): void {
  try {
    if (valor === null) window.localStorage.removeItem(clave);
    else window.localStorage.setItem(clave, valor);
  } catch {
    // Que no se pueda recordar la preferencia no es motivo para dejar de aplicarla ahora.
  }
}

export function ProveedorDeTema({
  configuracion,
  children,
}: {
  readonly configuracion: ConfiguracionDeTema;
  readonly children: ReactNode;
}) {
  const { identidadPorOmision, prefijoDeClaves } = configuracion;
  const claveDelTema = `${prefijoDeClaves}.tema`;
  const claveDelModo = `${prefijoDeClaves}.modo`;

  const [identidad, setIdentidad] = useState<Identidad>(() => {
    const guardada = recordar(claveDelTema);
    // Un valor guardado que ya no existe —porque el tema se retiro— NO se aplica: se cae al del
    // servicio. Estamparlo dejaria `data-tema="algo"` sin reglas y la pantalla sin colores.
    return IDENTIDADES.includes(guardada as Identidad) ? (guardada as Identidad) : identidadPorOmision;
  });

  const [modo, setModo] = useState<Modo | null>(() => {
    const guardado = recordar(claveDelModo);
    return MODOS.includes(guardado as Modo) ? (guardado as Modo) : null;
  });

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.setAttribute('data-tema', identidad);
    // Ausente y no `claro`: ver el javadoc. `removeAttribute` es lo que devuelve el mando al
    // sistema operativo.
    if (modo === null) raiz.removeAttribute('data-modo');
    else raiz.setAttribute('data-modo', modo);
  }, [identidad, modo]);

  const fijarIdentidad = useCallback(
    (nueva: Identidad) => {
      setIdentidad(nueva);
      anotar(claveDelTema, nueva);
    },
    [claveDelTema],
  );

  const fijarModo = useCallback(
    (nuevo: Modo | null) => {
      setModo(nuevo);
      anotar(claveDelModo, nuevo);
    },
    [claveDelModo],
  );

  const valor = useMemo<Estado>(
    () => ({ identidad, modo, fijarIdentidad, fijarModo }),
    [identidad, modo, fijarIdentidad, fijarModo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** El tema actual y como cambiarlo. Revienta fuera del proveedor, en vez de devolver uno inventado. */
export function useTema(): Estado {
  const estado = useContext(Contexto);
  if (estado === null) {
    throw new Error(
      'useTema() fuera de <ProveedorDeTema>. Devolver un tema por omision aqui dejaria una ' +
        'pantalla que se ve bien y cuyo mando no hace nada.',
    );
  }
  return estado;
}

export { IDENTIDADES, MODOS };
