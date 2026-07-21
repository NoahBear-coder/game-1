# Top-Down Driver

A small top-down 2D driving game built with plain HTML Canvas and vanilla JavaScript.
No build tools, bundlers, or game engines - just static files.

## How to run it

Everything is plain `<script>` tags (not ES modules), so just double-click
`index.html` (or open it with `File > Open` in your browser) - no server needed.

## Controls

| Action        | Keys              |
|---------------|-------------------|
| Accelerate    | `Arrow Up` or `W` |
| Brake/Reverse | `Arrow Down` or `S` |
| Steer left    | `Arrow Left` or `A` |
| Steer right   | `Arrow Right` or `D` |
| Shoot         | `Space` (also starts the game from the splash screen) |
| Restart after winning | `R` |

On launch you'll see a splash screen with the title and full instructions;
press `Enter` or `Space` to start driving.

Drive from the start, through the open road, into the tunnel, across the
bridge, across the desert, and through the forest to reach the checkered
**FINISH** line. Avoid the orange hazard barrels (rocks in the desert) and
the birds that fly at you against your direction of travel - hitting either
crashes the car, shows a "CRASHED!" message, and automatically resets it
back to the start after a moment (no key press needed). The forest has no
birds or barrels; instead, branches telegraph with a growing ground shadow
before dropping onto the road, so watch for the tell and dodge in time. You
start each run with **10 bullets**; press `Space` to fire one from the front
of the car and destroy a barrel or bird in its path (branches can't be shot).
Reaching the finish line shows a "YOU WIN!" message; press `R` to reset and
play again without reloading the page. Every reset (crash or win) re-rolls
the barrel/rock layout, respawns the birds, and refills your ammo.

## Project structure

```
index.html              Canvas element + script tags (load order matters)
src/
  collision.js           Circle-vs-rectangle collision detection (car vs. obstacles/finish)
  world.js                Track layout: centerline points, section colors/labels,
                           obstacles, and the finish rectangle
  car.js                  Car state (incl. ammo), arcade-style movement physics, and keyboard input
  bullets.js              Firing, bullet movement, and bullet-vs-obstacle/bird hit resolution
  birds.js                Per-section bird hazards that fly against the player's travel direction
  branches.js             Forest-only hazard: branches telegraph, fall, and block the road on a loop
  particles.js            Cosmetic debris bursts spawned when barrels/birds/branches are hit
  camera.js               Viewport/camera that smoothly follows the car
  gameState.js             Game state machine: playing / crashed / won
  render.js               All canvas drawing (track, obstacles, car, UI overlays)
  main.js                 Wires the modules together and runs the game loop
tests/
  collision.test.js       Plain Node assertions for the collision logic
```

Each module attaches its public API to a shared `window.Game` namespace
(e.g. `window.Game.Car`), so the files can be loaded as ordinary scripts
(no CORS issues with `file://`) while still keeping concerns cleanly
separated. `collision.js` is written so it also works unmodified under
Node's CommonJS `require`, which is what the tests use.

## Architecture notes

- **Track**: `world.js` builds the track as a sequence of centerline points
  (`{x, y, width, section}`). It goes straight ("open" section), curves 90°
  through a turn, narrows into a "tunnel" section, widens into a "bridge",
  then a sandy "desert" stretch, then a "forest", and ends at a "finish"
  gate. `render.js` draws it as a thick stroked polyline, colored per
  section, so the sections are visually distinct. `World.getSectionAt(x, y)`
  finds the section nearest a world position, used to spawn section-local
  hazards only once the player actually reaches them.
- **Obstacles**: `world.js` procedurally generates two obstacles per named
  section (open, tunnel, bridge, desert) within a random position/size,
  always leaving a guaranteed passable gap so the track stays winnable
  (the forest has none - it uses the branch hazard instead). The layout is
  re-rolled via `World.randomizeObstacles()` on every reset (crash or win).
  Collision uses a simple circle-vs-axis-aligned-rectangle check in
  `collision.js`.
- **Birds**: `birds.js` spawns a small flock per section (open, tunnel,
  bridge, desert) the first time the player reaches that section, flying
  head-on against the player's direction of travel. Each bird flies through
  once and is removed for good on exit - it does not respawn - so a
  section's bird count is also its total spawn budget for the run.
- **Forest branches**: `branches.js` runs a handful of independently-timed
  hazard cycles through the forest section: an idle wait, a telegraphed
  "warning" shadow that grows on the ground, an "impact" phase where the
  fallen branch actually blocks the road (crashes the car on contact, but
  can't be shot), then back to idle at a new spot. Unlike birds, this
  hazard loops forever so the forest stays dangerous throughout.
- **Car**: `car.js` holds position/angle/speed/ammo and applies simple
  arcade physics (acceleration, friction, turning proportional to speed).
  Input from both arrow keys and WASD is normalized into the same logical
  actions.
- **Bullets**: `bullets.js` fires a bullet from the car's nose when `Space`
  is pressed (capped at 10 per run via `car.ammo`), moves bullets each frame,
  and destroys the first obstacle or bird each bullet touches - reusing
  `collision.js`'s circle-rect/circle-circle checks rather than duplicating
  the math.
- **Particles**: `particles.js` spawns a short-lived, purely cosmetic burst
  of debris (chips, feathers, or bark/leaves) wherever a barrel, bird, or
  branch is destroyed/lands.
- **Camera**: `camera.js` exponentially smooths the camera position toward
  the car's position and returns a screen offset so the car stays centered.
  `main.js` sizes the canvas to the full browser window and keeps it in
  sync on resize.
- **Game state**: `gameState.js` is a tiny state machine (`splash`,
  `playing`, `crashed`, `won`). `main.js` drives the transitions: the game
  starts on `splash` and moves to `playing` when `Enter`/`Space` is pressed,
  a collision triggers `crashed` (auto-reverts to `playing` after a short
  timer, resetting the car), and reaching the finish rectangle triggers
  `won` (reverts to `playing` when `R` is pressed).

## Running the collision tests

```
node tests/collision.test.js
```

This runs a handful of plain `assert`-based checks against
`src/collision.js` (circle-vs-rect overlap in various configurations, plus
the obstacle-list and finish-line helpers) without needing a browser.
