import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Boton } from './boton.tsx';

/**
 * El primer componente de shadcn del producto.
 *
 * Que el `--radius` del `@theme` sea el del artboard y no el de shadcn lo comprueba
 * `radio.test.ts`, que lee el disco y por eso va en entorno `node`. Aqui se comprueba la otra
 * mitad: que el boton USE la utilidad que sale de ese token, y no una medida escrita a mano.
 */

describe('el boton toma el radio del token, no una medida suelta', () => {
  it('usa `rounded-sm`, que sale de `--radius-sm`', () => {
    render(<Boton>Guardar</Boton>);
    const clases = screen.getByRole('button').className;

    // Un `rounded-[3px]` escrito a mano se veria igual HOY y dejaria de seguir al token el dia
    // que el artboard cambie el radio.
    expect(clases).toContain('rounded-sm');
    expect(clases).not.toMatch(/rounded-\[/);
  });
});

describe('el boton', () => {
  it('por omision es el secundario, que es el que mas sale en V8', () => {
    render(<Boton>Volver</Boton>);
    expect(screen.getByRole('button').className).toContain('bg-superficie');
  });

  it('el primario lleva el azul y el texto de encima, en negrita', () => {
    render(<Boton variante="primario">Guardar</Boton>);
    const clases = screen.getByRole('button').className;
    // Las clases van ENTERAS, no compuestas: Tailwind lee el codigo como texto.
    expect(clases).toContain('bg-azul');
    expect(clases).toContain('text-sobre-azul');
    expect(clases).toContain('font-bold');
  });

  it('una clase de fuera gana a la del componente, y no se queda al lado', () => {
    // Es lo que `cn()` compra: con `px-2 px-4` sin `tailwind-merge` quedan las dos y gana la que
    // la hoja de estilos emita despues — o sea, unas veces una y otras otra.
    render(<Boton className="px-10">Ancho</Boton>);
    const clases = screen.getByRole('button').className;
    expect(clases).toContain('px-10');
    expect(clases).not.toContain('px-[18px]');
  });

  it('deshabilitado no se puede pulsar, y se ve', () => {
    render(<Boton disabled>Guardar</Boton>);
    const boton = screen.getByRole('button');
    expect(boton).toBeDisabled();
    expect(boton.className).toContain('disabled:opacity-50');
  });
});
