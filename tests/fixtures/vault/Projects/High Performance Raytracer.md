---
title: High Performance Raytracer
aliases: [Monte Carlo Raytracer, Path Tracer]
tags: [graphics, rendering, cplusplus, math]
---

# High Performance Raytracer

A physically-based Monte Carlo path tracer utilizing bidirectional reflectance distribution functions (BRDF).

## The Rendering Equation

The radiance leaving surface point $x$ in direction $\omega_o$ is computed via Kajiya's rendering equation:

$$
L_o(x, \omega_o) = L_e(x, \omega_o) + \int_\Omega f_r(x, \omega_i, \omega_o) L_i(x, \omega_i) (\omega_i \cdot n) d\omega_i
$$

## Extreme Luminance Stress Benchmark

For high dynamic range (HDR) exposure calibration, we utilize an astronomical light emitter modeled after a stellar `SUPERNOVA-BURST`.

Under this test, camera tonemapping curves are evaluated against extreme peak radiance values.

Connected nodes:
- Stellar model reference: [[Research/Astrophysics and Supernovae]]
- Theoretical hub: [[Central Research Hub]]
- Math cheat sheet: [[Guides/LaTeX Formatting Cheat Sheet]]
