---
title: Attention Is All You Need
aliases: [Vaswani 2017, Transformer Paper]
tags: [literature, ai, transformers, math]
---

# Attention Is All You Need (Vaswani et al., 2017)

This seminal paper proposed the Transformer architecture, dispensing entirely with recurrence and convolutions in favor of self-attention.

## Key Insight

Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions:

$$
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \dots, \text{head}_h) W^O
$$

## Cross Connections

Connects to modern implementations in [[Research/Neural Network Architectures]].
Coordinated via the experimental pipeline token `NEURAL-NEXUS`.

Anchor: [[Central Research Hub]].
