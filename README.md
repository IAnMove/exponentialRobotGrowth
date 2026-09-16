# Robot Lab

An interactive, isometric explanation of robots helping build more robots, and of the supply chains that make this possible.

English is the default. Use **EN / ES** to switch the interface and narration. All four scenes work with touch controls. Start with the robot factory, then explore the district, region and city.

- **Industrial district:** follow people and robots through mining, refining, four component families, logistics, assembly and testing. Compare reinvesting across the chain with reinforcing assembly alone.
- **Robot factory (start here):** humans build the first robots. Completed robots return automatically to help build the next ones. Inspect five stations, follow queues and compare output with a human line. Automatic assignment can be disabled for manual experiments.
- **Industrial region:** build new mines, refineries, component plants, robot factories, power generation and logistics. Reserve robots and refined material for construction, and compare fleet growth with a region that keeps its initial facilities. Click plots to build manually or inspect industry output over time.
- **City:** follow robots exported by the growing industrial region into logistics, retail, construction, cleaning, care and education. Compare three illustrative task-coverage scenarios. Robots sent to the city leave industrial production; travel and sector limits matter.
- **Guided explanations:** each scale has a general introduction and a narrated tour that focuses on its sectors. There are 46 prerecorded explanations in each language; Spanish uses the voice selected by the project owner.
- **Click a place:** hear an explanation of its role, followed by its current condition. Narration pauses the simulation so the explanation remains relevant. Transcripts and voice controls are included.

## What the model means

Reinvested production can increase future productive capacity. For that feedback to keep accelerating, supporting supplies, equipment and infrastructure must expand too. The model makes those dependencies visible.

This is an independent educational illustration, not a Tesla product, a calibrated GDP model, an employment forecast or a prediction of dates. All rates, schedules and quantities are illustrative. It does not establish that exponential growth continues indefinitely.

The district compresses development into 12 illustrative days. People work one eight-hour shift; real factories can operate multiple shifts. Each robot has 21 available hours and staggered charging and service. Specialized inputs, machinery and electricity are supplied externally. Costs, permissions, random breakdowns and rejected units are omitted.

Each scale starts from its own assumptions; moving between scenes does not carry over simulation state. The city starts with 600 equivalent tasks, not 600 employment predictions, and preserves human tasks under every scenario.

The separate regional scenario begins with 24 robots and six facilities and runs for 120 illustrative cycles, not days or years. Each new facility consumes 48 material batches and 24 robot work units. At most four robots work on each of three simultaneous projects. The investment percentage limits construction workers and reserves that share of newly refined material. Electricity limits construction and production, while transport limits industrial flow. Six plots per industry bound regional expansion. Specialized equipment is still supplied externally. At larger fleet sizes, one figure represents several robots; the map displays the scale.

## Run locally

Serve this directory with a static HTTP server, for example `python -m http.server 8000`, then open `http://localhost:8000/`. No API credentials or backend are required. Audio is prerecorded with MiniMax; viewing or playing it makes no MiniMax API requests.

This repository contains the deployable static files. GitHub Pages publishes the root of `main`. Three.js is bundled locally; its license is in [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt).
