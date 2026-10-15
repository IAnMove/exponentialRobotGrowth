# Eight learning journeys

`index.html?topic=internet` opens the conventional notebook; append `&mode=immersive`
for first-person walking. Routes also work under `/es/` and a GitHub Pages prefix.
The museum links to these modes from each corresponding painting.

Each lesson exports bilingual metadata, four narration steps, experimental controls,
a pure `evaluate(parameters, tick)` model, and a Three.js scene. Ideas, Carbon and Evolution use persistent specialized worlds.
`app.js` owns interaction, charts and the audio-ended tour; `world.js` owns rendering,
inspection, shared scenery and camera controls. Numerical results never depend on frame rate.

| Topic | Mechanism | Explicit teaching simplification |
| --- | --- | --- |
| Internet | DNS, forwarding and TCP retransmission | Five-node routing graph, invented timings, no TLS or congestion |
| Electricity | Voltage/current, resistive losses and storage | Hourly equivalent circuit, ideal battery, no AC stability model |
| Microchip | MOS switch, CMOS inverter and full adder | Ideal logic, schematic cross-sections, illustrative timing |
| Cell | DNA → mRNA → codons → peptide | Artificial five-codon sequence, standard code, no biological clock |
| Ideas | Independent cascade and community bridges | Synthetic 64-node network, fixed random seed, no persuasion model |
| Nuclear | PWR heat exchange, turbine and residual heat | Dimensionless thermal balance, arbitrary decay curve, no plant operation |
| Carbon | Reservoirs, exchanges and fossil transfer | 100 arbitrary conserved units, no temperature prediction |
| Evolution | Selection, mutation and genetic drift | Haploid Wright–Fisher population of 50, actual parent/copy/mutation events, educational rates; deterministic mode has proportions, not rounded organisms |

Sources and exact assumptions are visible in each notebook. The shapes are explanatory
models, not photoreal scans, engineering plans or measured biological structures.

MiniMax uses the existing project voices in `narration/voices.json`. Generate a selected
lesson with `python tools/build_journey_narration.py internet`. Content-addressed MP3s are
reused; the generator verifies transcripts, measured durations and MP3 decoding, and
does not retry uncertain paid requests. No credentials are included in the site.

Validation:

```
python build-site.py
node check-journeys.mjs
node check-journey-scenes.mjs
node check-journey-controls.mjs
node check-museo.mjs
node check-museo-controls.mjs
python check-site.py
```

The scene test constructs actual Three.js geometry without WebGL. The controller test
uses DOM/audio/renderer adapters and covers both modes and languages. Neither is a
substitute for pixel-level desktop/mobile browser review.

Evolution uses `evolution-model.js` to record all 50 copies per generation and their
parents. Its original seeded A/B histories are retained; separate keyed draws choose
an individual parent within the recorded parental variant. The scene, HUD and chart
commit a new population only at an integer generation. A mutation changes a daughter
copy, never its parent. The non-finite mode displays the infinite-population recurrence
as proportions; it is not the exact mean of finite populations under selection.
The four existing MiniMax recordings in each language are reused without changing
their transcripts. Changing a control restarts the recalculated history at generation 0.
