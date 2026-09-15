# Robot Lab

An interactive, isometric explanation of robots helping build more robots, and of the supply chains that make this possible.

English is the default. Use **EN / ES** to switch the interface and narration. Both scenes work with touch controls.

- **Industrial district:** follow people and robots through mining, refining, four component families, logistics, assembly and testing. Compare reinvesting across the chain with reinforcing assembly alone.
- **Phone factory:** automate individual stations and see how queues, shifts, machinery and component supply affect finished phones.
- **Click a place:** hear an explanation of its role, followed by its current condition. Narration pauses the simulation so the explanation remains relevant. Transcripts and voice controls are included.

## What the model means

Reinvested production can increase future productive capacity. For that feedback to keep accelerating, supporting supplies, equipment and infrastructure must expand too. The model makes those dependencies visible.

This is an independent educational illustration, not a Tesla product, a calibrated GDP model, an employment forecast or a prediction of dates. All rates, schedules and quantities are illustrative. It does not establish that exponential growth continues indefinitely.

The district compresses development into 12 illustrative days. People work one eight-hour shift; real factories can operate multiple shifts. Each robot has 21 available hours and staggered charging and service. Specialized inputs, machinery and electricity are supplied externally. Costs, permissions, random breakdowns and rejected units are omitted.

## Run locally

Serve this directory with a static HTTP server, for example `python -m http.server 8000`, then open `http://localhost:8000/`. No API credentials or backend are required. Audio is prerecorded with MiniMax; viewing or playing it makes no MiniMax API requests.

This repository contains the deployable static files. GitHub Pages publishes the root of `main`. Three.js is bundled locally; its license is in [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt).
