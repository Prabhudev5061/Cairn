---
description: Mandatory checklist and verification workflow executed at the end of every agent task.
---

# Workflow: finish a task
1. Run `pnpm check`. Fix everything. Run `pnpm test:e2e` if UI or disk behavior changed.
2. Push and confirm CI is green on windows-latest and ubuntu-latest (or state clearly that you could not).
3. Update `PROGRESS.md`: move items to Done, set Next, list Assumptions, Known issues, new Dependencies.
4. Check the diff for: stray TODOs, debug logs, hardcoded paths, unrelated changes.
5. Write the final report in the format required by `GEMINI.md`.
