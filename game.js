(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['score', 'best', 'overlay', 'title', 'message', 'play', 'eyebrow', 'hint', 'announcement'].map(id => [id, document.getElementById(id)]));
  const W = 432, H = 640, FLOOR = 568;
  const GRAVITY = 1400, IMPULSE = -440, SPEED = 160, GAP = 174, PIPE_WIDTH = 68;
  const STEP = 1 / 120;
  let state = 'ready', score = 0, best = 0, pipes = [], spawn = 0, clock = 0, distance = 0;
  let last = null, accumulator = 0, deathTime = 0;
  const cat = { x: 108, y: 265, vy: 0 };
  try { best = Math.max(0, Number(localStorage.getItem('gato-al-vuelo-best')) || 0); } catch { /* Storage can be unavailable for local files or private browsing. */ }
  ui.best.textContent = best;

  function flap() { cat.vy = IMPULSE; }
  function start() {
    state = 'playing'; score = 0; pipes = []; spawn = 0.8; distance = 0;
    cat.y = 265; cat.vy = 0; accumulator = 0;
    ui.score.textContent = '0'; ui.overlay.hidden = true;
    ui.announcement.textContent = 'Partida iniciada.';
    flap();
  }
  function end() {
    if (state !== 'playing') return;
    state = 'over'; deathTime = performance.now();
    if (score > best) {
      best = score;
      try { localStorage.setItem('gato-al-vuelo-best', String(best)); } catch { /* Keep the record for this session. */ }
    }
    ui.best.textContent = best;
    ui.eyebrow.textContent = 'UN DESCANSO Y OTRO INTENTO';
    ui.title.innerHTML = 'Fin del<br><em>vuelo.</em>';
    ui.message.textContent = `Puntos: ${score} · Récord: ${best}`;
    ui.play.innerHTML = 'Volver a jugar <span>↗</span>';
    ui.hint.textContent = 'CADA SALTO ES UNA NUEVA OPORTUNIDAD';
    ui.overlay.hidden = false;
    ui.announcement.textContent = `Fin de la partida. ${score} puntos. Récord: ${best}.`;
    ui.play.focus({ preventScroll: true });
  }
  function action() {
    if (state === 'playing') flap();
    else if (state === 'ready' || performance.now() - deathTime > 350) start();
  }
  ui.play.addEventListener('click', start);
  canvas.addEventListener('pointerdown', event => { event.preventDefault(); action(); });
  window.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat) return;
    event.preventDefault(); action();
  });
  document.addEventListener('visibilitychange', () => { last = null; accumulator = 0; });

  function update(dt) {
    clock += dt;
    if (state !== 'playing') return;
    distance += SPEED * dt;
    cat.vy += GRAVITY * dt; cat.y += cat.vy * dt;
    spawn -= dt;
    if (spawn <= 0) {
      pipes.push({ x: W + 10, top: 95 + Math.random() * 230, passed: false });
      spawn += 1.55;
    }
    for (const pipe of pipes) pipe.x -= SPEED * dt;
    // A compact hitbox keeps the decorative tail and ears forgiving.
    const left = cat.x - 14, right = cat.x + 14, top = cat.y - 14, bottom = cat.y + 15;
    if (top <= 0 || bottom >= FLOOR || pipes.some(p => right > p.x - 5 && left < p.x + PIPE_WIDTH + 5 && (top < p.top || bottom > p.top + GAP))) {
      end(); return;
    }
    for (const pipe of pipes) {
      if (!pipe.passed && pipe.x + PIPE_WIDTH + 5 < left) {
        pipe.passed = true; score++; ui.score.textContent = score;
      }
    }
    pipes = pipes.filter(p => p.x > -PIPE_WIDTH - 10);
  }
  function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function cloud(x, y, scale) {
    ctx.save(); ctx.translate(Math.round(x), y); ctx.scale(scale, scale);
    rect(0, 12, 70, 15, '#def2df'); rect(12, 3, 23, 24, '#def2df'); rect(31, 0, 24, 27, '#def2df');
    rect(8, 25, 57, 5, '#bbdfcf'); ctx.restore();
  }
  function drawPipe(p) {
    const segment = (y, height, capY) => {
      rect(p.x, y, PIPE_WIDTH, height, '#345b4b');
      rect(p.x + 4, y, PIPE_WIDTH - 8, height, '#74ad69');
      rect(p.x + 9, y, 9, height, '#a8d381');
      rect(p.x + PIPE_WIDTH - 14, y, 9, height, '#508753');
      rect(p.x - 5, capY, PIPE_WIDTH + 10, 24, '#345b4b');
      rect(p.x - 1, capY + 4, PIPE_WIDTH + 2, 15, '#88bb72');
      rect(p.x + 4, capY + 4, 10, 15, '#b8db89');
    };
    segment(0, p.top, p.top - 24);
    segment(p.top + GAP, FLOOR - p.top - GAP, p.top + GAP);
  }
  function drawCat() {
    const y = state === 'ready' ? cat.y + Math.sin(clock * 3) * 7 : cat.y;
    ctx.save(); ctx.translate(cat.x, y);
    ctx.rotate(state === 'playing' ? Math.max(-0.35, Math.min(0.9, cat.vy / 750)) : -0.08);
    const fur = '#18212c', light = '#303945';
    rect(-26, 1, 12, 7, fur); rect(-29, -8, 7, 15, fur);
    rect(-17, -12, 34, 29, fur); rect(-13, -20, 10, 14, fur); rect(7, -20, 10, 14, fur);
    rect(-10, -16, 4, 5, '#bc7a85'); rect(10, -16, 4, 5, '#bc7a85');
    rect(-13, -9, 5, 10, light);
    rect(-7, -6, 8, 8, '#ffe168'); rect(8, -6, 8, 8, '#ffe168');
    rect(-3, -5, 3, 6, '#172532'); rect(12, -5, 3, 6, '#172532');
    rect(3, 5, 4, 3, '#d9969e');
    const paw = Math.sin(clock * 18) > 0 ? 3 : 0;
    rect(-11, 15, 8, 5 + paw, fur); rect(8, 15, 8, 8 - paw, fur);
    ctx.restore();
  }
  function render() {
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, W, H, '#84c9ca');
    rect(0, 310, W, 258, '#9fd5cc');
    for (let i = 0; i < 5; i++) cloud(((i * 137 - distance * 0.16) % 685 + 685) % 685 - 110, 60 + (i % 3) * 74, 0.8 + (i % 2) * 0.5);
    for (let i = 0; i < 10; i++) {
      const x = i * 58 - 30;
      rect(x, 485 - (i % 3) * 15, 48, 90, '#80b5a2');
      rect(x + 8, 477 - (i % 3) * 15, 30, 10, '#80b5a2');
    }
    pipes.forEach(drawPipe); drawCat();
    rect(0, FLOOR, W, 6, '#35574a'); rect(0, FLOOR + 6, W, 12, '#a2cf74');
    rect(0, FLOOR + 18, W, 5, '#698b4f'); rect(0, FLOOR + 23, W, H - FLOOR - 23, '#dec591');
    for (let i = -1; i < 24; i++) {
      const x = i * 22 - distance % 22;
      rect(x, FLOOR + 7, 10, 4, '#d5e69a'); rect(x + 8, FLOOR + 35, 5, 4, '#b69c75');
      rect(x, FLOOR + 56, 7, 3, '#c1a77c');
    }
  }
  function frame(now) {
    if (last !== null) accumulator += Math.min((now - last) / 1000, 0.1);
    last = now;
    while (accumulator >= STEP) { update(STEP); accumulator -= STEP; }
    render(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
