import { describe, expect, it } from 'vitest';

import { ArchivoRechazado, ErrorDeLaApi, NoEsUnDocumento } from '../api/index.ts';
import { ABRE, marcarElSaco } from '../verificaciones/marcas.ts';
import { peldanoDe, type Peldano } from './escalera.ts';
import { TEXTOS_DE_LA_ESCALERA } from './textos.ts';

/**
 * Los cuatro peldanos, sin montar nada (AC6).
 *
 * Aqui se mide **el mapa**: que estado y que codigo llevan a que remedio. Que ademas se vea en
 * pantalla se mide en `aplicacion.test.tsx`, y las dos mitades hacen falta: un mapa correcto que
 * nadie dibuja no ayuda a nadie, y una pantalla que dibuja el peldano equivocado se ve bien.
 */

function fallo(estado: number, codigo: string | null, mensaje: string): ErrorDeLaApi {
  return new ErrorDeLaApi(
    estado,
    'GET /seguridad/sesion',
    codigo === null ? {} : { codigo, mensaje, title: mensaje },
  );
}

describe('AC6 — cada peldano de la escalera es un remedio distinto', () => {
  it('401: vuelve a pedir identidad, y solo el 401 ofrece esa puerta', () => {
    const peldano = peldanoDe(fallo(401, 'NO_AUTENTICADO', 'La peticion no trae un token valido'));

    expect(peldano.clave).toBe('sin-identidad');
    expect(peldano.pideIdentidad).toBe(true);
    expect(peldano.esAveria).toBe(false);
  });

  it('403 SIN_MUNICIPALIDAD: lo dice, y NO manda a volver a entrar', () => {
    const peldano = peldanoDe(
      fallo(403, 'SIN_MUNICIPALIDAD', 'El token no identifica una municipalidad'),
    );

    expect(peldano.clave).toBe('sin-municipalidad');
    expect(peldano.titulo).toBe('Esta cuenta no tiene municipalidad asignada');
    // Entrar otra vez con la misma cuenta trae el mismo token, sin el mismo claim, y el mismo
    // 403: seria mandar a dar vueltas a quien tiene que llamar al administrador.
    expect(peldano.pideIdentidad).toBe(false);
    expect(peldano.esAveria).toBe(false);
  });

  it('403 SIN_PRIVILEGIO: falta permiso, y NO es una averia', () => {
    const peldano = peldanoDe(
      fallo(403, 'SIN_PRIVILEGIO', 'No tiene el privilegio LECTURA sobre consulta_deuda'),
    );

    expect(peldano.clave).toBe('sin-privilegio');
    expect(peldano.esAveria).toBe(false);
    expect(peldano.remedio).toContain('No es una averia');
    // El mensaje del backend nombra el privilegio y la opcion: es lo que hay que pedir.
    expect(peldano.detalle).toBe('No tiene el privilegio LECTURA sobre consulta_deuda');
  });

  it('404: el detalle del backend se conserva TAL CUAL, porque nombra la cuenta', () => {
    const dijo = "El token identifica a 'administrador', que no es un usuario de esta municipalidad";
    const peldano = peldanoDe(fallo(404, 'NO_ENCONTRADO', dijo));

    expect(peldano.clave).toBe('no-encontrado');
    expect(peldano.detalle).toBe(dijo);
    expect(peldano.esAveria).toBe(false);
  });

  it('los dos 403 NO son el mismo peldano, que es lo que el codigo separa', () => {
    const sinMunicipalidad = peldanoDe(fallo(403, 'SIN_MUNICIPALIDAD', 'a'));
    const sinPrivilegio = peldanoDe(fallo(403, 'SIN_PRIVILEGIO', 'b'));

    expect(sinMunicipalidad.clave).not.toBe(sinPrivilegio.clave);
    expect(sinMunicipalidad.titulo).not.toBe(sinPrivilegio.titulo);
    expect(sinMunicipalidad.remedio).not.toBe(sinPrivilegio.remedio);
  });

  it('un 403 sin codigo no se hace pasar por ninguno de los dos', () => {
    // Sin `codigo` no se puede saber cual de los dos es, y adivinar mandaria a la mitad de los
    // casos a pedir un permiso que no falta.
    const peldano = peldanoDe(fallo(403, null, ''));

    expect(peldano.clave).toBe('no-permitido');
    expect(peldano.esAveria).toBe(false);
  });
});

/**
 * El quinto peldano, que llego con la primera escritura de esta interfaz (I-3).
 *
 * Hasta #31 esta interfaz solo leia y un 422 no podia llegar. Con
 * `PUT /seguridad/sesion/ejercicio` llega, y es **la respuesta mas probable del acto**.
 */
describe('422 VALIDACION — el backend entendio la peticion y la rechazo por una regla suya', () => {
  it('NO es una averia: escribir «ok» no manda a llamar a soporte', () => {
    const dijo =
      'La observacion debe explicar el cambio: al menos 5 caracteres, y no espacios en blanco (ADR-0008)';
    const peldano = peldanoDe(fallo(422, 'VALIDACION', dijo));

    expect(peldano.clave).toBe('no-valido');
    // Sin este peldano caia en `averia`, con «Reintente en unos segundos. Si sigue igual, avise
    // a soporte» — para una observacion corta.
    expect(peldano.esAveria).toBe(false);
    expect(peldano.pideIdentidad).toBe(false);
  });

  it('y el mensaje del backend se conserva TAL CUAL, porque lleva la regla y su cifra', () => {
    const peldano = peldanoDe(
      fallo(422, 'VALIDACION', 'Ejercicio fuera de rango: 1800. Se admite de 1990 a 2100'),
    );

    // Es lo unico con lo que quien esta delante corrige lo que escribio. Resumirlo a «revise
    // los datos» borraria justo eso; copiar la regla aqui para adelantarla seria peor, porque
    // dejaria dos verdades sobre el rango y ninguna que lo dijera.
    expect(peldano.detalle).toBe('Ejercicio fuera de rango: 1800. Se admite de 1990 a 2100');
    expect(peldano.detalle).not.toContain('422');
  });

  it('un 500 sigue siendo una averia, que es lo que el 422 NO es', () => {
    // El contraste importa: los dos son fallos del servidor por el codigo, y sin separarlos el
    // 500 de #30 —el cuerpo sin observacion— y el 422 de una observacion corta se explicarian
    // igual, cuando uno se arregla escribiendo mas y el otro no se arregla desde aqui.
    expect(peldanoDe(fallo(500, 'ERROR_INTERNO', 'No se pudo completar la operacion')).esAveria).toBe(
      true,
    );
    expect(peldanoDe(fallo(422, 'VALIDACION', 'x')).esAveria).toBe(false);
  });
});

describe('AC6 — lo que SI es una averia', () => {
  it('un corte de red: no llega ningun ErrorDeLaApi, y hay que decir algo igual', () => {
    const peldano = peldanoDe(new TypeError('Failed to fetch'));

    expect(peldano.clave).toBe('averia');
    expect(peldano.esAveria).toBe(true);
    expect(peldano.pideIdentidad).toBe(false);
  });

  it('un 500 del backend, con su estado dentro para dictarlo a soporte', () => {
    const peldano = peldanoDe(fallo(500, 'ERROR_INTERNO', 'Algo se rompio'));

    expect(peldano.clave).toBe('averia');
    expect(peldano.esAveria).toBe(true);
    expect(peldano.detalle).toContain('500');
  });

  it('y los tres peldanos de autorizacion NO son averias: es el sistema funcionando', () => {
    const codigos: readonly [number, string][] = [
      [401, 'NO_AUTENTICADO'],
      [403, 'SIN_MUNICIPALIDAD'],
      [403, 'SIN_PRIVILEGIO'],
    ];

    // Pintarlas de «algo se rompio» manda a mirar un despliegue cuando lo que falta es una fila
    // en una tabla de permisos.
    expect(codigos.map(([estado, codigo]) => peldanoDe(fallo(estado, codigo, 'x')).esAveria)).toEqual(
      [false, false, false],
    );
  });
});

/**
 * **La escalera ENTERA, con el mismo mensaje en todos los casos** (#52, AC1).
 *
 * Es el metodo de `catastro`#123, y no es un detalle de estilo: inyectando el mismo `mensaje` en
 * las once respuestas, **lo unico que puede separar dos peldanos es `estado` y `codigo`**. Si dos
 * salen iguales, salen iguales de verdad — y no porque la prueba les haya dado textos distintos
 * de partida.
 *
 * Asi se midio lo que este issue arregla: con este mismo metodo, `normativa` dibujo sus siete
 * situaciones de error y **le salieron seis pantallas** (`normativa`#63, PR `normativa`#84).
 */
const EL_MISMO_MENSAJE = 'El backend contesto que no se pudo';

interface Fila {
  readonly nombre: string;
  readonly elFallo: unknown;
  readonly clave: Peldano['clave'];
  readonly esAveria: boolean;
  readonly pideIdentidad: boolean;
  readonly reintentable: boolean;
}

const LA_ESCALERA: readonly Fila[] = [
  {
    nombre: 'red caida',
    elFallo: new TypeError(EL_MISMO_MENSAJE),
    clave: 'averia',
    esAveria: true,
    pideIdentidad: false,
    reintentable: true,
  },
  {
    nombre: '401',
    elFallo: fallo(401, 'NO_AUTENTICADO', EL_MISMO_MENSAJE),
    clave: 'sin-identidad',
    esAveria: false,
    pideIdentidad: true,
    reintentable: false,
  },
  {
    nombre: '403 SIN_MUNICIPALIDAD',
    elFallo: fallo(403, 'SIN_MUNICIPALIDAD', EL_MISMO_MENSAJE),
    clave: 'sin-municipalidad',
    esAveria: false,
    pideIdentidad: false,
    reintentable: false,
  },
  {
    nombre: '403 SIN_PRIVILEGIO',
    elFallo: fallo(403, 'SIN_PRIVILEGIO', EL_MISMO_MENSAJE),
    clave: 'sin-privilegio',
    esAveria: false,
    pideIdentidad: false,
    reintentable: false,
  },
  {
    nombre: '403 con otro codigo',
    elFallo: fallo(403, 'PROHIBIDO', EL_MISMO_MENSAJE),
    clave: 'no-permitido',
    esAveria: false,
    pideIdentidad: false,
    reintentable: false,
  },
  {
    nombre: '404',
    elFallo: fallo(404, 'NO_ENCONTRADO', EL_MISMO_MENSAJE),
    clave: 'no-encontrado',
    esAveria: false,
    pideIdentidad: false,
    reintentable: false,
  },
  {
    nombre: '409',
    elFallo: fallo(409, 'CONFLICTO', EL_MISMO_MENSAJE),
    clave: 'conflicto',
    esAveria: false,
    pideIdentidad: false,
    reintentable: false,
  },
  {
    nombre: '422 ORDEN_NO_ADMITIDO',
    elFallo: fallo(422, 'ORDEN_NO_ADMITIDO', EL_MISMO_MENSAJE),
    clave: 'orden-no-admitido',
    esAveria: false,
    pideIdentidad: false,
    reintentable: false,
  },
  {
    nombre: '422 VALIDACION',
    elFallo: fallo(422, 'VALIDACION', EL_MISMO_MENSAJE),
    clave: 'no-valido',
    esAveria: false,
    pideIdentidad: false,
    reintentable: false,
  },
  {
    nombre: '422 sin codigo',
    elFallo: new ErrorDeLaApi(422, 'PUT /algo', { mensaje: EL_MISMO_MENSAJE }),
    clave: 'no-valido',
    esAveria: false,
    pideIdentidad: false,
    reintentable: false,
  },
  {
    nombre: '500',
    elFallo: fallo(500, 'ERROR_INTERNO', EL_MISMO_MENSAJE),
    clave: 'averia',
    esAveria: true,
    pideIdentidad: false,
    reintentable: true,
  },
];

describe('#52 AC1 — la escalera entera, y ningun 4xx que nombre es una averia', () => {
  it.each(LA_ESCALERA)(
    '$nombre cae en «$clave», y dice la verdad sobre si el sistema esta roto',
    ({ elFallo, clave, esAveria, pideIdentidad, reintentable }) => {
      const peldano = peldanoDe(elFallo);

      expect(peldano.clave).toBe(clave);
      expect(peldano.esAveria).toBe(esAveria);
      expect(peldano.pideIdentidad).toBe(pideIdentidad);
      expect(peldano.reintentable).toBe(reintentable);
    },
  );

  it('EL CENTINELA: la tabla recorre los nueve peldanos que existen, no ocho', () => {
    // Una fila que se borrase dejaria su peldano sin recorrer y nada lo diria. Se comprueba el
    // CONJUNTO de claves y no su numero: un conteo seguiria cuadrando con una renombrada y otra
    // nueva.
    expect([...new Set(LA_ESCALERA.map((f) => f.clave))].sort((a, b) => a.localeCompare(b))).toEqual([
      'averia',
      'conflicto',
      'no-encontrado',
      'no-permitido',
      'no-valido',
      'orden-no-admitido',
      'sin-identidad',
      'sin-municipalidad',
      'sin-privilegio',
    ]);
  });

  it('ningun 4xx que la escalera nombra es una averia, ni se arregla reintentando', () => {
    // Es la frase entera del AC1, y se mide sobre la tabla para que una fila nueva entre sola.
    const losCuatroCientos = LA_ESCALERA.filter(
      (f) => f.elFallo instanceof ErrorDeLaApi && f.elFallo.estado >= 400 && f.elFallo.estado < 500,
    );
    expect(losCuatroCientos.length).toBeGreaterThanOrEqual(8);
    for (const fila of losCuatroCientos) {
      const peldano = peldanoDe(fila.elFallo);
      expect(peldano.esAveria, `«${fila.nombre}» se ensena como una averia`).toBe(false);
      expect(peldano.reintentable, `«${fila.nombre}» ofrece reintentar`).toBe(false);
    }
  });

  it('y con el MISMO mensaje, dos peldanos distintos no se ven iguales', () => {
    // Lo que el metodo compra: si dos peldanos distintos comparten titulo y remedio con el mismo
    // mensaje inyectado, sus dos pantallas son LA MISMA pantalla — que es lo que `normativa`
    // midio sobre los dos 422.
    //
    // Se mira por cara y no por fila: dos filas del mismo peldano —los dos 422 que caen en
    // `no-valido`— tienen que verse igual, y las dos averias, que son peldanos distintos con la
    // misma clave, tienen que verse distinto.
    const porCara = new Map<string, Set<string>>();
    for (const fila of LA_ESCALERA) {
      const peldano = peldanoDe(fila.elFallo);
      const cara = `${peldano.titulo} · ${peldano.remedio}`;
      porCara.set(cara, (porCara.get(cara) ?? new Set()).add(fila.nombre));
    }

    const repetidas = [...porCara.entries()].filter(([, filas]) => filas.size > 1);
    // La unica cara compartida legitima es la de los dos 422 que caen en `no-valido`: uno con
    // `VALIDACION` y otro sin codigo, que son el mismo peldano a proposito.
    expect(repetidas.map(([, filas]) => [...filas].sort((a, b) => a.localeCompare(b)))).toEqual([
      ['422 sin codigo', '422 VALIDACION'],
    ]);
  });
});

/**
 * **El 409 tiene su peldano, y su remedio es el contrario del que tenia** (#52, AC1).
 *
 * Los mensajes son los de verdad: `identidad` `SeguridadController.java:310`,
 * `AdministrarPermisos.java:313-315` y `normativa` `AdministrarParametros.java:311-330`.
 */
const LOS_CUATRO_CONFLICTOS: readonly string[] = [
  'Ya hay un usuario con esa cuenta en esta municipalidad',
  'El cambio dejaria a la municipalidad sin ningun usuario capaz de administrar permisos, y de ahi' +
    ' no se sale por el sistema. Otorgue primero el privilegio a otro usuario o grupo',
  'El conjunto 7 ya esta sellado; corregirlo exige una version nueva (ADR-0007)',
  'El conjunto 7 no tiene ningun parametro: sellarlo vacio diria que el ejercicio esta' +
    ' parametrizado cuando no lo esta',
];

describe('#52 — el 409 CONFLICTO deja de mandar a soporte', () => {
  it.each(LOS_CUATRO_CONFLICTOS)('«%s» cae en «conflicto», y NO en «averia»', (mensaje) => {
    const peldano = peldanoDe(fallo(409, 'CONFLICTO', mensaje));

    expect(peldano.clave).toBe('conflicto');
    expect(peldano.esAveria).toBe(false);
    expect(peldano.reintentable).toBe(false);
  });

  it('el mensaje del backend se conserva TAL CUAL: es el que dice que hay que cambiar', () => {
    const dijo = LOS_CUATRO_CONFLICTOS[1] ?? '';
    expect(peldanoDe(fallo(409, 'CONFLICTO', dijo)).detalle).toBe(dijo);
  });

  it('y su remedio no dice «reintente» ni manda a avisar a soporte', () => {
    // Era el remedio CONTRARIO: el 409 caia en la ultima rama, «Reintente en unos segundos. Si
    // sigue igual, avise a soporte con este mensaje» — para un conjunto que ya esta sellado.
    const { remedio } = peldanoDe(fallo(409, 'CONFLICTO', LOS_CUATRO_CONFLICTOS[0] ?? ''));

    expect(remedio.toLowerCase()).not.toContain('soporte');
    expect(remedio.startsWith('Reintente')).toBe(false);
  });
});

describe('#52 — ORDEN_NO_ADMITIDO no es un VALIDACION mas', () => {
  it('con el MISMO mensaje, los dos 422 no comparten ni titulo ni remedio', () => {
    // Antes de #52 la rama miraba solo `fallo.estado === 422`, asi que estos dos eran el mismo
    // peldano: el mismo titulo, el mismo remedio, y solo el detalle del backend distinto.
    const orden = peldanoDe(fallo(422, 'ORDEN_NO_ADMITIDO', EL_MISMO_MENSAJE));
    const validacion = peldanoDe(fallo(422, 'VALIDACION', EL_MISMO_MENSAJE));

    expect(orden.clave).not.toBe(validacion.clave);
    expect(orden.titulo).not.toBe(validacion.titulo);
    expect(orden.remedio).not.toBe(validacion.remedio);
  });

  it('nombra el campo que llega en «detalles», que es donde viaja', () => {
    // Su `mensaje` es fijo —«No se puede ordenar por ese campo», `CodigoDeError.java:61`— y el
    // campo solo esta en `detalles` («Campo pedido: …», `ManejadorDeErrores.java:75-81`). Sin
    // leerlo, la pantalla no puede decir por cual se pidio.
    const peldano = peldanoDe(
      new ErrorDeLaApi(422, 'GET /conjuntos', {
        codigo: 'ORDEN_NO_ADMITIDO',
        mensaje: 'No se puede ordenar por ese campo',
        detalles: ['Campo pedido: selladoPor'],
      }),
    );

    expect(peldano.clave).toBe('orden-no-admitido');
    expect(peldano.detalle).toContain('selladoPor');
  });

  it('y sin «detalles» no inventa ningun campo', () => {
    // El backend no escribe el miembro con la lista vacia. Poner «Campo pedido: undefined» seria
    // peor que no decir nada.
    const peldano = peldanoDe(fallo(422, 'ORDEN_NO_ADMITIDO', 'No se puede ordenar por ese campo'));

    expect(peldano.detalle).toBe('No se puede ordenar por ese campo');
  });

  it('su remedio no le pide a la persona que corrija nada: el defecto es de la pantalla', () => {
    const { remedio } = peldanoDe(fallo(422, 'ORDEN_NO_ADMITIDO', 'x'));

    expect(remedio.toLowerCase()).not.toContain('corrija');
  });
});

describe('#52 AC3 — la incidencia llega al peldano, como campo y no como trozo de frase', () => {
  const LA_INCIDENCIA = '2f0f7f2e-9a1c-4f1e-9a55-1c3f5c2f0a11';

  it('un 500 que la trae deja «incidencia» con ella, y el remedio la nombra', () => {
    const peldano = peldanoDe(
      new ErrorDeLaApi(500, 'POST /conjuntos/7/sellar', {
        codigo: 'ERROR_INTERNO',
        mensaje: 'No se pudo completar la operacion',
        incidencia: LA_INCIDENCIA,
      }),
    );

    expect(peldano.clave).toBe('averia');
    expect(peldano.incidencia).toBe(LA_INCIDENCIA);
    // Es lo unico con lo que soporte encuentra la causa en el registro del servidor.
    expect(peldano.remedio).toContain(LA_INCIDENCIA);
  });

  it('sin incidencia es «null», y el remedio NO promete ningun identificador', () => {
    const peldano = peldanoDe(fallo(500, 'ERROR_INTERNO', 'No se pudo completar la operacion'));

    expect(peldano.incidencia).toBeNull();
    expect(peldano.remedio.toLowerCase()).not.toContain('incidencia');
  });

  it('y todos los demas peldanos la llevan en «null»', () => {
    for (const fila of LA_ESCALERA.filter((f) => f.clave !== 'averia')) {
      expect(peldanoDe(fila.elFallo).incidencia, `«${fila.nombre}»`).toBeNull();
    }
    // Un corte de red tampoco: no hubo respuesta, asi que no hay nada que buscar en el registro.
    expect(peldanoDe(new TypeError('sin red')).incidencia).toBeNull();
  });
});

describe('#52 AC4 — los textos de la escalera son DATO', () => {
  const MARCADOS = marcarElSaco(TEXTOS_DE_LA_ESCALERA);

  it.each(LA_ESCALERA)('$nombre saca su titulo y su remedio del saco', ({ elFallo }) => {
    const peldano = peldanoDe(elFallo, MARCADOS);

    // Con el saco marcado clave a clave, lo que NO salga marcado esta escrito dentro de
    // `escalera.ts` y no se puede traducir nunca. Es el arnes de #19, aplicado a una funcion
    // pura en vez de a un arbol montado.
    expect(peldano.titulo.startsWith(ABRE), `titulo: «${peldano.titulo}»`).toBe(true);
    expect(peldano.remedio.startsWith(ABRE), `remedio: «${peldano.remedio}»`).toBe(true);
  });

  it('EL CENTINELA: el saco marcado NO se parece al de por omision', () => {
    // Sin esto, un `marcarElSaco` que devolviera el saco tal cual dejaria todo lo de arriba
    // pasando en verde sobre el castellano.
    expect(MARCADOS.elSistemaNoContesta).not.toBe(TEXTOS_DE_LA_ESCALERA.elSistemaNoContesta);
    expect(MARCADOS.elSistemaNoContesta.startsWith(ABRE)).toBe(true);
  });

  it('con UN SOLO argumento contesta lo de siempre, que es lo que `rentas` compila', () => {
    // La compatibilidad del AC8, medida aqui ademas de en el consumidor: el segundo argumento es
    // opcional y su ausencia da el castellano.
    expect(peldanoDe(fallo(403, 'SIN_MUNICIPALIDAD', 'x')).titulo).toBe(
      'Esta cuenta no tiene municipalidad asignada',
    );
    expect(peldanoDe(fallo(403, 'SIN_PRIVILEGIO', 'x')).remedio).toContain('No es una averia');
  });

  it('el `Partial` se funde encima: lo que no se pasa sigue siendo lo de siempre', () => {
    const peldano = peldanoDe(fallo(409, 'CONFLICTO', 'x'), {
      elEstadoNoAdmiteLaOperacion: 'That is not possible right now',
    });

    expect(peldano.titulo).toBe('That is not possible right now');
    // Y el remedio, que no se paso, sigue en castellano.
    expect(peldano.remedio).toBe(TEXTOS_DE_LA_ESCALERA.cambieLoQueDiceElMensaje);
  });

  it('pero el texto del BACKEND no sale del saco: es el dato, y el saco solo pone el respaldo', () => {
    // Con el saco marcado, un detalle que el backend dijo sigue siendo lo que dijo.
    expect(
      peldanoDe(fallo(422, 'VALIDACION', 'Ejercicio fuera de rango: 1800'), MARCADOS).detalle,
    ).toBe('Ejercicio fuera de rango: 1800');
    // Y cuando no dijo nada, el respaldo SI sale del saco.
    expect(peldanoDe(new ErrorDeLaApi(422, 'PUT /algo'), MARCADOS).detalle.startsWith(ABRE)).toBe(
      true,
    );
  });

  it('y ninguna frase del saco supone un sistema: no nombra padron ni cuenta de entrada', () => {
    // Las dos que lo suponian venian de que la escalera salio de `rentas`: «sin eso no hay padron
    // que ensenar» y «revise con que cuenta esta entrando». `normativa` no tiene padron, y en
    // `identidad` una cuenta sin alta recibe 403 `SIN_PRIVILEGIO`, no un 404.
    const sueltas = Object.values(TEXTOS_DE_LA_ESCALERA).filter(
      (valor): valor is string => typeof valor === 'string',
    );
    // Las cuatro que llevan un dato dentro se llaman con uno, porque su frase esta en el
    // resultado y no en la referencia.
    const todas = [
      ...sueltas,
      TEXTOS_DE_LA_ESCALERA.noSeEncontroLaOperacion('GET /conjuntos/2026'),
      TEXTOS_DE_LA_ESCALERA.elCampoQueSePidio('x', []),
      TEXTOS_DE_LA_ESCALERA.loQueDijoConSuEstado('x', 500),
      TEXTOS_DE_LA_ESCALERA.aviseASoporte(null),
      TEXTOS_DE_LA_ESCALERA.aviseASoporte('i'),
    ]
      .join('\n')
      .toLowerCase();

    expect(todas).not.toContain('padron');
    expect(todas).not.toContain('esta entrando');
    // EL CENTINELA de este recorrido: si el saco gana una quinta funcion, la lista de arriba deja
    // de cubrirlo y hay que anadirla. Un conteo de las sueltas no lo diria.
    expect(Object.values(TEXTOS_DE_LA_ESCALERA).length - sueltas.length).toBe(4);
  });
});

/**
 * **Un archivo rechazado no es una averia, ni se arregla reintentando** (#109).
 *
 * `ArchivoRechazado` y `NoEsUnDocumento` son subclases de `ErrorDeLaApi` a proposito —la pantalla
 * atrapa UNA clase— y por eso pasaban el unico `instanceof` de la escalera y caian a la
 * clasificacion por `estado`. Ninguno de sus estados —0 del rechazo local, 413/415 del servidor,
 * 200 del documento que no lo es— lo nombra esa clasificacion, asi que los tres acababan en la
 * ultima rama: «averia», reintentable y «avise a soporte». Reintentar con el mismo archivo no
 * puede funcionar nunca, y soporte no puede hacer nada con un archivo que pesa de mas.
 *
 * Los tres casos van aparte de `LA_ESCALERA` porque esa tabla mide **peldanos**: dos rechazos del
 * mismo motivo son la misma cara a proposito, y el centinela de caras la contaria como repetida.
 */
describe('#109 — un archivo rechazado no manda a soporte, ni ofrece reintentar', () => {
  const MARCADOS = marcarElSaco(TEXTOS_DE_LA_ESCALERA);

  /** Lo que las tres afirman: ni averia, ni boton de reintentar, ni soporte, y palabras del saco. */
  function noEsUnaAveria(elFallo: unknown): Peldano {
    const peldano = peldanoDe(elFallo);

    expect(peldano.esAveria, 'se ensena como una averia').toBe(false);
    expect(peldano.reintentable, 'ofrece reintentar').toBe(false);
    expect(peldano.pideIdentidad).toBe(false);
    expect(peldano.incidencia).toBeNull();
    expect(peldano.remedio.toLowerCase(), `remedio: «${peldano.remedio}»`).not.toContain('soporte');
    expect(peldano.remedio.startsWith('Reintente')).toBe(false);

    // Y lo que dice sale del saco: con el saco marcado, titulo y remedio salen marcados.
    const marcado = peldanoDe(elFallo, MARCADOS);
    expect(marcado.titulo.startsWith(ABRE), `titulo: «${marcado.titulo}»`).toBe(true);
    expect(marcado.remedio.startsWith(ABRE), `remedio: «${marcado.remedio}»`).toBe(true);
    return peldano;
  }

  it('ArchivoRechazado LOCAL (estado 0): no salio ni un byte, y el remedio nombra el motivo', () => {
    // Es lo que lanza `subir()` antes de mandar nada (`paquetes/api/subir.ts`), con `estado: 0`.
    const rechazo = (motivo: 'demasiado-grande' | 'tipo-no-admitido'): ArchivoRechazado =>
      new ArchivoRechazado(0, 'POST /documentos', {
        motivo,
        bytes: 5_000_000,
        limiteDeBytes: 1_000_000,
        tipo: 'application/x-msdownload',
      });

    const grande = noEsUnaAveria(rechazo('demasiado-grande'));
    const tipo = noEsUnaAveria(rechazo('tipo-no-admitido'));

    // Sin ensanchar la union: la clave es una de las nueve que ya existen.
    expect(grande.clave).toBe('no-valido');
    expect(tipo.clave).toBe('no-valido');
    // Y los dos motivos no se dicen igual: el remedio de uno no arregla el otro.
    expect(grande.titulo).not.toBe(tipo.titulo);
    expect(grande.remedio).toBe(TEXTOS_DE_LA_ESCALERA.elijaUnArchivoMasLiviano);
    expect(tipo.remedio).toBe(TEXTOS_DE_LA_ESCALERA.elijaUnArchivoDeOtroTipo);
    expect(grande.remedio).not.toBe(tipo.remedio);
  });

  it('ArchivoRechazado del SERVIDOR (413): el backend contesto, y lo que dijo se conserva', () => {
    const dijo = 'El archivo supera el limite de 1 MB';
    const peldano = noEsUnaAveria(
      new ArchivoRechazado(
        413,
        'POST /documentos',
        { motivo: 'demasiado-grande', bytes: 5_000_000, limiteDeBytes: null, tipo: 'text/csv' },
        { mensaje: dijo },
      ),
    );

    expect(peldano.clave).toBe('no-valido');
    // Es lo unico que puede nombrar el limite del servidor, que no viaja en ningun campo.
    expect(peldano.detalle).toBe(dijo);
    expect(peldano.remedio).toBe(TEXTOS_DE_LA_ESCALERA.elijaUnArchivoMasLiviano);
  });

  it('NoEsUnDocumento (200 con JSON): lo arregla quien hizo la pantalla, no quien la usa', () => {
    const peldano = noEsUnaAveria(new NoEsUnDocumento(200, 'GET /documentos/7', 'application/json'));

    // Como `ORDEN_NO_ADMITIDO`: la peticion la compuso la pantalla, y quien la usa no puede
    // corregir nada.
    expect(peldano.clave).toBe('orden-no-admitido');
    expect(peldano.remedio.toLowerCase()).not.toContain('corrija');
    expect(peldano.remedio).toBe(TEXTOS_DE_LA_ESCALERA.loArreglaQuienHizoLaDescarga);
  });
});
