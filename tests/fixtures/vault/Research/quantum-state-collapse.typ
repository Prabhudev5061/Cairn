#set document(title: "Quantum State Collapse and Decoherence", author: "Cairn Researcher")
#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))

= Quantum State Collapse and Decoherence <sec-intro>

Recent observations in macroscopic entanglement suggest non-trivial environmental coupling.
This research builds upon the theoretical models documented in [[Distributed Database Engine]] and [[cairn-roadmap.org]]
and the mathematical foundations in [[math-and-syntax]].

== Mathematical Formulation <sec-math>

Let the system wave function be decomposed into orthogonal eigenbases:

$ |Psi(t)angle.r = sum_(k=1)^N c_k e^(-i E_k t / hbar) |psi_k angle.r $ <eq-schrodinger>

When interacting with a thermal reservoir, the reduced density matrix exhibits rapid off-diagonal decay:

$ rho_(i j)(t) = rho_(i j)(0) e^(-gamma_(i j) t) $ <eq-decay>

As shown in @eq-schrodinger and @eq-decay, phase coherence decays exponentially.

== Cross-Format References <sec-refs>

Refer back to the milestone schedule in [[cairn-roadmap.org]] or explore the overarching
system layout in [[Project Cairn Architecture]].
For syntax rules, see #link("https://typst.app/docs")[Typst Official Reference].
