// Forest hazard: branches that drop from the canopy onto the road. Unlike
// the birds (which fly through once and are gone), this hazard cycles
// forever in a loop so the forest stays dangerous for as long as the
// player is in it: a telegraphed "warning" shadow grows on the ground,
// then the branch actually lands and becomes solid for a beat, then it
// clears away and the cycle starts again at a new spot.
(function () {
  const WARNING_DURATION = 0.9; // seconds the ground shadow telegraphs before impact
  const IMPACT_DURATION = 1.1; // seconds the fallen branch blocks the road
  const IDLE_RANGE = [0.7, 1.8]; // random pause range before the next telegraph
  const IMPACT_RADIUS = 26;

  // The forest's along-axis (x) span to scatter hazards into, its fixed
  // cross-axis (y) center, and how far off that center a branch may land.
  const FOREST_RANGE = [3650, 4400];
  const FOREST_CENTER = 3800;
  const FOREST_HALF_WIDTH = 100;
  const SLOT_COUNT = 3; // concurrent, independently-timed hazard cycles

  function randomIdle() {
    return IDLE_RANGE[0] + Math.random() * (IDLE_RANGE[1] - IDLE_RANGE[0]);
  }

  function makeSlot(index) {
    const span = FOREST_RANGE[1] - FOREST_RANGE[0];
    const band = [
      FOREST_RANGE[0] + (span / SLOT_COUNT) * index,
      FOREST_RANGE[0] + (span / SLOT_COUNT) * (index + 1),
    ];
    return {
      band,
      phase: 'idle',
      // Stagger each slot's first telegraph so they don't all fire in sync.
      timer: randomIdle() + Math.random() * 1.5,
      x: 0,
      y: 0,
      rot: 0,
    };
  }

  function createBranchSystem() {
    return { hazards: [makeSlot(0), makeSlot(1), makeSlot(2)] };
  }

  function resetBranches(system) {
    system.hazards.length = 0;
    for (let i = 0; i < SLOT_COUNT; i++) {
      system.hazards.push(makeSlot(i));
    }
  }

  // Advances every hazard's phase cycle. Returns the {x, y} of any hazard
  // that just transitioned into 'impact' this frame, so a debris burst can
  // be spawned once at the moment the branch lands.
  function updateBranches(system, dt) {
    const impacts = [];
    system.hazards.forEach((h) => {
      h.timer -= dt;
      if (h.timer > 0) return;

      if (h.phase === 'idle') {
        h.phase = 'warning';
        h.timer = WARNING_DURATION;
        const [a0, a1] = h.band;
        h.x = a0 + Math.random() * (a1 - a0);
        h.y = FOREST_CENTER + (Math.random() * 2 - 1) * FOREST_HALF_WIDTH;
        h.rot = Math.random() * Math.PI;
      } else if (h.phase === 'warning') {
        h.phase = 'impact';
        h.timer = IMPACT_DURATION;
        impacts.push({ x: h.x, y: h.y });
      } else {
        h.phase = 'idle';
        h.timer = randomIdle();
      }
    });
    return impacts;
  }

  // True if the car circle overlaps a branch that has already landed.
  function checkBranchCollisions(car, hazards) {
    const { circleCircleCollision } = window.Game.Collision;
    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      if (h.phase !== 'impact') continue;
      if (circleCircleCollision(car.x, car.y, car.radius, h.x, h.y, IMPACT_RADIUS)) {
        return true;
      }
    }
    return false;
  }

  window.Game = window.Game || {};
  window.Game.Branches = {
    createBranchSystem,
    resetBranches,
    updateBranches,
    checkBranchCollisions,
    WARNING_DURATION,
    IMPACT_DURATION,
    IMPACT_RADIUS,
  };
})();
