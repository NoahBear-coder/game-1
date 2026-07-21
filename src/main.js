// Entry point: sets up the canvas, wires the modules together, and runs the
// main game loop. Kept deliberately thin - all real logic lives in the
// dedicated modules (world, car, camera, collision, gameState, render).
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Full-window canvas: resized to fill the viewport, and kept in sync on
  // resize since every draw call below takes the current width/height as
  // parameters rather than assuming a fixed size.
  let CANVAS_WIDTH = window.innerWidth;
  let CANVAS_HEIGHT = window.innerHeight;

  function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const { World } = window.Game;
  const { createCar, resetCar, createInput, updateCar } = window.Game.Car;
  const { createCamera, updateCamera, getViewOffset } = window.Game.Camera;
  const { checkObstacleCollisions, checkFinishCollision } = window.Game.Collision;
  const { STATUS, createGameState, startGame, triggerCrash, triggerWin, backToPlaying } = window.Game.GameState;
  const { createBulletSystem, resetBullets, fireBullet, updateBullets, checkBulletObstacleHits } = window.Game.Bullets;
  const { createBirdSystem, resetBirds, updateBirds, checkBirdCollisions, checkBulletBirdHits } = window.Game.Birds;
  const { createBranchSystem, resetBranches, updateBranches, checkBranchCollisions } = window.Game.Branches;
  const { createParticleSystem, resetParticles, spawnBarrelDebris, spawnBirdDebris, spawnBranchDebris, updateParticles } =
    window.Game.Particles;
  const { render } = window.Game.Render;

  const car = createCar(World.start.x, World.start.y, World.start.angle);
  const camera = createCamera(World.start.x, World.start.y);
  const input = createInput();
  const gameState = createGameState();
  const bulletSystem = createBulletSystem();
  const birdSystem = createBirdSystem();
  const branchSystem = createBranchSystem();
  const particleSystem = createParticleSystem();

  // Reset the car to the start, recenter the camera, re-roll the obstacle
  // layout, clear any in-flight bullets, reset the birds and forest
  // branches, clear debris, and return to the PLAYING state.
  function resetGame() {
    resetCar(car, World.start);
    camera.x = World.start.x;
    camera.y = World.start.y;
    World.randomizeObstacles();
    resetBullets(bulletSystem);
    resetBirds(birdSystem);
    resetBranches(branchSystem);
    resetParticles(particleSystem);
    input.firePressed = false;
    backToPlaying(gameState);
  }

  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000); // clamp to avoid big jumps on tab switch
    lastTime = now;

    if (gameState.status === STATUS.SPLASH) {
      if (input.start) {
        startGame(gameState);
      }
      // Space doubles as both "start" and "fire" - drop any fire trigger
      // queued from the same key press so gameplay doesn't open with a
      // phantom shot.
      input.firePressed = false;
    } else if (gameState.status === STATUS.PLAYING) {
      updateCar(car, input, dt);

      if (input.firePressed) {
        fireBullet(bulletSystem, car);
      }
      input.firePressed = false;

      updateBullets(bulletSystem, dt);
      checkBulletObstacleHits(bulletSystem, World.obstacles).forEach((h) =>
        spawnBarrelDebris(particleSystem, h.x, h.y)
      );
      checkBulletBirdHits(bulletSystem, birdSystem.birds).forEach((h) =>
        spawnBirdDebris(particleSystem, h.x, h.y)
      );
      updateBirds(birdSystem, dt, World.getSectionAt(car.x, car.y));
      updateBranches(branchSystem, dt).forEach((h) => spawnBranchDebris(particleSystem, h.x, h.y));

      if (
        checkObstacleCollisions(car, World.obstacles) ||
        checkBirdCollisions(car, birdSystem.birds) ||
        checkBranchCollisions(car, branchSystem.hazards)
      ) {
        triggerCrash(gameState);
      } else if (checkFinishCollision(car, World.finish)) {
        triggerWin(gameState);
      }
    } else if (gameState.status === STATUS.CRASHED) {
      gameState.crashTimer -= dt;
      if (gameState.crashTimer <= 0) {
        resetGame();
      }
    } else if (gameState.status === STATUS.WON) {
      if (input.restart) {
        resetGame();
      }
    }

    updateParticles(particleSystem, dt);
    updateCamera(camera, car, dt);
    const offset = getViewOffset(camera, CANVAS_WIDTH, CANVAS_HEIGHT);
    render(
      ctx,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      World,
      car,
      offset,
      gameState,
      bulletSystem.bullets,
      birdSystem.birds,
      particleSystem.particles,
      branchSystem.hazards
    );

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
