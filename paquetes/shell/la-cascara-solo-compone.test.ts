// @vitest-environment node
//
// Lee la fuente de `Armazon.tsx`. No es un DOM lo que necesita.

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PAQUETES, leer, sinComentarios } from '../verificaciones/texto.ts';

/**
 * **`Cascara` compone y nada más** (#119, AC3).
 *
 * Medido sobre `origin/main@2530761`: la función tenía **353 líneas y 26 llamadas a hooks** y hacía
 * nueve cosas —el carril, la paleta y su atajo, `sucias`, lo tecleado y su olvido, la navegación con
 * aviso, el estado en la ruta y su aviso, construir `HojaAbierta`, construir `NavegacionDelArmazon`
 * y la maquetación—. Desde #119 cada una de las siete primeras vive en su hook, y el reductor del
 * registro de hojas en `registro-de-hojas.ts`, con sus pruebas sin DOM.
 *
 * Esto es la cifra del AC3 escrita como prueba, para que no vuelva a crecer sin que nadie lo vea.
 * Las líneas se cuentan **enteras**, comentarios incluidos, que es como se contaron las 353; los
 * hooks, **sin comentarios**, para que un docblock que nombre `useState` no cuente como uno.
 */

const LINEAS_COMO_MUCHO = 150;
const HOOKS_COMO_MUCHO = 8;

interface Medida {
  readonly lineas: number;
  readonly hooks: readonly string[];
}

/**
 * Las líneas y los hooks de la función `nombre` de `fuente`: desde `function <nombre>(` hasta la
 * primera línea que es `}` a secas, que es como cierra una función de primer nivel en este paquete.
 */
function medirLaFuncion(fuente: string, nombre: string): Medida {
  const lineas = fuente.split('\n');
  const desde = lineas.findIndex((linea) => linea.startsWith(`function ${nombre}(`));
  if (desde === -1) throw new Error(`No hay \`function ${nombre}(\` en la fuente: la medida no mediría nada.`);
  const hasta = lineas.findIndex((linea, i) => i > desde && linea === '}');
  if (hasta === -1) throw new Error(`\`${nombre}\` no cierra con una línea \`}\`: la medida no mediría nada.`);
  const cuerpo = sinComentarios(lineas.slice(desde, hasta + 1).join('\n'));
  return {
    lineas: hasta - desde + 1,
    hooks: [...cuerpo.matchAll(/\buse[A-Z]\w*(?=\s*[<(])/gu)].map(([hook]) => hook),
  };
}

/** Una `Cascara` como la de antes, en pequeño: tres hooks, y dos más escritos en comentarios que no cuentan. */
const MUESTRA = [
  'function Cascara() {',
  '  // const [x] = useState(0); comentado no cuenta',
  '  /** Ni en un docblock: `useEffect(() => {})`. */',
  '  const [a] = useState(1);',
  '  const b = useMemo<string>(() => "", []);',
  '  useEffect(() => {}, []);',
  '  return null;',
  '}',
  '',
  'function Otra() {',
  '  useState(2);',
  '}',
].join('\n');

describe('la medida', () => {
  it('cuenta las líneas de la función y sus hooks, sin los del comentario ni los de la siguiente', () => {
    expect(medirLaFuncion(MUESTRA, 'Cascara')).toEqual({ lineas: 8, hooks: ['useState', 'useMemo', 'useEffect'] });
  });

  it('sin la función, lo dice en vez de medir cero', () => {
    expect(() => medirLaFuncion(MUESTRA, 'Ninguna')).toThrow('No hay `function Ninguna(`');
  });
});

describe('`Cascara` compone y nada más (#119, AC3)', () => {
  const medida = medirLaFuncion(leer(join(PAQUETES, 'shell', 'Armazon.tsx')), 'Cascara');

  it(`cabe en ${String(LINEAS_COMO_MUCHO)} líneas`, () => {
    expect(medida.lineas, 'la cascara volvio a crecer: lo que hace de mas va a su hook').toBeLessThanOrEqual(
      LINEAS_COMO_MUCHO,
    );
  });

  it(`llama a ${String(HOOKS_COMO_MUCHO)} hooks como mucho`, () => {
    expect(medida.hooks.length, `la cascara llama a ${medida.hooks.join(', ')}`).toBeLessThanOrEqual(
      HOOKS_COMO_MUCHO,
    );
  });
});
