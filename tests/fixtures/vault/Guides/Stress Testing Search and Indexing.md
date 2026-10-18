---
title: Stress Testing Search and Indexing
aliases: [Search Benchmark, Stress Testing Protocol]
tags: [benchmark, search, indexing, guide]
---

# Stress Testing Search and Indexing

This guide documents the stress test benchmarks designed to evaluate Cairn's in-memory indexer and search subsystem under pressure.

## Benchmark Keywords & Frequencies

1. **`NEURAL-NEXUS`** (High-Frequency / Broad Match):
   - Appears across 12+ notes in `Research/`, `Projects/`, `Daily/`, and `Literature/`.
   - Used to verify instant debounced search performance and match count aggregation.

2. **`SUPERNOVA-BURST`** (Targeted / Exact Match):
   - Appears in exactly 2 notes:
     - `Research/Astrophysics and Supernovae.md`
     - `Projects/High Performance Raytracer.md`
   - Used to verify instant precise filtering and disambiguation.

3. **`QUANTUM-ENTANGLEMENT`** (Deep Math & Physics):
   - Appears in 4 notes with complex KaTeX formulas:
     - `Research/Quantum Computing Fundamentals.md`
     - `Research/Topological Quantum Field Theory.md`
     - `Guides/LaTeX Formatting Cheat Sheet.md`
     - `Literature/Quantum Supremacy Paper Review.md`

4. **`ALPHA-OMEGA-CORE`** (Backlinks Hub Stress Test):
   - Target hub: `Research/Central Research Hub.md`.
   - Linked to by over 12 notes across the vault.
   - Evaluates the right-side Backlinks panel under heavy incoming reference density.

Associated hub: [[Central Research Hub]]
