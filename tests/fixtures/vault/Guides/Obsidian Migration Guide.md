---
title: Obsidian Migration Guide
aliases: [Migration, Obsidian Compatibility]
tags: [guide, obsidian, markdown]
---

# Obsidian Migration Guide

Cairn is engineered to be an Obsidian drop-in companion. All existing vaults open directly without conversion, file modification, or hidden configuration.

## Syntax Support Matrix

- **Wikilinks**: `[[note]]`, `[[note|alias]]`, `[[note#heading]]`
- **Embeds**: `![[embed.png]]`, `![[note]]`
- **Callouts**: `> [!note]`, `> [!warning]`, `> [!tip]`, `> [!important]`
- **Highlighting**: `==highlighted text==`
- **Tags**: `#obsidian`, `#guide/advanced`
- **Math**: `$E=mc^2$` and `$$\int_0^\infty e^{-x} dx = 1$$`

## File Integrity Guarantees

Cairn never writes to `.obsidian/`. It preserves existing line endings (CRLF vs LF) and UTF-8 BOMs byte-for-byte.

Linked hubs:
- Navigation anchor: [[Central Research Hub]]
- Architecture overview: [[Projects/Project Cairn Architecture]]
- Testing documentation: [[Stress Testing Search and Indexing]]
