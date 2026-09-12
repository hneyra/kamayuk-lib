import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FechaDeCalculo } from './FechaDeCalculo.tsx';
import { Icono } from './Icono.tsx';
import { Importe } from './Importe.tsx';
import { Insignia } from './Insignia.tsx';

/**
 * Los tres componentes que el DOMINIO ata, y el icono.
 *
 * Lo que se prueba aqui no es que pinten: es que no puedan pintar mal. `Importe` sin su fecha,
 * `Insignia` sin su texto y un icono que hable solo son los tres defectos que estos componentes
 * existen para hacer imposibles, y los tres se ven bien cuando ocurren.
 */

describe('Importe lleva SIEMPRE la fecha a la que esta calculado', () => {
  it('formatea el importe y dice de cuando es', () => {
    render(<Importe valor="1842.6" fechaCalculo="2026-09-06" />);

    expect(screen.getByText('S/ 1,842.60')).toBeInTheDocument();
    expect(screen.getByText('al 06/09/2026')).toBeInTheDocument();
  });

  it('con la fecha implicita la oculta, pero sigue habiendo que pasarla', () => {
    // La diferencia importa: lo que se evita es repetir «al 06/09/2026» en cuarenta filas de una
    // tabla que ya lo dice arriba. NO es que el importe pueda ir sin fecha.
    render(<Importe valor="1842.6" fechaCalculo="2026-09-06" fechaImplicita />);

    expect(screen.getByText('S/ 1,842.60')).toBeInTheDocument();
    expect(screen.queryByText('al 06/09/2026')).not.toBeInTheDocument();
  });

  it('no redondea: un importe con tres decimales revienta en vez de perder el centimo', () => {
    // Regla 1, RNF-055. Recortar es aritmetica, la decide el backend con su NUMERIC(x,2), y un
    // centimo que desaparece al pintarlo no deja rastro en ningun sitio.
    expect(() => render(<Importe valor="412880.005" fechaCalculo="2026-09-06" />)).toThrow(
      /Importe con una forma que el backend no sirve/,
    );
  });
});

describe('Insignia no comunica solo por color', () => {
  it('el texto va dentro', () => {
    render(<Insignia tono="mal">Vencido</Insignia>);
    expect(screen.getByText('Vencido')).toBeInTheDocument();
  });

  it.each(['ok', 'atencion', 'mal', 'info'] as const)(
    'el tono «%s» lleva sus dos clases ENTERAS, que es lo que Tailwind sabe leer',
    (tono) => {
      render(<Insignia tono={tono}>Un estado</Insignia>);

      // Enteras y no compuestas: Tailwind lee el codigo como texto, asi que un
      // `bg-${tono}-fondo` no aparece en ningun archivo y la clase no se genera — la insignia
      // saldria sin fondo en produccion, donde no hay nadie mirando.
      const clases = screen.getByText('Un estado').className;
      expect(clases).toContain(`bg-${tono}-fondo`);
      expect(clases).toContain(`text-${tono}-tinta`);
    },
  );
});

describe('FechaDeCalculo dice de cuando son las cifras de la pantalla', () => {
  it('con la fecha formateada como la escribe el artboard', () => {
    render(<FechaDeCalculo fecha="2026-08-31" />);
    expect(screen.getByText('31/08/2026')).toBeInTheDocument();
  });
});

describe('Icono nunca comunica solo', () => {
  it('va oculto al lector de pantalla y fuera del recorrido de foco', () => {
    const { container } = render(<Icono nombre="alerta" />);
    const svg = container.querySelector('svg');

    // Lo que dice algo es el texto que lleva al lado. Un icono con `aria-label` seria una pieza
    // que habla sin que nadie pueda leerla dos veces.
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
  });

  it('dibuja todos los trazos de su nombre, no solo el primero', () => {
    const { container } = render(<Icono nombre="alerta" />);
    // `alerta` son TRES: el triangulo, el asta y el punto. Con uno solo se veria un triangulo
    // vacio, que es un icono distinto.
    expect(container.querySelectorAll('path')).toHaveLength(3);
  });
});
