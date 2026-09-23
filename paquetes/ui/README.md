# `@kamayuk/ui`

Los **42** tokens del artboard en un `@theme` de Tailwind v4 —38 colores, 2 radios, 2 sombras—;
**cuatro identidades × dos modos**; `Importe`/`Insignia`/`FechaDeCalculo`/`Icono` y los trazos con
nombre genérico; **once + siete** piezas de shadcn; el `ProveedorDeTema`; y el **intérprete de
pantallas**, que tiene su propio [`README.md`](interprete/README.md).

## Qué trae

- **Cuatro identidades × dos modos**: ocho paletas derivadas con reglas en OKLCH de **dos orígenes**
  —el `@theme` y `estilos/clasico.css`, que no se importa sino que se lee— con `ORIGEN_DE`
  decidiendo cuál le toca a cada una, de modo que pasarle a una identidad la base de otra no es
  posible.
- **Once + siete** piezas de shadcn —las que el intérprete pide en cada pantalla y las del armazón,
  sobre Radix, `cmdk` y `sonner`—. Los demás componentes de shadcn entran cuando se usen.

## Tres cosas que no se tocan

- `estilos/temas.css` es **archivo generado**: sale de `temas/generar.ts`, se regenera con
  `KAMAYUK_REGENERAR=1`, lo arrastra `estilos.css` con un `@import` y lo vigila una guarda **sobre
  el CSS emitido**, que lo compila como lo compila Vite.
- Los tres bloques oscuros declaran `color-scheme: dark` **por sus dos caminos cada uno**, sin lo
  cual los controles nativos, la barra de desplazamiento y el fondo previo del lienzo se quedan
  claros bajo una paleta oscura.
- **El paquete no escribe ni una palabra visible**: lo suyo vive en `textos.tsx` y entra por `props`
  con valor por omisión.

## Lo que le falta

Los tokens contra el artboard y el contraste.

---

Este archivo dice **el estado** del paquete, y salió de la tabla de [`CLAUDE.md`](../../CLAUDE.md)
en #128. Cuántas pruebas tiene —más las de capa y las barreras de tipo— lo escribe `yarn cifras` en
esa tabla; por qué cada cosa es como es —lo que se midió, con qué rotura y qué rojo salió— vive en
[`docs/agent/HISTORY.md`](../../docs/agent/HISTORY.md), una fila por issue.
