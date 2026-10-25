(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['score', 'best', 'overlay', 'title', 'message', 'play', 'eyebrow', 'hint', 'announcement', 'lives'].map(id => [id, document.getElementById(id)]));
  const MAX_LIVES = 3, HIT_PAUSE = 0.4, INVULNERABILITY = 1.5;
  const WORLD_SCALE = 0.85, PIPE_WIDTH = Math.round(68 * 0.8), PIPE_INTERVAL = 1.7;
  const W = canvas.width / WORLD_SCALE, H = canvas.height / WORLD_SCALE;
  const FLOOR = 568 / WORLD_SCALE;
  const GRAVITY = 1400, IMPULSE = -440, SPEED = 160, GAP = 174;
  const STEP = 1 / 120;
  let state = 'ready', score = 0, best = 0, pipes = [], spawn = 0, clock = 0, distance = 0;
  let lives = MAX_LIVES, hitRemaining = 0, immune = 0, particles = [];
  let last = null, accumulator = 0, deathTime = 0;
  const cat = { x: 108, y: 265, vy: 0 };
  try { best = Math.max(0, Number(localStorage.getItem('gato-al-vuelo-best')) || 0); } catch { /* Storage can be unavailable for local files or private browsing. */ }
  ui.best.textContent = best;

  function showLives() {
    ui.lives.replaceChildren(...Array.from({ length: MAX_LIVES }, (_, i) => {
      const heart = document.createElement('span');
      heart.className = `heart${i < lives ? '' : ' lost'}`;
      heart.setAttribute('aria-hidden', 'true');
      return heart;
    }));
    ui.lives.setAttribute('aria-label', `${lives} de ${MAX_LIVES} vidas`);
  }
  showLives();
  function damage() {
    if (immune > 0 || state !== 'playing') return;
    lives--; showLives(); state = 'hit'; hitRemaining = HIT_PAUSE;
    particles = Array.from({ length: 16 }, (_, i) => ({
      x: cat.x, y: cat.y, vx: Math.cos(i * Math.PI / 8) * 90,
      vy: Math.sin(i * Math.PI / 8) * 90 - 30
    }));
    ui.announcement.textContent = `Has perdido una vida. Quedan ${lives}.`;
  }
  function recover() {
    // Move every upcoming obstacle together: preserve their spacing and scores.
    const upcoming = pipes.filter(p => p.x + PIPE_WIDTH + 5 >= cat.x - 14);
    const nearest = upcoming.reduce((a, p) => Math.min(a, p.x), Infinity);
    const safeX = cat.x + SPEED * (INVULNERABILITY + 0.5);
    if (nearest < safeX) for (const p of upcoming) p.x += safeX - nearest;
    cat.y = FLOOR * 0.46; cat.vy = IMPULSE * 0.6;
    immune = INVULNERABILITY; state = 'playing';
  }
  function flap() { cat.vy = IMPULSE; }
  function start() {
    state = 'playing'; lives = MAX_LIVES; hitRemaining = 0; immune = 0; particles = []; showLives(); score = 0; pipes = []; spawn = 0.8; distance = 0;
    cat.y = 265; cat.vy = 0; accumulator = 0;
    ui.score.textContent = '0'; ui.overlay.hidden = true;
    ui.announcement.textContent = 'Partida iniciada.';
    flap();
  }
  function end() {
    if (state !== 'hit') return;
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
    else if (state === 'ready' || (state === 'over' && performance.now() - deathTime > 350)) start();
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
    if (state === 'hit') {
      hitRemaining = Math.max(0, hitRemaining - dt);
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt; }
      if (hitRemaining <= 0) { if (lives === 0) end(); else recover(); }
      return;
    }
    if (state !== 'playing') return;
    immune = Math.max(0, immune - dt);
    distance += SPEED * dt;
    cat.vy += GRAVITY * dt; cat.y += cat.vy * dt;
    spawn -= dt;
    if (spawn <= 0) {
      pipes.push({ x: W + 10, top: 95 + Math.random() * 230, passed: false });
      spawn += PIPE_INTERVAL;
    }
    for (const pipe of pipes) pipe.x -= SPEED * dt;
    // A compact hitbox keeps the decorative tail and ears forgiving.
    const left = cat.x - 14, right = cat.x + 14, top = cat.y - 14, bottom = cat.y + 15;
    if (immune <= 0 && (top <= 0 || bottom >= FLOOR || pipes.some(p => right > p.x - 5 && left < p.x + PIPE_WIDTH + 5 && (top < p.top || bottom > p.top + GAP)))) {
      damage(); return;
    }
    if (immune > 0) {
      cat.y = Math.max(15, Math.min(FLOOR - 16, cat.y));
      if (cat.y === 15 || cat.y === FLOOR - 16) cat.vy = 0;
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
    ctx.save();
    if ((state === 'hit' && Math.floor(hitRemaining * 24) % 2) || (immune > 0 && Math.floor(immune * 12) % 2)) ctx.globalAlpha = 0.35;
    ctx.translate(cat.x + (state === 'hit' ? Math.sin(hitRemaining * 65) * 4 : 0), y);
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
    ctx.setTransform(WORLD_SCALE, 0, 0, WORLD_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, W, H, '#84c9ca');
    rect(0, 310, W, FLOOR - 310, '#9fd5cc');
    for (let i = 0; i < 5; i++) cloud(((i * 137 - distance * 0.16) % 685 + 685) % 685 - 110, 60 + (i % 3) * 74, 0.8 + (i % 2) * 0.5);
    for (let i = 0; i < Math.ceil(W / 58) + 1; i++) {
      const x = i * 58 - 30;
      rect(x, FLOOR - 83 - (i % 3) * 15, 48, 90, '#80b5a2');
      rect(x + 8, FLOOR - 91 - (i % 3) * 15, 30, 10, '#80b5a2');
    }
    pipes.forEach(drawPipe); drawCat();
    rect(0, FLOOR, W, 6, '#35574a'); rect(0, FLOOR + 6, W, 12, '#a2cf74');
    rect(0, FLOOR + 18, W, 5, '#698b4f'); rect(0, FLOOR + 23, W, H - FLOOR - 23, '#dec591');
    for (let i = -1; i < Math.ceil(W / 22) + 1; i++) {
      const x = i * 22 - distance % 22;
      rect(x, FLOOR + 7, 10, 4, '#d5e69a'); rect(x + 8, FLOOR + 35, 5, 4, '#b69c75');
      rect(x, FLOOR + 56, 7, 3, '#c1a77c');
    }
    if (state === 'hit') {
      ctx.globalAlpha = hitRemaining / HIT_PAUSE;
      for (const p of particles) rect(p.x, p.y, 5, 5, '#f39598');
      ctx.globalAlpha = 0.18 * hitRemaining / HIT_PAUSE;
      rect(0, 0, W, H, '#ed5e6d'); ctx.globalAlpha = 1;
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
