import type { CSSProperties, ComponentProps } from 'react';
import { Toaster, toast } from 'sonner';

import type { Modo } from '../temas/ProveedorDeTema.tsx';

/**
 * Los avisos que salen abajo y se van solos. Es el `Sonner` de shadcn.
 *
 * V8 los dibuja como una tira oscura centrada abajo con `role="status"`, y eso último no es un
 * detalle de marcado: es una **región viva**, que el lector de pantalla anuncia SIN robar el foco.
 * Un `alert` interrumpiría lo que se estuviera leyendo, y «Guardado.» no merece interrumpir a
 * nadie; sin región viva, el aviso sale, se va a los tres segundos y quien no mira la esquina no se
 * entera de que guardó. `sonner` la monta como `<section aria-live="polite">`, que es lo mismo que
 * `role="status"` dicho con el atributo en vez de con el papel.
 *
 * <h2>El rótulo de esa región venía EN INGLÉS, y no se ve mirando la pantalla</h2>
 *
 * Medido: sin `containerAriaLabel`, `sonner` monta `aria-label="Notifications alt+T"`. No se dibuja
 * en ninguna parte —es el nombre accesible del contenedor— así que una pantalla entera en castellano
 * se anuncia con una palabra en inglés. Con el rótulo puesto queda «Avisos alt+T»: el atajo se lo
 * pega `sonner` por su cuenta y es suyo, no del producto.
 *
 * <h2>El modo entra por parámetro, y NO por `useTema()`</h2>
 *
 * La receta de shadcn lo lee con `useTheme()` de `next-themes`, que aquí no existe ni va a existir:
 * estos paquetes no suponen Next. La traducción directa sería `useTema()` de #8, y se descartó
 * midiendo lo que cuesta: **`useTema()` revienta fuera de `ProveedorDeTema`**, a propósito, así que
 * usarlo aquí convertiría el proveedor en obligatorio para cualquiera que quiera un aviso. Un
 * parámetro opcional deja las dos puertas abiertas y no ata a ninguna.
 *
 * `null` —que en `ProveedorDeTema` significa «lo que diga el equipo» y no «claro»— se traduce a
 * `system`, que es lo que `sonner` llama a lo mismo.
 *
 * <h2>Los colores son los tokens, y por eso van por `style` y no por clase</h2>
 *
 * `sonner` pinta con sus propias variables CSS —`--normal-bg`, `--normal-text`, `--normal-border`—
 * dentro de su propio marcado, al que una clase de Tailwind no llega. Ponerlas en el contenedor es
 * lo que la receta de shadcn hace, y es lo que hace falta para que el aviso sea de V8 y no de la
 * paleta por omisión de la librería.
 */

export interface AvisosProps
  extends Omit<ComponentProps<typeof Toaster>, 'theme' | 'containerAriaLabel'> {
  /** El modo de `ProveedorDeTema`. Ausente o `null`: el del equipo. */
  readonly modo?: Modo | null;
  /** El nombre accesible de la región viva. Ver el javadoc: sin él viene en inglés. */
  readonly rotulo?: string;
}

/** Lo que `sonner` llama a cada uno de los tres estados del modo. */
const TEMA_DE_SONNER = { claro: 'light', oscuro: 'dark' } as const;

export function Avisos({ modo = null, rotulo = 'Avisos', ...resto }: AvisosProps) {
  return (
    <Toaster
      theme={modo === null ? 'system' : TEMA_DE_SONNER[modo]}
      containerAriaLabel={rotulo}
      position="bottom-center"
      style={
        {
          '--normal-bg': 'var(--color-tinta)',
          '--normal-text': 'var(--color-superficie)',
          '--normal-border': 'var(--color-tinta)',
          '--border-radius': 'var(--radius-sm)',
        } as CSSProperties
      }
      {...resto}
    />
  );
}

/**
 * Levanta un aviso. Es el `toast` de `sonner`, republicado con el nombre del producto.
 *
 * Se republica en vez de dejar que cada sistema importe `sonner` por su cuenta para que la librería
 * pueda cambiar de motor sin tocar los cuatro: el día que `sonner` deje de servir, esto es una
 * línea y no cuatro repositorios.
 */
export const avisar = toast;
