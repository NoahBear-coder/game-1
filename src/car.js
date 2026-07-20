// Car state, movement physics, and keyboard input handling.
// Supports both Arrow keys and WASD for the same logical actions.
(function () {
  const ACCELERATION = 420; // px/s^2
  const BRAKE_DECEL = 520; // px/s^2 when reversing/braking
  const FRICTION = 260; // px/s^2, natural deceleration when no input
  const MAX_SPEED = 320; // px/s forward
  const MAX_REVERSE_SPEED = -160; // px/s backward
  const TURN_RATE = 2.6; // radians/s at full speed
  const RADIUS = 28; // car collision radius (matches the doubled car sprite in render.js)

  function createCar(x, y, angle) {
    return { x, y, angle, speed: 0, radius: RADIUS };
  }

  function resetCar(car, start) {
    car.x = start.x;
    car.y = start.y;
    car.angle = start.angle;
    car.speed = 0;
  }

  function createInput() {
    const input = { forward: false, backward: false, left: false, right: false, restart: false, start: false };

    const keyMap = {
      ArrowUp: 'forward',
      KeyW: 'forward',
      ArrowDown: 'backward',
      KeyS: 'backward',
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
    };

    const startKeys = new Set(['Enter', 'Space']);

    window.addEventListener('keydown', (e) => {
      const action = keyMap[e.code];
      if (action) {
        input[action] = true;
        e.preventDefault();
      }
      if (e.code === 'KeyR') {
        input.restart = true;
      }
      if (startKeys.has(e.code)) {
        input.start = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      const action = keyMap[e.code];
      if (action) {
        input[action] = false;
        e.preventDefault();
      }
      if (e.code === 'KeyR') {
        input.restart = false;
      }
      if (startKeys.has(e.code)) {
        input.start = false;
      }
    });

    return input;
  }

  function updateCar(car, input, dt) {
    if (input.forward) {
      car.speed += ACCELERATION * dt;
    } else if (input.backward) {
      car.speed -= BRAKE_DECEL * dt;
    } else if (car.speed > 0) {
      car.speed = Math.max(0, car.speed - FRICTION * dt);
    } else if (car.speed < 0) {
      car.speed = Math.min(0, car.speed + FRICTION * dt);
    }

    car.speed = Math.max(MAX_REVERSE_SPEED, Math.min(MAX_SPEED, car.speed));

    // Steering only has effect while moving, and reverses when driving backward,
    // matching how a real car's wheels work.
    const speedFactor = car.speed / MAX_SPEED;
    if (input.left) car.angle -= TURN_RATE * dt * speedFactor;
    if (input.right) car.angle += TURN_RATE * dt * speedFactor;

    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
  }

  window.Game = window.Game || {};
  window.Game.Car = { createCar, resetCar, createInput, updateCar, RADIUS };
})();
