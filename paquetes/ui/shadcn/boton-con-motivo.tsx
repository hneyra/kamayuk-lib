import { useId, type MouseEvent } from 'react';

import { cn } from '../utilidades.ts';
import { Boton, type BotonProps } from './boton.tsx';

/**
 * **Un boton que, cuando no se puede pulsar, dice por que** (#66, `impedido-con-motivo`).
 *
 * <h2>Por que `aria-disabled` y NUNCA `disabled`</h2>
 *
 * Un `disabled` saca el boton del orden del tabulador: quien navega con teclado **no llega nunca** a
 * saber que esta ahi, y quien lo ve apagado no tiene como averiguar que le falta —no se puede pulsar,
 * y el navegador no enseña un `title` sobre un control apagado en todos los casos—. Es la lección
 * `impedimentos` de la V6 de `catastro` (`22e6d2e:frontend/verificaciones/impedimentos.mjs`): un boton
 * apagado es la unica pieza que no puede explicarse a si misma, y concluir por que es adivinar.
 *
 * Asi que: `aria-disabled="true"`, sigue enfocable, el clic y Enter **no llaman a nada**, y
 * `aria-describedby` apunta a **un texto visible** con el motivo, que el lector de pantalla lee al
 * enfocarlo.
 *
 * <h2>El motivo lo dibuja esta pieza, o quien la agrupa</h2>
 *
 * Sola, dibuja el motivo detras del boton. En un grupo —la cabecera de un bloque, con tres botones y
 * dos impedidos por lo mismo— el motivo lo dibuja el grupo una vez, y cada boton recibe su
 * `idDelMotivo`: dos parrafos iguales seguidos se leen como un defecto.
 *
 * Es de `@kamayuk/ui` y no del interprete porque el pie de `@kamayuk/shell` tiene el mismo defecto
 * (`AccionesAlPie.tsx`, #55 AC-6 y #61 AC-8) y tiene que poder usar la misma pieza.
 */
export interface BotonConMotivoProps extends Omit<BotonProps, 'disabled'> {
  /** Por que no se puede pulsar, ya en el idioma de la sesion. Sin el, se puede. */
  readonly motivo?: string;
  /** El `id` del motivo que dibuja el grupo. Sin el, esta pieza dibuja el suyo. */
  readonly idDelMotivo?: string;
  /** Hay una operacion pendiente por este boton: se anuncia ocupado, ademas de impedido. */
  readonly enCurso?: boolean;
  /**
   * Lo que pasa cuando se pulsa impedido, que NO es el `onClick`. Un acto lo usa para contar el
   * primer intento y ensenar desde ahi los errores bajo sus campos.
   */
  readonly alPulsarImpedido?: () => void;
}

export function BotonConMotivo({
  motivo,
  idDelMotivo,
  enCurso = false,
  alPulsarImpedido,
  onClick,
  className,
  children,
  'aria-describedby': tambienDescrito,
  ...resto
}: BotonConMotivoProps) {
  const propio = useId();
  const impedido = motivo !== undefined;
  const idDelSuyo = impedido ? (idDelMotivo ?? `${propio}-motivo`) : undefined;
  // Lo que ya describia al boton se SUMA al motivo, no lo pisa: la accion de una fila lleva ademas
  // el detalle de su fila (#65), y perder cualquiera de las dos es callar algo a quien no ve.
  const describe = [idDelSuyo, tambienDescrito].filter((id) => id !== undefined && id !== '').join(' ') || undefined;
  const alPulsar = (evento: MouseEvent<HTMLButtonElement>) => {
    if (impedido) {
      // Tambien el `submit` de un formulario: un boton impedido no envia, se pulse como se pulse.
      evento.preventDefault();
      alPulsarImpedido?.();
      return;
    }
    onClick?.(evento);
  };
  return (
    <>
      <Boton
        data-slot="boton-con-motivo"
        aria-disabled={impedido ? true : undefined}
        aria-describedby={describe}
        aria-busy={enCurso ? true : undefined}
        className={cn('aria-disabled:cursor-not-allowed aria-disabled:opacity-55', className)}
        onClick={alPulsar}
        {...resto}
      >
        {children}
      </Boton>
      {impedido && idDelMotivo === undefined ? (
        <span id={idDelSuyo} data-slot="motivo" className="text-[12.5px] leading-[1.5] text-tinta-3 text-pretty">
          {motivo}
        </span>
      ) : null}
    </>
  );
}
