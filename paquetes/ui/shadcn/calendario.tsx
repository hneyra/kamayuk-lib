import { DayPicker, getDefaultClassNames, type DayPickerProps } from 'react-day-picker';
import { es } from 'react-day-picker/locale';

import { cn } from '../utilidades.ts';
import { FOCO } from './foco.ts';

/**
 * El calendario, y por que no es `<input type="date">`.
 *
 * El artboard dibuja el nativo —es un prototipo, y el nativo no cuesta nada— pero su derivacion de
 * piezas pide **`Calendar` + `Popover`**, y hay dos motivos medidos para hacerle caso:
 *
 *   1. **El nativo no se puede pintar.** Su panel lo dibuja el navegador y ni el filo, ni el papel,
 *      ni el tamano de letra son alcanzables desde CSS. En una pantalla donde todo lo demas sale
 *      del artboard, el unico elemento que no se parece a nada es el calendario.
 *   2. **El nativo cambia de formato con el idioma del SISTEMA operativo, no con el de la
 *      aplicacion.** Un equipo en ingles muestra `mm/dd/yyyy` en un formulario en castellano, y
 *      en una fecha de vencimiento eso no es una molestia: es un error de dia.
 *
 * <h2>El idioma va fijado a castellano aqui, y no es suponer un sistema</h2>
 *
 * `es` es el idioma del PRODUCTO —los cuatro sistemas son de una municipalidad peruana— y no el
 * de uno de ellos. Se pasa como valor por omision y se puede pisar: el dia que haya un segundo
 * locale, entra por `props` sin tocar esta pieza.
 */

export type CalendarioProps = DayPickerProps;

export function Calendario({ className, classNames, ...resto }: CalendarioProps) {
  const porOmision = getDefaultClassNames();
  return (
    <DayPicker
      data-slot="calendario"
      locale={es}
      // La semana empieza en lunes. No es preferencia: es como se leen los calendarios aqui, y
      // una semana que empieza en domingo desplaza todas las columnas un dia.
      weekStartsOn={1}
      showOutsideDays
      className={cn('text-[13px] text-tinta-2', className)}
      classNames={{
        ...porOmision,
        month_caption: cn(porOmision.month_caption, 'text-[13.5px] font-bold text-tinta'),
        weekday: cn(porOmision.weekday, 'text-[11.5px] font-bold uppercase text-tinta-3'),
        day_button: cn(
          porOmision.day_button,
          'rounded-sm hover:bg-azul-suave hover:text-info-tinta',
          FOCO,
        ),
        selected: cn(porOmision.selected, '[&>button]:bg-azul [&>button]:text-sobre-azul [&>button]:font-bold'),
        today: cn(porOmision.today, '[&>button]:border [&>button]:border-azul'),
        // ATENUADO, PERO LEGIBLE: `--tinta-3` y no `--tinta-4` (#39).
        //
        // Los dias del mes vecino son numeros que se LEEN y se PULSAN, asi que son texto de WCAG
        // 1.4.3 como cualquier otro. `--tinta-4` es el token que la hoja de esta libreria declara
        // en mayusculas NO-COLOR-DE-TEXTO —2.59:1 sobre papel blanco— y aqui daba 2.59 / 3.56 /
        // 7.45 / 5.34 / 2.42 / 3.83 en las seis: solo llegaba en una. Los otros tres usos del
        // token son un chevron, una flecha y el separador de una miga, los tres con `aria-hidden`;
        // estos no pueden llevarlo sin dejar de anunciarse.
        //
        // Atenuar sigue siendo lo que se quiere, y para eso esta `--tinta-3`, que es la tinta
        // terciaria: contrasta MENOS que el `--tinta-2` de un dia del mes en las seis, y aun asi
        // pasa su minimo en las seis. Lo mide `calendario.test.ts`.
        outside: cn(porOmision.outside, 'text-tinta-3'),
        ...classNames,
      }}
      {...resto}
    />
  );
}
