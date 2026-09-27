import type {
  ActoAbierto,
  DatosDeLaPantalla,
  DefinicionDePantalla,
  HojaDelMarco,
  ManejadoresDeLasAcciones,
  ManejadoresDeLosActos,
  NavegacionDeLaPantalla,
  PantallaProps,
  PiezaDeLaPantalla,
  PiezasDelConsumidor,
  PropsDeUnaPiezaDelConsumidor,
  TextosDeLaPantalla,
  TonoDeInsignia,
} from '../../ui/index.ts';

/**
 * LAS BARRERAS DE TIPO de las dos `props` publicas del interprete (#125). Son pruebas DEL
 * COMPILADOR, como las de `barreras-de-tipos.tsx`: las comprueba `yarn typecheck`, sin ejecutar nada.
 *
 * <h2>Lo que vigilan</h2>
 *
 * #125 saco `traducir`, `textos`, `tonoDeLaInsignia` y `hoja` de las `props` de las piezas a un
 * contexto interno (`ui/interprete/entorno.tsx`). Las piezas son internas y podian cambiar; **lo que
 * no podia cambiar es lo que los seis consumidores escriben**: `<Pantalla …>` y el componente de una
 * pieza del consumidor. Por eso aqui van **dos copias fijadas antes de tocar nada** —tal cual estaban
 * en `origin/main@e42ad3a`— y la igualdad EXACTA con las de hoy, importadas por `index.ts`, que es
 * por donde las ve un consumidor.
 *
 * Exacta en los dos sentidos: una `prop` de mas, de menos, que pasa a obligatoria u opcional, o que
 * pierde su `readonly` rompe la igualdad, y la asignacion de `true` es TS2322 en este archivo.
 *
 * **Si un issue cambia una de las dos a proposito**, se cambia aqui la copia en el mismo PR, y ese
 * cambio es el que la revision tiene que ver: es un cambio para seis repositorios.
 */

/** Igualdad EXACTA de dos tipos: ni mas ancho ni mas estrecho (la de `barreras-de-los-temas.ts`). */
type Igual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** `PantallaProps` tal cual en `origin/main@e42ad3a`, antes de #125. */
interface PantallaPropsFijadas {
  readonly definicion: DefinicionDePantalla<PiezaDeLaPantalla>;
  readonly datos: DatosDeLaPantalla;
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  readonly traducir?: (texto: string) => string;
  readonly textos?: Partial<TextosDeLaPantalla>;
  readonly piezas?: PiezasDelConsumidor;
  readonly alEnsuciar?: () => void;
  readonly actos?: ManejadoresDeLosActos;
  readonly alHacer?: ManejadoresDeLasAcciones;
  readonly navegacion?: NavegacionDeLaPantalla;
  readonly actoAbierto?: ActoAbierto | null;
  readonly alAbrirActo?: (clave: string | null, parametros?: Readonly<Record<string, string>>) => void;
  readonly alQuedarGuardada?: () => void;
  readonly hoja?: HojaDelMarco;
}

/** `PropsDeUnaPiezaDelConsumidor` tal cual en `origin/main@e42ad3a`, antes de #125. */
interface PropsDeUnaPiezaDelConsumidorFijadas {
  readonly clave: string;
  readonly indice: number;
  readonly datos: DatosDeLaPantalla;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
}

/** Sin `@ts-expect-error`: esto TIENE que compilar. Si no compila, una `prop` publica cambio. */
export const pantallaPropsNoCambia: Igual<PantallaProps, PantallaPropsFijadas> = true;
export const propsDeUnaPiezaDelConsumidorNoCambian: Igual<
  PropsDeUnaPiezaDelConsumidor,
  PropsDeUnaPiezaDelConsumidorFijadas
> = true;
