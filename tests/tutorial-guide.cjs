'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let now = 1000;
const nodes = new Map();
function node(id) {
  if (nodes.has(id)) return nodes.get(id);
  const classes = new Set(['hidden']);
  const el = { id, open: false, complete: true, naturalWidth: 1774, hidden: false, disabled: false,
    listeners: {}, style: { setProperty() {} },
    classList: { add: n => classes.add(n), remove: n => classes.delete(n), contains: n => classes.has(n) },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute() {}, focus() {}, querySelector: () => node('content'),
    showModal() { this.open = true; }, close() { this.open = false; } };
  nodes.set(id, el); return el;
}
const c = vm.createContext({ document: { getElementById: node }, performance: { now: () => now } });
const Guide = vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/tutorial-guide.js'), 'utf8') + ';TutorialGuide', c);
let starts = 0, resumes = 0;
const g = { state: 'TITLE', assetsLoaded: true, mobilePortrait: false, isMobilePhoneActive: false,
  player: { hp: 73 }, survivalTime: 0, canvas: node('canvas'), keys: {},
  clearInputState() { this.keys = {}; }, mobileUI: { syncVisibility() {} },
  refreshPresentationState() { guide.refreshStartButton(); },
  startGame() { starts++; this.state = 'PLAYING'; },
  sound: { resumeCurrentBGM() { resumes++; } } };
const guide = new Guide(g);
const next = () => { now += 250; guide.advance(1); };

// START後に待っても開始しない。連打でページや最終確認を飛ばさない。
guide.open();
assert.equal(guide.isOpen, true);
assert.equal(g.state, 'TITLE');
guide.advance(1); assert.equal(guide.page, 0);
next(); guide.advance(1); assert.equal(guide.page, 1);
now += 250; guide.advance(-1); assert.equal(guide.page, 0);
next(); next(); next();
assert.equal(guide.page, 3); assert.equal(starts, 0);
guide.advance(1); assert.equal(starts, 0);
next();
assert.equal(starts, 1); assert.equal(guide.isOpen, false);
assert.equal(g.keys && Object.keys(g.keys).length, 0);

// 説明の再読は再出撃させず、HP・時間を保って戻す。
g.survivalTime = 40; guide.open();
assert.equal(guide.page, 0);
next(); next(); next(); next();
assert.equal(starts, 1); assert.equal(resumes, 1);
assert.equal(g.player.hp, 73); assert.equal(g.survivalTime, 40);

// 縦回転中は最後の開始だけ止め、横へ戻せば同じページから開始できる。
g.state = 'TITLE'; guide.open(); next(); next(); next();
g.mobilePortrait = true; guide.refreshStartButton();
assert.equal(guide.next.disabled, true);
next(); assert.equal(starts, 1); assert.equal(guide.isOpen, true);
g.mobilePortrait = false; guide.refreshStartButton();
assert.equal(guide.next.disabled, false);
next(); assert.equal(starts, 2);

// 画像が読めなくても操作と文章を失わない。Escapeでは開始しない。
g.state = 'TITLE'; guide.open();
guide.image.listeners.error();
assert.equal(guide.art.hidden, true);
assert.equal(node('guide-fallback').hidden, false);
assert.match(node('guide-fallback').textContent, /ジョイスティック/);
next(); assert.match(node('guide-fallback').textContent, /自動で攻撃/);
guide.dialog.listeners.cancel({ preventDefault() {} });
assert.equal(guide.isOpen, false); assert.equal(starts, 2);
assert.equal(g.state, 'TITLE');
console.log('Tutorial guide passed: explicit start, 4 pages, repeated taps, resume, rotation, image fallback and Escape');
