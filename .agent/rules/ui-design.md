# Rule: UI design (always on for renderer work)
Full brief: `docs/06-UI-DESIGN-BRIEF.md`. Short version:
- Dark-first, dense, professional "creative tool" feel with dockable panels. Inspired by the layout principles of modern open-source creative suites, **never copying any third-party logos, icons, assets, or code**.
- All colors, spacing, radii and fonts are CSS variables in `src/renderer/styles/tokens.css`. No hardcoded colors in components.
- 4px spacing grid. One accent color. Neutral grays for everything else.
- Everything reachable by keyboard. Every action is a registered command (for the future palette and rebinding).
- Panels are resizable and remember their size. Respect `prefers-reduced-motion`.
- Bundle fonts (UI sans + monospace) so rendering does not depend on the OS.
