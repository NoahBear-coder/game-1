// Viewport/camera logic: keeps the car smoothly centered in the fixed-size canvas.
(function () {
  function createCamera(x, y) {
    return { x, y };
  }

  // Smoothly moves the camera toward the car's position (lerp), rather than
  // snapping instantly, so following reads as smooth rather than rigid.
  function updateCamera(camera, car, dt) {
    const smoothing = 6; // higher = snappier follow
    const t = 1 - Math.exp(-smoothing * dt);
    camera.x += (car.x - camera.x) * t;
    camera.y += (car.y - camera.y) * t;
  }

  // Returns the offset to add to any world-space coordinate to get its
  // screen-space position, such that the camera's position is drawn at the
  // center of the canvas.
  function getViewOffset(camera, canvasWidth, canvasHeight) {
    return {
      x: canvasWidth / 2 - camera.x,
      y: canvasHeight / 2 - camera.y,
    };
  }

  window.Game = window.Game || {};
  window.Game.Camera = { createCamera, updateCamera, getViewOffset };
})();
