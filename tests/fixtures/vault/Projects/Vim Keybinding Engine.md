---
title: Vim Keybinding Engine
aliases: [Vim Engine, Modal Editing]
tags: [vim, editor, productivity, cairn]
---

# Vim Keybinding Engine

Cairn integrates modal editing via `@replit/codemirror-vim`, embedded cleanly inside a CodeMirror `Compartment`.

## Ex Commands Implemented

- `:w` — Save current note atomically to disk.
- `:q` — Close active editor tab.
- `:wq` / `:x` — Save and close active editor tab.

## Mode Synchronization

Vim modes (`NORMAL`, `INSERT`, `VISUAL`, `REPLACE`) synchronize in real-time to the Cairn status bar.

Shortcut toggle: `Mod+Shift+V` toggles modal editing mode on and off instantly without reloading notes.

Cross references:
- [[Project Cairn Architecture]]
- [[Guides/Keyboard Shortcuts and Vim Mastery]]
- Central anchor: [[Central Research Hub]]
