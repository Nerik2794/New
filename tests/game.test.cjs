// Dependency-free simulation tests: expose closure state only inside the VM copy.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function game() {
  const nodes = {};
  const node = id => nodes[id] ||= { textContent: '', hidden: false, children: [],
    classList: {add() {}, remove() {}}, setAttribute() {}, addEventListener() {}, focus() {}, replaceChildren(...items) { this.children = items; } };
  const context = new Proxy({}, { get: () => () => {} });
  Object.assign(node('game'), { width: 432, height: 640, getContext: () => context });
  const storage = new Map();
  const sandbox = { document: { getElementById: node, createElement: () => node(Math.random()), addEventListener() {} },
    window: { addEventListener() {} }, localStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) },
    performance: { now: () => 1000 }, requestAnimationFrame() {}, Math };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../game.js'), 'utf8')
    .replace('  requestAnimationFrame(frame);\n})();', `  globalThis.testGame = {
      start, update, render, action, frame, cat, collectCoin, nextLevel, victory,
      get data() { return {state, lives, score, level, levelScore, coinCount, charges, victoryTime, confetti, immune, distance, spawn, pipes, W, H, FLOOR, GAP, PIPE_WIDTH, WORLD_SCALE}; },
      setPipes(value) { pipes = value; },
      setScore(value) { score = value; },
      setImmune(value) { immune = value; }
    };\n})();`);
  vm.runInNewContext(source, sandbox);
  return { g: sandbox.testGame, nodes, storage };
}
const advance = (g, seconds) => { for(let t=0;t<Math.round(seconds*120);t++) g.update(1/120); };
test('three lives, impact freeze, safe recovery, immunity, preserved score and delayed Game Over', () => {
  const {g,nodes,storage} = game(); g.start(); g.setScore(7);
  assert.equal(g.data.lives,3); assert.equal(nodes.lives.children.length,3);
  for(let remaining=2;remaining>=0;remaining--) {
    g.setImmune(0); g.cat.y=1; g.update(1/120);
    assert.equal(g.data.lives,remaining); assert.equal(g.data.state,'hit');
    const distance=g.data.distance;
    g.action(); advance(g,.3);
    assert.equal(g.data.distance,distance); assert.equal(g.data.lives,remaining);
    assert.equal(nodes.overlay.hidden,true);
    advance(g,.12);
    assert.equal(g.data.score,7);
    if(remaining) {
      assert.equal(g.data.state,'playing'); assert.ok(g.data.immune>1.4);
      for(let i=0;i<100;i++){g.cat.y=1;g.update(1/120)}
      assert.equal(g.data.lives,remaining);
    }
  }
  assert.equal(g.data.state,'over'); assert.equal(nodes.overlay.hidden,false);
  assert.equal(storage.get('gato-al-vuelo-best'),'7');
  g.start(); assert.equal(g.data.lives,3); assert.equal(g.data.score,0);
});
test('floor and pipe cap collisions use world dimensions; safe obstacle relocation', () => {
  const {g}=game();g.start();g.cat.y=g.data.FLOOR;g.update(1/120);assert.equal(g.data.lives,2);
  g.setPipes([{x:100,top:210,passed:false},{x:372,top:200,passed:false}]);advance(g,.42);
  assert.ok(g.data.pipes[0].x>g.cat.x+300);
  assert.equal(Math.round(g.data.pipes[1].x-g.data.pipes[0].x),272);
  g.setImmune(0); g.cat.y=210-10;
  g.setPipes([{x:g.cat.x+17,top:210,passed:false}]);g.update(1/120);
  assert.equal(g.data.lives,1,'cap overhang counts as collision');
  assert.equal(g.data.PIPE_WIDTH,54); assert.equal(g.data.GAP,174);
  assert.equal(g.data.WORLD_SCALE,.85); assert.ok(g.data.W>500);
});
test('generation, scoring once, and fixed timestep at 30/60/120 FPS', () => {
  const {g}=game();g.start();advance(g,.85);assert.equal(g.data.pipes.length,1);
  g.setPipes([{x:20,top:200,passed:false}]);g.cat.y=280;g.update(1/120);g.update(1/120);assert.equal(g.data.score,1);
  const results=[30,60,120].map(fps=>{
    const {g}=game();g.start();g.frame(0);for(let i=1;i<=fps/2;i++)g.frame(i*1000/fps);
    return g.cat.y;
  });
  assert.ok(Math.max(...results)-Math.min(...results)<4);
});
test('coins collected once, banked rewards, maximum lives and last-life rescue', () => {
  const {g}=game();g.start();
  const coin={x:108,y:265,collected:false};g.collectCoin(coin);g.collectCoin(coin);assert.equal(g.data.coinCount,1);
  for(let i=0;i<29;i++)g.collectCoin({x:108,y:265,collected:false});
  assert.equal(g.data.coinCount,30);assert.equal(g.data.charges,3);assert.equal(g.data.lives,3);
  for(let i=0;i<3;i++){
    g.setImmune(0);g.cat.y=1;g.update(1/120);advance(g,.42);
    assert.equal(g.data.lives,3);assert.equal(g.data.charges,2-i);
  }
  g.setImmune(0);g.cat.y=1;g.update(1/120);advance(g,.42);assert.equal(g.data.lives,2);
  for(let i=0;i<10;i++)g.collectCoin({x:108,y:265,collected:false});
  assert.equal(g.data.lives,3);assert.equal(g.data.charges,0);
});
function passPipe(g){
  g.cat.y=280;g.cat.vy=0;g.setPipes([{x:20,top:200,passed:false}]);g.update(1/120);
}
test('exact targets, single victory, frozen obstacles, explicit transition and conserved totals', () => {
  const {g,storage}=game();g.start();
  g.cat.y=1;g.update(1/120);advance(g,.42);
  for(let i=0;i<12;i++)g.collectCoin({x:108,y:265,collected:false});
  for(let i=0;i<14;i++)passPipe(g);
  assert.equal(g.data.state,'playing');assert.equal(g.data.levelScore,14);
  passPipe(g);assert.equal(g.data.state,'victory');assert.equal(g.data.score,15);
  const confetti=g.data.confetti, distance=g.data.distance, spawn=g.data.spawn;
  g.victory();assert.equal(g.data.confetti,confetti);advance(g,5);
  assert.equal(g.data.distance,distance);assert.equal(g.data.spawn,spawn);assert.equal(g.data.victoryTime,1.5);
  g.action();assert.equal(g.data.state,'victory');
  const lives=g.data.lives, coins=g.data.coinCount, charges=g.data.charges;
  g.nextLevel();assert.equal(g.data.state,'transition');assert.equal(g.data.level,2);
  assert.equal(g.data.levelScore,0);assert.equal(g.data.score,15);assert.equal(g.data.lives,lives);
  assert.equal(g.data.coinCount,coins);assert.equal(g.data.charges,charges);assert.equal(g.data.pipes.length,0);
  advance(g,2);assert.equal(g.data.pipes.length,0);g.action();assert.equal(g.data.state,'playing');
  for(let i=0;i<19;i++)passPipe(g);assert.equal(g.data.state,'playing');
  passPipe(g);assert.equal(g.data.state,'victory');assert.equal(g.data.score,35);
  assert.equal(storage.get('gato-al-vuelo-best'),'35');
});
test('coin placement, physical pickup, and collision precedence over scoring', () => {
  const {g}=game();g.start();advance(g,.85);
  const p=g.data.pipes[0];assert.ok(p.coin.y-11>p.top);assert.ok(p.coin.y+11<p.top+g.data.GAP);
  g.cat.y=280;g.cat.vy=0;g.setPipes([{x:90,top:200,passed:false,coin:{x:108,y:280,collected:false}}]);
  g.update(1/120);assert.equal(g.data.coinCount,1);g.update(1/120);assert.equal(g.data.coinCount,1);
  g.setImmune(0);g.cat.y=1;g.setPipes([{x:20,top:200,passed:false}]);g.update(1/120);
  assert.equal(g.data.state,'hit');assert.equal(g.data.score,0);
});
