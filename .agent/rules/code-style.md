# Rule: Code style (always on)
- TypeScript `strict: true`, plus `noUncheckedIndexedAccess`. No `any` without a comment explaining why.
- Prefer small pure functions in `src/shared/` for logic that both sides need, and unit test them.
- React: function components, hooks, no class components. Zustand for shared state; local state stays local.
- One concern per file. Name files after what they export. No giant files (over ~300 lines means split).
- Errors: return typed results at IPC boundaries (`{ ok: true, value } | { ok: false, error }`), never throw raw errors across IPC.
- Comments explain *why*, not *what*. Public functions get a short doc comment.
- No dead code, no commented-out code, no console.log left behind (use a tiny logger).
