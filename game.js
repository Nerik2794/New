(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['score', 'best', 'overlay', 'title', 'message', 'play', 'eyebrow', 'hint', 'announcement', 'lives', 'level', 'progress', 'coins', 'charges', 'dash', 'speedNotice'].map(id => [id, document.getElementById(id)]));
  const MAX_LIVES = 3, HIT_PAUSE = 0.4, INVULNERABILITY = 1.5;
  const WORLD_SCALE = 0.85, PIPE_WIDTH = Math.round(68 * 0.8), PIPE_INTERVAL = 1.7;
  const W = canvas.width / WORLD_SCALE, H = canvas.height / WORLD_SCALE;
  const FLOOR = 568 / WORLD_SCALE;
  const GRAVITY = 1400, IMPULSE = -440, SPEED = 160, GAP = 174;
  const COINS_PER_LIFE = 10, COIN_EVERY = 1, COIN_RADIUS = 11;
  const BASE_TARGET = 15, TARGET_INCREMENT = 5, LEVEL_SPEED_FACTOR = 1.05;
  const VICTORY_DURATION = 1.5;
  const DASH_DURATION = 1, DASH_DISTANCE = 100, DASH_RETURN = 0.35, DASH_SCROLL_FACTOR = 1.8;
  const CAT_HOME_X = 108;
  let dashAvailable = true, dashRemaining = 0, dashReturn = 0, dashReturnX = CAT_HOME_X;
  let dashTrail = [], speedNoticeTime = 0;
  let level = 1, levelScore = 0, coinCount = 0, charges = 0, generated = 0;
  let victoryTime = 0, confetti = [], sparkles = [], healTime = 0;
  const target = () => BASE_TARGET + (level - 1) * TARGET_INCREMENT;
  const speed = () => SPEED * LEVEL_SPEED_FACTOR ** (level - 1);
  const STEP = 1 / 120;
  let state = 'ready', score = 0, best = 0, pipes = [], spawn = 0, clock = 0, distance = 0;
  let lives = MAX_LIVES, hitRemaining = 0, immune = 0, particles = [];
  let last = null, accumulator = 0, deathTime = 0;
  const cat = { x: CAT_HOME_X, y: 265, vy: 0 };
  try { best = Math.max(0, Number(localStorage.getItem('gato-al-vuelo-best')) || 0); } catch { /* Storage can be unavailable for local files or private browsing. */ }
  ui.best.textContent = best;

  function showLives() {
    ui.lives.replaceChildren(...Array.from({ length: MAX_LIVES }, (_, i) => {
      const heart = document.createElement('span');
      heart.className = `heart${i < lives ? '' : ' lost'}${healTime > 0 && i === lives - 1 ? ' restored' : ''}`;
      heart.setAttribute('aria-hidden', 'true');
      return heart;
    }));
    ui.lives.setAttribute('aria-label', `${lives} de ${MAX_LIVES} vidas`);
  }
  showLives();
  function refreshHud() {
    ui.score.textContent = score; ui.level.textContent = level;
    ui.progress.textContent = `${levelScore} / ${target()}`;
    ui.coins.textContent = `${coinCount} · ${coinCount % COINS_PER_LIFE}/${COINS_PER_LIFE}`;
    ui.charges.textContent = charges ? `+${charges} recuperación${charges === 1 ? '' : 'es'}` : 'Sin cargas';
  }
  function refreshDash() {
    ui.dash.disabled = state !== 'playing' || !dashAvailable;
    ui.dash.classList.toggle('active', dashRemaining > 0);
    ui.dash.classList.toggle('spent', !dashAvailable && dashRemaining <= 0);
    ui.dash.textContent = dashRemaining > 0 ? `ϟ DASH · ${dashRemaining.toFixed(1)} s` : dashAvailable ? 'ϟ DASH · SHIFT' : 'ϟ DASH · CONSUMIDO';
    ui.dash.setAttribute('aria-label', dashRemaining > 0 ? 'Dash activo' : dashAvailable ? 'Activar Dash Felino con Shift o este botón' : 'Dash consumido hasta el siguiente nivel');
    ui.dash.style.setProperty('--dash-progress', `${dashRemaining / DASH_DURATION * 100}%`);
  }
  function resetDash() {
    dashAvailable = true; dashRemaining = 0; dashReturn = 0; dashTrail = []; cat.x = CAT_HOME_X;
    refreshDash();
  }
  function activateDash() {
    if (state !== 'playing' || !dashAvailable || dashRemaining > 0) return;
    dashAvailable = false; dashRemaining = DASH_DURATION; dashReturn = 0;
    ui.announcement.textContent = '¡Dash Felino! Invulnerable durante un segundo.';
    refreshDash();
  }
  function finishDash() {
    dashRemaining = 0; dashReturn = DASH_RETURN; dashReturnX = cat.x;
    const safeY = Math.max(90, Math.min(FLOOR - 90, cat.y));
    if (safeY !== cat.y) { cat.y = safeY; cat.vy = 0; }
    // Clear the entire return corridor, including already-scored pipes. No extra immunity.
    const upcoming = pipes.filter(p => p.x + PIPE_WIDTH + 5 >= CAT_HOME_X - 14);
    const nearest = upcoming.reduce((x, p) => Math.min(x, p.x), Infinity);
    const safeX = cat.x + 40 + speed() * (DASH_RETURN + 0.5);
    if (nearest < safeX) for (const pipe of upcoming) {
      pipe.x += safeX - nearest;
      if (pipe.coin) pipe.coin.x += safeX - nearest;
    }
    if (upcoming.length) spawn = Math.max(spawn, (Math.max(...upcoming.map(p => p.x)) - (W + 10)) / speed() + PIPE_INTERVAL);
    refreshDash();
  }
  function saveBest() {
    if (score <= best) return;
    best = score; ui.best.textContent = best;
    try { localStorage.setItem('gato-al-vuelo-best', String(best)); } catch { /* Session record remains available. */ }
  }
  function useCharges() {
    while (charges > 0 && lives < MAX_LIVES) { charges--; lives++; healTime = 0.8; }
    showLives(); refreshHud();
  }
  function collectCoin(coin) {
    if (coin.collected) return;
    coin.collected = true; coinCount++;
    sparkles.push({ x: coin.x, y: coin.y, time: 0.45 });
    if (coinCount % COINS_PER_LIFE === 0) charges++;
    useCharges();
  }
  function victory() {
    if (state !== 'playing') return;
    state = 'victory'; dashRemaining = 0; dashReturn = 0; dashTrail = []; refreshDash(); victoryTime = 0; saveBest();
    confetti = Array.from({ length: 64 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.55,
      vx: (Math.random() - 0.5) * 90, vy: 40 + Math.random() * 100,
      color: ['#ffcf70', '#f39598', '#a2cf74', '#def2df'][Math.floor(Math.random() * 4)] }));
    ui.eyebrow.textContent = '¡NIVEL COMPLETADO!';
    ui.title.innerHTML = '¡Nivel<br><em>completado!</em>';
    ui.title.classList.add('victory-title');
    ui.message.textContent = `Nivel ${level} · ${levelScore} puntos · Total: ${score} · Monedas: ${coinCount}`;
    ui.play.textContent = 'Siguiente nivel'; ui.hint.textContent = 'TU PRÓXIMO VUELO TE ESPERA';
    ui.overlay.hidden = false; ui.play.focus({ preventScroll: true });
    ui.announcement.textContent = `¡Nivel ${level} completado! ${levelScore} puntos.`;
  }
  function nextLevel() {
    if (state !== 'victory') return;
    level++; levelScore = 0; pipes = []; spawn = 0.8; generated = 0; immune = 0;
    particles = []; sparkles = []; confetti = []; cat.y = 265; cat.vy = 0;
    state = 'transition'; resetDash(); speedNoticeTime = 2; ui.speedNotice.hidden = false; refreshHud();
    ui.title.classList.remove('victory-title');
    ui.eyebrow.textContent = 'UN NUEVO DESAFÍO'; ui.title.textContent = `NIVEL ${level}`;
    ui.message.textContent = `Objetivo: ${target()} puntos. Pulsa para despegar.`;
    ui.play.textContent = 'Despegar'; ui.hint.textContent = 'ESPACIO · CLIC · TOQUE';
    ui.announcement.textContent = `Nivel ${level}. Esperando para despegar.`;
  }
  refreshHud();
  function damage() {
    if (immune > 0 || dashRemaining > 0 || state !== 'playing') return;
    lives--; showLives(); state = 'hit'; dashReturn = 0; refreshDash(); hitRemaining = HIT_PAUSE;
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
    const safeX = cat.x + speed() * (INVULNERABILITY + 0.5);
    if (nearest < safeX) for (const p of upcoming) {
      p.x += safeX - nearest; if (p.coin) p.coin.x += safeX - nearest;
    }
    if (upcoming.length) {
      const farthest = Math.max(...upcoming.map(p => p.x));
      spawn = Math.max(spawn, (farthest - (W + 10)) / speed() + PIPE_INTERVAL);
    }
    cat.y = FLOOR * 0.46; cat.vy = IMPULSE * 0.6;
    immune = INVULNERABILITY; cat.x = CAT_HOME_X; state = 'playing'; refreshDash();
  }
  function flap() { cat.vy = IMPULSE; }
  function start() {
    level = 1; levelScore = 0; coinCount = 0; charges = 0; generated = 0; healTime = 0; sparkles = []; confetti = [];
    ui.title.classList.remove('victory-title');
    state = 'playing'; lives = MAX_LIVES; hitRemaining = 0; immune = 0; particles = []; showLives(); score = 0; pipes = []; spawn = 0.8; distance = 0;
    resetDash(); speedNoticeTime = 0; ui.speedNotice.hidden = true;
    cat.y = 265; cat.vy = 0; accumulator = 0;
    refreshHud(); ui.overlay.hidden = true;
    ui.announcement.textContent = 'Partida iniciada.';
    flap();
  }
  function end() {
    if (state !== 'hit') return;
    state = 'over'; refreshDash(); deathTime = performance.now();
    saveBest();
    ui.eyebrow.textContent = 'UN DESCANSO Y OTRO INTENTO';
    ui.title.innerHTML = 'Fin del<br><em>vuelo.</em>';
    ui.message.textContent = `Nivel ${level} · Total: ${score} · Monedas: ${coinCount} · Récord: ${best}`;
    ui.play.innerHTML = 'Volver a jugar <span>↗</span>';
    ui.hint.textContent = 'CADA SALTO ES UNA NUEVA OPORTUNIDAD';
    ui.overlay.hidden = false;
    ui.announcement.textContent = `Fin de la partida. ${score} puntos. Récord: ${best}.`;
    ui.play.focus({ preventScroll: true });
  }
  function action() {
    if (state === 'transition') { state = 'playing'; ui.overlay.hidden = true; refreshDash(); flap(); }
    else if (state === 'playing') flap();
    else if (state === 'ready' || (state === 'over' && performance.now() - deathTime > 350)) start();
  }
  ui.play.addEventListener('click', () => {
    if (state === 'victory') nextLevel();
    else if (state === 'transition') action();
    else if (state === 'ready' || state === 'over') start();
  });
  ui.dash.addEventListener('click', activateDash);
  refreshDash();
  canvas.addEventListener('pointerdown', event => { event.preventDefault(); action(); });
  window.addEventListener('keydown', event => {
    if (event.repeat) return;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') { event.preventDefault(); activateDash(); return; }
    if (event.code !== 'Space') return;
    if (state === 'victory' && document.activeElement === ui.play) return;
    event.preventDefault(); action();
  });
  document.addEventListener('visibilitychange', () => { last = null; accumulator = 0; });

  function update(dt) {
    clock += dt;
    for (const ghost of dashTrail) ghost.time -= dt;
    dashTrail = dashTrail.filter(ghost => ghost.time > 0);
    if (state === 'playing') {
      speedNoticeTime = Math.max(0, speedNoticeTime - dt);
      ui.speedNotice.hidden = speedNoticeTime <= 0;
    }
    healTime = Math.max(0, healTime - dt);
    for (const effect of sparkles) effect.time -= dt;
    sparkles = sparkles.filter(effect => effect.time > 0);
    if (state === 'victory') {
      const active = Math.min(dt, Math.max(0, VICTORY_DURATION - victoryTime));
      victoryTime = Math.min(VICTORY_DURATION, victoryTime + dt);
      for (const p of confetti) { p.x += p.vx * active; p.y += p.vy * active; }
      return;
    }
    if (state === 'hit') {
      hitRemaining = Math.max(0, hitRemaining - dt);
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt; }
      if (hitRemaining <= 0) { useCharges(); if (lives === 0) end(); else recover(); }
      return;
    }
    if (state !== 'playing') return;
    immune = Math.max(0, immune - dt);
    const dashing = dashRemaining > 0;
    if (dashing) {
      const progress = Math.min(1, (DASH_DURATION - dashRemaining + dt) / DASH_DURATION);
      cat.x = CAT_HOME_X + Math.min(DASH_DISTANCE, W - CAT_HOME_X - 35) * Math.sin(progress * Math.PI / 2);
      dashTrail.push({ x: cat.x, y: cat.y, time: 0.22 });
    } else if (dashReturn > 0) {
      dashReturn = Math.max(0, dashReturn - dt);
      const t = 1 - dashReturn / DASH_RETURN;
      cat.x = dashReturnX + (CAT_HOME_X - dashReturnX) * t * t * (3 - 2 * t);
    }
    const relativeFactor = dashing ? DASH_SCROLL_FACTOR : 1;
    distance += speed() * relativeFactor * dt;
    cat.vy += GRAVITY * dt; cat.y += cat.vy * dt;
    spawn -= dt * relativeFactor;
    if (spawn <= 0) {
      const pipe = { x: W + 10, top: 95 + Math.random() * 230, passed: false };
      generated++;
      if (generated % COIN_EVERY === 0) pipe.coin = { x: pipe.x + PIPE_WIDTH / 2,
        y: pipe.top + GAP / 2 + (Math.random() - 0.5) * 40, collected: false };
      pipes.push(pipe);
      spawn += PIPE_INTERVAL;
    }
    for (const pipe of pipes) {
      pipe.x -= speed() * relativeFactor * dt; if (pipe.coin) pipe.coin.x -= speed() * relativeFactor * dt;
    }
    // A compact hitbox keeps the decorative tail and ears forgiving.
    const left = cat.x - 14, right = cat.x + 14, top = cat.y - 14, bottom = cat.y + 15;
    if (!dashing && immune <= 0 && (top <= 0 || bottom >= FLOOR || pipes.some(p => right > p.x - 5 && left < p.x + PIPE_WIDTH + 5 && (top < p.top || bottom > p.top + GAP)))) {
      damage(); return;
    }
    if (immune > 0 || dashing) {
      cat.y = Math.max(15, Math.min(FLOOR - 16, cat.y));
      if (cat.y === 15 || cat.y === FLOOR - 16) cat.vy = 0;
    }
    for (const pipe of pipes) {
      if (pipe.coin && !pipe.coin.collected && Math.abs(cat.x - pipe.coin.x) < 14 + COIN_RADIUS && Math.abs(cat.y - pipe.coin.y) < 15 + COIN_RADIUS) collectCoin(pipe.coin);
      if (!pipe.passed && pipe.x + PIPE_WIDTH + 5 < left) {
        pipe.passed = true; score++; levelScore++; refreshHud(); saveBest();
        if (levelScore >= target()) { victory(); return; }
      }
    }
    pipes = pipes.filter(p => p.x > -PIPE_WIDTH - 10);
    if (dashing) {
      dashRemaining = Math.max(0, dashRemaining - dt);
      if (dashRemaining < 1e-9) finishDash();
      else refreshDash();
    }
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
    const y = state === 'victory' ? cat.y - Math.abs(Math.sin(victoryTime * Math.PI * 4)) * 22 : state === 'ready' ? cat.y + Math.sin(clock * 3) * 7 : cat.y;
    ctx.save();
    if ((state === 'hit' && Math.floor(hitRemaining * 24) % 2) || (immune > 0 && Math.floor(immune * 12) % 2)) ctx.globalAlpha = 0.35;
    ctx.translate(cat.x + (state === 'hit' ? Math.sin(hitRemaining * 65) * 4 : 0), y);
    ctx.rotate(dashRemaining > 0 ? 0 : state === 'playing' ? Math.max(-0.35, Math.min(0.9, cat.vy / 750)) : -0.08);
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
    pipes.forEach(drawPipe);
    for (const pipe of pipes) {
      const c = pipe.coin;
      if (!c || c.collected) continue;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(0.35 + Math.abs(Math.cos(clock * 4)) * 0.65, 1);
      rect(-8, -11, 16, 22, '#bd8738'); rect(-11, -7, 22, 14, '#bd8738');
      rect(-7, -8, 14, 16, '#ffcf70'); rect(-3, -5, 4, 10, '#fff4ce'); ctx.restore();
    }
    for (const ghost of dashTrail) {
      ctx.globalAlpha = ghost.time / 0.22 * 0.35;
      rect(ghost.x - 20, ghost.y - 12, 32, 25, '#b4f4ee');
      rect(ghost.x - 55, ghost.y - 6, 28, 3, '#ffcf70');
    }
    ctx.globalAlpha = 1;
    if (dashRemaining > 0) {
      const flash = DASH_DURATION - dashRemaining < 0.12;
      ctx.globalAlpha = flash ? 0.75 : 0.4;
      rect(cat.x - 22, cat.y - 22, 45, 4, '#def2df');
      rect(cat.x + 23, cat.y - 18, 4, 35, '#def2df');
      rect(cat.x - 22, cat.y + 20, 45, 4, '#ffcf70');
      for (let i = 0; i < 4; i++) rect(cat.x - 40 - i * 12 - (clock * 110 % 12), cat.y - 15 + i * 10, 24, 3, '#def2df');
      ctx.globalAlpha = 1;
    }
    drawCat();
    rect(0, FLOOR, W, 6, '#35574a'); rect(0, FLOOR + 6, W, 12, '#a2cf74');
    rect(0, FLOOR + 18, W, 5, '#698b4f'); rect(0, FLOOR + 23, W, H - FLOOR - 23, '#dec591');
    for (let i = -1; i < Math.ceil(W / 22) + 1; i++) {
      const x = i * 22 - distance % 22;
      rect(x, FLOOR + 7, 10, 4, '#d5e69a'); rect(x + 8, FLOOR + 35, 5, 4, '#b69c75');
      rect(x, FLOOR + 56, 7, 3, '#c1a77c');
    }
    for (const effect of sparkles) {
      ctx.globalAlpha = effect.time / 0.45;
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4, radius = (0.45 - effect.time) * 100;
        rect(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius, 4, 4, '#ffcf70');
      }
      ctx.globalAlpha = 1;
    }
    if (healTime > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, healTime * 3);
      ctx.font = 'bold 24px monospace'; ctx.fillStyle = '#f39598';
      ctx.fillText('♥ +1', cat.x - 25, cat.y - 35 - (0.8 - healTime) * 35); ctx.restore();
    }
    if (state === 'victory') for (const p of confetti) rect(p.x, p.y, 5, 7, p.color);
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
