'use strict';
// 実際の成長表・更新処理を使い、隠し取得、同行枠、斬撃の方向と停止を確認する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const node = () => ({ classList: { toggle() {}, add() {}, remove() {}, contains: () => true },
  style: {}, getContext: () => ({}), querySelector: () => null, textContent: '', width: 880, height: 495 });
const nodes = new Map();
const c = vm.createContext({ console, performance,
  Image: class { constructor() { this.complete = true; this.naturalWidth = this.naturalHeight = 1254; } },
  window: { addEventListener() {}, screen: { width: 1440, height: 900 }, matchMedia: () => ({ matches: false }) },
  navigator: { maxTouchPoints: 0 },
  document: { hidden: false, body: node(), getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); } },
  SoundSystem: class { constructor() { return new Proxy({}, { get: () => () => {} }); } },
  setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame() {} });
for (const file of ['balance.js', 'constants.js', 'enemy-tactics.js', 'kimie.js', 'game.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), c);
}
const Game = vm.runInContext('AsaichiGame', c);
const kimie = vm.runInContext('Kimie', c);
Game.prototype.initEvents = function() {};
Game.prototype.loadAssets = function() { this.assetsLoaded = true; };
function fresh() { const g = new Game(); g.startGame(); return g; }
function unlock(g) {
  Object.assign(g.player, { x: kimie.shrine.x, y: kimie.shrine.y });
  kimie.updateDiscovery(g, 0, g.player.x, g.player.y);
}

// 通常の上移動だけで最上段へ到達。通路外には広げない。
{
  const g = fresh();
  g.keys.ArrowRight = true;
  for (let frame = 0; frame < 5; frame++) g.update(1 / 60);
  g.keys = {};
  g.keys.ArrowUp = true;
  for (let frame = 0; frame < 90; frame++) g.update(1 / 60);
  assert.equal(g.player.character, 'kimie');
  assert.ok(g.player.y <= 96);
  assert.equal(g.kittens.length, 1);
  assert.equal(g.kittens[0].isCompanion, true);
  assert.equal(g.isPointWalkable(600, 200), false);
  assert.equal(g.isPointWalkable(770, 200), false);
  g.keys = { ArrowDown: true };
  for (let frame = 0; frame < 90; frame++) g.update(1 / 60);
  assert.ok(g.player.y > 530);
  assert.ok(g.kittens[0].y < g.player.y, '同行ミケは下向き移動の後ろ');
  g.keys = {};
  for (let frame = 0; frame < 90; frame++) g.update(1 / 60);
  assert.ok(g.player.y - g.kittens[0].y > 20, '停止してもミケと重ならない');
}

// 接触限定。高速通過は拾えるが、近く・戦闘後・画像失敗時には交換しない。
{
  const g = fresh();
  Object.assign(g.player, { x: 720, y: 74 });
  kimie.updateDiscovery(g, 0.1, 720, 74);
  assert.equal(g.player.character, 'mike');
  g.player.x = 650;
  kimie.updateDiscovery(g, 0.1, 730, 74);
  assert.equal(g.player.character, 'kimie');
  kimie.updateDiscovery(g, 0.1, 730, 74);
  assert.equal(g.kittens.length, 1);
  for (const prepare of [g => { g.survivalTime = 15; }, g => g.startBattle(),
    g => { g.images.kimie.naturalWidth = 0; }]) {
    const locked = fresh(); prepare(locked); unlock(locked);
    assert.equal(locked.player.character, 'mike');
    assert.equal(locked.kittens.length, 0);
  }
}

// 成長表が共通で、初期ミケだけ常に1匹多い。重複適用・再挑戦も安全。
{
  const normal = fresh(), secret = fresh();
  secret.player.hp = 73; secret.player.exp = 4;
  unlock(secret);
  assert.deepEqual([secret.player.hp, secret.player.exp], [73, 4]);
  for (let level = 2; level <= 12; level++) {
    for (const g of [normal, secret]) { g.player.level = level; g.applyAutomaticEvolution(level); }
    const count = Math.min(3, Math.floor(level / 3));
    assert.equal(normal.kittens.length, count);
    assert.equal(secret.kittens.length, count + 1);
    assert.equal(secret.skills.scratch.level, normal.skills.scratch.level);
    assert.equal(secret.skills.bonito.level, normal.skills.bonito.level);
  }
  secret.applyAutomaticEvolution(9);
  assert.equal(secret.kittens.length, 4);
  secret.player.daikonSwing = { angle: 0, age: 0.1 };
  secret.state = 'RESULT'; secret.startGame();
  assert.equal(secret.player.character, 'mike');
  assert.equal(secret.kittens.length, 0);
  assert.equal(secret.player.daikonSwing, null);
  assert.equal(kimie.canDiscover(secret), true);
}

// 120度の前方だけに一度ずつ命中。背後・範囲外・通常ミケは対象外。
{
  const g = fresh(); unlock(g);
  Object.assign(g.player, { x: 688, y: 590, aimAngle: 0, dir: 'right' });
  g.survivalTime = 20; g.firstYankeeEventDone = true;
  const targets = [0, 60, -60, 61, -61, 180].map(deg => ({ type: 'tsuppari', hp: 200,
    x: g.player.x + Math.cos(deg * Math.PI / 180) * 65,
    y: g.player.y + Math.sin(deg * Math.PI / 180) * 65 }));
  targets.push({ type: 'tsuppari', hp: 200, x: g.player.x + 91, y: g.player.y });
  g.enemies = targets;
  kimie.updateAttack(g, 0.01);
  assert.ok(targets.slice(0, 3).every(e => e.hp < 200));
  assert.ok(targets.slice(3).every(e => e.hp === 200));
  const hp = targets.map(e => e.hp);
  kimie.updateAttack(g, 0.1);
  assert.deepEqual(targets.map(e => e.hp), hp);
  g.player.character = 'mike'; g.player.daikonCooldown = 0;
  kimie.updateAttack(g, 1);
  assert.deepEqual(targets.map(e => e.hp), hp);
}

// 8方向の移動を斬撃方向へ反映し、通常爪撃の自動照準に上書きさせない。
{
  const g = fresh(); unlock(g);
  Object.assign(g.player, { x: 688, y: 590 });
  for (const [x, y] of [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]) {
    g.joystickVector = { x, y }; g.updatePlayer(1 / 60);
    assert.ok(Math.abs(g.player.aimAngle - Math.atan2(y, x)) < 1e-8);
    const angle = g.player.aimAngle, p = g.player;
    const front = { x: p.x + x * 40, y: p.y + y * 40, hp: 100 };
    const back = { x: p.x - x * 40, y: p.y - y * 40, hp: 100 };
    assert.equal(kimie.isInSlash(p, front, angle), true);
    assert.equal(kimie.isInSlash(p, back, angle), false);
  }
  g.joystickVector = { x: 0, y: 0 }; g.updatePlayer(1 / 60);
  const angle = g.player.aimAngle, dir = g.player.dir;
  g.enemies = [{ x: g.player.x - 60, y: g.player.y, hp: 100 }];
  g.fireAutoScratch(1);
  assert.equal(g.player.aimAngle, angle);
  assert.equal(g.player.dir, dir);
  assert.ok(g.projectiles.length > 0, '通常爪撃も継続');
  g.skills.bonito.level = 1; g.fireBonitoBoomerang(1);
  assert.ok(g.projectiles.some(p => p.type === 'bonito_throw'));
}

// ポーズ、縦回転、カットイン中は斬撃・隠し取得・ゲーム時間が進まない。
for (const block of [g => { g.mobileUI = { isPaused: true }; },
  g => { g.mobilePortrait = true; }, g => { g.eventState = 'YANKEE'; }]) {
  const g = fresh(); unlock(g);
  g.player.daikonSwing = { angle: 0, age: 0.1 }; g.player.daikonCooldown = 0.4;
  const time = g.survivalTime; block(g); g.update(0.2);
  assert.equal(g.player.daikonSwing.age, 0.1);
  assert.equal(g.player.daikonCooldown, 0.4);
  assert.equal(g.survivalTime, time);
  const waiting = fresh(); Object.assign(waiting.player, kimie.shrine); block(waiting); waiting.update(0.2);
  assert.equal(waiting.player.character, 'mike');
}
console.log('Kimie regression passed: stair access, contact unlock, 1→4 companions, shared evolution, 120° slash, facing, pause and restart');
