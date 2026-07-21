// Bullet/weapon system: firing from the car, moving bullets, and resolving
// bullet-vs-obstacle hits. Reuses collision.js's circle-rect test rather than
// duplicating collision math.
(function () {
  const BULLET_SPEED = 700; // px/s
  const BULLET_RADIUS = 4;
  const BULLET_LIFETIME = 1.1; // seconds before a bullet despawns unused
  const MUZZLE_OFFSET = 34; // spawn distance from car center, along its heading

  function createBulletSystem() {
    return { bullets: [] };
  }

  function resetBullets(system) {
    system.bullets.length = 0;
  }

  // Fires one bullet from the car's nose if it has ammo left. Returns true
  // if a shot was fired.
  function fireBullet(system, car) {
    if (car.ammo <= 0) return false;
    car.ammo -= 1;
    system.bullets.push({
      x: car.x + Math.cos(car.angle) * MUZZLE_OFFSET,
      y: car.y + Math.sin(car.angle) * MUZZLE_OFFSET,
      vx: Math.cos(car.angle) * BULLET_SPEED,
      vy: Math.sin(car.angle) * BULLET_SPEED,
      radius: BULLET_RADIUS,
      life: BULLET_LIFETIME,
    });
    return true;
  }

  function updateBullets(system, dt) {
    system.bullets = system.bullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      return b.life > 0;
    });
  }

  // Destroys the first obstacle each bullet touches (and that bullet with
  // it). Mutates the obstacles array in place so existing references
  // (world.js, render.js) stay valid. Returns the {x, y} center of each
  // destroyed obstacle, for spawning debris.
  function checkBulletObstacleHits(system, obstacles) {
    const { circleRectCollision } = window.Game.Collision;
    const hits = [];
    system.bullets = system.bullets.filter((b) => {
      const hitIndex = obstacles.findIndex((o) => circleRectCollision(b.x, b.y, b.radius, o));
      if (hitIndex === -1) return true;
      const o = obstacles[hitIndex];
      hits.push({ x: o.x + o.width / 2, y: o.y + o.height / 2 });
      obstacles.splice(hitIndex, 1);
      return false;
    });
    return hits;
  }

  window.Game = window.Game || {};
  window.Game.Bullets = { createBulletSystem, resetBullets, fireBullet, updateBullets, checkBulletObstacleHits };
})();
