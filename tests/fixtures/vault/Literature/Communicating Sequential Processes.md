---
title: Communicating Sequential Processes
aliases: [Hoare 1978, CSP]
tags: [literature, concurrency, computer-science, algorithms]
---

# Communicating Sequential Processes (C.A.R. Hoare, 1978)

Hoare's formal language for describing patterns of interaction in concurrent systems without shared mutable memory.

## Core Tenet

> "Do not communicate by sharing memory; instead, share memory by communicating."

Processes synchronize and exchange values via synchronous, unbuffered channels:

$$
P \xrightarrow{c!v} Q \quad \text{synchronized with} \quad Q \xrightarrow{c?x}
$$

## Distributed Relevance

Directly informs the design of actor engines and consensus protocols:
- Implementation study: [[Projects/Distributed Database Engine]]
- Event bus routing token: `NEURAL-NEXUS`
- Nexus coordinator: [[Central Research Hub]]
