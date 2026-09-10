# Math Boxes Claude Pack

Upload/copy this folder into the root of the Math Boxes repository, for example as `design/math-boxes-redesign/`.

Then tell Claude Code:

> Read `design/math-boxes-redesign/docs/CLAUDE_MASTER_PROMPT.md` completely. Inspect every image in `design/math-boxes-redesign/reference/` and read `ASSET_MANIFEST.md`. Then inspect the existing repository before editing anything. Treat the reference images as art direction rather than pixel-perfect screenshots. Implement the redesign in the exact staged workflow in the master prompt, preserving the current stack and working game logic. Do not stop after creating a mockup: implement the playable redesign, animations, responsive states, error/timeout destruction, checkpoints, combo/life behavior, pause/results/settings, and polish. Run the project/tests after each major stage and fix regressions.

The most important product rule is: **the equation lives above the tower; completed tower blocks contain only answer numbers. Correct answers build one block. Wrong answers/timeouts cost one life and destroy up to the last two destructible blocks.**
