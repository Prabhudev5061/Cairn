---
description: Procedure for declaring, implementing, and exposing typed IPC channels across main, preload, and renderer.
---

# Workflow: add an IPC channel
1. Add the channel name, request type and response type to `src/shared/ipc.ts`.
2. Implement the handler in `src/main/ipc/<area>.ts`. Validate every argument. Resolve paths inside the vault.
3. Expose a typed function in `src/preload/index.ts` (no generic passthrough).
4. Call it from the renderer through a small wrapper in `src/renderer/ipc/`.
5. Unit test the handler logic. Add an e2e step if it affects UI or disk.
6. Run `pnpm check`.
