---
title: Synaptic Plasticity
aliases: [Neuroplasticity, STDP]
tags: [neuroscience, biology, research]
---

# Synaptic Plasticity

Synaptic plasticity is the biological foundation of learning and memory consolidation in biological systems.

## Spike-Timing-Dependent Plasticity (STDP)

The temporal difference $\Delta t = t_{\text{post}} - t_{\text{pre}}$ determines the direction and magnitude of synaptic weight alteration:

$$
\Delta w = \begin{cases}
A_+ e^{-\Delta t / \tau_+} & \text{if } \Delta t > 0 \\
-A_- e^{\Delta t / \tau_-} & \text{if } \Delta t < 0
\end{cases}
$$

## Cross-Disciplinary Modeling

In our biomimetic models, biological plasticity principles are mapped to synthetic neural layers. The interface between these architectures is codified in the `NEURAL-NEXUS` protocol.

References:
- Master coordinator: [[Central Research Hub]]
- Synthetic counterpart: [[Neural Network Architectures]]
- Foundational paper: [[Literature/Spike-Timing-Dependent Plasticity]]
