import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DocumentoDescargado } from './cliente.ts';
import { entregarAlNavegador } from './entregar.ts';

/**
 * `entregarAlNavegador()`: la unica pieza de `@kamayuk/api` que toca el DOM (#43, AC2).
 *
 * jsdom no implementa `URL.createObjectURL` ni descarga nada al pulsar un enlace, asi que se
 * espian las dos cosas. Lo que se mide es el ORDEN y lo que queda despues: el enlace tenia la URL
 * y el nombre en el momento del clic, estaba colgado del documento, y al volver ni el enlace sigue
 * en la pagina ni la URL sigue viva.
 */

const URL_DEL_BLOB = 'blob:http://localhost/0d9c7a52-1111-4222-8333-944455556666';

interface Clic {
  readonly href: string;
  readonly download: string;
  readonly colgado: boolean;
  readonly revocadaYa: boolean;
}

let clics: Clic[];
let revocadas: string[];
let creadas: Blob[];

function unDocumento(): DocumentoDescargado {
  return {
    nombre: 'resumen-42.pdf',
    tipoDeMedio: 'application/pdf',
    contenido: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
  };
}

/** Los de verdad, si el entorno los trae, para dejarlos como estaban. */
const ORIGINALES = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL };

beforeEach(() => {
  clics = [];
  revocadas = [];
  creadas = [];
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    creadas.push(blob as Blob);
    return URL_DEL_BLOB;
  };
  URL.revokeObjectURL = (url: string) => {
    revocadas.push(url);
  };
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clics.push({
      href: this.href,
      download: this.download,
      colgado: this.isConnected,
      revocadaYa: revocadas.includes(this.href),
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  URL.createObjectURL = ORIGINALES.crear;
  URL.revokeObjectURL = ORIGINALES.revocar;
});

describe('entregarAlNavegador', () => {
  it('pulsa UN enlace con la URL del contenido y el nombre del documento', () => {
    const documento = unDocumento();

    entregarAlNavegador(documento);

    expect(creadas).toEqual([documento.contenido]);
    expect(clics).toHaveLength(1);
    expect(clics[0]).toMatchObject({ href: URL_DEL_BLOB, download: 'resumen-42.pdf' });
  });

  it('el enlace esta colgado del documento al pulsarlo, y la URL todavia viva', () => {
    entregarAlNavegador(unDocumento());

    expect(clics[0]?.colgado).toBe(true);
    expect(clics[0]?.revocadaYa).toBe(false);
  });

  it('al volver, la URL esta revocada y el enlace ya no esta en la pagina', () => {
    entregarAlNavegador(unDocumento());

    expect(revocadas).toEqual([URL_DEL_BLOB]);
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });

  it('si el clic revienta, la URL se revoca igual y el enlace no se queda', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('el navegador rechazo la descarga');
    });

    expect(() => entregarAlNavegador(unDocumento())).toThrow('el navegador rechazo la descarga');

    expect(revocadas).toEqual([URL_DEL_BLOB]);
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });
});
