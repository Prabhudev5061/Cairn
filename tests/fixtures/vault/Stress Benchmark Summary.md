---
title: Stress Benchmark Summary
aliases: [Benchmark Cheat Sheet, Stress Test Directory]
tags: [benchmark, stress-test, cairn, search]
---

# Stress Benchmark Summary

This note summarizes the stress-testing dataset generated across the vault to evaluate Cairn's in-memory indexer, live preview, autocomplete, and search speed under load.

## 1. Keywords to Search (`Mod+Shift+F`)

Open the **Search Panel** in the left Activity Rail (`Mod+Shift+F`) and test these keywords:

| Keyword | Frequency / Scope | Expected Behavior |
|---|---|---|
| `NEURAL-NEXUS` | **High-Frequency** (12+ files across 5 directories) | Instant results list across Research, Projects, Daily, and Literature. Verifies match count badges, snippet highlights, and smooth scrolling. |
| `SUPERNOVA-BURST` | **Rare / Targeted** (Exactly 2 files) | Pinpoints `Astrophysics and Supernovae.md` and `High Performance Raytracer.md` with zero noise. |
| `QUANTUM-ENTANGLEMENT` | **Mathematical / Dense** (4 files with KaTeX math) | Matches across quantum physics notes with complex formulas and Bell states. |
| `ALPHA-OMEGA-CORE` | **Hub / Apex Token** (Hub alias & references) | Matches `Central Research Hub.md` alias and cross-reference mentions. |
| `neural-nexus` vs `NEURAL-NEXUS` | **Case-Insensitivity Test** | Both lowercase and uppercase return identical complete result counts. |

## 2. Testing the Backlinks Panel Under Pressure (`Mod+Shift+B`)

Open the note [[Central Research Hub]] (or click the link right here).

1. Look at the **Backlinks Panel** on the right side of the screen.
2. Notice that **over 12 distinct notes** from `Research/`, `Projects/`, `Guides/`, `Daily/`, and `Literature/` link directly to this hub!
3. Notice each incoming file displays its exact line number and context snippet.
4. Click any backlink item to immediately jump to that file and scroll to that reference.

## 3. Testing Autocomplete Under Pressure

1. In any note, type `[[`: notice the autocomplete popup instantly presents suggestions sorted and badged across all folders (`Research/`, `Projects/`, `Guides/`, etc.).
2. Type `[[Cent`: notice fuzzy completion immediately highlights `Central Research Hub` and its aliases (`Nexus Core`, `ALPHA-OMEGA-CORE`).
3. Type `[[Central Research Hub#`: notice the autocomplete dropdown switches to display all heading anchors inside that hub (`#Key Theoretical Domains`, `#Core Directives and Keywords`, `#Active Research Milestones`).

## 4. Testing Live Preview & KaTeX Math

Open [[Research/Quantum Computing Fundamentals]] or [[Guides/LaTeX Formatting Cheat Sheet]]:
- See Bell states $|\Phi^+\rangle$, density matrices, and integrals rendered in typography-grade KaTeX.
- Click any formula: watch it expand smoothly into raw editable LaTeX.
- Move the cursor away: KaTeX immediately re-renders with zero flickering.

Enjoy stress testing Cairn!
