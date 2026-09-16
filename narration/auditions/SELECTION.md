# Spanish narration casting

User feedback, 2026-09-16:
- A (`Spanish_ReliableMan`) and C (`Spanish_Steadymentor`) rejected: the user hears a British accent.
- B (`Spanish_SereneWoman`) has not been selected.
- Do not present catalog language `Spanish` / description `Standard Spanish` as proof of a native accent or speaker origin.

New candidates D/E/F in `regional/` are synthetic MiniMax Voice Design voices with explicit regional pronunciation prompts. They are **not verified recordings of native speakers**. D/E request Spain; F requests Mexico. The `.design.json` files preserve the prompts and voice IDs. The main `.mp3` files use the production speech model; `.preview.mp3` files are the initial design previews.

User selection, 2026-09-16: E (`ttv-voice-2026091606404326-GjG0y5Nk`) approved. The user hears a male voice, despite the female voice requested in its design prompt. The original filename records that prompt, not a verified vocal characteristic. Preserve the exact approved voice ID; do not redesign it or substitute another voice. `narration/voices.json` is the production configuration.

Production regeneration attempted after selection. MiniMax rejected synthesis with error 2056: `Token Plan usage limit reached: Upgrade your Token Plan or purchase Credits for more usage.` The complete Spanish catalog has not been regenerated, and the public site has not been updated. Resume `python tools/build_narration.py --language es` only once quota is available; cached completed clips are reused. No additional voice selection is required.

Update after quota renewal, 2026-09-16: all 46 Spanish clips generated successfully with the exact approved E voice. Both catalogs (92 audio files) validated and decoded. Four-scale public release pushed as commit 593b7cd; Pages run 35038428752 succeeded. All 10 public page routes and both catalogs match this build after line-ending normalization; all 92 current audio URLs return HTTP 200 with matching sizes.
