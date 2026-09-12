import type { ComponentProps, ReactNode } from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';

import { Etiqueta } from './etiqueta.tsx';

/**
 * El formulario: `react-hook-form` para el estado, `zod` para lo que vale, y la pieza para decirlo.
 *
 * <h2>Por que el mensaje de error vive PEGADO al campo y no arriba</h2>
 *
 * Porque un resumen de errores al principio del formulario obliga a recorrer la pantalla buscando
 * cual es cada uno, y en una pantalla de V8 con doce campos repartidos en tres tarjetas eso es
 * media pantalla de distancia. El mensaje va debajo del campo que lo produce, y el campo se pinta
 * invalido a la vez: **dos senales, una para quien mira y otra para quien escucha**.
 *
 * <h2>`aria-describedby` y `aria-invalid` no son adorno</h2>
 *
 * Sin ellos, el lector de pantalla anuncia «Ejercicio, cuadro de edicion» y **no dice que esta
 * mal**: el mensaje esta en la pantalla y no pertenece a nada. Con ellos, lo lee al enfocar el
 * campo, que es cuando sirve.
 *
 * <h2>El esquema NO se declara aqui</h2>
 *
 * `zod` entra por el `resolver` que pasa quien monta el formulario, y esta pieza no conoce ni un
 * campo. Es la regla de gobierno de ADR-0030 §4: el dia que esta libreria supiera que un ejercicio
 * es un ano de cuatro digitos entre 2019 y hoy, habria dejado de ser comun.
 */

export interface FormularioProps<T extends FieldValues> extends Omit<ComponentProps<'form'>, 'onSubmit'> {
  /** Lo que devuelve `useForm()`. */
  readonly form: UseFormReturn<T>;
  /** Qué hacer con los valores ya validados. */
  readonly alEnviar: (valores: T) => void | Promise<void>;
  readonly children: ReactNode;
}

export function Formulario<T extends FieldValues>({
  form,
  alEnviar,
  children,
  ...resto
}: FormularioProps<T>) {
  return (
    <FormProvider {...form}>
      <form
        data-slot="formulario"
        // `noValidate` a proposito: la validacion la hace el esquema, y dejar tambien la del
        // navegador da DOS mensajes distintos para el mismo campo, uno en castellano del esquema y
        // otro en el idioma del sistema operativo.
        noValidate
        onSubmit={form.handleSubmit(alEnviar)}
        {...resto}
      >
        {children}
      </form>
    </FormProvider>
  );
}

export interface CampoDelFormularioProps<T extends FieldValues, N extends FieldPath<T>> {
  readonly nombre: N;
  readonly rotulo: ReactNode;
  readonly opcional?: boolean;
  readonly ayuda?: ReactNode;
  readonly ancho?: boolean;
  /**
   * El control. Recibe lo que `react-hook-form` maneja; el `id`, el `aria-describedby` y el
   * `aria-invalid` se los mete `Etiqueta` por `Slot`, que es quien conoce los identificadores.
   */
  readonly children: (campo: ControllerRenderProps<T, N>) => ReactNode;
}

export function CampoDelFormulario<T extends FieldValues, N extends FieldPath<T>>({
  nombre,
  rotulo,
  opcional,
  ayuda,
  ancho,
  children,
}: CampoDelFormularioProps<T, N>) {
  return (
    <Controller<T, N>
      name={nombre}
      render={({ field, fieldState }) => (
        <Etiqueta
          rotulo={rotulo}
          opcional={opcional}
          ayuda={ayuda}
          error={fieldState.error?.message}
          ancho={ancho}
        >
          {children(field)}
        </Etiqueta>
      )}
    />
  );
}

export { useFormContext };
