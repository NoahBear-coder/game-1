// All drawing/rendering code. Nothing in here mutates game state.
(function () {
  function drawTrack(ctx, world, offset) {
    const pts = world.centerline;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      ctx.strokeStyle = world.sectionColors[b.section] || '#5a8f4a';
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x + offset.x, a.y + offset.y);
      ctx.lineTo(b.x + offset.x, b.y + offset.y);
      ctx.stroke();
    }

    // Lane markings down the center for a bit of visual guidance.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x + offset.x, pts[0].y + offset.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x + offset.x, pts[i].y + offset.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawSectionLabels(ctx, world, offset) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    world.sectionLabels.forEach((label) => {
      ctx.fillText(label.text, label.x + offset.x, label.y + offset.y);
    });
  }

  // Obstacles use top-left x/y (same rect contract as collision.js), so they
  // are drawn directly at (o.x, o.y) with no center adjustment.
  function drawObstacles(ctx, obstacles, offset) {
    obstacles.forEach((o) => {
      ctx.fillStyle = '#b33939';
      ctx.strokeStyle = '#7a1f1f';
      ctx.lineWidth = 2;
      ctx.fillRect(o.x + offset.x, o.y + offset.y, o.width, o.height);
      ctx.strokeRect(o.x + offset.x, o.y + offset.y, o.width, o.height);
    });
  }

  function drawFinish(ctx, finish, offset) {
    const x = finish.x + offset.x;
    const y = finish.y + offset.y;
    const tile = 20;
    for (let row = 0; row * tile < finish.height; row++) {
      for (let col = 0; col * tile < finish.width; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(x + col * tile, y + row * tile, tile, tile);
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', x + finish.width / 2, y - 10);
  }

  // Drawn nose-first along +x, then rotated/translated into place. Simple
  // top-down car: body, windshield, and four wheels, all flat rectangles.
  function drawCar(ctx, car, offset) {
    const length = 60;
    const width = 32;

    ctx.save();
    ctx.translate(car.x + offset.x, car.y + offset.y);
    ctx.rotate(car.angle);

    // Wheels (drawn first so the body overlaps their inner edges).
    ctx.fillStyle = '#222222';
    const wheelW = 12;
    const wheelH = 8;
    const wheelInset = 8;
    [-1, 1].forEach((sideX) => {
      [-1, 1].forEach((sideY) => {
        ctx.fillRect(
          sideX * (length / 2 - wheelInset) - wheelW / 2,
          sideY * (width / 2) - wheelH / 2,
          wheelW,
          wheelH
        );
      });
    });

    // Body: rounded rectangle, nose pointing toward +x (the car's heading).
    const bodyLength = length - 8;
    const bodyWidth = width - 4;
    const r = 10;
    const bx = -bodyLength / 2;
    const by = -bodyWidth / 2;
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#8a6d00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bodyLength - r, by);
    ctx.quadraticCurveTo(bx + bodyLength, by, bx + bodyLength, by + r);
    ctx.lineTo(bx + bodyLength, by + bodyWidth - r);
    ctx.quadraticCurveTo(bx + bodyLength, by + bodyWidth, bx + bodyLength - r, by + bodyWidth);
    ctx.lineTo(bx + r, by + bodyWidth);
    ctx.quadraticCurveTo(bx, by + bodyWidth, bx, by + bodyWidth - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Windshield, offset toward the nose to show facing direction.
    ctx.fillStyle = '#3a6ea5';
    ctx.fillRect(bx + bodyLength * 0.45, by + 2, bodyLength * 0.3, bodyWidth - 4);

    ctx.restore();
  }

  function drawBackground(ctx, canvasWidth, canvasHeight) {
    ctx.fillStyle = '#1a1f16';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  function drawInstructions(ctx, canvasWidth, canvasHeight) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvasHeight - 46, canvasWidth, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      'Controls: Arrow Keys or WASD to steer/accelerate  |  Avoid obstacles  |  Reach the finish line',
      12,
      canvasHeight - 18
    );
  }

  function drawSplashScreen(ctx, canvasWidth, canvasHeight) {
    ctx.fillStyle = '#0d0f0a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e6342a';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('ROAD RAGE DODGE', canvasWidth / 2, 170);

    const instructions = [
      'Steer with Arrow Keys or WASD:',
      'Up/W accelerate   Down/S brake or reverse   Left/A and Right/D turn',
      '',
      'Drive from the start through the open road, tunnel, and bridge',
      'to reach the checkered FINISH line.',
      '',
      'Avoid the red obstacles - hitting one crashes the car',
      'and resets it back to the start.',
    ];

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    let y = 250;
    instructions.forEach((line) => {
      ctx.fillText(line, canvasWidth / 2, y);
      y += 26;
    });

    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press ENTER or SPACE to start', canvasWidth / 2, canvasHeight - 60);
  }

  function drawOverlayMessage(ctx, canvasWidth, canvasHeight, lines, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(lines[0], canvasWidth / 2, canvasHeight / 2 - 10);
    if (lines[1]) {
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lines[1], canvasWidth / 2, canvasHeight / 2 + 24);
    }
  }

  function render(ctx, canvasWidth, canvasHeight, world, car, offset, gameState) {
    if (gameState.status === 'splash') {
      drawSplashScreen(ctx, canvasWidth, canvasHeight);
      return;
    }

    drawBackground(ctx, canvasWidth, canvasHeight);
    drawTrack(ctx, world, offset);
    drawSectionLabels(ctx, world, offset);
    drawObstacles(ctx, world.obstacles, offset);
    drawFinish(ctx, world.finish, offset);
    drawCar(ctx, car, offset);
    drawInstructions(ctx, canvasWidth, canvasHeight);

    if (gameState.status === 'crashed') {
      drawOverlayMessage(ctx, canvasWidth, canvasHeight, ['CRASHED!', 'Resetting...'], '#ff5555');
    } else if (gameState.status === 'won') {
      drawOverlayMessage(ctx, canvasWidth, canvasHeight, ['YOU WIN!', 'Press R to play again'], '#5cff5c');
    }
  }

  window.Game = window.Game || {};
  window.Game.Render = { render };
})();
