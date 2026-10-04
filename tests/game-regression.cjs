'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const gameContext = vm.createContext({
  console,
  window: { addEventListener() {}, screen: { width: 1440, height: 900 }, matchMedia: () => ({ matches: false }) },
  navigator: { maxTouchPoints: 0 },
  document: { hidden: false, body: { classList: { toggle() {} } }, getElementById: () => null },
  performance: { now: () => 0 },
  requestAnimationFrame() { return 1; },
  setTimeout() { return 1; },
  clearTimeout() {},
  LEVEL_EVOLUTION: [null, { apply() {} }]
});
vm.runInContext(fs.readFileSync(path.join(root, 'js/balance.js'), 'utf8'), gameContext);
vm.runInContext(fs.readFileSync(path.join(root, 'js/enemy-tactics.js'), 'utf8'), gameContext);
vm.runInContext(fs.readFileSync(path.join(root, 'js/kimie.js'), 'utf8'), gameContext);
vm.runInContext(`${fs.readFileSync(path.join(root, 'js/game.js'), 'utf8')}\nglobalThis.__AsaichiGame = AsaichiGame;`, gameContext);
const AsaichiGame = gameContext.__AsaichiGame;

function makeGame(overrides = {}) {
  const game = Object.create(AsaichiGame.prototype);
  Object.assign(game, {
    state: 'PLAYING',
    mobilePortrait: false,
    isVictoryClear: false,
    keys: {},
    mouseInput: { active: false, x: 0, y: 0, isDown: false },
    joystickVector: { x: 0, y: 0 },
    touchDash: false,
    meowWaves: [],
    survivalTime: 20,
    killCount: 0,
    lastEnemyDropSec: 20,
    dropItems: [],
    enemies: [],
    player: { x: 0, y: 0, hp: 100, invincibleTimer: 5, shieldBuffTimer: 0 },
    npcSpots: [],
    screenShake: 0,
    skills: { meow: { level: 1 } },
    sound: {
      playEnemyDefeat() {}, playKyonSound() {}, playMeowRoar() {}, playHit() {},
      stopBGM() {}, resumeCurrentBGM() {}, playVictoryFanfare() {}, playTaiko() {}
    },
    addParticle() {},
    addComicPopup() {},
    addExp() {},
    isInsideForbiddenArea: () => false,
    worldW: 1376,
    worldH: 768,
    isPointWalkable: () => true,
    viewW: 880,
    viewH: 495,
    camera: { x: 0, y: 0 },
    ...overrides
  });
  return game;
}

// タブ切替・回転時の入力解除は、押下状態とポインター識別子の両方を消す。
{
  let pointersCancelled = false;
  const game = makeGame({
    keys: { ArrowUp: true },
    mouseInput: { active: true, x: 12, y: 24, isDown: true },
    joystickVector: { x: 1, y: -0.5 },
    touchDash: true,
    cancelInputPointers: () => { pointersCancelled = true; }
  });
  game.clearInputState();
  assert.equal(pointersCancelled, true);
  assert.deepEqual(Object.keys(game.keys), []);
  assert.equal(game.mouseInput.active, false);
  assert.equal(game.mouseInput.isDown, false);
  assert.deepEqual([game.joystickVector.x, game.joystickVector.y], [0, 0]);
  assert.equal(game.touchDash, false);
}

// 敵は撃破後に配列から除かれ、同じ参照への二度目の命中で報酬を重複付与しない。
{
  let exp = 0;
  const enemy = { x: 50, y: 50, hp: 10, type: 'tsuppari', isBoss: false };
  const game = makeGame({ enemies: [enemy], addExp: (amount) => { exp += amount; } });
  assert.equal(game.damageEnemy(enemy, 10), true);
  assert.equal(game.damageEnemy(enemy, 10), false);
  assert.equal(game.killCount, 1);
  assert.equal(exp, 1);
  assert.equal(game.enemies.length, 0);
}

// 範囲攻撃が配列を縮めても、対象だった敵を全員一度ずつ処理する。
{
  let exp = 0;
  const enemies = [0, 1, 2].map((i) => ({ x: 20 + i * 10, y: 0, hp: 1, type: 'tsuppari', isBoss: false }));
  const game = makeGame({ enemies, addExp: (amount) => { exp += amount; } });
  game.fireMeowShockwave(1);
  assert.equal(game.killCount, 3);
  assert.equal(exp, 3);
  assert.equal(game.enemies.length, 0);
}

// わらび餅は初回・再取得とも援護だけ。防御力・接触反射は付与しない。
{
  const game = makeGame({ player: { x: 0, y: 0, hp: 100, invincibleTimer: 0 },
    assistCutinSeen: { noraneko: false }, assistCutinQueue: [], assistCutin: null,
    sound: { playAssistCutinSE() {}, playCatHiss() {}, playDamage() {} }, addDamageNumber() {} });
  let allies = 0;
  game.spawnAllyCat = () => allies++;
  game.collectItem({ type: 'warabi' });
  assert.equal(game.assistCutin.type, 'noraneko');
  game.endAssistCutin();
  game.collectItem({ type: 'warabi' });
  assert.equal(allies, 2);
  assert.equal(game.player.shieldBuffTimer, undefined);
  const enemy = { x: 0, y: 0, hp: 100, atk: 9, speed: 0, isFlying: true };
  game.enemies = [enemy];
  game.updateEnemies(0);
  assert.equal(game.player.hp, 91, 'item collection must not prevent contact damage');
  assert.equal(enemy.hp, 100, 'contact must not reflect shield damage');
}

// メニューを開いている間、戦闘時間・被弾処理を進めない。
{
  const game = makeGame({ mobileUI: { isPaused: true } });
  const time = game.survivalTime;
  game.update(1);
  assert.equal(game.survivalTime, time);
  assert.equal(game.isGameInputBlocked(), true);
}

// お助け描画は専用画像を使用し、ミケのシートへ戻らない。
{
  const draws = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'drawImage' ? (...args) => draws.push(args) : () => {} });
  const allyCat = { complete: true, naturalWidth: 1044, naturalHeight: 377 };
  const game = makeGame({ images: { allyCat, cat: {} } });
  game.drawAllyCat(ctx, { x: 0, y: 0, scale: 1.35, dir: 'left', animFrame: 2 });
  assert.equal(draws.length, 1);
  assert.equal(draws[0][0], allyCat);
  assert.deepEqual(draws[0].slice(1, 5), [522, 80, 261, 220]);
}

// 助っ人を30秒待っても自動出撃せず、待ち行列は新しい入力ごとに1枚ずつ進む。
{
  const game = makeGame({ eventState: 'NONE', assistCutin: null, assistCutinQueue: [],
    sound: { playAssistCutinSE() {} }, updateCamera() {} });
  const startedActions = [];
  game.spawnAllyCat = () => startedActions.push('noraneko');
  game.triggerTandemBikeRush = () => startedActions.push('tandem');
  game.triggerAssistCutin('noraneko', 'ノラネコ');
  game.triggerAssistCutin('tandem', 'タンデム');
  assert.equal(game.assistCutin.type, 'noraneko');
  assert.deepEqual(game.assistCutinQueue.map((item) => item.type), ['tandem']);
  const time = game.survivalTime;
  assert.equal(game.continueCutin(), false, 'opening lockout prevents accidental dismissal');
  for (let i = 0; i < 60; i++) game.update(0.5);
  assert.equal(game.assistCutin.type, 'noraneko');
  assert.deepEqual(startedActions, [], 'time alone must not summon an ally');
  assert.equal(game.continueCutin(), true);
  assert.deepEqual(startedActions, ['noraneko']);
  assert.equal(game.assistCutin.type, 'tandem');
  assert.equal(game.continueCutin(), false, 'the next cut-in requires a fresh input after its lockout');
  for (let i = 0; i < 60; i++) game.update(0.5);
  assert.equal(game.assistCutin.type, 'tandem');
  assert.deepEqual(startedActions, ['noraneko']);
  assert.equal(game.survivalTime, time, 'all waiting time is excluded from battle time');
  assert.equal(game.continueCutin(), true);
  assert.deepEqual(startedActions, ['noraneko', 'tandem']);
  assert.equal(game.assistCutin, null);
}

// ヤンキー・キョンの登場も30秒待ち続け、明示入力だけで戦闘へ戻る。
{
  for (const eventState of ['YANKEE', 'KYON']) {
    const enemy = { x: 100, y: 100, hp: 10 };
    const game = makeGame({ eventState, eventTimer: 0, eventLockoutTimer: 0.5,
      enemies: [enemy], updateCamera() {} });
    const time = game.survivalTime;
    assert.equal(game.continueCutin(), false);
    for (let i = 0; i < 60; i++) game.update(0.5);
    assert.equal(game.eventState, eventState);
    assert.equal(game.survivalTime, time);
    assert.deepEqual(enemy, { x: 100, y: 100, hp: 10 });
    assert.equal(game.continueCutin(), true);
    assert.equal(game.eventState, 'NONE');
    assert.equal(game.continueCutin(), false, 'one input completes the event exactly once');
  }
}

// 一時停止・縦向き・回転復帰待ちでは続行不可。再開時に押下状態を持ち越さない。
{
  const game = makeGame({ eventState: 'KYON', eventTimer: 1, eventLockoutTimer: 0,
    keys: { ArrowUp: true }, mouseInput: { active: true, isDown: true },
    mobileUI: { isPaused: true } });
  assert.equal(game.continueCutin(), false);
  game.mobileUI.isPaused = false;
  game.mobilePortrait = true;
  assert.equal(game.continueCutin(), false);
  game.mobilePortrait = false;
  game.orientationResumeRequired = true;
  assert.equal(game.continueCutin(), false);
  game.orientationResumeRequired = false;
  assert.equal(game.continueCutin(), true);
  assert.deepEqual(Object.keys(game.keys), []);
  assert.equal(game.mouseInput.active, false);
  assert.equal(game.mouseInput.isDown, false);
}

// 説明画面の「タイトルへ戻る」はゲーム状態・音・タイトル表示を一緒に戻す。
{
  const originalGetElementById = gameContext.document.getElementById;
  const makeNode = (hidden = false) => {
    const names = new Set(hidden ? ['hidden'] : []);
    return {
      classList: {
        add: (name) => names.add(name),
        remove: (name) => names.delete(name),
        contains: (name) => names.has(name)
      },
      style: {}
    };
  };
  const nodes = {
    'tutorial-overlay': makeNode(),
    'result-overlay': makeNode(),
    'levelup-overlay': makeNode(),
    'ui-header': makeNode(),
    'title-overlay': makeNode(true)
  };
  gameContext.document.getElementById = (id) => nodes[id] || null;
  let stopCalls = 0;
  const game = makeGame({
    state: 'PLAYING', runId: 4,
    sound: { stopBGM() { stopCalls++; } },
    refreshPresentationState() {}
  });
  game.returnToTitle();
  assert.equal(game.state, 'TITLE');
  assert.equal(game.runId, 5);
  assert.equal(stopCalls, 1);
  assert.equal(nodes['title-overlay'].classList.contains('hidden'), false);
  assert.equal(nodes['ui-header'].classList.contains('hidden'), true);
  gameContext.document.getElementById = originalGetElementById;
}

// 勝利確定後は同じ更新内のHP0で敗北へ反転せず、結果確定は二度走らない。
{
  let stopCalls = 0;
  const game = makeGame({
    state: 'PLAYING', isVictoryClear: true, runId: 7,
    sound: { stopBGM() { stopCalls++; } }
  });
  game.endGame(false);
  assert.equal(game.state, 'PLAYING');
  assert.equal(game.runId, 7);
  assert.equal(stopCalls, 0);

  const finished = makeGame({ state: 'RESULT', resultFinalizedForRun: true });
  finished.endGame(true);
  assert.equal(finished.state, 'RESULT');
}

// 敵の移動速度は30/60/120Hzで一致する。
function enemyTravelDistance(fps) {
  const enemy = { x: 1000, y: 1000, hp: 50, w: 32, speed: 2, isFlying: true, animTimer: 0, stunTimer: 0 };
  const game = makeGame({ enemies: [enemy], player: { x: 0, y: 0, invincibleTimer: 5, shieldBuffTimer: 0 } });
  for (let i = 0; i < fps; i++) game.updateEnemies(1 / fps);
  return Math.hypot(1000 - enemy.x, 1000 - enemy.y);
}
const travel = [30, 60, 120].map(enemyTravelDistance);
assert.ok(travel.every((distance) => Math.abs(distance - 120) < 0.01), `frame-rate-dependent travel: ${travel.join(', ')}`);

// 障害物の角で進めない敵を、最後の微小移動で歩行禁止区域へ押し出さない。
{
  const game = makeGame();
  game.isPointWalkable = (x, y) => x <= 10 && y <= 10;
  const enemy = { x: 10, y: 10 };
  game.moveEnemy(enemy, 2, 2);
  assert.deepEqual([enemy.x, enemy.y], [10, 10]);
}

// object-fit:contain の左右余白を引いて、黒帯の位置はゲーム入力に変換しない。
{
  const game = makeGame({
    canvas: {
      width: 880,
      height: 495,
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 844, height: 390 })
    }
  });
  const rect = game.canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / game.canvas.width, rect.height / game.canvas.height);
  const leftLetterbox = (rect.width - game.canvas.width * scale) / 2;
  const topLeft = game.getCanvasPoint(rect.left + leftLetterbox, rect.top);
  assert.ok(Math.abs(topLeft.x) < 0.001 && Math.abs(topLeft.y) < 0.001);
  assert.equal(game.getCanvasPoint(rect.left + 20, rect.top + 195), null);
  const center = game.getCanvasPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  assert.ok(Math.abs(center.x - 440) < 0.001 && Math.abs(center.y - 247.5) < 0.001);
}

// 縦持ちスマートフォンでは開始要求を受けてもタイトル状態のままにする。
{
  gameContext.navigator.maxTouchPoints = 1;
  gameContext.window.screen.width = 390;
  gameContext.window.screen.height = 844;
  gameContext.window.screen.orientation = { type: 'portrait-primary' };
  gameContext.document.body.classList.toggle = () => {};
  const game = makeGame({ state: 'TITLE', assetsLoaded: true });
  game.startGame();
  assert.equal(game.state, 'TITLE');
  gameContext.navigator.maxTouchPoints = 0;
  gameContext.window.screen.orientation = undefined;
}

// 説明を開いている間は戦闘時間を進めず、誤操作も発生させない。
{
  const originalGetElementById = gameContext.document.getElementById;
  gameContext.document.getElementById = (id) => id === 'tutorial-overlay'
    ? { classList: { contains: () => false } }
    : null;
  const game = makeGame({ survivalTime: 37, lightningFlashTimer: 0 });
  game.update(1);
  assert.equal(game.survivalTime, 37);
  gameContext.document.getElementById = originalGetElementById;
}

// 縦向きスマートフォンでは開始を止め、横にした後は案内を閉じる。
{
  const classes = new Set();
  const overlayState = { hidden: true };
  const restartState = { disabled: false, textContent: '' };
  gameContext.navigator.maxTouchPoints = 1;
  gameContext.window.screen.width = 390;
  gameContext.window.screen.height = 844;
  gameContext.window.screen.orientation = { type: 'portrait-primary' };
  gameContext.document.body.classList.toggle = (name, force) => force ? classes.add(name) : classes.delete(name);
  gameContext.document.getElementById = (id) => id === 'orientation-overlay'
    ? { classList: { toggle: (_name, hidden) => { overlayState.hidden = hidden; } } }
    : id === 'restart-btn' ? restartState
    : null;
  const game = makeGame({ state: 'TITLE' });
  game.refreshPresentationState();
  assert.equal(game.mobilePortrait, true);
  assert.equal(overlayState.hidden, false);
  gameContext.window.screen.orientation.type = 'landscape-primary';
  game.refreshPresentationState();
  assert.equal(game.mobilePortrait, false);
  assert.equal(overlayState.hidden, true);

  let resumedBgm = false;
  const activeGame = makeGame({ state: 'PLAYING', survivalTime: 24, orientationResumeRequired: false });
  activeGame.sound.resumeCurrentBGM = () => { resumedBgm = true; };
  gameContext.window.screen.orientation.type = 'portrait-primary';
  activeGame.refreshPresentationState();
  assert.equal(activeGame.orientationResumeRequired, true);
  assert.equal(overlayState.hidden, false);
  activeGame.update(2);
  assert.equal(activeGame.survivalTime, 24);
  gameContext.window.screen.orientation.type = 'landscape-primary';
  activeGame.refreshPresentationState();
  assert.equal(overlayState.hidden, false, 'rotation back should wait for explicit resume');
  assert.equal(activeGame.isGameInputBlocked(), true);
  assert.equal(activeGame.resumeAfterOrientation(), true);
  assert.equal(overlayState.hidden, true);
  assert.equal(resumedBgm, true, 'orientation resume also retries the current BGM');

  gameContext.window.screen.orientation.type = 'portrait-primary';
  const resultGame = makeGame({ state: 'RESULT' });
  resultGame.refreshPresentationState();
  assert.equal(overlayState.hidden, true, 'result screen should remain readable in portrait');
  assert.equal(restartState.disabled, true);
  assert.match(restartState.textContent, /横向き/);
  gameContext.navigator.maxTouchPoints = 0;
  gameContext.window.screen.orientation = undefined;
  gameContext.document.body.classList.toggle = () => {};
  gameContext.document.getElementById = () => null;
}

// 画像1点の失敗は代替表示として明示し、完了表示で成功扱いにしない。
{
  const originalImage = gameContext.Image;
  const originalGetElementById = gameContext.document.getElementById;
  const originalWarn = gameContext.console.warn;
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.onload = null; this.onerror = null; }
    set src(value) {
      this._src = value;
      this.complete = true;
      if (value.includes('map_horizontal')) {
        this.onerror?.();
      } else {
        this.naturalWidth = 16;
        this.onload?.();
      }
    }
  }
  gameContext.Image = FakeImage;
  gameContext.console.warn = () => {};
  const status = { textContent: '' };
  const percent = { textContent: '', style: {} };
  const bar = { style: {} };
  gameContext.document.getElementById = (id) => ({
    'loading-overlay': { classList: { add() {} }, style: {} },
    'loading-bar-fill': bar,
    'loading-percent': percent,
    'loading-status-text': status
  })[id] || null;
  const imageNames = [
    'mapHorizontal', 'mapPeace', 'mapForeground', 'mapForegroundPeace', 'splashYankee',
    'splashKyon', 'cutinCat', 'cutinYankee', 'cutinKyon', 'cutinTandem', 'cutinMikoshi',
    'cutinNoraneko', 'tandemBike', 'mikoshi', 'cat', 'kimie', 'allyCat', 'yankees', 'items'
  ];
  const game = makeGame({ images: Object.fromEntries(imageNames.map((name) => [name, new FakeImage()])) });
  game.loadAssets();
  assert.equal(game.assetsLoaded, true);
  assert.equal(percent.textContent, '100%');
  assert.match(status.textContent, /画像 1 点/);
  gameContext.Image = originalImage;
  gameContext.document.getElementById = originalGetElementById;
  gameContext.console.warn = originalWarn;
}

// ブラウザバー非対応時のホーム画面起動に必要な画像が存在し、manifestの寸法と一致する。
{
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const gameSource = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
  const renderStart = gameSource.indexOf('  render() {');
  const particleFactory = gameSource.indexOf('  addParticle(', renderStart);
  const renderPipeline = gameSource.slice(renderStart, particleFactory);
  assert.equal(manifest.orientation, 'landscape');
  assert.equal(manifest.display, 'standalone');
  assert.doesNotMatch(renderPipeline, /Math\.random\(|Date\.now\(\)|this\.addParticle\(/,
    'rendering must not consume gameplay randomness, wall time, or emit particles');
  for (const icon of manifest.icons) {
    const bytes = fs.readFileSync(path.join(root, icon.src));
    assert.equal(bytes.readUInt32BE(16), Number(icon.sizes.slice(0, icon.sizes.indexOf('x'))));
    assert.equal(bytes.readUInt32BE(20), Number(icon.sizes.slice(icon.sizes.indexOf('x') + 1)));
  }
}

class FakeAudio {
  constructor(src) { this.src=src; this.currentTime = 0; this.loop = false; this.volume = 1; this.paused = true; this.playCalls=0; }
  play() { this.paused=false; this.playCalls++; return Promise.resolve(); }
  load() {}
  pause() { this.paused = true; }
}
const soundContext = vm.createContext({
  Audio: FakeAudio,
  window: {},
  setTimeout: () => 1,
  clearTimeout() {},
  performance: { now: () => 1000 },
  console
});
vm.runInContext(`${fs.readFileSync(path.join(root, 'js/sound.js'), 'utf8')}\nglobalThis.__SoundSystem = SoundSystem;`, soundContext);
{
  const sound = new soundContext.__SoundSystem();
  sound.init = () => {};
  sound.startBattleBGM();
  sound.toggleSound();
  assert.equal(sound.soundEnabled, false);
  assert.equal(sound.resumeBgmType, 'BATTLE');
  sound.startBattleBGM(); // ゲーム進行中にミュートでも現在の曲種を更新
  sound.toggleSound();
  assert.equal(sound.soundEnabled, true);
  assert.equal(sound.currentBgmType, 'BATTLE');
  sound.startClearBGM();
  sound.toggleSound();
  sound.toggleSound();
  assert.equal(sound.currentBgmType, 'CLEAR');
}

async function verifySharedBgmTransport() {
  const sound = new soundContext.__SoundSystem();
  // 効果音のコンテキストが復帰しなくても、BGMの再生許可は同期的に取得する。
  sound.init = () => new Promise(() => {});
  const player = sound.bgmAudio;
  await sound.startPeaceBGM();
  assert.equal(player.src, 'assets/bgm_peace.m4a');
  assert.equal(player.loop, true);
  assert.equal(sound.peaceBgmPlaying, true);
  player.currentTime = 3;
  await sound.startPeaceBGM();
  assert.equal(player.currentTime, 3, 'repeated peace requests keep their position');
  assert.equal(player.playCalls, 1, 'gestures do not restart a playing track');
  player.pause();
  await sound.resumeCurrentBGM();
  assert.equal(player.currentTime, 3, 'interruption resumes from its position');
  assert.equal(player.paused, false);

  await sound.startBattleBGM();
  assert.equal(sound.bgmAudio, player, 'battle reuses the player unlocked at departure');
  assert.equal(player.src, 'assets/bgm.m4a');
  player.currentTime = 4;
  await sound.startBattleBGM();
  assert.equal(player.currentTime, 4, 'closing a cut-in does not rewind battle music');
  assert.equal(sound.peaceBgmPlaying, false);
  await sound.startClearBGM();
  assert.equal(sound.clearBgmAudio, player);
  assert.equal(player.src, 'assets/bgm_clear.m4a');
  sound.stopBGM();
  await sound.resumeCurrentBGM();
  assert.equal(player.paused, true, 'explicit stop is not undone by a gesture');

  // 開始のPromiseが後から完了しても、古い曲の状態へ戻さない。
  const late = new soundContext.__SoundSystem();
  late.init = () => Promise.resolve(false);
  let finish;
  late.bgmAudio.play = function() { this.paused=false; return new Promise(r => { finish=r; }); };
  const pending = late.startPeaceBGM();
  late.stopBGM(); finish(); await pending;
  assert.equal(late.currentBgmType, 'NONE');
  assert.equal(late.peaceBgmPlaying, false);
  assert.equal(late.bgmAudio.paused, true);
}


// 早期回収は次の出現までを短縮し、遅い回収では短縮しない。
{
  const game = makeGame({ itemSpawnTimer: 3.6, assistCutinSeen: { noraneko: true }, spawnAllyCat() {} });
  game.collectItem({ type: 'warabi', age: 2 });
  assert.equal(game.itemSpawnTimer, 1.4);
  game.itemSpawnTimer = 3.6;
  game.collectItem({ type: 'warabi', age: 4 });
  assert.equal(game.itemSpawnTimer, 3.6);
}

// ノラは複数コマでジグザグ移動。援護連打でも上限以内、終了後は残らない。
{
  const game = makeGame({ allyCats: [], player: { x: 660, y: 610 } });
  for (let i = 0; i < 6; i++) game.spawnAllyCat();
  assert.equal(game.allyCats.length, 3);
  const nora = game.allyCats[0], x = nora.x;
  const ys = [], frames = new Set();
  for (let i = 0; i < 12; i++) { game.updateAllyCats(0.07); ys.push(nora.y); frames.add(nora.animFrame); }
  assert.notEqual(nora.x, x);
  assert.equal(frames.size, 4);
  assert.ok(ys.some((v, i) => i > 0 && v > ys[i - 1]));
  assert.ok(ys.some((v, i) => i > 0 && v < ys[i - 1]));
  game.updateAllyCats(2.8);
  assert.equal(game.allyCats.length, 0);
}

// ノラが重なり続けてもボスへ毎フレーム連続ダメージを与えない。
{
  const game = makeGame({ allyCats: [], player: { x: 660, y: 610 } });
  game.spawnAllyCat();
  const nora = game.allyCats[0];
  game.updateAllyCats(0.01);
  const boss = { x: nora.x, y: nora.y, hp: 3000 };
  game.enemies = [boss];
  let hits = 0;
  game.damageEnemy = () => { hits++; return true; };
  for (let i = 0; i < 10; i++) { boss.x = nora.x; boss.y = nora.y; game.updateAllyCats(0.01); }
  assert.equal(hits, 1);
  game.updateAllyCats(0.5);
  boss.x = nora.x; boss.y = nora.y; game.updateAllyCats(0);
  assert.equal(hits, 2);
}

// 波とラッシュが同時に来ても上限を守り、平和時間と最終ボス戦は雑魚を増やさない。
{
  const game = makeGame({ survivalTime: 90, enemySpawnTimer: 5, hordeTimer: 20, bossSpawned1: true });
  game.spawnEnemy = () => game.enemies.push({});
  for (let i = 0; i < 100; i++) game.updateEnemyWaves(1);
  assert.equal(game.enemies.length, 52);
  game.enemies = []; game.finalBossPhase = true; game.updateEnemyWaves(20);
  assert.equal(game.enemies.length, 0);
  game.finalBossPhase = false; game.survivalTime = 14; game.updateEnemyWaves(20);
  assert.equal(game.enemies.length, 0);
}

// アイテムは近くで待っても動かず、接触時だけ一度回収する。高速横断も拾える。
{
  let collected = 0;
  const item = { type: 'warabi', x: 60, y: 0, life: 12, age: 0 };
  const game = makeGame({ dropItems: [item], collectItem() { collected++; } });
  for (let i = 0; i < 60; i++) game.updateDropItems(1 / 60);
  assert.deepEqual([item.x, item.y, collected], [60, 0, 0]);
  game.player.x = 30; game.updateDropItems(0.1);
  assert.equal(collected, 0, '以前の回収半径45pxでは拾わない');
  game.player.x = 40; game.updateDropItems(0.1); game.updateDropItems(0.1);
  assert.equal(collected, 1);
  game.dropItems = [{ type: 'coffee', x: 0, y: 0, life: 1 }];
  game.player.x = 60; game.updateDropItems(0.08, -60, 0);
  assert.equal(collected, 2, '高速で上を通った場合は取りこぼさない');
  game.dropItems = [{ type: 'coffee', x: 60, y: 0, life: 0.01 }];
  game.updateDropItems(0.02);
  assert.equal(collected, 2, '期限切れのアイテムは発動しない');
}

// タンデムの進路はミケの左右の向き。細い一列と神輿の広い面で命中対象が違う。
{
  const hits = [];
  const game = makeGame({ tandemRushes: [], mikoshiRushes: [], player: { x: 660, y: 610, facing: -1 },
    sound: { playBicycleBell() {}, playMikoshiSound() {}, playTaiko() {}, playHit() {} },
    damageEnemy(e) { hits.push(e.id); return true; } });
  game.triggerTandemBikeRush();
  assert.equal(game.tandemRushes[0].dir, -1);
  assert.equal(game.tandemRushes[0].y, 610);
  game.enemies = [{ id: 'lane', x: 660, y: 610 }, { id: 'wide', x: 660, y: 680 }];
  game.tandemRushes[0].x = 660;
  game.updateTandemRushes(0); game.updateTandemRushes(0);
  assert.deepEqual(hits, ['lane']);
  hits.length = 0;
  game.triggerMikoshiRush(1);
  Object.assign(game.mikoshiRushes[0], { x: 660, y: 610 });
  game.updateMikoshiRushes(0); game.updateMikoshiRushes(0);
  assert.deepEqual(hits, ['lane', 'wide']);
  assert.ok(game.enemies.every(e => e.stunTimer >= 0.9));
}

// ノラはミケの近くを守り、離れた敵へ画面横断の攻撃をしない。
{
  const hits = [];
  const game = makeGame({ allyCats: [], player: { x: 660, y: 610, facing: 1 },
    enemies: [{ id: 'near', x: 660, y: 610 }, { id: 'far', x: 1060, y: 610 }],
    damageEnemy(e) { hits.push(e.id); return true; } });
  game.spawnAllyCat();
  for (let i = 0; i < 90; i++) {
    game.updateAllyCats(1 / 60);
    assert.ok(Math.abs(game.allyCats[0].x - game.player.x) <= 145);
  }
  assert.ok(hits.includes('near'));
  assert.ok(!hits.includes('far'));
}

// 大群12秒→回収6秒。回収中は既存の敵を残し、新規の出現を止める。
{
  let spawned = 0, items = 0;
  const game = makeGame({ survivalTime: 56.9, enemySpawnTimer: 0, hordeTimer: 0, bossSpawned1: true,
    spawnEnemy() { spawned++; this.enemies.push({}); }, spawnRandomMarketItem() { items++; } });
  assert.equal(game.getWavePhase(), 'SURGE');
  game.survivalTime = 57; game.enemies = [{}]; game.updateEnemyWaves(1);
  assert.deepEqual([game.wavePhase, spawned, items, game.enemies.length], ['REST', 0, 1, 1]);
  game.updateEnemyWaves(5);
  assert.deepEqual([spawned, items, game.enemySpawnTimer, game.hordeTimer], [0, 1, 0, 0]);
  game.survivalTime = 63; game.updateEnemyWaves(0.1);
  assert.equal(game.wavePhase, 'SURGE'); assert.equal(spawned, 0);
  game.updateEnemyWaves(0.5); assert.ok(spawned > 0);
}

// 予告中は当たらず、照準は固定。横へよければ突進と急降下を避けられる。
for (const type of ['skater', 'tonbi']) {
  const game = makeGame({ player: { x: 660, y: 610, hp: 100, invincibleTimer: 0 },
    sound: { playDamage() {} }, addDamageNumber() {}, camera: { x: 220, y: 273 } });
  const enemy = game.spawnEnemy(type, 470, 610); enemy.attackCooldown = 0;
  game.updateEnemies(1 / 60);
  assert.equal(enemy.attackPhase, 'WINDUP');
  assert.equal(enemy.attackY, 610);
  game.player.y = 705;
  for (let i = 0; i < 90; i++) game.updateEnemies(1 / 60);
  assert.equal(enemy.attackY, 610, '予告後に照準を追従させない');
  assert.equal(game.player.hp, 100);
  assert.equal(enemy.attackPhase, 'RECOVER');
}

// 予告を無視したら命中し、被弾で突進が中断されたら予告も消える。
for (const type of ['skater', 'tonbi']) {
  const game = makeGame({ player: { x: 660, y: 610, hp: 100, invincibleTimer: 0 },
    sound: { playDamage() {} }, addDamageNumber() {}, camera: { x: 220, y: 273 } });
  const enemy = game.spawnEnemy(type, 470, 610); enemy.attackCooldown = 0;
  for (let i = 0; i < 90; i++) {
    game.player.invincibleTimer = Math.max(0, game.player.invincibleTimer - 1 / 60);
    game.updateEnemies(1 / 60);
  }
  assert.ok(game.player.hp < 100);
  enemy.attackPhase = 'WINDUP'; enemy.hp = 100;
  game.damageEnemy(enemy, 1);
  assert.equal(enemy.attackPhase, 'RECOVER');
}

// 同時予告には上限があり、一時停止では予告時間も進まない。
{
  const game = makeGame({ player: { x: 660, y: 610, hp: 100, invincibleTimer: 5 }, camera: { x: 220, y: 273 } });
  for (let i = 0; i < 8; i++) game.spawnEnemy('skater', 460 + i * 8, 580).attackCooldown = 0;
  game.updateEnemies(1 / 60);
  assert.equal(game.enemies.filter(e => e.attackPhase === 'WINDUP').length, 3);
  const timer = game.enemies[0].attackTimer;
  game.mobileUI = { isPaused: true }; game.update(1);
  assert.equal(game.enemies[0].attackTimer, timer);
}

// 会話は接近時1件だけ。居座っても連発せず、戦闘開始・新規プレイで解除される。
{
  vm.runInContext(`${fs.readFileSync(path.join(root, 'js/peace-scene.js'), 'utf8')}\nglobalThis.__PeaceScene = PeaceScene;`, gameContext);
  const game = makeGame({ survivalTime: 1, firstYankeeEventDone: false, player: { x: 660, y: 530 } });
  const scene = new gameContext.__PeaceScene(game);
  scene.update(0.1); assert.equal(scene.bubble, null);
  game.player.x = 310; game.player.y = 558;
  scene.update(0.1); assert.equal(scene.bubble.stall.lines[0], 'お！ミケ！');
  scene.update(3); assert.equal(scene.bubble, null);
  scene.update(9); assert.equal(scene.bubble, null);
  game.player.x = 660; scene.update(0.1);
  game.player.x = 310; scene.update(0.1); assert.ok(scene.bubble);
  game.firstYankeeEventDone = true; scene.update(0.1); assert.equal(scene.bubble, null);
  game.firstYankeeEventDone = false; scene.reset(); scene.update(0.1); assert.ok(scene.bubble);
  scene.reset(); assert.equal(scene.bubble, null);
}

// 遅延中の神輿はゲームが一時停止している間に動き出さない。
{
  const game = makeGame({ mobileUI: { isPaused: true },
    mikoshiRushes: [{ delay: 0.14, x: 10, y: 600 }], enemies: [] });
  game.update(1);
  assert.equal(game.mikoshiRushes[0].delay, 0.14);
  game.updateMikoshiRushes(0.07);
  assert.equal(game.mikoshiRushes[0].x, 10);
  assert.ok(game.mikoshiRushes[0].delay > 0);
}

// 平和スキップは入力・会話を解除し、敵登場とBGM切替を一度だけ実行する。
{
  let stopped = 0, started = 0, cleared = 0;
  const game = makeGame({ survivalTime: 3, firstYankeeEventDone: false, eventState: 'NONE',
    peaceScene: { reset() { cleared++; } }, updateUI() {},
    sound: { stopPeaceBGM() { stopped++; }, playYankeeEncounter() {}, startBattleBGM() { started++; } },
    spawnEnemy() { const e = {}; this.enemies.push(e); return e; },
    joystickVector: { x: 1, y: 0 }, levelUpBanner: { title: '平和' } });
  assert.equal(game.startBattle(), true);
  assert.equal(game.survivalTime, 15);
  assert.equal(game.eventState, 'YANKEE');
  assert.equal(game.firstYankeeEventDone, true);
  assert.equal(game.levelUpBanner, null);
  assert.equal(game.joystickVector.x, 0);
  assert.equal(game.startBattle(), false);
  assert.deepEqual([game.enemies.length, stopped, started, cleared], [1, 1, 1, 1]);
}

// 一時停止中のスキップ要求では時刻・敵・イベントを変更しない。
{
  const game = makeGame({ survivalTime: 4, firstYankeeEventDone: false, eventState: 'NONE',
    mobileUI: { isPaused: true } });
  assert.equal(game.startBattle(), false);
  assert.equal(game.survivalTime, 4);
  assert.equal(game.eventState, 'NONE');
  assert.equal(game.enemies.length, 0);
}

// レベルアップは強化を適用しつつ戦闘・入力を止めず、通知だけ短時間で消える。
{
  let evolved = 0;
  gameContext.LEVEL_EVOLUTION[2] = { apply() { evolved++; } };
  const game = makeGame({ eventState: 'NONE', assistCutin: null, levelUpBanner: null,
    skills: { boots: { level: 0 } }, player: { x: 0, y: 0, level: 2, dir: 'down', facing: 1 },
    moveWithCollision() {} });
  game.applyAutomaticEvolution(2);
  assert.equal(evolved, 1);
  assert.equal(game.state, 'PLAYING');
  assert.equal(game.isGameInputBlocked(), false);
  assert.equal(game.levelUpBanner, null);
  assert.equal(game.player.levelUpFxTimer, 0.7);
  game.updatePlayer(0.8);
  assert.equal(game.player.levelUpFxTimer, 0);
}

// 上下でも歩行の描画が変わり、向き・頭部を反転せずに足を交互に動かす。
{
  gameContext.SPRITES = { cat: { cell: 256 } };
  const calls = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'drawImage' ? (...args) => calls.push(args) : () => {} });
  const game = makeGame({ simulationTime: 1, images: { cat: { complete: true, naturalWidth: 1024 } },
    player: { x: 0, y: 0, dir: 'up', facing: 1, isMoving: true, animFrame: 1, animTimer: 1, invincibleTimer: 0 } });
  for (const direction of ['up', 'down']) {
    game.player.dir = direction;
    calls.length = 0; game.player.animFrame = 1; game.drawPlayer(ctx);
    const first = calls.map(c => c.slice(1));
    calls.length = 0; game.player.animFrame = 3; game.drawPlayer(ctx);
    assert.deepEqual(first[0], calls[0].slice(1), 'head and body stay in the same source pose');
    assert.notDeepEqual(first[1], calls[1].slice(1), 'left foot changes its step');
    assert.notDeepEqual(first[2], calls[2].slice(1), 'right foot changes its step');
  }
}

// 被弾・スタンでも敵を白い面で覆わず、影以外の楕円塗りを追加しない。
{
  let ellipses = 0, strokes = 0;
  const styles = [];
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'ellipse' ? () => ellipses++ : key === 'stroke' ? () => strokes++ : () => {},
    set: (_, key, value) => { if (key === 'fillStyle' || key === 'strokeStyle') styles.push(value); return true; }
  });
  const game = makeGame({ simulationTime: 1, images: { yankees: null } });
  game.drawEnemy(ctx, { x:10,y:20,w:36,h:48,hp:100,maxHp:100,type:'tsuppari',hitFlashTimer:.08,stunTimer:1 });
  assert.equal(ellipses, 1, 'only the ground shadow uses an ellipse');
  assert.equal(strokes, 1, 'a single small spark marks the hit');
  assert.ok(!styles.some(s => /255, ?255, ?255|#fff(?:fff)?$/i.test(s)), 'no white wash or white hit core');
}

// 横長カットインの背景は可視領域を埋め、中央の文字は従来の縮尺で収める。
{
  const image = {complete:true,naturalWidth:1600,naturalHeight:900};
  let backdrop, transform;
  const ctx = new Proxy({}, { get:(_, key) => key === 'drawImage' ? (...args) => { backdrop=args; } :
    key === 'scale' ? (...args) => { transform=args; } : () => {} });
  const game = makeGame({viewW:880,viewH:340,eventState:'YANKEE',images:{splashYankee:image}});
  let foreground = 0;
  game.renderCinematic(ctx, () => foreground++);
  assert.equal(foreground, 1);
  assert.ok(backdrop[3] >= game.viewW && backdrop[4] >= game.viewH, 'background fills all side margins');
  assert.equal(transform[0], 340/495, 'foreground fits vertically without cutting text');
}

// 演出終了で既に鳴っている戦闘曲を先頭から再生しない。
{
  let started=0, resumed=0;
  const game = makeGame({eventState:'YANKEE',sound:{startBattleBGM(){started++;},resumeCurrentBGM(){resumed++;}}});
  game.endEventCutin();
  assert.equal(started, 0);
  assert.equal(resumed, 1);
  assert.equal(game.eventState, 'NONE');
}

// 実際のスティックイベントを呼び出し、プレイヤーの移動まで確認する。
function makeJoystickGame(size = 104) {
  const handlers = new Map();
  const nodes = {};
  const makeTarget = (id, width) => {
    const classes = new Set();
    return {
      style: {}, getBoundingClientRect: () => ({ width }),
      classList: { add: n => classes.add(n), remove: n => classes.delete(n), contains: n => classes.has(n) },
      addEventListener(type, listener) { handlers.set(`${id}:${type}`, listener); }
    };
  };
  nodes['joystick-zone'] = makeTarget('zone', size);
  nodes['joystick-base'] = makeTarget('base', size);
  nodes['joystick-knob'] = makeTarget('knob', 46);
  const game = makeGame({ eventState: 'NONE', assistCutin: null, skills: { boots: { level: 0 } },
    player: { x: 660, y: 500, dir: 'down', facing: 1, animTimer: 0 },
    moveWithCollision(p, x, y) { p.x += x; p.y += y; } });
  const previousGet = gameContext.document.getElementById;
  const previousListen = gameContext.window.addEventListener;
  try {
    gameContext.document.getElementById = id => nodes[id] || null;
    gameContext.window.addEventListener = (type, listener) => handlers.set(`window:${type}`, listener);
    game.initJoystickEvents();
  } finally {
    gameContext.document.getElementById = previousGet;
    gameContext.window.addEventListener = previousListen;
  }
  const touch = (target, type, x, y, identifier = 1) => handlers.get(`${target}:${type}`)({
    changedTouches: [{ clientX: x, clientY: y, identifier }], preventDefault() {}
  });
  return { game, nodes, start: (x, y, id) => touch('zone', 'touchstart', x, y, id),
    move: (x, y, id) => touch('window', 'touchmove', x, y, id),
    end: (id, cancelled = false) => touch('window', cancelled ? 'touchcancel' : 'touchend', 0, 0, id) };
}

// 端を触っただけでは走らず、指の揺れは無視、小さな倒し量は歩き、大きな倒し量は走る。
{
  for (const size of [96, 104]) {
    const { game, nodes, start, move, end } = makeJoystickGame(size);
    start(88, 92);
    game.updatePlayer(1 / 60);
    assert.deepEqual([game.player.x, game.player.y], [660, 500]);
    move(92, 92);
    assert.equal(game.joystickVector.x, 0, 'thumb jitter does not move the player');
    move(98, 92);
    assert.ok(game.joystickVector.x > 0 && game.joystickVector.x < 0.2, 'small drags allow precise movement');
    const before = game.player.x;
    game.updatePlayer(1 / 60);
    assert.ok(game.player.x > before && game.player.x - before < 1.12);
    move(288, 92);
    assert.equal(game.joystickVector.x, 1);
    end();
    const stopped = game.player.x;
    game.updatePlayer(1 / 60);
    assert.equal(game.player.x, stopped, 'release stops on the next frame without inertia');
    assert.equal(nodes['joystick-knob'].style.transform, 'translate(0px, 0px)');
    assert.equal(nodes['joystick-zone'].classList.contains('is-dragging'), false);
  }
}

// ゾーン外まで倒しても戻し量が増えず、別の指や画面ドラッグが中立入力へ混ざらない。
{
  const { game, start, move, end } = makeJoystickGame();
  start(0, 0);
  move(300, 0);
  assert.equal(game.joystickVector.x, 1);
  move(0, 300, 2);
  end(2);
  assert.equal(game.joystickVector.x, 1, 'unrelated fingers do not change or release the stick');
  move(300 - 104 * 0.36, 0);
  assert.equal(game.joystickVector.x, 0, 'returning only the stick radius reaches neutral');
  game.mouseInput = { isDown: true, active: true, x: 1000, y: 500 };
  const stopped = game.player.x;
  game.updatePlayer(1 / 60);
  assert.equal(game.player.x, stopped, 'neutral stick suppresses competing canvas movement');
  move(300 - 104 * 0.36 - 12, 0);
  assert.ok(game.joystickVector.x < 0, 'a short further return reverses direction');
  end(1, true);
  assert.equal(game.joyTouchId, null);
  assert.equal(game.mouseInput.isDown, false);
  assert.equal(game.joystickVector.x, 0);
  start(40, 40);
  move(90, 40);
  game.clearInputState();
  move(110, 40);
  assert.equal(game.joystickVector.x, 0, 'cancelled input cannot resume from a stale move');
}

// スティックの斜め移動も30/60/120Hzで同じ距離。PCのキー入力も独立して使える。
{
  const distances = [30, 60, 120].map(fps => {
    const { game, start, move } = makeJoystickGame();
    start(40, 40); move(140, 140);
    for (let i = 0; i < fps; i++) game.updatePlayer(1 / fps);
    assert.ok(Math.abs((game.player.x - 660) - (game.player.y - 500)) < 0.001);
    return Math.hypot(game.player.x - 660, game.player.y - 500);
  });
  assert.ok(distances.every(d => Math.abs(d - 336) < 0.001), `stick travel varies: ${distances}`);
  const { game } = makeJoystickGame();
  game.keys.KeyW = true;
  game.updatePlayer(1 / 60);
  assert.equal(game.player.x, 660);
  assert.equal(game.player.y, 494.4);
}

verifySharedBgmTransport().then(() => {
  console.log('Game regression checks passed: input, pickups, helper roles, telegraphs, wave pacing, shared BGM');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
