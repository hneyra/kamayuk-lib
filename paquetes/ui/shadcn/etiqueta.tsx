import { Label, Slot } from 'radix-ui';
import { useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from '../utilidades.ts';

/**
 * La etiqueta de un campo, con las tres cosas que V8 le cuelga: el «(opcional)», la ayuda y —desde
 * el formulario— el mensaje de error.
 *
 * <h2>El error que esta pieza cometio primero, y por que se cuenta aqui</h2>
 *
 * La primera version ENVOLVIA al control en el `<label>`, para no tener que inventar un
 * identificador por campo. Funcionaba… hasta que hubo ayuda o error: envolver mete **todo** el
 * contenido del `<label>` en el nombre accesible del control, asi que el campo pasaba a llamarse
 * «Ejercicio El ejercicio son cuatro digitos: 2026.». El lector de pantalla anuncia ese nombre
 * ENTERO cada vez que se enfoca el campo, y el mensaje deja de ser un aviso para convertirse en
 * parte del rotulo — que no se quita ni corrigiendo el campo.
 *
 * Lo delato la prueba, no la vista: `getByLabelText('Ejercicio')` dejo de encontrarlo.
 *
 * <h2>Y el miedo al identificador duplicado no tenia fundamento</h2>
 *
 * `useId()` de React da uno unico por instancia montada, de modo que un interprete que dibuje la
 * misma definicion cuarenta veces sigue dando cuarenta identificadores distintos. Era justo lo que
 * hacia falta, y estaba en la caja.
 *
 * Asi que: `htmlFor` para el rotulo, `aria-describedby` para la ayuda y el error, y `Slot` para
 * meterselos al control sea cual sea la pieza. Es la forma de shadcn, y ahora se sabe por que.
 *
 * <h2>El «(opcional)» es la marca, y no el «obligatorio»</h2>
 *
 * V8 marca lo opcional y deja lo demas sin marcar. Es la decision correcta y no una economia: en
 * un formulario donde casi todo es obligatorio, marcar lo obligatorio pinta ruido en cada campo y
 * lo excepcional —lo que se puede dejar en blanco— se pierde.
 */

export interface EtiquetaProps extends Omit<ComponentProps<'div'>, 'children' | 'title'> {
  /** El rotulo del campo. */
  readonly rotulo: ReactNode;
  /** Si se puede dejar en blanco, se dice. Lo obligatorio no se marca: ver el javadoc. */
  readonly opcional?: boolean;
  /** La frase de ayuda, bajo el control. */
  readonly ayuda?: ReactNode;
  /** Que esta mal. Pinta el control invalido y se lee al enfocarlo. */
  readonly error?: ReactNode;
  /** El control: un `Campo`, un `Desplegable`, un `Dato`… Uno solo. */
  readonly children: ReactNode;
  /** De ancho completo en la rejilla. Es el `1` final del tipo de campo del artboard. */
  readonly ancho?: boolean;
}

export function Etiqueta({
  rotulo,
  opcional = false,
  ayuda,
  error,
  children,
  ancho = false,
  className,
  ...resto
}: EtiquetaProps) {
  const raiz = useId();
  const idDelControl = `${raiz}-control`;
  const idDeLaAyuda = `${raiz}-ayuda`;
  const idDelError = `${raiz}-error`;

  const hayAyuda = ayuda !== undefined && ayuda !== '';
  const hayError = error !== undefined && error !== '';
  const describe = [hayAyuda ? idDeLaAyuda : null, hayError ? idDelError : null]
    .filter((x) => x !== null)
    .join(' ');

  return (
    <div
      data-slot="etiqueta"
      data-ancho={ancho ? '1' : '0'}
      className={cn('block min-w-0', className)}
      {...resto}
    >
      <Label.Root htmlFor={idDelControl} className="flex items-baseline gap-[7px] mb-[5px]">
        <span className="text-[12.5px] font-bold text-tinta-2">{rotulo}</span>
        {opcional ? <span className="text-[11.5px] text-tinta-3">(opcional)</span> : null}
      </Label.Root>
      <Slot.Root
        id={idDelControl}
        aria-describedby={describe === '' ? undefined : describe}
        aria-invalid={hayError ? true : undefined}
      >
        {children}
      </Slot.Root>
      {hayAyuda ? (
        <span
          id={idDeLaAyuda}
          data-slot="ayuda"
          className="block text-[11.5px] leading-[1.45] text-tinta-3 mt-[5px] text-pretty"
        >
          {ayuda}
        </span>
      ) : null}
      {hayError ? (
        <span
          id={idDelError}
          data-slot="mensaje-de-error"
          className="block text-[11.5px] leading-[1.45] font-bold text-mal-tinta mt-[5px] text-pretty"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
