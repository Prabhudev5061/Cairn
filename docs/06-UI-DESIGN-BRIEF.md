# UI Design Brief

## Inspiration (principles only)
Modern open-source creative suites (for example the ArtCraft family) share a look: dark theme, dense panels around
a central work area, familiar shortcuts, little decoration. Cairn borrows those *principles*.
Do not copy any logos, icons, assets, names, or code. Put reference screenshots in `docs/ui-reference/` for study.

## Layout
```
┌ Title bar: vault name · command palette hint ───────────────────────┐
│ Activity │ Sidebar        │ Editor tabs                 │ Right panel │
│ rail     │ (Files/Search/ │ ┌─────────────────────────┐ │ (Outline,   │
│ (icons)  │  Tags)         │ │ Live-preview editor     │ │  Backlinks, │
│          │                │ └─────────────────────────┘ │  Local graph)│
├──────────┴────────────────┴─────────────────────────────┴─────────────┤
│ Status bar: vim mode · cursor · words · vault path · save state      │
└───────────────────────────────────────────────────────────────────────┘
```
Phase 1 builds this shell. Right panel and activity rail may be placeholders.

## Tokens (`src/renderer/styles/tokens.css`)
- Dark default. Backgrounds from 3 to 4 neutral steps (app, panel, raised, hover). Text: primary, muted, faint.
- One accent color (suggest a calm blue-violet) plus semantic success/warn/danger.
- 4px grid. Radii 4/6/8. Borders 1px, low contrast.
- UI font: Inter (bundled). Editor font: JetBrains Mono for code, same UI font for prose. Editor line-height about 1.65, measure about 70ch.
- Light theme is a later phase, but all colors must already be tokens so it is a swap, not a rewrite.

## Behavior
- Resizable panels (remembered per vault), collapsible with keyboard shortcuts.
- Icons: lucide-react.
- Every action is a registered command with an id, a title and an optional default key binding.
- Focus rings visible. Full keyboard navigation of tree, tabs and panels.
