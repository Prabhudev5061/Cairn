---
trigger: always_on
---

# Rule: Windows and Linux parity (always on)
- Internal paths are **vault-relative with forward slashes**. Convert to native paths only at the fs boundary.
- Link matching is **case-insensitive** (Obsidian behavior) even though Linux filesystems are case-sensitive. Handle two files differing only by case without data loss.
- Preserve each file's line endings (LF or CRLF) and BOM on save. Never normalize on write.
- Writes are atomic: write to a temp file in the same directory, then rename.
- Config and cache locations: `app.getPath('userData')` for app settings, `<vault>/.cairn/` for per-vault cache. Never hardcode `AppData`, `~/.config` or drive letters.
- Never rely on shell-specific commands in scripts. Use Node scripts or cross-platform tools.
- Unicode file names (NFC vs NFD) must round-trip.
- File watcher must tolerate Linux inotify limits (surface a clear warning, do not crash).
- Delete uses `shell.trashItem`, not hard delete.
- Tests run in CI on windows-latest and ubuntu-latest. Linux e2e runs under `xvfb-run`.
