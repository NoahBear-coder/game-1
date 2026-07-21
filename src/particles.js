// Debris particles: a short-lived puff of chunks/feathers spawned when a
// bullet destroys a barrel or a bird. Purely cosmetic - no gameplay effect.
(function () {
  const GRAVITY = 260; // px/s^2, pulls debris down after the initial pop
  const DRAG = 0.98; // per-frame velocity damping so debris settles quickly

  function createParticleSystem() {
    return { particles: [] };
  }

  function resetParticles(system) {
    system.particles.length = 0;
  }

  function spawnBurst(system, x, y, count, colors, shape, speedRange, lifeRange) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
      const life = lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]);
      system.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40, // slight upward kick
        size: 2.5 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 2 - 1) * 7,
        color: colors[(Math.random() * colors.length) | 0],
        life,
        maxLife: life,
        shape,
      });
    }
  }

  // Chunky orange/dark/white chips flung out from a shot barrel.
  function spawnBarrelDebris(system, x, y) {
    spawnBurst(
      system,
      x,
      y,
      10,
      ['#ef7a2c', '#c0521f', '#6e2c0f', '#f5f5f5'],
      'rect',
      [60, 220],
      [0.5, 0.9]
    );
  }

  // Small dark/light feathers puffing out from a shot bird.
  function spawnBirdDebris(system, x, y) {
    spawnBurst(
      system,
      x,
      y,
      8,
      ['#2e2620', '#4a3d31', '#e8e2d0', '#241f1a'],
      'feather',
      [40, 150],
      [0.6, 1.1]
    );
  }

  // Splintered bark chips and leaves kicked up when a forest branch lands.
  function spawnBranchDebris(system, x, y) {
    spawnBurst(
      system,
      x,
      y,
      12,
      ['#5a3d24', '#3e2a18', '#4c7a3a', '#6b9c52'],
      'rect',
      [70, 200],
      [0.4, 0.8]
    );
  }

  function updateParticles(system, dt) {
    system.particles = system.particles.filter((p) => {
      p.vy += GRAVITY * dt;
      p.vx *= DRAG;
      p.vy *= DRAG;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  window.Game = window.Game || {};
  window.Game.Particles = {
    createParticleSystem,
    resetParticles,
    spawnBarrelDebris,
    spawnBirdDebris,
    spawnBranchDebris,
    updateParticles,
  };
})();
