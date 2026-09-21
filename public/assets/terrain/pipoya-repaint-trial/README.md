# Generated materials — promoted to default

Two 48x48 opaque PNGs for the existing terrain-base provider, not an atlas replacement.
Derived with built-in image_gen from Pipoya's base grass/dirt tiles and the user's target reference.
Source: https://pipoya.itch.io/pipoya-rpg-tileset-32x32 — Pipoya permits use/editing for personal/commercial productions; no standalone asset redistribution/resale.
Preview: http://localhost:5666/?map=grass-transition-study
User selected these materials as the improved baseline on 2026-09-20. The default manifest now loads them; the temporary query override was removed.
Existing topology/compositor, map schema and saved maps are unchanged. Old grass-center-transition.png and path-center.png remain available for rollback.
Atlas generation v1 was rejected after tile reconstruction showed broken boundaries.
Full generation and exact prompts: docs/qa/pipoya-trial/. Rebuild with prepare_materials.py there.
Verified: 48x48 opaque files, 4x4 repeat inspection, actual editor proof scene, build and seven road-compositor tests.
Known limitations: grass repetition and detail loss at 48px; existing edge treatment is still geometric and does not match the target fringe.
