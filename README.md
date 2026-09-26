# Atlas — interactive explanations

Bilingual notebooks: Robots, Terafab, Dyson, Home, Starlink, SpaceX, Kardashev, LLMs,
Mind and Models, connected by an explorable 3D museum.
English starts at `/`; Spanish at `/es/`. All links work beneath the GitHub Pages repository path.

The museum's LLM painting now offers two formats: the existing web notebook and
`immersive/index.html?experience=llms`, a walkable Three.js world with eight stations.
Walk with WASD/arrows, drag to look, or use touch buttons. The guided route moves the camera,
plays the existing bilingual MiniMax narration and waits three seconds after each clip.
Walking interrupts the guide; instant travel supports reduced motion. Inspect tokens,
vector cells, attention matrices and probabilities, then emit a token and return it to context.
This is teaching geometry with synthetic weights and curated answers, not a physical CPU model.
Only LLMs currently has an immersive world; the catalog marks other experiences as pending.
The museum has an atrium and three themed galleries: Intelligence, Industry & Life and Cosmos.
Eleven original illustrated canvases sit in physical frames. Choose a painting or a gallery on
the live floor plan to walk there through the doorways, or explore with smooth WASD movement,
drag-to-look and a touch joystick. The LLM canvas ripples as the camera crosses it and enters
the learning world directly. Eight new bilingual MiniMax clips narrate the atrium and galleries.
Reduced motion uses instant routes; voice playback pauses when leaving or hiding the page.

Kardashev adds a playable 3D planet → star → galaxy journey, live power and multiplier counters,
linear/logarithmic charts and a conditional compound-growth calculator. It distinguishes the
original 1964 categories from the continuous Sagan convention. Rates and scenarios are teaching
assumptions, not forecasts. Sources and limitations are linked inside each notebook.

The scenes use NASA's official MarCO CubeSat model and Blue Marble Earth texture, with an
interactive component inspector. A MiniMax voice guide covers all four scales and the spacecraft
in English and Spanish, with transcripts, pause/resume and a sequential guided tour.
Asset credits are in `project/site-src/kardashev/ASSETS.md`.
Scene motion has its own pause control and continues at fixed energy levels. The solar swarm
contains up to 1,728 illustrative collectors; motion and distances are not physically to scale.

The LLM notebook follows a question through context, optional retrieval, tokenization, vectors,
causal attention, next-token probabilities and autoregressive output. Play, step and inspection
controls accompany bilingual examples of ambiguity, current sources and stale sources. A separate
training exercise distinguishes changing weights from supplying context. This is an explicitly
labelled educational simulation: answers and logits are scripted, not output from a trained LLM.
Interactive Three.js scenes replace the original SVG. Select token blocks, vector cells and
causal-attention rows to inspect their values. Twenty-six MiniMax recordings cover each step and
subsequent token cycles in English and Spanish, with transcripts and language selection. Playback
waits for the audio to finish and then pauses for 3, 5 or 8 seconds. Manual advancement, pause/resume
and silent reading are supported; unavailable audio never silently skips a step.
The attention view now follows paper-style tensor operations: distinct Q/K/V projections,
scaled dot products, a causal mask, row softmax, AV, residual connections and a feed-forward
network. Values are computed using fixed synthetic weights in a small post-norm block.
Five separately recorded narration segments supply measured scene cue times in both languages;
a gold activation signal moves along the dependency arrows and pauses with the audio.
The visible token window and scripted answer are explicitly separate. Paper references and
differences from Llama's architecture are explained in the notebook.

## One repository for development and publication

- `project/site-src/`: editable bilingual source, models and Three.js scenes.
- `project/check-*`: validation scripts.
- `project/tools/build_site.py`: bilingual route builder.
- Root HTML/JS/CSS, topic folders, `audio/` and `vendor/`: generated deployable website.
- `project/dist/`: ignored build output.

From `project/`:

```sh
npm ci
python build-site.py
python check-site.py
node check-kardashev.mjs
node check-kardashev-media.mjs
node check-kardashev-motion.mjs
node check-llms.mjs
node check-llms-guide.mjs
node check-llms-tensors.mjs
node check-immersive.mjs
node check-museo.mjs
node check-museo-controls.mjs
node check-explanations.mjs
node check-full-automation.mjs
node check-narrator.mjs
python tools/package_pages.py --output ..
```

Commit the edited source and regenerated root assets together. Work on a branch and open a PR
against `main`; do not edit generated files directly. GitHub Pages currently publishes the root
of `main`, so pushing a feature branch or opening a PR does not update the public website.

For a local preview run `python serve.py` from `project/`, or serve the repository root with
`python -m http.server 8000`. Audio is already recorded; no credentials or external API are needed.
Three.js is bundled locally; see `vendor/THREE-LICENSE.txt`.

This snapshot consolidates the source project's previous Atlas changes and the `added more places`
work with the new Kardashev and LLM notebooks. The robot learning improvements proposed in PR #1 are also
included. The older source checkout and this publishing repository originally had separate histories;
this branch is based on GitHub `main` so the PR is normally reviewable and mergeable.
