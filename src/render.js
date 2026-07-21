// All drawing/rendering code. Nothing in here mutates game state.
(function () {
  // --- Palette -------------------------------------------------------------
  const COLORS = {
    grassA: '#4c7a3a',
    grassB: '#437033',
    water: '#2f6f9e',
    waterDeep: '#245a83',
    rock: '#3c3b44',
    sand: '#d8c48a',
    sandDune: '#c9a769',
    forestFloor: '#1f3d1a',
    treeDark: '#1a3016',
    treeMid: '#2f5233',
    treeLight: '#3f6b41',
  };

  // Per-section road styling: outer curb, edge line, and asphalt surface.
  const ROAD_STYLES = {
    open: { curb: '#26282e', edge: '#e9e3c4', surface: '#40464e' },
    turn: { curb: '#26282e', edge: '#e9e3c4', surface: '#40464e' },
    tunnel: { curb: '#3d414c', edge: '#5a6070', surface: '#191a20' },
    bridge: { curb: '#8a7550', edge: '#d8cba0', surface: '#463f38' },
    desert: { curb: '#8a6a3a', edge: '#e8d9a8', surface: '#c9a769' },
    forest: { curb: '#2e4620', edge: '#c9c08a', surface: '#5a4632' },
  };

  // Deterministic 0..1 hash from integer cell coordinates (for scenery).
  function hash(ix, iy) {
    let n = (ix | 0) * 374761393 + (iy | 0) * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
  }

  // Bounding regions for the tunnel and bridge, derived once from the
  // centerline so world.js needs no extra data. Memoized on the world object.
  function getRegions(world) {
    if (world.__regions) return world.__regions;
    function bounds(section) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxW = 0;
      world.centerline.forEach((p) => {
        if (p.section !== section) return;
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        maxW = Math.max(maxW, p.width);
      });
      if (minX === Infinity) return null;
      return { minX, maxX, minY, maxY, maxW, cy: (minY + maxY) / 2 };
    }
    world.__regions = {
      tunnel: bounds('tunnel'),
      bridge: bounds('bridge'),
      desert: bounds('desert'),
      forest: bounds('forest'),
    };
    return world.__regions;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // A simple saguaro-style cactus silhouette, for scattering across the
  // desert background (decorative only, not a collidable obstacle).
  function drawCactus(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.9, s * 0.5, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3d6b3a';
    ctx.strokeStyle = '#2a4a28';
    ctx.lineWidth = 1.5;

    roundRectPath(ctx, x - s * 0.16, y - s * 0.9, s * 0.32, s * 0.9, s * 0.16);
    ctx.fill();
    ctx.stroke();

    roundRectPath(ctx, x - s * 0.38, y - s * 0.55, s * 0.2, s * 0.4, s * 0.1);
    ctx.fill();
    ctx.stroke();

    roundRectPath(ctx, x + s * 0.18, y - s * 0.7, s * 0.2, s * 0.4, s * 0.1);
    ctx.fill();
    ctx.stroke();
  }

  // --- Environment ---------------------------------------------------------
  function drawEnvironment(ctx, canvasWidth, canvasHeight, world, offset) {
    // Grass base.
    ctx.fillStyle = COLORS.grassA;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grass texture: scattered darker/lighter tufts on a jittered grid,
    // only over the currently visible world region.
    const cell = 74;
    const wx0 = Math.floor(-offset.x / cell) * cell;
    const wy0 = Math.floor(-offset.y / cell) * cell;
    for (let wx = wx0; wx < canvasWidth - offset.x; wx += cell) {
      for (let wy = wy0; wy < canvasHeight - offset.y; wy += cell) {
        const r = hash(wx, wy);
        const sx = wx + r * cell * 0.7 + offset.x;
        const sy = wy + hash(wx, wy + 7) * cell * 0.7 + offset.y;
        ctx.fillStyle = r > 0.5 ? 'rgba(255,255,255,0.045)' : COLORS.grassB;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 10 + r * 8, 6 + r * 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const regions = getRegions(world);

    // Rock massif the tunnel bores through.
    if (regions.tunnel) {
      const t = regions.tunnel;
      const x = t.minX - 60 + offset.x;
      const y = t.cy - t.maxW / 2 - 80 + offset.y;
      const w = t.maxX - t.minX + 120;
      const h = t.maxW + 160;
      ctx.fillStyle = COLORS.rock;
      ctx.fillRect(x, y, w, h);
      // Speckles / cracks for texture.
      for (let i = 0; i < 60; i++) {
        const rx = x + hash(i, 1) * w;
        const ry = y + hash(i, 2) * h;
        ctx.fillStyle = hash(i, 3) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.18)';
        ctx.fillRect(rx, ry, 3 + hash(i, 4) * 5, 3 + hash(i, 5) * 4);
      }
    }

    // Water beneath the bridge.
    if (regions.bridge) {
      const b = regions.bridge;
      const x = b.minX - 40 + offset.x;
      const y = b.cy - b.maxW / 2 - 110 + offset.y;
      const w = b.maxX - b.minX + 180;
      const h = b.maxW + 220;
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, COLORS.waterDeep);
      grad.addColorStop(0.5, COLORS.water);
      grad.addColorStop(1, COLORS.waterDeep);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      // Gently drifting wave crests.
      const phase = Date.now() / 900;
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      for (let row = 0; row < h / 26; row++) {
        const wy = y + row * 26 + 10;
        ctx.beginPath();
        for (let px = x; px < x + w; px += 12) {
          const oy = Math.sin((px + offset.x) * 0.05 + phase + row) * 2.2;
          if (px === x) ctx.moveTo(px, wy + oy);
          else ctx.lineTo(px, wy + oy);
        }
        ctx.stroke();
      }
    }

    // How far above/below the road the themed backdrop (dunes/canopy)
    // extends. Scaled off canvasHeight rather than a fixed pixel value so
    // the flanking scenery always reaches past both screen edges on a
    // fullscreen canvas - a fixed small margin would only cover a thin band
    // hugging the road, leaving plain grass (and no trees/cacti at all)
    // everywhere above and below it on a tall window.
    const flankMargin = Math.max(260, canvasHeight * 0.7);

    // Sand dunes flanking the desert stretch, on both sides of the road.
    if (regions.desert) {
      const d = regions.desert;
      const x = d.minX - 60 + offset.x;
      const y = d.cy - d.maxW / 2 - flankMargin + offset.y;
      const w = d.maxX - d.minX + 120;
      const h = d.maxW + flankMargin * 2;
      ctx.fillStyle = COLORS.sand;
      ctx.fillRect(x, y, w, h);
      // Dune ridges: soft overlapping ellipses in a slightly darker sand
      // tone. Count scales with area so density stays consistent regardless
      // of window size.
      const duneCount = Math.round((w * h) / 55000);
      for (let i = 0; i < duneCount; i++) {
        const rx = x + hash(i, 11) * w;
        const ry = y + hash(i, 12) * h;
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.beginPath();
        ctx.ellipse(rx, ry, 40 + hash(i, 13) * 50, 14 + hash(i, 14) * 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cacti scattered across the dunes, same area-scaled density.
      const cactusCount = Math.round((w * h) / 65000);
      for (let i = 0; i < cactusCount; i++) {
        const rx = x + hash(i, 41) * w;
        const ry = y + hash(i, 42) * h;
        const s = 26 + hash(i, 43) * 22;
        drawCactus(ctx, rx, ry, s);
      }
    }

    // Dense tree canopy flanking the forest stretch, on both sides of the road.
    if (regions.forest) {
      const f = regions.forest;
      const x = f.minX - 80 + offset.x;
      const y = f.cy - f.maxW / 2 - flankMargin + offset.y;
      const w = f.maxX - f.minX + 160;
      const h = f.maxW + flankMargin * 2;
      ctx.fillStyle = COLORS.forestFloor;
      ctx.fillRect(x, y, w, h);
      // Overlapping canopy blobs, scattered by section hash so they're stable
      // frame-to-frame but vary in size/shade for a dense-woods look. Drawn
      // over the whole region - drawTrack paints the road on top afterward,
      // so trees only end up reading as flanking the road, not covering it.
      // Counts scale with area so density stays consistent on any window size.
      const treeColors = [COLORS.treeDark, COLORS.treeMid, COLORS.treeLight];
      const canopyCount = Math.round((w * h) / 6500);
      for (let i = 0; i < canopyCount; i++) {
        const rx = x + hash(i, 21) * w;
        const ry = y + hash(i, 22) * h;
        ctx.fillStyle = treeColors[Math.floor(hash(i, 23) * treeColors.length)];
        ctx.beginPath();
        ctx.ellipse(rx, ry, 20 + hash(i, 24) * 18, 20 + hash(i, 25) * 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // A closer, smaller undergrowth layer on top for extra depth/density.
      const undergrowthCount = Math.round((w * h) / 10000);
      for (let i = 0; i < undergrowthCount; i++) {
        const rx = x + hash(i, 31) * w;
        const ry = y + hash(i, 32) * h;
        ctx.fillStyle = treeColors[Math.floor(hash(i, 33) * treeColors.length)];
        ctx.beginPath();
        ctx.ellipse(rx, ry, 10 + hash(i, 34) * 10, 10 + hash(i, 35) * 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- Road ----------------------------------------------------------------
  function strokeRibbon(ctx, pts, offset, widthDelta, colorFor) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      ctx.strokeStyle = colorFor(b.section);
      ctx.lineWidth = Math.max(1, b.width + widthDelta);
      ctx.beginPath();
      ctx.moveTo(a.x + offset.x, a.y + offset.y);
      ctx.lineTo(b.x + offset.x, b.y + offset.y);
      ctx.stroke();
    }
  }

  function drawTrack(ctx, world, offset) {
    const pts = world.centerline;
    const style = (s) => ROAD_STYLES[s] || ROAD_STYLES.open;

    // Layered strokes: curb, then edge lines, then the asphalt surface.
    strokeRibbon(ctx, pts, offset, 16, (s) => style(s).curb);
    strokeRibbon(ctx, pts, offset, 0, (s) => style(s).edge);
    strokeRibbon(ctx, pts, offset, -10, (s) => style(s).surface);

    // Bridge planks + guard rails.
    const regions = getRegions(world);
    if (regions.bridge) {
      const b = regions.bridge;
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 3;
      for (let x = b.minX; x <= b.maxX; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x + offset.x, b.cy - b.maxW / 2 + offset.y);
        ctx.lineTo(x + offset.x, b.cy + b.maxW / 2 + offset.y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#c9b98c';
      ctx.lineWidth = 5;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(b.minX + offset.x, b.cy + (side * b.maxW) / 2 + offset.y);
        ctx.lineTo(b.maxX + offset.x, b.cy + (side * b.maxW) / 2 + offset.y);
        ctx.stroke();
      });
    }

    // Center dashes down the whole track.
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.85)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 18]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x + offset.x, pts[0].y + offset.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x + offset.x, pts[i].y + offset.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Extra darkness inside the tunnel for atmosphere.
    if (regions.tunnel) {
      const t = regions.tunnel;
      const x = t.minX + offset.x;
      const y = t.cy - t.maxW / 2 + offset.y;
      const w = t.maxX - t.minX;
      const grad = ctx.createLinearGradient(0, y, 0, y + t.maxW);
      grad.addColorStop(0, 'rgba(0,0,0,0.55)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
      grad.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, t.maxW);
    }
  }

  function drawSectionLabels(ctx, world, offset) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px sans-serif';
    world.sectionLabels.forEach((label) => {
      const x = label.x + offset.x;
      const y = label.y + offset.y;
      const w = ctx.measureText(label.text).width + 24;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRectPath(ctx, x - w / 2, y - 15, w, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#ffe27a';
      ctx.fillText(label.text, x, y + 1);
    });
    ctx.textBaseline = 'alphabetic';
  }

  // --- Obstacles: hazard barrels (rocks in the desert), with a soft shadow --
  function drawRockObstacle(ctx, o, x, y, cx) {
    // Ground shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, y + o.height + 2, o.width * 0.55, o.height * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(x, y, x + o.width, y + o.height);
    grad.addColorStop(0, '#9a8d78');
    grad.addColorStop(0.5, '#7d7264');
    grad.addColorStop(1, '#5c5344');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, y + o.height / 2, o.width / 2, o.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#453f34';
    ctx.lineWidth = 2;
    ctx.stroke();

    // A couple of darker facets for a chiseled rock look.
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx - o.width * 0.15, y + o.height * 0.35, o.width * 0.22, o.height * 0.18, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBarrelObstacle(ctx, o, x, y, cx) {
    // Ground shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, y + o.height + 3, o.width * 0.55, o.height * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Barrel body.
    const grad = ctx.createLinearGradient(x, 0, x + o.width, 0);
    grad.addColorStop(0, '#c0521f');
    grad.addColorStop(0.5, '#ef7a2c');
    grad.addColorStop(1, '#a8441a');
    ctx.fillStyle = grad;
    roundRectPath(ctx, x, y, o.width, o.height, 8);
    ctx.fill();
    ctx.strokeStyle = '#6e2c0f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Reflective white hazard stripes.
    ctx.fillStyle = 'rgba(245,245,245,0.9)';
    ctx.fillRect(x + 3, y + o.height * 0.24, o.width - 6, o.height * 0.16);
    ctx.fillRect(x + 3, y + o.height * 0.6, o.width - 6, o.height * 0.16);
  }

  function drawObstacles(ctx, obstacles, offset) {
    obstacles.forEach((o) => {
      const x = o.x + offset.x;
      const y = o.y + offset.y;
      const cx = x + o.width / 2;
      if (o.section === 'desert') {
        drawRockObstacle(ctx, o, x, y, cx);
      } else {
        drawBarrelObstacle(ctx, o, x, y, cx);
      }
    });
  }

  // --- Finish gate ---------------------------------------------------------
  function drawFinish(ctx, finish, offset) {
    const x = finish.x + offset.x;
    const y = finish.y + offset.y;
    const tile = 20;

    // Checkered strip.
    for (let row = 0; row * tile < finish.height; row++) {
      for (let col = 0; col * tile < finish.width; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#f5f5f5' : '#161616';
        ctx.fillRect(x + col * tile, y + row * tile, tile, tile);
      }
    }

    // Posts top and bottom.
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(x - 8, y - 20, 8, finish.height + 40);
    ctx.fillRect(x + finish.width, y - 20, 8, finish.height + 40);

    // Banner.
    ctx.fillStyle = '#c0392b';
    roundRectPath(ctx, x - 12, y - 44, finish.width + 24, 26, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', x + finish.width / 2, y - 26);
  }

  // --- Bullets ---------------------------------------------------------------
  function drawBullets(ctx, bullets, offset) {
    bullets.forEach((b) => {
      const x = b.x + offset.x;
      const y = b.y + offset.y;
      ctx.fillStyle = 'rgba(255,180,60,0.35)';
      ctx.beginPath();
      ctx.ellipse(x - b.vx * 0.01, y - b.vy * 0.01, b.radius * 1.8, b.radius * 0.9, Math.atan2(b.vy, b.vx), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff2c2';
      ctx.beginPath();
      ctx.arc(x, y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // --- Birds -----------------------------------------------------------------
  function drawBirds(ctx, birds, offset) {
    const t = Date.now() / 1000;
    birds.forEach((b) => {
      const x = b.x + offset.x;
      // Small vertical bob for a natural flight wobble (purely visual).
      const y = b.y + offset.y + Math.sin(t * 5 + b.phase) * 3;
      const flap = Math.sin(t * 14 + b.phase);
      const facing = b.axis === 'v' ? (b.dir < 0 ? -Math.PI / 2 : Math.PI / 2) : (b.dir < 0 ? Math.PI : 0);

      // Ground shadow so it reads as flying above the road.
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(x, y + 16, b.radius * 0.9, b.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(facing);

      // Wings: a simple V-shape that flaps via a sine wave. A white outline
      // is drawn first (wider) and the dark wing stroked on top, so the
      // silhouette reads clearly against dark backgrounds like the tunnel.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-b.radius, -flap * b.radius * 0.8);
      ctx.lineTo(0, 2);
      ctx.lineTo(b.radius, -flap * b.radius * 0.8);
      ctx.stroke();
      ctx.strokeStyle = '#3a2f22';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-b.radius, -flap * b.radius * 0.8);
      ctx.lineTo(0, 2);
      ctx.lineTo(b.radius, -flap * b.radius * 0.8);
      ctx.stroke();

      // Body.
      ctx.fillStyle = '#4a3d2e';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 0.4, b.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    });
  }

  // --- Forest branch hazard --------------------------------------------------
  function drawBranches(ctx, hazards, offset) {
    const { WARNING_DURATION, IMPACT_DURATION, IMPACT_RADIUS } = window.Game.Branches;
    hazards.forEach((h) => {
      const x = h.x + offset.x;
      const y = h.y + offset.y;

      if (h.phase === 'warning') {
        // Telegraph: a dark shadow that grows to the branch's landing size,
        // pulsing so it reads as "something about to land" rather than a
        // static obstacle.
        const progress = 1 - h.timer / WARNING_DURATION;
        const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 90);
        ctx.fillStyle = `rgba(20,15,8,${0.25 + 0.35 * progress})`;
        ctx.beginPath();
        ctx.ellipse(x, y, IMPACT_RADIUS * progress * pulse, IMPACT_RADIUS * 0.55 * progress * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (h.phase === 'impact') {
        // Fade the branch out right at the end of its life so it doesn't
        // just pop away.
        const fadeIn = Math.min(1, (IMPACT_DURATION - h.timer) / 0.15);
        const fadeOut = Math.min(1, h.timer / 0.2);
        ctx.save();
        ctx.globalAlpha = Math.min(fadeIn, fadeOut);
        ctx.translate(x, y);
        ctx.rotate(h.rot);

        // Ground shadow.
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 4, IMPACT_RADIUS * 1.1, IMPACT_RADIUS * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Log body.
        const grad = ctx.createLinearGradient(-IMPACT_RADIUS, 0, IMPACT_RADIUS, 0);
        grad.addColorStop(0, '#3e2a18');
        grad.addColorStop(0.5, '#5a3d24');
        grad.addColorStop(1, '#3e2a18');
        ctx.fillStyle = grad;
        roundRectPath(ctx, -IMPACT_RADIUS, -IMPACT_RADIUS * 0.32, IMPACT_RADIUS * 2, IMPACT_RADIUS * 0.64, 10);
        ctx.fill();
        ctx.strokeStyle = '#241708';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Snapped side-branches and leaf tufts for silhouette variety.
        ctx.strokeStyle = '#3e2a18';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.moveTo(side * IMPACT_RADIUS * 0.3, 0);
          ctx.lineTo(side * IMPACT_RADIUS * 0.55, -IMPACT_RADIUS * 0.55);
          ctx.stroke();
        });
        ctx.fillStyle = '#4c7a3a';
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.ellipse(side * IMPACT_RADIUS * 0.6, -IMPACT_RADIUS * 0.6, 7, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }
    });
  }

  // --- Debris particles -----------------------------------------------------
  function drawParticles(ctx, particles, offset) {
    particles.forEach((p) => {
      const x = p.x + offset.x;
      const y = p.y + offset.y;
      const alpha = Math.max(0, p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'feather') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    });
  }

  // --- Car -----------------------------------------------------------------
  function drawCar(ctx, car, offset, inTunnel) {
    const length = 60;
    const width = 32;

    ctx.save();
    ctx.translate(car.x + offset.x, car.y + offset.y);
    ctx.rotate(car.angle);

    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(4, 6, length * 0.5, width * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Headlight beams (more visible in the dark tunnel).
    ctx.fillStyle = inTunnel ? 'rgba(255,244,190,0.28)' : 'rgba(255,244,190,0.12)';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(length / 2 - 4, (side * width) / 2 - 3);
      ctx.lineTo(length / 2 + 70, (side * width) / 2 - 22);
      ctx.lineTo(length / 2 + 70, (side * width) / 2 + 10);
      ctx.closePath();
      ctx.fill();
    });

    // Wheels.
    ctx.fillStyle = '#1a1a1a';
    const wheelW = 12, wheelH = 8, wheelInset = 8;
    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sy) => {
        roundRectPath(
          ctx,
          sx * (length / 2 - wheelInset) - wheelW / 2,
          sy * (width / 2) - wheelH / 2,
          wheelW,
          wheelH,
          2
        );
        ctx.fill();
      });
    });

    // Body with a lengthwise metallic gradient.
    const bodyLength = length - 8;
    const bodyWidth = width - 4;
    const bx = -bodyLength / 2;
    const by = -bodyWidth / 2;
    const grad = ctx.createLinearGradient(0, by, 0, by + bodyWidth);
    grad.addColorStop(0, '#ffe888');
    grad.addColorStop(0.5, '#ffcf3f');
    grad.addColorStop(1, '#d99e00');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#7a5f00';
    ctx.lineWidth = 2;
    roundRectPath(ctx, bx, by, bodyLength, bodyWidth, 10);
    ctx.fill();
    ctx.stroke();

    // Cabin / roof.
    ctx.fillStyle = '#2c2c34';
    roundRectPath(ctx, bx + bodyLength * 0.28, by + 4, bodyLength * 0.34, bodyWidth - 8, 5);
    ctx.fill();

    // Windshield toward the nose.
    ctx.fillStyle = '#7fb4e6';
    roundRectPath(ctx, bx + bodyLength * 0.6, by + 5, bodyLength * 0.14, bodyWidth - 10, 3);
    ctx.fill();

    // Headlights.
    ctx.fillStyle = '#fff6c8';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.arc(length / 2 - 6, (side * (bodyWidth - 6)) / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    // Tail lights.
    ctx.fillStyle = '#e33';
    [-1, 1].forEach((side) => {
      ctx.fillRect(bx + 1, (side * (bodyWidth - 8)) / 2 - 2, 3, 4);
    });

    ctx.restore();
  }

  // --- Overlays / HUD ------------------------------------------------------
  function drawBackground(ctx, canvasWidth, canvasHeight) {
    ctx.fillStyle = COLORS.grassA;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  function drawVignette(ctx, canvasWidth, canvasHeight) {
    const grad = ctx.createRadialGradient(
      canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.35,
      canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.85
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  function drawInstructions(ctx, canvasWidth, canvasHeight) {
    const grad = ctx.createLinearGradient(0, canvasHeight - 46, 0, canvasHeight);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, canvasHeight - 46, canvasWidth, 46);
    ctx.fillStyle = '#f2f2f2';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Arrow Keys / WASD to drive   •   Space to shoot barrels   •   Reach the FINISH line',
      canvasWidth / 2,
      canvasHeight - 16
    );
  }

  function drawAmmoHud(ctx, canvasWidth, ammo, maxAmmo) {
    const panelW = 58 + maxAmmo * 13 + 10, panelH = 34;
    const x = canvasWidth / 2 - panelW / 2;
    const y = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRectPath(ctx, x, y, panelW, panelH, 8);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2f2f2';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('AMMO', x + 10, y + panelH / 2 + 1);

    const bulletW = 8, bulletH = 16, gap = 5;
    for (let i = 0; i < maxAmmo; i++) {
      const bx = x + 58 + i * (bulletW + gap);
      const by = y + panelH / 2 - bulletH / 2;
      ctx.fillStyle = i < ammo ? '#ffd23f' : 'rgba(255,255,255,0.18)';
      roundRectPath(ctx, bx, by, bulletW, bulletH, 3);
      ctx.fill();
    }
    ctx.textBaseline = 'alphabetic';
  }

  function drawSplashScreen(ctx, canvasWidth, canvasHeight) {
    const bg = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bg.addColorStop(0, '#1b1030');
    bg.addColorStop(1, '#070a12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Decorative dashed "road" streaks across the backdrop.
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 40;
    ctx.setLineDash([30, 40]);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-40, 90 + i * 110);
      ctx.lineTo(canvasWidth + 40, 60 + i * 110);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.textAlign = 'center';
    // Title with layered shadow / outline.
    ctx.font = 'bold 60px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('ROAD RAGE DODGE', canvasWidth / 2 + 3, 150 + 3);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a0d0a';
    ctx.strokeText('ROAD RAGE DODGE', canvasWidth / 2, 150);
    ctx.fillStyle = '#e6342a';
    ctx.fillText('ROAD RAGE DODGE', canvasWidth / 2, 150);

    // Instruction panel.
    const px = canvasWidth / 2 - 300;
    const py = 200;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRectPath(ctx, px, py, 600, 250, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const instructions = [
      ['Steer with Arrow Keys or WASD', '#ffd23f'],
      ['Up / W accelerate    Down / S brake or reverse', '#ffffff'],
      ['Left / A and Right / D to turn', '#ffffff'],
      ['', '#fff'],
      ['Race through the open road, tunnel, bridge, desert,', '#cfe8ff'],
      ['and forest to reach the checkered FINISH line.', '#cfe8ff'],
      ['', '#fff'],
      ['Dodge the orange barrels — a crash resets you', '#ff9a7a'],
      ['Press SPACE to shoot a barrel — you only get 10 shots', '#ffd23f'],
    ];
    let y = py + 40;
    instructions.forEach(([line, color]) => {
      ctx.fillStyle = color;
      ctx.font = line.indexOf('Steer') === 0 ? 'bold 20px sans-serif' : '17px sans-serif';
      ctx.fillText(line, canvasWidth / 2, y);
      y += 28;
    });

    // Pulsing prompt.
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 380);
    ctx.fillStyle = `rgba(255, 210, 63, ${pulse})`;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Press ENTER or SPACE to start', canvasWidth / 2, canvasHeight - 55);
  }

  function drawOverlayMessage(ctx, canvasWidth, canvasHeight, lines, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Panel.
    const w = 420, h = 150;
    const x = canvasWidth / 2 - w / 2;
    const y = canvasHeight / 2 - h / 2;
    ctx.fillStyle = 'rgba(20,20,26,0.92)';
    roundRectPath(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(lines[0], canvasWidth / 2, canvasHeight / 2 - 4);
    if (lines[1]) {
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#eaeaea';
      ctx.fillText(lines[1], canvasWidth / 2, canvasHeight / 2 + 34);
    }
  }

  // --- Main entry ----------------------------------------------------------
  function render(ctx, canvasWidth, canvasHeight, world, car, offset, gameState, bullets, birds, particles, branches) {
    if (gameState.status === 'splash') {
      drawSplashScreen(ctx, canvasWidth, canvasHeight);
      return;
    }

    drawBackground(ctx, canvasWidth, canvasHeight);
    drawEnvironment(ctx, canvasWidth, canvasHeight, world, offset);
    drawTrack(ctx, world, offset);
    drawFinish(ctx, world.finish, offset);
    drawObstacles(ctx, world.obstacles, offset);
    if (branches) drawBranches(ctx, branches, offset);
    if (bullets) drawBullets(ctx, bullets, offset);
    if (birds) drawBirds(ctx, birds, offset);

    // Detect whether the car is under the tunnel (for headlight intensity).
    const regions = getRegions(world);
    const t = regions.tunnel;
    const inTunnel = !!(t && car.x >= t.minX && car.x <= t.maxX &&
      car.y >= t.cy - t.maxW / 2 && car.y <= t.cy + t.maxW / 2);
    drawCar(ctx, car, offset, inTunnel);
    if (particles) drawParticles(ctx, particles, offset);

    drawSectionLabels(ctx, world, offset);
    drawVignette(ctx, canvasWidth, canvasHeight);
    drawInstructions(ctx, canvasWidth, canvasHeight);
    drawAmmoHud(ctx, canvasWidth, car.ammo, window.Game.Car.MAX_AMMO);

    if (gameState.status === 'crashed') {
      drawOverlayMessage(ctx, canvasWidth, canvasHeight, ['CRASHED!', 'Resetting...'], '#ff5555');
    } else if (gameState.status === 'won') {
      drawOverlayMessage(ctx, canvasWidth, canvasHeight, ['YOU WIN!', 'Press R to play again'], '#5cff5c');
    }
  }

  window.Game = window.Game || {};
  window.Game.Render = { render };
})();
