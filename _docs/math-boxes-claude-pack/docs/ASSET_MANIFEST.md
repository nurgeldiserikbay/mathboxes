# Asset manifest

## Reference boards
- `reference/gameplay-concept.png` — primary visual target for the new 2D gameplay.
- `reference/design-spec-board.png` — overview of screens, backgrounds, effects and UI direction.
- `reference/asset-sheet.png` — broad visual language / asset reference.
- `reference/implementation-board.png` — mechanics/effects reference board.

These are visual references, not assets to display whole inside the application.

## Recommended production assets
Use these names if you create/export individual files. Claude may recreate simple vector elements procedurally if separate files are unavailable.

### Backgrounds
- `bg_city_sunset.webp`
- `bg_forest_valley.webp`
- `bg_canyon.webp`
- `bg_night.webp`
- `bg_space.webp`

For parallax, ideally split each zone into `far`, `mid`, `near` layers. If not available, use one background plus procedural foreground silhouettes/particles.

### Icons (prefer SVG)
- `icon_pause.svg`
- `icon_settings.svg`
- `icon_sound_on.svg`
- `icon_sound_off.svg`
- `icon_vibration.svg`
- `icon_heart_full.svg`
- `icon_heart_empty.svg`
- `icon_shield.svg`
- `icon_clock.svg`
- `icon_combo.svg`
- `icon_home.svg`
- `icon_retry.svg`
- `icon_play.svg`
- `icon_trophy.svg`
- `icon_check.svg`
- `icon_cross.svg`

### Effects
Most effects should be procedural particles rather than large GIFs.
- `particle_spark_soft.png` — small soft white/yellow spark, transparent background.
- `particle_dust.png` — soft circular dust puff, transparent.
- `particle_fragment.png` — optional tiny neutral fragment texture.
- `texture_block_noise.png` — seamless extremely subtle block texture.
- `texture_background_noise.png` — seamless very subtle background grain.

Do NOT use heavy sprite sheets if CSS/canvas particles can produce the same result more efficiently.

### Optional audio
- `ui_tap.ogg`
- `answer_correct.ogg`
- `block_land.ogg`
- `answer_wrong.ogg`
- `block_crack.ogg`
- `block_break.ogg`
- `checkpoint.ogg`
- `combo.ogg`
- `life_gain.ogg`
- `timer_warning.ogg`
- `game_over.ogg`

Audio is not included in this package; use existing project audio or placeholders and wire the events correctly.
