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
  // Distributed across sections: at least one in open, tunnel, and bridge.
  // NOTE: x/y are the TOP-LEFT corner (matching collision.js's rect contract),
  // not the center - the values below are the intended center point minus half
  // the width/height.
  const obstacles = [
    // Open section: a boulder just off the centerline.
    { x: 285, y: 4615, width: 70, height: 70, section: 'open' },
    { x: 470, y: 4370, width: 60, height: 60, section: 'open' },

    // Tunnel section: obstacles forcing the car to weave inside the narrow corridor.
    { x: 960, y: 3740, width: 40, height: 40, section: 'tunnel' },
    { x: 1230, y: 3800, width: 40, height: 40, section: 'tunnel' },

    // Bridge section: a barrel/crate near the rail.
    { x: 2022, y: 3732, width: 55, height: 55, section: 'bridge' },
    { x: 2272, y: 3812, width: 55, height: 55, section: 'bridge' },
  ];

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

  window.Game = window.Game || {};
  window.Game.World = {
    start,
    centerline,
    obstacles,
    finish,
    sectionColors,
    sectionLabels,
  };
})();
