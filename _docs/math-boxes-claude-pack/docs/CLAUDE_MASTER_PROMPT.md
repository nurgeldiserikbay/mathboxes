# Math Boxes — Claude implementation master prompt

You are redesigning an existing mobile game named **Math Boxes**. Treat the images in `reference/` as visual direction, not pixel-perfect layouts. Preserve the core idea, but rebuild the gameplay presentation and feedback so the game feels like a polished, satisfying 2D casual game rather than a static math UI.

## Product goal
Create a portrait 2D mobile game that is immediately understandable, visually warm, tactile and replayable. The central fantasy is **building an endless tower with correct answers**.

Core rule: **solve → build; fail → destroy**.

Do NOT turn this into a runner, platformer, 3D game, or character-based game. The tower itself is the hero.

## Core gameplay
1. The mathematical expression is shown separately above the tower. Never repeat the full expression inside completed floor blocks.
2. Show 2–4 large answer buttons at the bottom depending on difficulty. Usually use 3 choices once the game ramps up.
3. Each completed floor contains only the answer number, plus an optional tiny floor number. The answer is the visual identity of the floor.
4. Correct answer:
   - selected answer button reacts immediately;
   - create a new block carrying that answer;
   - block drops from above into the tower;
   - soft squash/bounce on impact;
   - tiny camera/tower impulse;
   - particles and floating `+1`;
   - increment floor and combo;
   - then present the next expression.
5. Wrong answer:
   - lose 1 life;
   - reset combo;
   - spawn a red/coral unstable block carrying the chosen wrong answer;
   - it falls onto the tower;
   - impact cracks it and the latest 2 destructible floors;
   - those floors break into small fragments and fall/fade away;
   - show `−2` near the destruction, not a huge blocking modal;
   - continue after a short recovery beat.
6. Timeout has the same gameplay consequence as a wrong answer: −1 life, combo reset, destroy the latest 2 destructible floors. The falling failure block can say `TIME` or show a clock icon rather than a number.
7. Player starts with 3 lives. Game ends at 0 lives.
8. Every 5 consecutive correct answers grants +1 life if lives < 3. Never exceed 3.
9. Checkpoint/support floors are indestructible. Initial progression: every 10th floor; later spacing can increase to every 20 and eventually 50 according to progression. Destruction stops at a checkpoint.
10. Always communicate how far the next support is: e.g. shield icon + `4` or `Опора через 4`.
11. Keep scoring secondary. The main success metric is highest floor. Combo may multiply score but must not complicate the core loop.

## Difficulty
Allowed operations only: `+`, `−`, `×`, `÷`. No square roots, powers or logarithms.

Start extremely readable and ramp gradually. Division must always have an integer result. Avoid negative answers unless explicitly introduced later. Wrong choices should be plausible, generated around common mistakes rather than random nonsense.

Suggested pacing:
- floors 1–10: very easy addition/subtraction, generous timer, 2 choices;
- 11–25: addition/subtraction + easy multiplication, mostly 3 choices;
- 26–50: multiplication/division and larger values;
- 51+: mixed operations and shorter but fair timer.

Do not make the game primarily about raw calculation speed. The timer creates tension, not frustration.

## Visual direction
Use **2D illustrated casual-game graphics**, not photorealism and not faux-3D. Slight depth from highlights/shadows is allowed, but all gameplay must remain visually flat and readable.

The visual hierarchy must be:
1. current equation;
2. tower / newly falling block;
3. answer buttons;
4. lives, floor and combo;
5. secondary score/checkpoint information.

Use soft saturated colors, rounded shapes, subtle texture and restrained glow. Avoid the current dark monochrome feeling where most of the screen is empty purple UI.

The tower should occupy the visual center. Backgrounds should provide atmosphere but remain lower contrast than gameplay.

### Suggested palette
- deep navy UI/background shadow: `#0D1233`
- blue: `#2F80ED`
- cyan: `#31B8D4`
- violet: `#7657E8`
- green/success: `#45C977`
- coral/error: `#F0645D`
- gold/checkpoint: `#F5B83D`
- warm white: `#F8F7FF`

Do not blindly hardcode these if the existing project already has design tokens. Create semantic tokens such as `--success`, `--danger`, `--checkpoint`, `--surface`, etc.

## Tower block design
Completed blocks should NOT look like giant UI cards. Make them feel like physical 2D building slabs:
- rounded corners but less rounded than buttons;
- subtle top highlight;
- soft bottom shadow;
- very light surface texture/noise;
- large centered answer number;
- tiny optional floor number in a corner;
- no equation on completed blocks.

Use controlled variation in block hues as the player climbs. Checkpoint block is gold and has a shield emblem. Failure block is coral/red and visibly cracked only during the failure sequence.

## Background progression
Use parallax-ready 2D backgrounds. If supplied image assets are unsuitable for responsive cropping, recreate them procedurally with layered CSS/canvas/SVG shapes while matching the reference mood.

Suggested height zones:
- 1–20: sunset city;
- 21–40: green valley/forest;
- 41–60: warm canyon;
- 61–80: night sky;
- 81+: space / abstract sky.

Transitions must be gradual, not hard scene cuts. A long run should visibly feel like climbing higher.

## Microinteractions and animation
Animation is critical. Implement all gameplay feedback with transform/opacity wherever possible. Target 60 fps and avoid layout thrashing.

### Answer button press
- duration: 90–130 ms;
- scale to ~0.96, then return;
- subtle brightness increase;
- light haptic when available.

### Correct block spawn
- block appears ~80–140 px above its target;
- fall: 240–360 ms, ease-in;
- impact squash: `scaleX 1.025 / scaleY 0.965` for ~70 ms;
- rebound: 100–150 ms;
- tower translates down slightly as camera follows;
- emit 6–12 tiny particles;
- floating `+1 этаж` or score feedback fades upward in 500–800 ms;
- success haptic: light.

### Wrong answer
- chosen button briefly turns coral;
- failure block drops with slightly faster/heavier motion;
- impact camera shake: 2–4 px, ~120–180 ms;
- crack lines appear at impact;
- top two destructible blocks split into several simple fragments;
- fragments rotate/fall for ~350–550 ms then disappear;
- red/coral dust particles: 8–16;
- life heart pops/shrinks/fades;
- combo display collapses back to ×1;
- error haptic: medium, one pulse.

### Timeout
- timer changes state only near the end: neutral → amber → coral;
- final second can pulse softly at ~1 Hz;
- at zero, use the same destruction choreography as wrong answer;
- never flash the entire screen bright red.

### Combo
- x5: tiny glow + label pop;
- x10: slightly richer landing particles;
- x15: soft tower edge glow;
- x20+: subtle streak/energy accents;
- keep escalation tasteful. Gameplay readability always wins.

### +1 life from 5-combo
- heart icon travels/pops toward life HUD;
- if already at 3 lives, show a tiny `MAX`/sparkle response instead of pretending to add another life.

### Checkpoint
- gold block enters like a normal correct block;
- shield emblem draws/pops in after landing;
- gold ring or radial sparkle for 400–700 ms;
- show a concise `ОПОРА!` label;
- stronger but still short haptic.

### Pause / results
Use dim + blur only if performant. Dialog should scale/fade in around 180–250 ms. Avoid excessive glow.

## HUD redesign
Keep the HUD compact. Recommended:
- top-left: pause;
- top-center: `ЭТАЖ` + current floor, strongest statistic;
- top-right: 3 hearts;
- under/around equation: timer bar/ring;
- compact combo indicator;
- compact checkpoint indicator.

Do not give score equal visual weight to the floor. Score may be small or omitted during active play and emphasized on results.

## Home screen
Keep it simple:
- Math Boxes logo;
- animated miniature tower or a few floating blocks;
- large Play button;
- best floor underneath;
- settings button;
- optional short line: `Решай. Строй. Поднимайся.`

No clutter, shops or currencies in this redesign unless they already exist as a product requirement.

## Results screen
Prioritize:
- floor reached;
- new record state;
- best floor;
- score;
- best combo;
- correct answers;
- checkpoints reached;
- large `Играть ещё` button;
- secondary home action.

Animate the reached-floor number counting up quickly. New record gets a restrained gold celebration.

## Sound design hooks
If audio files already exist, reuse/refine them. Otherwise create a clean event map and placeholders; do not block implementation waiting for final audio.

Events:
- `ui_tap`
- `answer_correct`
- `block_land`
- `answer_wrong`
- `block_crack`
- `block_break`
- `checkpoint`
- `combo_5`
- `combo_10`
- `life_gain`
- `timer_warning`
- `game_over`

Keep sounds short. Block landing should be a soft satisfying wooden/plastic `thump`, not an explosion.

## Asset usage
Inspect `reference/` and `assets/` before coding. Use supplied assets as direction and source material. Do not simply paste the reference screenshot as a game background.

For simple icons, prefer clean SVG/CSS shapes or the project's existing icon library so they scale perfectly. Use raster assets for illustrated backgrounds/textures/particle sprites where appropriate.

## Responsive/mobile requirements
Portrait-first. Design baseline may be 390×844 or 1080×1920, but support common mobile aspect ratios without cropping essential gameplay.
- respect safe areas;
- answer buttons remain thumb-friendly;
- no scrolling during gameplay;
- tower remains centered;
- equation never overlaps HUD;
- support short devices by showing fewer historical tower blocks, not by shrinking text below readable size.

## Accessibility / UX
- never communicate correct/wrong state by color alone;
- use check/cross, motion and text feedback;
- maintain readable contrast;
- respect `prefers-reduced-motion` by reducing shake, particles and large travel while retaining state feedback;
- buttons need clear pressed/disabled states.

## Engineering requirements
First inspect the existing project and preserve its framework and architecture. Do not rewrite the application in a different stack merely to implement the redesign.

Before changing code:
1. identify gameplay state machine / core game loop;
2. identify components/scenes controlling HUD, equation, answers, tower, pause and results;
3. identify existing asset pipeline and sound/haptic utilities;
4. write a short implementation plan;
5. then implement incrementally.

Keep game logic independent from visual animation. Animations must respond to explicit game events such as `ANSWER_CORRECT`, `ANSWER_WRONG`, `TIMEOUT`, `BLOCK_LANDED`, `FLOORS_DESTROYED`, `CHECKPOINT_REACHED`, `LIFE_GAINED`.

Avoid arbitrary `setTimeout` chains for core state. Use the framework's animation completion callbacks/events and a clear phase/state machine so rapid taps cannot corrupt state.

Lock answer input once a choice has been committed until the transition to the next question is ready.

Persist best floor and settings using the project's existing persistence layer; use localStorage only if this is a web-only project with no existing abstraction.

## Definition of done
The redesign is complete when:
- equation is outside the tower;
- completed blocks contain only answers;
- correct answers visibly build one floor;
- wrong/timeout visibly destroy up to two recent destructible floors and cost one life;
- checkpoints visibly stop destruction;
- 5-combo can restore one life up to max 3;
- the tower/camera movement feels satisfying;
- backgrounds evolve with height;
- all major actions have restrained sound/haptic/visual feedback;
- pause, home, settings and results visually match the new game language;
- gameplay works on common portrait mobile sizes;
- no gameplay race conditions are introduced;
- reduced-motion mode remains playable;
- build/lint/tests pass.

## Workflow
Do not attempt the entire redesign in one uncontrolled edit. Implement in this order:
1. core gameplay state and new tower data model;
2. gameplay layout/HUD;
3. correct-answer block placement animation;
4. wrong/timeout destruction animation;
5. checkpoint behavior;
6. combo/life feedback;
7. backgrounds and progression;
8. home/pause/results/settings;
9. sound/haptics;
10. responsive and performance pass;
11. polish pass against the reference images.

After each stage, run the project and fix regressions before continuing. At the end, provide a concise summary of files changed, mechanics changed, remaining placeholders, and how to tune animation constants/difficulty.
