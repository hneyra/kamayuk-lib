import { Progress } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';

/**
 * La barra de avance por tributo, que el arbol de V8 declara para el panel de inicio.
 *
 * <h2>Por que lleva el valor escrito al lado y no solo la barra</h2>
 *
 * Porque «77.7 %» es la cifra que se apunta y se compara, y una barra sola obliga a estimarla a
 * ojo. Ademas es lo unico que un lector de pantalla puede leer: `aria-valuenow` lo cubre, pero
 * quien mira la pantalla sin lector tambien merece el numero.
 *
 * <h2>El caso que rompe: no saber cuanto falta</h2>
 *
 * `valor` admite `null`, y no es lo mismo que cero. Cero es «no ha avanzado nada»; `null` es «la
 * corrida esta en marcha y todavia no informa». Pintar cero cuando no se sabe es afirmar algo
 * falso, asi que con `null` la barra se raya y no se rellena.
 */

export interface AvanceProps extends Omit<ComponentProps<typeof Progress.Root>, 'value'> {
  /** De 0 a 100. `null` = todavia no se sabe: ver el javadoc. */
  readonly valor: number | null;
  /** Que se esta midiendo, para el lector de pantalla. */
  readonly rotulo: string;
  /** La cifra escrita al lado. Por omision, el porcentaje. */
  readonly cifra?: string;
}

export function Avance({ valor, rotulo, cifra, className, ...resto }: AvanceProps) {
  const acotado = valor === null ? null : Math.min(100, Math.max(0, valor));
  return (
    <div data-slot="avance" className={cn('flex items-center gap-[10px]', className)}>
      <Progress.Root
        value={acotado}
        aria-label={rotulo}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-sm bg-esqueleto',
          acotado === null
            ? 'bg-[repeating-linear-gradient(135deg,var(--color-esqueleto)_0_7px,var(--color-esqueleto-brillo)_7px_14px)]'
            : '',
        )}
        {...resto}
      >
        {acotado === null ? null : (
          <Progress.Indicator
            data-slot="avance-relleno"
            className="h-full bg-azul transition-[width] duration-300"
            style={{ width: `${acotado}%` }}
          />
        )}
      </Progress.Root>
      <span className="shrink-0 text-[12.5px] tabular-nums text-tinta-2">
        {cifra ?? (acotado === null ? '—' : `${acotado.toFixed(1)} %`)}
      </span>
    </div>
  );
}
