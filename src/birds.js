// Flying bird hazards: a fixed budget of birds per section, flying head-on
// against the player's direction of travel (never reversing). A section's
// birds don't spawn until the player actually enters that section - if they
// spawned all at once at the start of the run, sections near the finish
// would always be empty by the time the player got there, since the birds
// would have already flown through and vanished. Each bird flies once
// through its section and is gone for the rest of the run once it exits -
// it does not respawn, so a section's `count` is also the total number of
// times a bird can spawn in there per run. Touching one crashes the car,
// same as a barrel; shooting one destroys it, same as a barrel.
(function () {
  // Each entry describes a section's travel axis ('v' = north/south like the
  // open section, 'h' = east/west like the tunnel/bridge), the direction
  // birds fly along that axis (+1 or -1) - the opposite of the player's
  // travel direction through that section - the fixed cross-axis center,
  // the [start, end] range to patrol, how far birds may drift off that
  // center, and how many birds (total spawns) the section gets per run.
  const BIRD_SECTIONS = [
    { section: 'open', axis: 'v', dir: 1, center: 400, range: [4250, 5150], drift: 110, speed: 110, count: 2 },
    { section: 'tunnel', axis: 'h', dir: -1, center: 3800, range: [860, 1590], drift: 70, speed: 130, count: 2 },
    { section: 'bridge', axis: 'h', dir: -1, center: 3800, range: [1800, 2500], drift: 80, speed: 120, count: 2 },
    { section: 'desert', axis: 'h', dir: -1, center: 3800, range: [2720, 3430], drift: 90, speed: 125, count: 2 },
  ]; // count: 2 -> at most 2 bird spawns per section per run (forest uses branches.js instead)

  const BIRD_RADIUS = 13;

  function spawnBird(cfg, index) {
    const span = cfg.range[1] - cfg.range[0];
    // Stagger starting positions so a section's birds aren't stacked.
    const pos = cfg.range[0] + (span / cfg.count) * index;
    return {
      section: cfg.section,
      axis: cfg.axis,
      dir: cfg.dir,
      center: cfg.center,
      range: cfg.range,
      drift: cfg.drift,
      speed: cfg.speed,
      pos,
      lateral: (Math.random() * 2 - 1) * cfg.drift,
      radius: BIRD_RADIUS,
      phase: Math.random() * Math.PI * 2, // wing-flap / bob offset, purely visual
      x: 0,
      y: 0,
    };
  }

  function placeBird(b) {
    if (b.axis === 'v') {
      b.x = b.center + b.lateral;
      b.y = b.pos;
    } else {
      b.x = b.pos;
      b.y = b.center + b.lateral;
    }
  }

  function spawnSectionBirds(system, sectionName) {
    const cfg = BIRD_SECTIONS.find((c) => c.section === sectionName);
    if (!cfg) return;
    for (let i = 0; i < cfg.count; i++) {
      const bird = spawnBird(cfg, i);
      placeBird(bird);
      system.birds.push(bird);
    }
  }

  // Birds start out with none spawned - each section's flock only appears
  // once the player reaches it (see updateBirds).
  function createBirdSystem() {
    return { birds: [], spawnedSections: {} };
  }

  function resetBirds(system) {
    system.birds.length = 0;
    system.spawnedSections = {};
  }

  // currentSection is whichever section the car is on right now (see
  // World.getSectionAt). The first time it matches a section that has
  // birds, that section's flock spawns.
  function updateBirds(system, dt, currentSection) {
    if (currentSection && !system.spawnedSections[currentSection]) {
      system.spawnedSections[currentSection] = true;
      spawnSectionBirds(system, currentSection);
    }

    system.birds = system.birds.filter((b) => {
      b.pos += b.dir * b.speed * dt;
      // Forward-only and one-shot: once a bird flies past the far end of its
      // range it's gone for good rather than turning back or respawning.
      const exited = b.dir > 0 ? b.pos > b.range[1] : b.pos < b.range[0];
      if (exited) return false;
      placeBird(b);
      return true;
    });
  }

  // True if the car circle overlaps any bird.
  function checkBirdCollisions(car, birds) {
    const { circleCircleCollision } = window.Game.Collision;
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      if (circleCircleCollision(car.x, car.y, car.radius, b.x, b.y, b.radius)) {
        return true;
      }
    }
    return false;
  }

  // Destroys the first bird each bullet touches (and that bullet with it),
  // mirroring bullets.js's checkBulletObstacleHits. Returns the {x, y}
  // position of each destroyed bird, for spawning debris.
  function checkBulletBirdHits(bulletSystem, birds) {
    const { circleCircleCollision } = window.Game.Collision;
    const hits = [];
    bulletSystem.bullets = bulletSystem.bullets.filter((b) => {
      const hitIndex = birds.findIndex((bird) =>
        circleCircleCollision(b.x, b.y, b.radius, bird.x, bird.y, bird.radius)
      );
      if (hitIndex === -1) return true;
      const bird = birds[hitIndex];
      hits.push({ x: bird.x, y: bird.y });
      birds.splice(hitIndex, 1);
      return false;
    });
    return hits;
  }

  window.Game = window.Game || {};
  window.Game.Birds = { createBirdSystem, resetBirds, updateBirds, checkBirdCollisions, checkBulletBirdHits };
})();
