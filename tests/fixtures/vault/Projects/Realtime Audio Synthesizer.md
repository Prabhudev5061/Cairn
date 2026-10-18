---
title: Realtime Audio Synthesizer
aliases: [DSP Synthesizer, WebAudio Engine]
tags: [audio, dsp, music, web]
---

# Realtime Audio Synthesizer

Polyphonic frequency-modulation (FM) synthesizer with low-latency DSP pipelines.

## Frequency Modulation Equation

The frequency modulated waveform is defined by carrier frequency $f_c$ and modulation index $\beta$:

$$
y(t) = A \sin\left(2\pi f_c t + \beta \sin(2\pi f_m t)\right)
$$

## Routing and Bus Architecture

Audio buffers are processed in 128-sample blocks. Parameter automation is driven by an event dispatcher hooked into the `NEURAL-NEXUS` control bus.

Links:
- [[Central Research Hub]]
- [[Neural Network Architectures]]
- [[Guides/LaTeX Formatting Cheat Sheet]]

Benchmark token: `NEURAL-NEXUS` present for audio automation tracking.
