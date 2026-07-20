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
| Start (from splash screen) | `Enter` or `Space` |
| Restart after winning | `R` |

On launch you'll see a splash screen with the title and full instructions;
press `Enter` or `Space` to start driving.

Drive from the start, through the open road, into the tunnel, across the
bridge, and reach the checkered **FINISH** line. Avoid the red obstacles -
hitting one crashes the car, shows a "CRASHED!" message, and automatically
resets it back to the start after a moment (no key press needed). Reaching
the finish line shows a "YOU WIN!" message; press `R` to reset and play again
without reloading the page.

## Project structure

```
index.html              Canvas element + script tags (load order matters)
src/
  collision.js           Circle-vs-rectangle collision detection (car vs. obstacles/finish)
  world.js                Track layout: centerline points, section colors/labels,
                           obstacles, and the finish rectangle
  car.js                  Car state, arcade-style movement physics, and keyboard input
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
  through a turn, narrows into a "tunnel" section, widens into a "bridge"
  section, and ends at a "finish" gate. `render.js` draws it as a thick
  stroked polyline, colored per section, so the sections are visually
  distinct.
- **Obstacles**: six static obstacles are defined in `world.js`, at least one
  per named section (open, tunnel, bridge). Collision uses a simple
  circle-vs-axis-aligned-rectangle check in `collision.js`.
- **Car**: `car.js` holds position/angle/speed and applies simple arcade
  physics (acceleration, friction, turning proportional to speed). Input
  from both arrow keys and WASD is normalized into the same logical actions.
- **Camera**: `camera.js` exponentially smooths the camera position toward
  the car's position and returns a screen offset so the car stays centered
  in the fixed 800x600 canvas.
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
