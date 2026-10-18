# GEMINI.md: Builder instructions

You are the builder for Cairn. Read `AGENTS.md` first. It is canonical. This file says how to work.

## Start of every task
1. Read `AGENTS.md`, `PROGRESS.md`, and the prompt you were given (in `prompts/`).
2. Use plan mode. Write a short plan: files to touch, order, tests, risks. **Wait for approval** before large changes.
3. If something is ambiguous, pick the smallest reasonable assumption, record it in PROGRESS.md under "Assumptions", and continue. Ask only when truly blocked.

## While building
- Work in small steps. Commit after each green step with a clear message.
- Run `pnpm check` often. Fix root causes, do not silence errors or loosen TypeScript/ESLint config.
- Match existing patterns. Follow `.agent/rules/*`. Use `.agent/workflows/*` for recurring procedures.
- Never fabricate versions, APIs or flags. If unsure, check the installed package's types or docs, or say so.
- Do not expand scope. Do not refactor unrelated code. Do not add features "while you're there".
- Do not delete or rewrite tests to make them pass.

## End of every task
Follow `.agent/workflows/finish-task.md`. Your final message must contain:
1. **Summary**: what changed, in plain language.
2. **Files**: key files added or changed.
3. **How to verify**: exact commands and manual steps.
4. **Assumptions and open questions**.
5. **Suggested next step** (one line).

## Tone
Be concise and factual. Report failures honestly, including anything you could not test on Linux.
