# `kamayuk-lib`

Las **librerías comunes del producto Kamayuk**: lo que vale igual en los cuatro sistemas y por
tanto no puede vivir en ninguno.

Lo decide [ADR-0038 — «El corte entre el producto y el suelo»](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0038-el-corte-entre-el-producto-y-el-suelo.md),
que contesta [`D-23b`](https://github.com/hneyra/infrastructure/blob/main/docs/00-gobierno/D-23b-quien-publica-las-librerias-comunes.md),
con un criterio de una línea:

> Si describe el clúster, es de `infrastructure`. Si describe el producto y vale igual en los
> cuatro sistemas, es de **`kamayuk-lib`**. Si sólo vale en uno, es de ese sistema.

Y una regla que lo gobierna, de [ADR-0030 §4](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0030-cuatro-interfaces-una-sesion.md):

> **Una librería común no puede contener lógica de negocio de un contexto.** Si `@kamayuk/ui`
> necesita saber qué es un arbitrio, dejó de ser común y es el monolito otra vez, repartido y sin
> que el build lo vea.

Esa regla no es una intención: la vigila
[`sin-suponer-un-sistema.test.ts`](paquetes/verificaciones/sin-suponer-un-sistema.test.ts), con su
muestra que la viola.

## Los seis paquetes

| Paquete | Qué trae | Estado |
|---|---|---|
| [`@kamayuk/formato`](paquetes/formato) | fechas, importes y documento de identidad | **Existe.** <!-- cifras:formato -->**68 pruebas** en 3 archivos<!-- /cifras --> |
| [`@kamayuk/api`](paquetes/api) | `solicitar()`, `solicitarRespuesta()`, `descargar()`, `subir()`, la clave de idempotencia y el catálogo de errores | **Existe.** <!-- cifras:api -->**146 pruebas** en 6 archivos<!-- /cifras --> |
| [`@kamayuk/sesion`](paquetes/sesion) | OIDC con PKCE S256, la sonda del emisor, la consola de la cuenta, quién entró según el `id_token` y la escalera de peldaños | **Existe.** <!-- cifras:sesion -->**150 pruebas** en 3 archivos<!-- /cifras --> |
| [`@kamayuk/ui`](paquetes/ui) | los 42 tokens, cuatro identidades por dos modos, las piezas de shadcn y el intérprete de pantallas | **Existe.** <!-- cifras:ui -->**545 pruebas** en 25 archivos, más las **3** de capa<!-- /cifras --> |
| [`@kamayuk/shell`](paquetes/shell) | barra, árbol de módulos, paleta de mando, enrutado por hash, miga, acciones y el aviso de cambios sin guardar | **Existe.** <!-- cifras:shell -->**151 pruebas** en 14 archivos<!-- /cifras --> |
| [`@kamayuk/verificaciones`](paquetes/verificaciones) | las barreras, sus muestras y el **arnés del `Request`** que los cinco necesitan para correr con Node 24 | **Existe.** <!-- cifras:verificaciones -->**277 pruebas** en 19 archivos<!-- /cifras --> |

## Cómo se consume

**Por `link:` a un clon hermano, no por un artefacto publicado.** Es el mismo mecanismo que los
cinco sistemas ya usan para `@kamayuk/infra-contrato`, y el motivo está escrito en
`infrastructure/librerias-backend/README.md`:

> Un jar publicado a mano se queda viejo sin que nada se ponga rojo, y una verificación vieja que
> pasa en verde es exactamente el modo de fallo que este proyecto lleva doscientos issues evitando.

En el `package.json` del sistema que consume:

```json
{
  "dependencies": {
    "@kamayuk/formato": "link:../../kamayuk-lib/paquetes/formato",
    "@kamayuk/api": "link:../../kamayuk-lib/paquetes/api",
    "@kamayuk/sesion": "link:../../kamayuk-lib/paquetes/sesion"
  }
}
```

Los paquetes son **sólo fuente** —`main: index.ts`, sin compilar— así que quien los consume los
compila con su propio Vite, y React, Radix y Tailwind entran como `peerDependencies`.

**Los cuatro frontends pasan a depender de un clon hermano**, y ADR-0038 lo dice sin disimular: *«ésa
es la propiedad que se pierde. A cambio, el marco deja de estar escrito cuatro veces»*.

### El arnés del `Request`, que se importa y no se copia (#92)

**Una línea en el `vitest.setup.ts` del sistema que consume, y es ésta, exacta:**

```ts
import '@kamayuk/verificaciones/arnes-del-request';
```

Sin ella, con **Node 24** cada navegación del enrutador de datos de `react-router` muere dentro de
`createClientSideRequest`: el `Request` de `undici` —el que viene dentro de Node— comprueba la señal
con el `instanceof` ordinario contra el `AbortSignal` que existía **al arrancar Node**, y el
`AbortController` global bajo Vitest es el de jsdom, de otro realm. El síntoma es
`TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal`, y con
`CI=true` Vitest no perdona los rechazos sin atender: **RC=1 sin que haya una sola prueba roja**. Lo
medido con Node 24 el 2026-09-16, por el trabajo `consumidores` de este repositorio:

| Sistema | Lo que le pasa hoy | Qué le falta |
|---|---|---|
| `rentas` | `652 passed (652)` y **2 168 errores** | la línea; ya enlaza `@kamayuk/verificaciones` en `devDependencies` |
| `catastro` | `310 passed (310)` y **18 errores** | la línea; ya enlaza `@kamayuk/verificaciones` en `devDependencies` |
| `normativa` | `Tests 2 failed \| 426 passed (428)` y **213 errores** | la línea **y** el `link:`: hoy enlaza cinco paquetes y `verificaciones` no es uno |
| `caja` | verde desde `caja`#93, con **la copia a mano** | cambiar la copia —docblock incluido— por la línea |

Que `rentas` y `catastro` **ya enlazan** `@kamayuk/verificaciones` está medido el 2026-09-20 sobre el
`main` de cada uno —`frontend/package.json`, en `devDependencies`—; que `normativa` no lo enlaza sale de
[`consumidores.json`](consumidores.json) y de la tabla de más abajo.

Al que le falte el `link:`, primero esto en su `devDependencies`:

```json
{
  "devDependencies": {
    "@kamayuk/verificaciones": "link:../../kamayuk-lib/paquetes/verificaciones"
  }
}
```

**Y que no vuelva a escribirse a mano lo comprueba cada uno en su propio árbol**, sin instalar nada:

```bash
node node_modules/@kamayuk/verificaciones/el-arnes-del-request-no-se-copia.mjs
```

Sale con RC=1 nombrando archivo y línea si alguien ha vuelto a reimplementarlo, y dice con qué línea
se cambia. Aquí es `yarn arnes:copias`, y además lo exige una prueba:
`el-arnes-del-request-se-publica.test.ts`, con su muestra. **Lo que esta librería no puede vigilar es
el árbol de un consumidor que no tiene clonado**, y por eso son dos piezas y no una.

## Quién la consume, y a quién mide la CI

Con `link:` no hay versión que dé margen: cada `main` de aquí es el `main` de los sistemas. Por eso
el trabajo `consumidores` de [`paquetes.yml`](.github/workflows/paquetes.yml) le corre la suite a
cada consumidor **dos veces** —con la librería en `main` y con la rama del PR— y falla si la rama lo
pone rojo (#10). A quién mide no está escrito en el workflow: lo lee de
[`consumidores.json`](consumidores.json), y lo vigila `los-consumidores-se-miran.test.ts`, que desde
#79 comprueba **lo que decide que el `link:` del consumidor resuelva** —que `<directorio>/<ruta>`
baje dos niveles y que `directorio` no choque con el clon de esta librería— y, **como convención**,
que la carpeta se llame como el repositorio.

| Sistema | Enlaza `kamayuk-lib` | La CI lo mide |
|---|---|---|
| `rentas` | sí | **sí**, desde #10 |
| `catastro` | sí, desde `catastro`#118 | **sí**, desde #45 |
| `caja` | sí, desde `caja`#83 | **sí**, desde #75 |
| `ciudadano` | sí | **sí**, desde #56 |
| `pcf` | sí, desde su T1 | **sí**, desde #82 |
| `normativa` | sí, desde `normativa`#55 | **sí**, desde #60 |

La columna del medio se midió sobre el `main` de cada sistema el 2026-09-16, contando los
`link:../../kamayuk-lib/paquetes/*` de `frontend/package.json`: seis en `rentas`, `catastro` y
`caja`, **cuatro en `pcf`** —`ui`, `shell`, `api` y `formato`; no enlaza `sesion`, porque su login es
el JWT propio del sistema que porta, ni `verificaciones`—, tres en `ciudadano` y **cinco en
`normativa`** —`api`, `formato`, `sesion`, `shell` y `ui`, todos en `dependencies`; tampoco enlaza
`verificaciones`, porque sus diez prohibiciones de ESLint son suyas y una de ellas,
`cifra-tributaria-literal`, aquí es opcional (#58)—. **Un sistema entra en la lista cuando ya
enlaza, y no antes**: medirlo antes sería correr una suite que no lee nada de aquí.

Con `normativa` la lista queda **completa**: los cuatro sistemas de Kamayuk, `ciudadano` y `pcf`.

## Comandos

```bash
yarn install
yarn verificar     # lint, tipos y pruebas, y que las cifras de pruebas sean las medidas
yarn cifras        # reescribe esas cifras, aquí y en CLAUDE.md, midiéndolas (#128)
yarn registro      # la guarda de la fila del registro
yarn arnes:copias  # que nadie haya vuelto a escribir a mano el arnés del `Request` (#92)
```

## Qué NO hay aquí

- **Nada de un solo sistema.** Ni un prefijo de ruta, ni un catálogo de módulos, ni una palabra del
  vocabulario tributario. Lo vigila `sin-suponer-un-sistema`.
- **Los módulos de backend** —`comun-dominio`, `comun-plataforma`, `comun-integracion`,
  `comun-gobierno` y `comun-verificaciones`— que ADR-0038 también manda traer aquí. Llegan por su
  propio camino (`infrastructure`#22, #23, #24); mezclarlos con la primera interfaz haría imposible
  saber qué rompió qué.
