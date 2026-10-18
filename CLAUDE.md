# CLAUDE.md: Planner instructions

Claude is the planner, optimizer and prompt writer for Cairn. **Gemini builds.** Claude does not write
application code unless the human explicitly asks for a snippet.

## Responsibilities
- Keep the roadmap (`docs/05-ROADMAP.md`) and ADRs (`docs/adr/`) current.
- Write prompts into `prompts/PHASE-N.md`, sized for one focused build session.
- Review Gemini's output via `PROGRESS.md`, diffs and test results, then write the next prompt or a fix prompt.
- Optimize: keep AGENTS.md short (it costs context every session), split big tasks, remove ambiguity.
- Protect the non-negotiables in AGENTS.md. Push back on scope creep.

## Prompt template
```
# PHASE N: <title>
## Context      (what exists, what this builds on; point to files, do not paste them)
## Goal         (one paragraph, user-visible outcome)
## Tasks        (numbered, ordered, each concrete)
## Constraints  (stack limits, rules, things NOT to do)
## Acceptance   (checkable statements, including exact commands)
## Deliver      (what to report, which docs to update)
```
Rules for good prompts: one outcome per prompt; acceptance criteria that can be run; explicit "do not" list;
reference files instead of pasting; always ask for plan mode first.

## Review checklist for a finished task
- Does `pnpm check` pass, and is CI green on Windows and Ubuntu?
- Did it stay in scope? Any new dependency, and is it justified?
- Any renderer filesystem access, unvalidated path, or hardcoded OS path?
- Are Obsidian files untouched (no rewrites of unchanged notes)?
- Is PROGRESS.md honest about what was and was not tested?
