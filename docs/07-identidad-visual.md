# 7. Identidad visual

## Concepto

**Nexo** significa unión. El símbolo es una «N» trazada como un camino que conecta dos nodos: el punto de partida (lo que tienes que hacer) y el de llegada (lo que se resuelve). Los nodos en verde salvia representan los módulos que NEXO une.

- Símbolo: [`brand/nexo-mark.svg`](../brand/nexo-mark.svg)
- Logotipo completo: [`brand/nexo-logo.svg`](../brand/nexo-logo.svg)
- Versión sobre fondo oscuro: [`brand/nexo-logo-inverse.svg`](../brand/nexo-logo-inverse.svg)

Wordmark: «nexo» en minúsculas, Manrope 700, tracking −2 %. Zona de respeto: la altura de un nodo alrededor del símbolo. Tamaño mínimo del símbolo: 20 px.

## Referencias visuales

| Referencia | Qué tomamos |
|------------|-------------|
| Dentora | Lienzo cálido, tarjetas grandes y suaves, navegación en píldora oscura, barras de progreso gruesas |
| FundFlow | Tarjeta de balance destacada, lista de transacciones limpia, «Próximos pagos» |
| Twisty | Gráfico lollipop, mucho aire, tipografía grande para la cifra principal |

## Tokens

### Color

| Token | Valor | Uso |
|-------|-------|-----|
| `--nx-ivory` | `#F7F6F2` | Fondo de la app |
| `--nx-surface` | `#FFFFFF` | Tarjetas |
| `--nx-surface-muted` | `#F1EFE9` | Tarjetas secundarias, inputs |
| `--nx-border` | `#E6E2D8` | Bordes y divisores |
| `--nx-navy-900` | `#182B35` | Color principal, texto fuerte, botón primario |
| `--nx-navy-700` | `#2A4250` | Hover primario |
| `--nx-navy-100` | `#E3E9EC` | Fondos de selección |
| `--nx-sage-500` | `#91A995` | Secundario, ingresos, progreso OK |
| `--nx-sage-700` | `#5B7660` | Texto sobre claro (contraste AA) |
| `--nx-sage-100` | `#E5ECE6` | Fondo suave |
| `--nx-sand-300` | `#E8DDCB` | Acento cálido |
| `--nx-sand-100` | `#F3EDE3` | Fondo suave |
| `--nx-text` | `#182B35` | Texto principal |
| `--nx-text-muted` | `#5F6B70` | Texto secundario (5,1:1 sobre ivory) |
| `--nx-success` / `-bg` | `#3D7650` / `#E2EFE5` | |
| `--nx-warning` / `-bg` | `#9A6212` / `#FAEFD8` | |
| `--nx-danger` / `-bg` | `#B0402D` / `#F8E2DC` | Gastos que superan presupuesto, borrar |
| `--nx-info` / `-bg` | `#2E6489` / `#E1EBF3` | |

Pasteles de categoría (siempre con nombre e icono): `sage #DCE6DD` · `sand #EFE6D6` · `mist #DCE6EC` · `blush #F3DAD3` · `butter #F4E9BE` · `lavender #E0DCEE` · `peach #F6E0CC` · `mint #D7EBDD`.

### Tipografía

| Rol | Familia | Peso | Tamaños |
|-----|---------|------|---------|
| Títulos | Manrope | 600 / 700 | 36 · 28 · 22 · 18 |
| Texto | Inter | 400 / 500 | 16 · 14 · 13 · 12 |
| Cifras | Inter `tabular-nums` | 500 / 600 | 48 (hero) · 28 · 16 |

### Forma y espacio

| Token | Valor |
|-------|-------|
| Radios | `--nx-radius-sm 8px` (chips) · `--nx-radius-md 12px` (inputs) · `--nx-radius-lg 20px` (tarjetas) · `--nx-radius-xl 28px` (hero) · `--nx-radius-pill 999px` (botones) |
| Espaciado | base 4 px: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 |
| Sombras | `--nx-shadow-sm 0 1px 2px rgb(24 43 53 / .06)` · `--nx-shadow-md 0 8px 24px rgb(24 43 53 / .08)` |
| Breakpoints | `768px` tablet · `1024px` escritorio · `1280px` escritorio amplio |
| Foco | `outline: 2px solid var(--nx-navy-900); outline-offset: 2px` |

### SCSS

```
src/styles/
├── _tokens.scss      custom properties en :root
├── _mixins.scss      @mixin bp($name), focus-ring, card
├── _typography.scss
├── _reset.scss
└── styles.scss
```
