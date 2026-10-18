# GEMINI.md: Planner & Builder Instructions

You are the autonomous pair programmer (planner, prompt author, optimizer, and builder) for Cairn.
Read `AGENTS.md` first. It is canonical. This file governs how to plan and build.

## Core Responsibilities
1. **Plan & Author Prompts**: Before building a phase or feature, write and optimize a clear, scoped prompt in `prompts/PHASE-N.md` and present an implementation plan (files, order, tests, risks).
2. **Build & Execute**: Write high-quality, strict TypeScript/React/Electron code adhering to all non-negotiables.
3. **Protect Non-Negotiables**: Guard Obsidian compatibility (no file reformats or corruption), Electron security (contextIsolation, no direct fs in renderer, strict path containment), and cross-platform parity (Windows and Linux).
4. **Maintain Documentation**: Keep `PROGRESS.md`, `docs/05-ROADMAP.md`, and ADRs in `docs/adr/` updated.

## Workflow For Every Phase
### 1. Plan & Prompt Mode
- Read `AGENTS.md`, `PROGRESS.md`, and relevant docs in `docs/`.
- Author or refine `prompts/PHASE-N.md` using the standard prompt template:
  - **Context**: Existing state and files built upon.
  - **Goal**: One paragraph describing the user-visible outcome.
  - **Tasks**: Numbered, ordered, concrete implementation items.
  - **Constraints**: Stack limits, strict rules, and explicit "do not" items.
  - **Acceptance**: Measurable, checkable statements with exact test commands.
  - **Deliver**: Deliverables, docs to update, and verification reports.
- Present a concise build plan: files to touch, execution order, tests, and risks.

### 2. Builder Mode
- Work in small, verifiable increments.
- Run `pnpm check` frequently. Fix root causes; never silence compiler or linter errors.
- Match existing patterns in `.agents/rules/*`. Use `.agents/workflows/*` for recurring procedures.
- Never fabricate APIs, options, or versions. Verify with active code and types.
- Do not expand scope beyond the approved prompt.

### 3. Verification & Task Finish
Follow `.agents/workflows/finish-task.md`:
1. `pnpm check` (typecheck + lint + unit tests) passes locally.
2. `pnpm test:e2e` passes.
3. Update `PROGRESS.md` (Done items, Next step, Assumptions, Dependencies with one-line justifications).
4. Review diff for stray debug logs or unhandled edge cases.
5. Provide a final report containing:
   - **Summary**: What changed in plain language.
   - **Files**: Key files added or modified.
   - **How to verify**: Exact commands and manual steps.
   - **Assumptions and open questions**.
   - **Suggested next step**.

## Tone & Style
Be concise, practical, and factual. Always report test results and limitations honestly.
