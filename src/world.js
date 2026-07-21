// Track / world setup: the drivable path, its visually distinct sections,
// static obstacles, and the finish line. Coordinates are in world space;
// the camera module maps world space to screen space.
(function () {
  // Generates points along a circular arc, used to build the single turn
  // in the track (open section -> tunnel section).
  function arcPoints(centerX, centerY, radius, startAngle, endAngle, steps, width, section) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = startAngle + ((endAngle - startAngle) * i) / steps;
      pts.push({
        x: centerX + radius * Math.cos(t),
        y: centerY + radius * Math.sin(t),
        width,
        section,
      });
    }
    return pts;
  }

  function straightPoints(x0, y0, x1, y1, steps, width, section) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, width, section });
    }
    return pts;
  }

  // --- Track layout -------------------------------------------------------
  // Start at the bottom, heading north (up) through the open section, then a
  // 90 degree turn to the east into a narrow tunnel, then a wider bridge
  // section, ending at the finish line.
  const OPEN_WIDTH = 300;
  const TUNNEL_WIDTH = 200; // narrower than open/bridge, but wide enough for the car to weave around obstacles
  const BRIDGE_WIDTH = 220;

  const start = { x: 400, y: 5200, angle: -Math.PI / 2 };

  const openSection = straightPoints(400, 5200, 400, 4200, 12, OPEN_WIDTH, 'open');

  // Turn: quarter circle from heading north to heading east.
  const turnCenter = { x: 800, y: 4200 };
  const turnRadius = 400;
  const turnSection = arcPoints(
    turnCenter.x,
    turnCenter.y,
    turnRadius,
    Math.PI, // pointing at (400, 4200)
    Math.PI * 1.5, // pointing at (800, 3800)
    16,
    (OPEN_WIDTH + TUNNEL_WIDTH) / 2,
    'turn'
  );

  const tunnelSection = straightPoints(800, 3800, 1650, 3800, 10, TUNNEL_WIDTH, 'tunnel');

  // Small transition so the ribbon widens smoothly from tunnel to bridge.
  const transitionSection = straightPoints(1650, 3800, 1750, 3800, 4, (TUNNEL_WIDTH + BRIDGE_WIDTH) / 2, 'bridge');

  const bridgeSection = straightPoints(1750, 3800, 2550, 3800, 12, BRIDGE_WIDTH, 'bridge');

  const centerline = [
    ...openSection,
    ...turnSection,
    ...tunnelSection,
    ...transitionSection,
    ...bridgeSection,
  ];

  const finish = { x: 2500, y: 3800 - BRIDGE_WIDTH / 2, width: 50, height: BRIDGE_WIDTH };

  // --- Obstacles ------------------------------------------------------------
  // Obstacles are generated randomly within each section's drivable band, so
  // the layout differs every run (and is re-rolled on each reset). Placement
  // is constrained to always leave a passable gap, so the track stays winnable.
  //
  // Each section config describes: the axis the track runs along ('v' = the
  // open section runs vertically, 'h' = tunnel/bridge run horizontally),
  // the fixed center coordinate on the cross-axis, the [start, end] range along
  // the travel axis to scatter obstacles into, the track half-width, how many
  // obstacles to place, and the min/max obstacle size.
  // Minimum free lane (px) kept on one side of every obstacle. The car's
  // collision radius is 28 (diameter 56), so this leaves a comfortable
  // ~26px steering corridor for its center to thread through.
  const PASS_CLEARANCE = 82;

  const OBSTACLE_SECTIONS = [
    { section: 'open', axis: 'v', center: 400, along: [4300, 4950], halfWidth: OPEN_WIDTH / 2, count: 2, size: [55, 72] },
    { section: 'tunnel', axis: 'h', center: 3800, along: [900, 1560], halfWidth: TUNNEL_WIDTH / 2, count: 2, size: [36, 46] },
    { section: 'bridge', axis: 'h', center: 3800, along: [1850, 2440], halfWidth: BRIDGE_WIDTH / 2, count: 2, size: [48, 60] },
  ];

  function makeObstacles() {
    const result = [];
    OBSTACLE_SECTIONS.forEach((cfg) => {
      const [a0, a1] = cfg.along;
      const band = (a1 - a0) / cfg.count; // give each obstacle its own stretch of the section
      for (let i = 0; i < cfg.count; i++) {
        const size = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
        const s = size / 2;
        // Position along the travel axis, kept inside this obstacle's band.
        const along = a0 + i * band + s + Math.random() * Math.max(0, band - 2 * s);
        // Lateral offset from center, bounded so a PASS_CLEARANCE gap always remains.
        const maxLat = Math.max(0, cfg.halfWidth - s - PASS_CLEARANCE);
        const lat = (Math.random() * 2 - 1) * maxLat;
        const cx = cfg.axis === 'v' ? cfg.center + lat : along;
        const cy = cfg.axis === 'v' ? along : cfg.center + lat;
        // Stored as top-left corner (matching collision.js's rect contract).
        result.push({ x: cx - s, y: cy - s, width: size, height: size, section: cfg.section });
      }
    });
    return result;
  }

  const obstacles = makeObstacles();

  // Re-roll obstacle positions in place, so existing references to the array
  // (in main.js and the renderer) stay valid.
  function randomizeObstacles() {
    const next = makeObstacles();
    obstacles.length = 0;
    next.forEach((o) => obstacles.push(o));
    return obstacles;
  }

  const sectionColors = {
    open: '#5a8f4a',
    turn: '#5a8f4a',
    tunnel: '#2b2b33',
    bridge: '#2e5f8a',
  };

  const sectionLabels = [
    { text: 'OPEN ROAD', x: 400, y: 4900, section: 'open' },
    { text: 'TUNNEL', x: 950, y: 3730, section: 'tunnel' },
    { text: 'BRIDGE', x: 1950, y: 3700, section: 'bridge' },
  ];

  // Returns the section tag ('open', 'turn', 'tunnel', 'bridge') of whichever
  // centerline point is nearest (x, y) - a cheap way to tell which part of
  // the track the car is currently on. Used to spawn section-local hazards
  // (birds) only once the player actually reaches that section.
  function getSectionAt(x, y) {
    let best = null;
    let bestDist = Infinity;
    centerline.forEach((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    });
    return best ? best.section : null;
  }

  window.Game = window.Game || {};
  window.Game.World = {
    start,
    centerline,
    obstacles,
    finish,
    sectionColors,
    sectionLabels,
    randomizeObstacles,
    getSectionAt,
  };
})();
