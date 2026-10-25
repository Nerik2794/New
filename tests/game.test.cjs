// Dependency-free simulation tests: expose closure state only inside the VM copy.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function game() {
  const nodes = {};
  const node = id => nodes[id] ||= { textContent: '', hidden: false, children: [],
    setAttribute() {}, addEventListener() {}, focus() {}, replaceChildren(...items) { this.children = items; } };
  const context = new Proxy({}, { get: () => () => {} });
  Object.assign(node('game'), { width: 432, height: 640, getContext: () => context });
  const storage = new Map();
  const sandbox = { document: { getElementById: node, createElement: () => node(Math.random()), addEventListener() {} },
    window: { addEventListener() {} }, localStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) },
    performance: { now: () => 1000 }, requestAnimationFrame() {}, Math };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../game.js'), 'utf8')
    .replace('  requestAnimationFrame(frame);\n})();', `  globalThis.testGame = {
      start, update, render, action, frame, cat,
      get data() { return {state, lives, score, immune, distance, spawn, pipes, W, H, FLOOR, GAP, PIPE_WIDTH, WORLD_SCALE}; },
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
