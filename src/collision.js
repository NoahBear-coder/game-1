// Collision detection helpers.
// Car is treated as a circle {x, y, radius}. Obstacles / the finish zone are
// axis-aligned rectangles {x, y, width, height} with (x, y) as the top-left corner.
// Written so it can run unmodified in the browser (attaches to window.Game.Collision)
// or under plain Node (module.exports), which is what tests/collision.test.js relies on.

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// True if a circle overlaps an axis-aligned rectangle.
function circleRectCollision(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

// True if the car circle overlaps any obstacle rectangle.
function checkObstacleCollisions(car, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    if (circleRectCollision(car.x, car.y, car.radius, obstacles[i])) {
      return true;
    }
  }
  return false;
}

// True if the car circle overlaps the finish rectangle.
function checkFinishCollision(car, finishRect) {
  return circleRectCollision(car.x, car.y, car.radius, finishRect);
}

const CollisionAPI = { clamp, circleRectCollision, checkObstacleCollisions, checkFinishCollision };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollisionAPI;
} else {
  window.Game = window.Game || {};
  window.Game.Collision = CollisionAPI;
}
