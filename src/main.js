// Entry point: sets up the canvas, wires the modules together, and runs the
// main game loop. Kept deliberately thin - all real logic lives in the
// dedicated modules (world, car, camera, collision, gameState, render).
(function () {
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  const canvas = document.getElementById('game');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  const { World } = window.Game;
  const { createCar, resetCar, createInput, updateCar } = window.Game.Car;
  const { createCamera, updateCamera, getViewOffset } = window.Game.Camera;
  const { checkObstacleCollisions, checkFinishCollision } = window.Game.Collision;
  const { STATUS, createGameState, startGame, triggerCrash, triggerWin, backToPlaying } = window.Game.GameState;
  const { render } = window.Game.Render;

  const car = createCar(World.start.x, World.start.y, World.start.angle);
  const camera = createCamera(World.start.x, World.start.y);
  const input = createInput();
  const gameState = createGameState();

  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000); // clamp to avoid big jumps on tab switch
    lastTime = now;

    if (gameState.status === STATUS.SPLASH) {
      if (input.start) {
        startGame(gameState);
      }
    } else if (gameState.status === STATUS.PLAYING) {
      updateCar(car, input, dt);

      if (checkObstacleCollisions(car, World.obstacles)) {
        triggerCrash(gameState);
      } else if (checkFinishCollision(car, World.finish)) {
        triggerWin(gameState);
      }
    } else if (gameState.status === STATUS.CRASHED) {
      gameState.crashTimer -= dt;
      if (gameState.crashTimer <= 0) {
        resetCar(car, World.start);
        camera.x = World.start.x;
        camera.y = World.start.y;
        backToPlaying(gameState);
      }
    } else if (gameState.status === STATUS.WON) {
      if (input.restart) {
        resetCar(car, World.start);
        camera.x = World.start.x;
        camera.y = World.start.y;
        backToPlaying(gameState);
      }
    }

    updateCamera(camera, car, dt);
    const offset = getViewOffset(camera, CANVAS_WIDTH, CANVAS_HEIGHT);
    render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, World, car, offset, gameState);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
