# Grass recovery handoff

- Art-only course-correction pass completed; runtime/topology/code was not changed.
- Reference crop: `docs/qa/grass-course-correction/target-grass-dirt-crop.png`.
- Comparison: `docs/qa/grass-course-correction/comparison-final.png` at 48px logical scale, enlarged 4× for diagnosis.
- Sampling tested: nearest-neighbor and high-quality bicubic reduction to 48×48.
- Existing `public/assets/terrain/grass-center-transition.png`: rejected detached dark tuft stamps.
- Initial reference-guided study: rejected neon/broad blades and an over-wide straight dirt band.
- One targeted correction: rejected repeated horizontal dirt strips instead of one clean contact sample.
- No candidate is approved for production; no manifest, map, renderer, or runtime variant was added.
- Next action: author or obtain a closer target-matched source, then repeat this visual proof before coding.
