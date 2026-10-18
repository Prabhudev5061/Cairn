# Contributing to Cairn 🏔️

Welcome! Whether you are a human software engineer, a designer, or a **vibe coder pairing with an AI assistant** (Antigravity, Cursor, Claude Code, Copilot, etc.), we are excited to have you contribute to Cairn.

Cairn is a keyboard-first, Obsidian-compatible, local-first markdown note-taking desktop application built with Electron, React, and CodeMirror 6.

---

## 🧭 Core Principles (The Non-Negotiables)
Before writing any code, keep these rules in mind:
1. **Local Files Are Sovereign**: Notes are plain `.md` files on your disk. Never tamper with `.obsidian/`. Never silently reformat or normalize files on open. Preserve line endings (LF/CRLF), BOM, and YAML frontmatter byte-for-byte.
2. **Renderer Never Touches Disk**: The UI renderer runs inside a secure sandbox without nodeIntegration. All filesystem access goes through typed IPC to the main process.
3. **Cross-Platform Parity**: Windows and Linux are equal tier-1 targets. Always use vault-relative paths with forward slashes internally.
4. **Zero-Warning Code Quality**: `pnpm check` (typecheck + ESLint + Vitest) and `pnpm test:e2e` (Playwright) must always pass 100%.

---

## 🚀 Quickstart Development Setup

### Prerequisites
- **Node.js**: v24.x (use `.nvmrc` if you use nvm/fnm)
- **pnpm**: v11.x (`corepack enable` or `npm install -g pnpm`)

### Installation & Launch
```bash
# 1. Clone the repository
git clone https://github.com/your-username/cairn.git
cd cairn

# 2. Install dependencies
pnpm install

# 3. Start development server with hot reload
pnpm dev
```

---

## 🤖 Vibe Coding with AI Pair Programming
Cairn is engineered from line one to be exceptionally friendly to **Vibe Coding**—where you describe your intent and steer an LLM pair programmer.

### How to Vibe Code on Cairn:
1. **Point your Agent to [AGENTS.md](file:///d:/Note-taking%20app/cairn/AGENTS.md)**:
   This file is the canonical source of truth for all coding agents. Tell your agent:
   > *"Read AGENTS.md before planning or modifying code."*
2. **Use Phased Prompts**:
   Take inspiration from the existing prompts in `prompts/PHASE-1.md` through `prompts/PHASE-7.md`. Structure new tasks using the 5-part template:
   - **Context**: Existing state and files to build on.
   - **Goal**: One paragraph describing user-visible behavior.
   - **Tasks**: Numbered, concrete items in execution order.
   - **Constraints**: Architecture boundaries and non-negotiables.
   - **Acceptance**: Checkable test commands and verification criteria.
3. **Run Verification Commands**:
   Always instruct your AI agent to run:
   ```bash
   pnpm check
   pnpm test:e2e
   ```
   Do not commit until both commands exit with status code 0.

---

## 🧪 Testing Commands
| Command | What it runs | When to run |
|---|---|---|
| `pnpm typecheck` | Strict TypeScript compilation (`tsconfig.node.json` + `tsconfig.web.json`) | While editing types |
| `pnpm lint` | ESLint rules check | Before committing |
| `pnpm test` | Vitest unit test suite (147+ tests) | On every change |
| `pnpm test:e2e` | Playwright Electron end-to-end suite (10 specs) | When modifying UI or IPC |
| `pnpm check` | Typecheck + Lint + Unit tests combined | Mandatory pre-commit |

---

## 📦 Pull Request Process
1. Create a feature branch: `git checkout -b feature/your-feature-name`.
2. Ensure `pnpm check` and `pnpm test:e2e` are green locally.
3. Update `PROGRESS.md` with:
   - What you added/changed
   - Any dependency added (with a 1-line justification)
4. Open a Pull Request with a clear description and testing steps.
