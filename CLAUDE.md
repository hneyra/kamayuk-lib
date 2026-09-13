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
| `paquetes/ui` — `@kamayuk/ui` | **Capa 1 hecha (#6).** Los **42** tokens del artboard en un `@theme` de Tailwind v4 —38 colores, 2 radios, 2 sombras—, `Importe`/`Insignia`/`FechaDeCalculo`/`Icono` y los trazos con nombre genérico. **15 pruebas** más las barreras de tipo. **Capa 2 hecha (#8)**: seis paletas —tres identidades × dos modos— derivadas de la del artboard con reglas en OKLCH, el `ProveedorDeTema` y el primer componente de shadcn. **56 pruebas.** **Capa 3 hecha (#11)**: las once piezas de shadcn que el interprete de V8 pide en cada pantalla, mas la tabla de que pieza dibuja cada uno de los siete tipos de campo. **Capa 4 hecha (#13)**: las siete piezas del armazon —`Miga`, `Plegable`, `Menu`, `Confirmacion`, `Cajon`, `PaletaDeMando` y `Avisos`—, sobre Radix, `cmdk` y `sonner`. Los demas componentes de shadcn entran cuando se usen. **Y desde #19 no escribe ni una palabra**: las **seis** que decia por su cuenta viven en `textos.tsx` y entran por `props` con valor por omision. Ahi se destapo que `cmdk` montaba su lista como `aria-label="Suggestions"`, el mismo defecto que `sonner` tenia en #13. **Y desde #23 las seis paletas SALEN del paquete**: `estilos/temas.css` existia, estaba bien escrito y **no lo importaba nadie** —medido sobre el `dist` de `rentas`: `data-tema` 0, `data-modo` 0, `prefers-color-scheme` 0—. Lo arrastra `estilos.css` con un `@import`, y no una entrada aparte, porque el segundo `import` que el consumidor puede olvidar deja exactamente el defecto de hoy sin que nada lo diga. Lo vigila una guarda **sobre el CSS emitido**, que compila la hoja publicada como la compila Vite |
| `paquetes/shell` — `@kamayuk/shell` | **Existe (#13).** El armazón de V8: barra global, carril de módulos plegable con filtro, paleta de mando (`Ctrl/Cmd+K`), cabecera con miga, acciones al pie y el aviso de cambios sin guardar. **No se extrajo: se reescribió** — había cuatro implementaciones divergentes (445 líneas de diferencia sólo entre `rentas` y `normativa`, y `catastro` con todo dentro de un archivo de 1 238). **El catálogo de módulos y destinos entra por parámetro** y el enrutado es por hash con `createHashRouter`, con **una sola ruta** y el destino resuelto en el render: lo que el catálogo no trae no se ofrece en el árbol, ni en la paleta, ni en la miga, **ni por el hash**. **Hasta #20 había una ruta por destino ofrecido, y por eso el armazón reventaba si su catálogo cambiaba después de montar** —que es el caso normal: el catálogo sale de la red—. El enrutador se construye **una vez**, y la propiedad de que nada se abra por el hash la sostiene el mismo dato que dibuja las tres listas. **Y desde #19 tampoco escribe una palabra**: las **32** que decía por su cuenta entran por `<Armazon textos={…} />`, un `Partial` con el castellano por omisión, **sin ninguna `peerDependency` nueva** — `i18next` obligaría a los cuatro sistemas a montarlo antes de dibujar un botón. **66 pruebas** |
| `paquetes/verificaciones` — `@kamayuk/verificaciones` | **Existe.** Las **nueve prohibiciones** de ESLint con sus nueve muestras, `sin-suponer-un-sistema`, `sin-nombre-publico-entre-paquetes`, `las-capas-corren`, `los-consumidores-se-miran` y —desde #19— `el-texto-visible-es-dato` mas el arnes de marcas que usan las dos guardas montadas. **Y desde #24 `lo-que-exports-promete-existe`**, que lee los seis `package.json` TAL CUAL —no una lista escrita a mano— y comprueba que las **20 promesas** de hoy (8 subrutas de `exports` mas 12 `main`/`types`) apuntan a un archivo que existe y que es un archivo; y que una forma de `exports` que no sepa leer —condicional anidado, array, el atajo de condiciones— sale **en rojo diciendolo** en vez de pasar en verde. **Y desde #26 `rama-del-consumidor.mjs`**, que decide contra que rama del consumidor se mide un PR leyendola de su cuerpo, con sus muestras y su ensayo contra un remoto de verdad. **86 pruebas.** Le faltan los tokens contra el artboard y el contraste |
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
  ui/        los tokens, los tres temas, los componentes de shadcn (once + siete) y textos.tsx
  shell/     el armazon: catalogo.ts, busqueda.ts, acciones.ts, textos.ts y las siete piezas
  verificaciones/  texto.ts, suposiciones.ts, marcas.ts, rama-del-consumidor.mjs, sus pruebas y sus muestras/
docs/
  agent/HISTORY.md            el registro «Verificar antes de afirmar»
  00-gobierno/                la guarda de la fila y su autoprueba
```

Los paquetes se importan entre sí **por ruta relativa**, y no hay `paths` ni `alias`. Es lo
contrario de lo que este archivo decía hasta #4, y el motivo está medido: un import por el nombre
público resolvía **aquí** —este repositorio es raíz de workspaces y yarn crea
`node_modules/@kamayuk/*`— y se rompía en el consumidor, que resuelve el symlink **a su ruta real**
(`preserveSymlinks` está apagado por omisión en Vite y en `tsc`). Sin `node_modules`:

```
paquetes/sesion/escalera.ts(45,30): error TS2307: Cannot find module '@kamayuk/api'   RC=2
```

Un rojo que **sólo sale en CI**, dentro de un archivo de otro repositorio, y cuya primera lectura
manda a mirar donde no es. Lo vigila `sin-nombre-publico-entre-paquetes`, con su muestra. Y está
demostrado al revés: apartado `node_modules/@kamayuk` entero, `tsc` da RC=0 y las 160 pruebas pasan.

## Reglas que no se negocian

Son las del producto, y valen aquí igual que en los cinco sistemas. Las que este repositorio puede
romper, y por eso vigila:

**Las nueve prohibiciones de ESLint viven aquí desde #4**, en
`paquetes/verificaciones/prohibiciones.mjs`, y este repositorio se lint a sí mismo con ellas. El
motivo de mudarlas es un hueco medido: el código enlazado **no lo lintaba nadie** —el config de cada
sistema ignora `node_modules`, que es donde el `link:` lo deja—, así que entraba al bundle código
que formatea dinero y compone peticiones sin ninguna de las cuatro prohibiciones de importes.

| # | Regla | Dónde muerde |
|---|---|---|
| 1 | **Importes en texto decimal, jamás `number`** | cuatro prohibiciones, más `@kamayuk/formato`: ni un `Number` ni un `Date` en todo el paquete |
| 2 | **Ningún método recibe `municipalidadId`** | prohibición `municipalidad-en-el-cliente`, más una prueba que espía lo que sale por el cable |
| 8 | **`alicuota`, nunca `tasa`** | prohibición `tasa-en-vez-de-alicuota` |
| — | **`fetch` sólo donde debe** | `fetch-fuera-del-cliente`, con **dos** excepciones declaradas |
| — | **Sin tildes ni enie en identificadores** | `identificador-con-tilde` |
| — | **Nada supone un sistema** | `sin-suponer-un-sistema`, con su muestra |
| — | **Ningún paquete se importa por su nombre público** | `sin-nombre-publico-entre-paquetes`, con su muestra |
| — | **Ninguna palabra visible escrita dentro de un componente** | `el-texto-visible-es-dato` (el barrido, con el analizador de TypeScript) más las dos guardas que **montan** el armazón y las piezas con el saco marcado (#19) |
| — | **Ninguna entrada de `exports` promete un archivo que no está** | `lo-que-exports-promete-existe`, que lee los seis manifiestos tal cual y sale en rojo también ante una forma de `exports` que no sepa leer (#24) |

**`fetch` tiene DOS sitios legítimos, y son dos desde #4.** Lo destapó la propia prohibición al
mudarse: `paquetes/sesion/identidad.ts:282` llama a `fetch` para el canje PKCE, y ese canje **no
puede pasar por `solicitar()`** — va a Keycloak, con otro tipo de contenido, sin el token (que es
justo lo que va a buscar) y sin el `problem+json` del backend. Mientras el cliente HTTP y la puerta
de identidad vivieron en el mismo `src/api/` de un sistema, una sola excepción las cubría y esto no
se veía. La lista se **comprueba entera**, no se cuenta.

**Si agregas una regla, agrega también la muestra que la viola.** Una regla que no puede fallar no
protege nada.

## Idioma

Español en el dominio, inglés en lo técnico. **Sin tildes en identificadores.** Comentarios, pruebas
y mensajes de commit en español.

## Comandos

```bash
yarn install
yarn verificar               # lint, tipos y pruebas, mas las de capa
yarn test                    # solo las pruebas (SIN las de capa)
yarn test:capas              # las que abren una capa con posicionador. Ver `las-capas-corren.test.ts`
yarn registro                # la guarda de la fila del registro
yarn registro:autoprueba     # sus nueve muestras
yarn consumidor:rama --consumidor duenno/sistema [--comprobar]   # contra que rama se mide (#26)
yarn consumidor:ensayo       # el ensayo de esa resolucion contra un remoto de verdad. Sale a la red
```

**Un PR puede nombrar la rama del consumidor contra la que quiere medirse** (#26), con una línea de
su cuerpo: `consumidor: duenno/sistema@la-rama-que-lo-arregla`. Sin ella se mide la rama por omisión
del consumidor, que es el caso normal; con ella, **la rama nombrada es el contrato** y si sale roja
bloquea, aunque la línea base también esté roja —que es lo normal, porque esa rama trae el ajuste
que espera el cambio de aquí—. Una rama nombrada que no existe **sale roja diciéndolo**: no se cae a
la de por omisión en silencio. Por qué es una línea del cuerpo del PR y no un archivo ni una
etiqueta está medido en `paquetes/verificaciones/rama-del-consumidor.mjs`.

## Verificar antes de afirmar

**Ejecutar la prueba vale más que razonar sobre ella.** Y no basta con que la verificación esté
escrita: **tiene que demostrarse que puede fallar** — se rompe a propósito el código que protege,
se ejecuta, y se anota el rojo exacto que sale.

Las filas viven en [`docs/agent/HISTORY.md`](docs/agent/HISTORY.md), y ahí es donde se escribe la
siguiente. Que la fila **exista** lo comprueba `docs/00-gobierno/verificar-fila-del-registro.mjs` en
cada PR que cierre un issue y toque código de producción. Lo que la fila **diga** lo lee la revisión.
