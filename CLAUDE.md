# `kamayuk-lib` — Contexto para agentes

Las **librerías comunes del producto Kamayuk**: lo que vale igual en los cuatro sistemas y por eso
no puede vivir en ninguno. Seis paquetes npm, **sólo fuente**, consumidos por `link:` desde un clon
hermano.

Es el **sexto repositorio**. Los otros son [`rentas`](https://github.com/hneyra/rentas),
[`catastro`](https://github.com/hneyra/catastro), [`normativa`](https://github.com/hneyra/normativa),
[`caja`](https://github.com/hneyra/caja), [`identidad`](https://github.com/hneyra/identidad) e
[`infrastructure`](https://github.com/hneyra/infrastructure). El archivo histórico es
[`sgtm`](https://github.com/hneyra/sgtm), que **no se borra ni se modifica**.

Lo decide [ADR-0038](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0038-el-corte-entre-el-producto-y-el-suelo.md)
(Aceptado, 2026-09-07), que contesta `D-23b`. El reparto de los seis paquetes es de
[ADR-0030 §4](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0030-cuatro-interfaces-una-sesion.md).

## Qué hay hoy, medido y no supuesto

| Pieza | Estado |
|---|---|
| `paquetes/formato` — `@kamayuk/formato` | **Existe.** Fechas, importes y documento de identidad, copiado **verbatim** de `rentas/frontend/src/dominio/`. **67 pruebas.** Es la hoja limpia del grafo: no importa nada de nadie. Le faltan `codigo predial` y `placa`, que ADR-0030 §4 le encarga y **no se inventan**: entran el día que el sistema dueño del dato diga cuál es su forma |
| `paquetes/api` — `@kamayuk/api` | **Existe.** `ErrorDeLaApi` y `crearCliente({ prefijo, token })`. **21 pruebas.** **No se extrajo: se diseñó** — medido el 2026-09-12, los tres clientes de `rentas`, `normativa` y `catastro` tenían **tres clases de error incompatibles** y compartían 45 líneas de 135 |
| `paquetes/sesion` — `@kamayuk/sesion` | **Existe.** `crearIdentidad(config)` con PKCE S256 y `peldanoDe()` con sus **siete** peldaños. **33 pruebas.** Venía de `rentas`, el único de los cuatro que se autenticaba, y **nada dentro nombraba a `rentas`**: lo único que lo ataba eran tres datos, hoy parámetros |
| `paquetes/ui` — `@kamayuk/ui` | **Vacío.** Le tocan los tokens, los tres temas por dos modos y los componentes de shadcn |
| `paquetes/shell` — `@kamayuk/shell` | **Vacío.** Le toca el marco. **No se extrae: se reescribe** — hay cuatro implementaciones divergentes (445 líneas de diferencia sólo entre `rentas` y `normativa`, y `catastro` con todo dentro de un archivo de 1 238) |
| `paquetes/verificaciones` — `@kamayuk/verificaciones` | **Existe a medias.** `sin-suponer-un-sistema` con su muestra. **13 pruebas.** Le faltan las nueve prohibiciones de ESLint, los tokens contra el artboard y el contraste |
| La guarda de la fila del registro | **Existe**, con su autoprueba de **nueve muestras**, adaptada a la forma de este repositorio |

## La regla que gobierna este repositorio

> **Una librería común no puede contener lógica de negocio de un contexto.** Si `@kamayuk/ui`
> necesita saber qué es un arbitrio, dejó de ser común y es el monolito otra vez, repartido y sin
> que el build lo vea. — ADR-0030 §4

**No es una intención: la vigila `paquetes/verificaciones/sin-suponer-un-sistema.test.ts`**, que
barre el código de producción de los cinco paquetes que viajan a un navegador —omitiendo
comentarios— y prohíbe cuatro cosas:

| Clave | Qué prohíbe |
|---|---|
| `prefijo-de-un-sistema` | `/rentas/api`, `/caja/api`… ADR-0030 §2: **la ruta dice quién responde**, y el prefijo es parámetro de `crearCliente` |
| `global-de-configuracion-de-un-sistema` | `__KAMAYUK_RENTAS__` y hermanos: el nombre lleva el sistema dentro |
| `catalogo-de-modulos-de-un-sistema` | `RENTAS_REGISTRO` y demás códigos de módulo |
| `vocabulario-tributario` | `arbitrio`, `alicuota`, `autovaluo`, `predial`, `contribuyente` |

**`@kamayuk/verificaciones` queda fuera del barrido, y lo descubrió la propia guarda: se delataba a
sí misma.** El texto de su regla cita «arbitrio» —es el ejemplo con el que ADR-0030 la escribe— y
ese texto es código, no comentario. Es el único paquete que no viaja a un navegador.

**Los comentarios se omiten a propósito.** Los docblocks explican de qué archivo de qué sistema
salió cada pieza, y esa procedencia **es la medición que se hizo**. Una guarda que obligara a
borrarla estaría pidiendo falsificar el registro.

## Estructura

```
paquetes/
  formato/   valores.ts, formato.ts, aritmetica.ts, documento.ts
  api/       cliente.ts (ErrorDeLaApi + crearCliente)
  sesion/    identidad.ts (crearIdentidad), escalera.ts (peldanoDe)
  ui/        vacio
  shell/     vacio
  verificaciones/  texto.ts, suposiciones.ts, sus pruebas y sus muestras/
docs/
  agent/HISTORY.md            el registro «Verificar antes de afirmar»
  00-gobierno/                la guarda de la fila y su autoprueba
```

Los paquetes se resuelven entre sí **por el mismo nombre con el que los ve un consumidor**
(`@kamayuk/formato`, no una ruta relativa), y eso está en dos sitios que tienen que decir lo mismo:
el `paths` de `tsconfig.json` y el `alias` de `vitest.config.ts`. Un `import` por ruta relativa
funcionaría aquí y se rompería en el consumidor, que es donde nadie lo estaría mirando.

## Reglas que no se negocian

Son las del producto, y valen aquí igual que en los cinco sistemas. Las que este repositorio puede
romper, y por eso vigila:

| # | Regla | Dónde muerde |
|---|---|---|
| 1 | **Importes en texto decimal, jamás `number`** | `@kamayuk/formato`: ni un `Number` ni un `Date` en todo el paquete |
| 2 | **Ningún método recibe `municipalidadId`** | `@kamayuk/api`: el cliente no compone nada, y hay prueba que espía lo que sale por el cable |
| 8 | **`alicuota`, nunca `tasa`** | prohibición de ESLint (pendiente de traer) |
| — | **Sin tildes ni enie en identificadores** | `eslint.config.js` |
| — | **Nada supone un sistema** | `sin-suponer-un-sistema`, con su muestra |

**Si agregas una regla, agrega también la muestra que la viola.** Una regla que no puede fallar no
protege nada.

## Idioma

Español en el dominio, inglés en lo técnico. **Sin tildes en identificadores.** Comentarios, pruebas
y mensajes de commit en español.

## Comandos

```bash
yarn install
yarn verificar               # lint, tipos y pruebas
yarn test                    # solo las pruebas
yarn registro                # la guarda de la fila del registro
yarn registro:autoprueba     # sus nueve muestras
```

## Verificar antes de afirmar

**Ejecutar la prueba vale más que razonar sobre ella.** Y no basta con que la verificación esté
escrita: **tiene que demostrarse que puede fallar** — se rompe a propósito el código que protege,
se ejecuta, y se anota el rojo exacto que sale.

Las filas viven en [`docs/agent/HISTORY.md`](docs/agent/HISTORY.md), y ahí es donde se escribe la
siguiente. Que la fila **exista** lo comprueba `docs/00-gobierno/verificar-fila-del-registro.mjs` en
cada PR que cierre un issue y toque código de producción. Lo que la fila **diga** lo lee la revisión.
