/**
 * 勝浦朝市サバイバー！ - メインゲームエンジン
 */

// ========================================================
// 3. ゲームエンジン本体（勝浦朝市サバイバー）
// ========================================================
class AsaichiGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.radarCanvas = document.getElementById('radarCanvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;
    this.sound = new SoundSystem();

    // ビューポート（画面サイズ）
    this.viewW = 880;
    this.viewH = 495;

    // ワールドマップサイズ（1376 × 768px: 広々とした朝市通り＆SPICE COFFEE自転車屋台＆遠見岬神社石段）
    this.worldW = 1376;
    this.worldH = 768;

    // カメラ位置
    this.camera = { x: 248, y: 136 };

    this.assetsLoaded = false;
    this.images = {
      mapHorizontal: new Image(),
      mapPeace: new Image(),
      mapForeground: new Image(),
      mapForegroundPeace: new Image(),
      splashYankee: new Image(),
      splashKyon: new Image(),
      cutinCat: new Image(),
      cutinYankee: new Image(),
      cutinKyon: new Image(),
      cutinTandem: new Image(),
      cutinMikoshi: new Image(),
      cutinNoraneko: new Image(),
      tandemBike: new Image(),
      mikoshi: new Image(),
      cat: new Image(),
      allyCat: new Image(),
      yankees: new Image(),
      items: new Image()
    };
    this.tandemBikeCanvas = null; // 黒背景を透明化したCanvasキャッシュ
    this.tandemRushes = []; // 走行中のタンデムバイクリスト
    this.mikoshiRushes = []; // 走行中の勝浦神輿軍団リスト
    this.assistCutin = null; // お助けキャラ格ゲー風必殺技カットイン状態
    this.assistCutinQueue = [];
    this.assistCutinSeen = { tandem: false, mikoshi: false, noraneko: false }; // 各アイテム初回取得時のみカットイン発動
    this.isMobilePhoneActive = false;
    this.mobilePortrait = false;
    this.orientationResumeRequired = false;
    this.runId = 0;
    this.resultFinalizedForRun = false;
    this.victoryClearTimerRemaining = 0;
    this.lastEnemyDropSec = null;
    this.hordeTimer = 0;
    this.kittens = []; // ミケについてくる子猫リスト
    this.lightningTimer = 0; // 電撃タイマー
    this.lightningBolts = [];
    this.levelUpBanner = null; // レベルアップ自動通知バナー

    // 操作入力（PCマウス操作 ＆ スマホ右下バーチャルスティック）
    this.joystickVector = { x: 0, y: 0 };
    this.mouseInput = { active: false, x: 0, y: 0, isDown: false };
    this.itemSpawnTimer = 3.0; // アイテム自然ポップタイマー

    // ゲーム状態
    this.state = 'TITLE'; // 'TITLE' | 'PLAYING' | 'LEVELUP' | 'RESULT'
    this.survivalTime = 0;
    this.simulationTime = 0;
    this.killCount = 0;
    this.screenShake = 0;

    // プレイヤー（三毛猫ミケ）
    this.player = {
      x: 660,
      y: 530,
      w: 44,
      h: 44,
      speed: 4.8,
      baseSpeed: 4.8,
      dashSpeed: 8.2,
      stamina: 100,
      maxStamina: 100,
      isDashing: false,
      isMoving: false,
      dir: 'down',
      facing: 1, // 1: 右向き, -1: 左向き
      animTimer: 0,
      animFrame: 0,
      meowAnimTimer: 0,
      hp: 100,
      maxHp: 100,
      level: 1,
      exp: 0,
      nextExp: 8,
      invincibleTimer: 0,
      speedBuffTimer: 0,
      speedSmokeTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      knockbackTimer: 0
    };

    // プレイヤーのスキル状況
    this.skills = {
      scratch:  { level: 1, timer: 0 },
      bonito:   { level: 0, timer: 0, angle: 0 },
      meow:     { level: 0, timer: 0 },
      shichirin:{ level: 0, timer: 0 },
      boots:    { level: 0 },
      magnet:   { level: 0 },
      spice:    { level: 0 }
    };

    // 敵リスト（ヤンキー、キョン、トンビ、ボス）
    this.enemies = [];
    this.enemySpawnTimer = 0;
    this.bossSpawned1 = false;
    this.bossSpawned2 = false;

    // 朝市店主・観光客のNPCスポット（リアクション演出用）
    this.npcSpots = [
      { x: 360, y: 530, name: 'わらび餅店主', cooldown: 0 },
      { x: 800, y: 520, name: '八百屋おじさん', cooldown: 0 },
      { x: 850, y: 540, name: '八百屋おばあちゃん', cooldown: 0 },
      { x: 100, y: 640, name: 'カメラ観光客', cooldown: 0 },
      { x: 710, y: 700, name: '驚くじいちゃん', cooldown: 0 },
      { x: 910, y: 700, name: '悲鳴観光客', cooldown: 0 }
    ];

    // 投射物（爪撃、ブーメラン、炎、衝撃波など）
    this.projectiles = [];
    this.meowWaves = [];

    // ドロップアイテム（コーヒー、わらび餅、タンタン麺）
    this.dropItems = [];

    // 助太刀仲間にゃんこ（クロ、トラ吉、チビ、シロ）
    this.allyCats = [];

    // エフェクト（パーティクル、ダメージ数字）
    this.particles = [];
    this.damageNumbers = [];
    this.comicPopups = [];

    // イベント演出用（開幕平和・初回ヤンキー・初回キョン）
    this.eventState = 'NONE'; // 'NONE' | 'PEACE' | 'YANKEE' | 'KYON'
    this.eventTimer = 0;
    this.eventLockoutTimer = 0;
    this.firstPeaceEventDone = false;
    this.firstYankeeEventDone = false;
    this.firstKyonEventDone = false;

    this.keys = {};
    this.touchDash = false;

    this.initColliders();
    this.loadAssets();
    this.initEvents();
  }

  isMobilePhone() {
    const touchScreen = (navigator.maxTouchPoints || 0) > 0;
    const screenWidth = window.screen?.width || window.innerWidth;
    const screenHeight = window.screen?.height || window.innerHeight;
    return touchScreen && Math.min(screenWidth, screenHeight) <= 600;
  }

  isLandscapeViewport() {
    const orientationType = window.screen?.orientation?.type;
    if (orientationType) return orientationType.startsWith('landscape');
    return window.innerWidth > window.innerHeight;
  }

  clearInputState() {
    this.cancelInputPointers?.();
    this.keys = Object.create(null);
    this.mouseInput.active = false;
    this.mouseInput.isDown = false;
    this.joystickVector.x = 0;
    this.joystickVector.y = 0;
    this.touchDash = false;
  }

  getCanvasPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const scale = Math.min(rect.width / this.canvas.width, rect.height / this.canvas.height);
    const contentWidth = this.canvas.width * scale;
    const contentHeight = this.canvas.height * scale;
    const offsetX = (rect.width - contentWidth) / 2;
    const offsetY = (rect.height - contentHeight) / 2;
    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;
    if (x < 0 || x > this.canvas.width || y < 0 || y > this.canvas.height) return null;
    return { x, y };
  }

  isGameInputBlocked() {
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    return this.state !== 'PLAYING' || document.hidden || this.mobilePortrait || this.orientationResumeRequired || this.mobileUI?.isPaused ||
      !!(tutorialOverlay && !tutorialOverlay.classList.contains('hidden'));
  }

  refreshPresentationState() {
    this.isMobilePhoneActive = this.isMobilePhone();
    this.mobilePortrait = this.isMobilePhoneActive && !this.isLandscapeViewport();
    if (this.mobilePortrait && this.state === 'PLAYING') this.orientationResumeRequired = true;
    document.body.classList.toggle('mobile-phone', this.isMobilePhoneActive);
    document.body.classList.toggle('mobile-landscape', this.isMobilePhoneActive && !this.mobilePortrait);
    document.body.classList.toggle('mobile-portrait', this.mobilePortrait);
    document.body.classList.toggle('game-title', this.state === 'TITLE');

    const showOrientationOverlay = this.isMobilePhoneActive &&
      ((this.mobilePortrait && this.state !== 'RESULT') || this.orientationResumeRequired);
    const orientationOverlay = document.getElementById('orientation-overlay');
    orientationOverlay?.classList.toggle('hidden', !showOrientationOverlay);
    const orientationTitle = document.getElementById('orientation-title');
    const orientationCopy = document.getElementById('orientation-copy');
    const orientationButton = document.getElementById('orientation-fullscreen-btn');
    if (showOrientationOverlay) {
      const needsResume = !this.mobilePortrait && this.orientationResumeRequired;
      if (orientationTitle) orientationTitle.textContent = needsResume ? '横向きに戻ったよ' : '端末を横向きにしてね';
      if (orientationCopy) {
        orientationCopy.textContent = needsResume
          ? 'ゲームの状態はそのまま止めてあるよ。準備ができたら「続ける」を押してね。'
          : this.state === 'PLAYING'
            ? '戦闘を一時停止したよ。横向きに戻すと、続きから遊べるよ。'
            : 'このゲームはスマートフォンを横にして遊べるよ。横向きになったら、タイトルの「出撃」から始めてね。';
      }
      if (orientationButton) orientationButton.textContent = needsResume ? '続ける' : '全画面表示を試す';
    }
    const restartButton = document.getElementById('restart-btn');
    if (restartButton) {
      restartButton.disabled = this.state === 'RESULT' && this.mobilePortrait;
      restartButton.textContent = restartButton.disabled
        ? '端末を横向きにして再挑戦'
        : 'もう一度リベンジするニャ！';
    }
    if (this.mobilePortrait) this.clearInputState();

    const standalone = window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches || navigator.standalone === true;
    for (const button of [document.getElementById('fullscreen-btn'), document.getElementById('title-fullscreen-btn')]) {
      if (button) button.hidden = !!standalone;
    }

    const nativeFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement);
    const label = nativeFullscreen ? '✖ 縮小' : '⛶ 全画面';
    const headerButton = document.getElementById('fullscreen-btn');
    const titleButton = document.getElementById('title-fullscreen-btn');
    if (headerButton) headerButton.textContent = label;
    if (titleButton) titleButton.textContent = label;
    this.mobileUI?.resize();
    this.mobileUI?.syncVisibility();
  }

  resumeAfterOrientation() {
    if (this.mobilePortrait || !this.orientationResumeRequired) return false;
    this.orientationResumeRequired = false;
    this.refreshPresentationState();
    this.sound.resumeCurrentBGM();
    return true;
  }

  openTutorial() {
    this.clearInputState();
    const fromTitle = this.state === 'TITLE';
    const startButton = document.getElementById('btn-tutorial-start');
    const backButton = document.getElementById('btn-tutorial-back');
    if (startButton) startButton.textContent = fromTitle ? '説明を閉じて出撃するニャ！（START）' : 'ゲームに戻る';
    if (backButton) backButton.textContent = fromTitle ? '閉じる' : 'タイトルへ戻る';
    document.getElementById('tutorial-overlay')?.classList.remove('hidden');
    this.mobileUI?.syncVisibility();
  }

  returnToTitle() {
    if (this.state !== 'PLAYING') return;
    this.runId++;
    this.resultFinalizedForRun = false;
    this.state = 'TITLE';
    this.isVictoryClear = false;
    this.victoryClearTimerRemaining = 0;
    this.orientationResumeRequired = false;
    this.assistCutin = null;
    this.assistCutinQueue = [];
    this.eventState = 'NONE';
    this.clearInputState();
    this.sound.stopBGM();
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
    document.getElementById('result-overlay')?.classList.add('hidden');
    document.getElementById('levelup-overlay')?.classList.add('hidden');
    document.getElementById('ui-header')?.classList.add('hidden');
    const titleOverlay = document.getElementById('title-overlay');
    titleOverlay?.classList.remove('hidden');
    if (titleOverlay) titleOverlay.style.display = '';
    this.refreshPresentationState();
  }

  loadAssets() {
    let loaded = 0;
    let failed = 0;
    // バージョン固定キャッシュキー（アクセスごとの全画像再ダウンロードを防ぎ、ブラウザキャッシュを即座に効かせる！）
    const cacheKey = '20260930_pdca_v2';

    const loadingOverlay = document.getElementById('loading-overlay');
    const barFill = document.getElementById('loading-bar-fill');
    const pctText = document.getElementById('loading-percent');
    const statusText = document.getElementById('loading-status-text');

    const titleBgImg = new Image();

    const list = [
      // CSS背景と同じURLを使い、タイトル絵の二重転送を避ける。
      { img: titleBgImg,                     src: 'assets/title_bg.webp?v=20260929_webp_lightweight_v1' },
      { img: this.images.mapHorizontal,      src: `assets/map_horizontal.webp?v=${cacheKey}` },
      { img: this.images.mapPeace,           src: `assets/map_peace.webp?v=${cacheKey}` },
      { img: this.images.mapForeground,      src: `assets/map_foreground.webp?v=${cacheKey}` },
      { img: this.images.mapForegroundPeace, src: `assets/map_foreground_peace.webp?v=${cacheKey}` },
      { img: this.images.splashYankee,       src: `assets/splash_yankee.webp?v=${cacheKey}` },
      { img: this.images.splashKyon,         src: `assets/splash_kyon.webp?v=${cacheKey}` },
      { img: this.images.cutinCat,           src: `assets/cutin_cat.webp?v=${cacheKey}` },
      { img: this.images.cutinYankee,        src: `assets/cutin_yankee.webp?v=${cacheKey}` },
      { img: this.images.cutinKyon,          src: `assets/cutin_kyon.webp?v=${cacheKey}` },
      { img: this.images.cutinTandem,        src: `assets/cutin_tandem.webp?v=${cacheKey}` },
      { img: this.images.cutinMikoshi,       src: `assets/cutin_mikoshi.webp?v=${cacheKey}` },
      { img: this.images.cutinNoraneko,      src: `assets/cutin_noraneko.webp?v=${cacheKey}` },
      { img: this.images.tandemBike,         src: `assets/tandem_bike.webp?v=${cacheKey}` },
      { img: this.images.mikoshi,            src: `assets/katsuura_mikoshi.webp?v=${cacheKey}` },
      { img: this.images.allyCat,            src: 'assets/nora_run.webp?v=20260930_rush_v7' },
      { img: this.images.cat,                src: `assets/cat_sprites.webp?v=${cacheKey}` },
      { img: this.images.yankees,            src: `assets/yankee_sprites.webp?v=${cacheKey}` },
      { img: this.images.items,              src: `assets/items.webp?v=${cacheKey}` }
    ];
    const total = list.length;

    const updateProgress = () => {
      const pct = Math.min(100, Math.floor((loaded / total) * 100));
      if (barFill) barFill.style.width = `${pct}%`;
      if (pctText) pctText.textContent = `${pct}%`;

      if (pct < 35) {
        if (statusText) statusText.textContent = '勝浦港のお魚を準備中ニャ... 🐟';
      } else if (pct < 75) {
        if (statusText) statusText.textContent = '朝市の屋台を設営中ニャ... ⛩️';
      } else if (pct < 100) {
        if (statusText) statusText.textContent = 'ミケがお出かけ準備中ニャ... 🐾';
      } else if (failed > 0) {
        if (statusText) statusText.textContent = `画像 ${failed} 点を読み込めなかったため、代替表示で起動します。`;
      } else {
        if (statusText) statusText.textContent = '仕入れ完了！出撃準備完了ニャ！✨';
      }
    };

    let isFinished = false;
    const finishLoading = () => {
      if (isFinished) return;
      isFinished = true;
      this.assetsLoaded = true;
      if (barFill) barFill.style.width = '100%';
      if (pctText) pctText.textContent = '100%';
      if (statusText) statusText.textContent = failed > 0
        ? `画像 ${failed} 点を読み込めなかったため、代替表示で起動します。`
        : '仕入れ完了！出撃準備完了ニャ！✨';
      this.prepareTransparentTandemBike();
      setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.classList.add('fade-out');
          setTimeout(() => {
            loadingOverlay.style.display = 'none';
          }, 450);
        }
      }, 350);
    };

    const settleAsset = (item, succeeded, reason = '') => {
      if (item.isDone) return;
      item.isDone = true;
      if (!succeeded) {
        failed++;
        console.warn('Asset unavailable; fallback will be used:', item.src, reason);
      }
      loaded++;
      updateProgress();
      if (loaded >= total) {
        finishLoading();
      }
    };

    // 読込が長引いた画像は失敗として数え、成功表示をせず代替表示で起動する。
    setTimeout(() => {
      if (!isFinished) {
        list.forEach(item => settleAsset(item, false, 'timeout'));
      }
    }, 6000);

    list.forEach(item => {
      item.isDone = false;
      item.img.onload = () => settleAsset(item, true);
      item.img.onerror = () => {
        settleAsset(item, false, 'load-error');
      };
      item.img.src = item.src;
      // すでにキャッシュ等でロード完了している場合
      if (item.img.complete && item.img.naturalWidth > 0) {
        settleAsset(item, true);
      }
    });
  }

  // タンデムクロスバイクの背景透過（事前処理済みWebPのためCPU走査は完全スキップして超高速化！）
  prepareTransparentTandemBike() {
    // 事前生成された tandem_bike.webp が背景透過済みのため、90万ピクセルの重いCPU走査は不要！
    this.tandemBikeCanvas = this.images.tandemBike;
  }

  // 通行可能ゾーン設定（★ユーザー指定の赤目印エリアに100%完全一致！）
  initColliders() {
    // ユーザー指定の赤目印エリア（添付画像と1ピクセルも違わず完全一致する通行可能ゾーン）
    this.walkableZones = [
      // 1. メイン大通り（水平方向の広大な道路全域：左端〜右端まで完全横断！）
      { x: 0, y: 535, w: 1376, h: 155 },
      // 2. 遠見岬神社 鳥居前広場・石畳（鳥居前〜石段下）
      { x: 550, y: 410, w: 295, h: 125 },
      // 3. 鳥居奥・石段手前（階段の足元敷居・2段目手前）
      { x: 595, y: 360, w: 180, h: 50 },
      // 4. 南参道縦道（画面手前中央から画面最下端へ抜ける参道・石畳広場）
      { x: 575, y: 685, w: 215, h: 83 },
      // 5. 左側カフェテラス前通路（カメラ女子＆迷彩服客〜パラソル前）
      { x: 0, y: 490, w: 220, h: 45 },
      // 6. 左側白テント屋台脇（SPICE COFFEE前）
      { x: 420, y: 495, w: 130, h: 40 },
      // 7. 左側パラソル小道1（パラソル間の抜け道）
      { x: 30, y: 430, w: 50, h: 60 },
      // 8. 左側パラソル小道2（パラソル間の抜け道）
      { x: 95, y: 430, w: 50, h: 60 }
    ];
    // 互換性保持用
    this.colliders = [];
  }

  // 指定座標がユーザー指定の通行可能ゾーン（赤目印エリア）に入っているか判定
  isPointWalkable(x, y) {
    for (let i = 0; i < this.walkableZones.length; i++) {
      const z = this.walkableZones[i];
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
        return true;
      }
    }
    return false;
  }

  // 立入禁止エリア判定（互換用ヘルパー：赤目印の外なら立入禁止）
  isInsideForbiddenArea(x, y, margin = 0) {
    if (margin <= 0) {
      return !this.isPointWalkable(x, y);
    }
    return !(
      this.isPointWalkable(x, y) &&
      this.isPointWalkable(x - margin, y) &&
      this.isPointWalkable(x + margin, y) &&
      this.isPointWalkable(x, y - margin) &&
      this.isPointWalkable(x, y + margin)
    );
  }

  // 足元接地衝突判定（超軽量・毎フレーム0.001ms・赤目印エリア外なら即衝突判定）
  checkFootCollision(fx, fy) {
    return !this.isPointWalkable(fx, fy);
  }

  // アンスタック救出機構（プレイヤー専用・最も近い赤目印エリア内へ即座に安全復帰！）
  unstuckEntity(entity) {
    if (this.isPointWalkable(entity.x, entity.y)) return;

    let bestDist = Infinity;
    let bestX = entity.x;
    let bestY = entity.y;

    for (let i = 0; i < this.walkableZones.length; i++) {
      const z = this.walkableZones[i];
      const clX = Math.max(z.x + 12, Math.min(z.x + z.w - 12, entity.x));
      const clY = Math.max(z.y + 12, Math.min(z.y + z.h - 12, entity.y));
      const dist = Math.hypot(entity.x - clX, entity.y - clY);
      if (dist < bestDist) {
        bestDist = dist;
        bestX = clX;
        bestY = clY;
      }
    }

    entity.x = bestX;
    entity.y = bestY;
  }

  // 入力・表示・描画ループを責務別の登録処理へ分ける
  initEvents() {
    this.mobileUI = new MobileUI(this);
    this.peaceScene = new PeaceScene(this);
    this.initKeyboardEvents();
    this.initPresentationEvents();
    this.initPointerEvents();
    this.initJoystickEvents();
    this.startMainLoop();
  }

  initKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        const tutorial = document.getElementById('tutorial-overlay');
        if (tutorial && !tutorial.classList.contains('hidden')) {
          tutorial.classList.add('hidden');
          this.clearInputState();
          return;
        }
      }
      const targetIsControl = e.target instanceof Element && !!e.target.closest('button, a, input, textarea, select, [contenteditable="true"]');
      if (targetIsControl) return;
      if (this.state === 'PLAYING' && this.isGameInputBlocked()) return;

      this.keys[e.code] = true;
      if (e.key) {
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.key] = true;
      }

      if (this.state === 'PLAYING' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (this.eventState !== 'NONE' && this.eventLockoutTimer <= 0) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.endEventCutin();
          return;
        }
      }

      if (this.assistCutin && this.assistCutin.lockoutTimer <= 0) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.endAssistCutin();
          return;
        }
      }

      if (this.state === 'TITLE') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.startGame();
        }
      } else if (this.state === 'RESULT') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.startGame();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.key) {
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.key] = false;
      }
    });
  }

  initPresentationEvents() {
    // ========================================================
    // 全画面表示：実際のAPI成功時だけ全画面として扱う
    // ========================================================
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isNativeFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement);
    const showFullscreenHelp = () => {
      const toast = document.getElementById('safari-fullscreen-toast');
      if (!toast) return;
      const text = toast.querySelector('.toast-text');
      if (text) {
        text.textContent = isIOS
          ? 'このブラウザではバーを隠せない場合があります。共有ボタンから「ホーム画面に追加」し、アプリとして起動できる場合は追加アイコンから開くとバーなしで遊べます。'
          : 'このブラウザはページの全画面表示に対応していません。画面の表示領域に合わせて遊べます。';
      }
      toast.classList.remove('hidden');
      if (this.safariToastTimer) clearTimeout(this.safariToastTimer);
      this.safariToastTimer = setTimeout(() => toast.classList.add('hidden'), 9000);
    };
    const tryEnterFullscreen = () => {
      const appMode = window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: fullscreen)').matches || navigator.standalone === true;
      if (appMode || isNativeFullscreen()) return;

      // ページ全体を全画面対象にし、ゲーム外に置いた回転案内・失敗案内も表示できるようにする。
      const target = document.documentElement;
      const request = target?.requestFullscreen || target?.webkitRequestFullscreen ||
        target?.mozRequestFullScreen || target?.msRequestFullscreen;
      if (!request) {
        showFullscreenHelp();
        return;
      }

      let fullscreenPromise;
      try {
        fullscreenPromise = request.call(target, { navigationUI: 'hide' });
      } catch (firstError) {
        try { fullscreenPromise = request.call(target); }
        catch (error) { showFullscreenHelp(); return; }
      }

      try { window.screen?.orientation?.lock?.('landscape')?.catch(() => {}); } catch (error) {}
      Promise.resolve(fullscreenPromise).then(() => {
        setTimeout(() => {
          this.refreshPresentationState();
          if (!isNativeFullscreen()) showFullscreenHelp();
        }, 250);
      }).catch(() => showFullscreenHelp());
    };
    const toggleFullscreen = () => {
      if (isNativeFullscreen()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen ||
          document.mozCancelFullScreen || document.msExitFullscreen;
        try { Promise.resolve(exit?.call(document)).then(() => this.refreshPresentationState()).catch(() => {}); }
        catch (error) { this.refreshPresentationState(); }
      } else {
        tryEnterFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', () => this.refreshPresentationState());
    document.addEventListener('webkitfullscreenchange', () => this.refreshPresentationState());
    document.addEventListener('mozfullscreenchange', () => this.refreshPresentationState());
    document.addEventListener('MSFullscreenChange', () => this.refreshPresentationState());
    document.getElementById('btn-close-safari-toast')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('safari-fullscreen-toast')?.classList.add('hidden');
    });

    const handleOrientation = () => this.refreshPresentationState();
    window.addEventListener('resize', handleOrientation, { passive: true });
    window.addEventListener('orientationchange', handleOrientation, { passive: true });
    window.visualViewport?.addEventListener('resize', handleOrientation, { passive: true });
    const resumeAudioFromGesture = () => this.sound.resumeCurrentBGM();
    window.addEventListener('pointerdown', resumeAudioFromGesture, { capture: true, passive: true });
    window.addEventListener('keydown', resumeAudioFromGesture, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clearInputState();
      else this.sound.resumeCurrentBGM();
    });
    window.addEventListener('blur', () => this.clearInputState());
    this.refreshPresentationState();

    // UIボタン＆タイトル画面タップ
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen();
      });
    }

    const titleFsBtn = document.getElementById('title-fullscreen-btn');
    if (titleFsBtn) {
      titleFsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen();
      });
    }

    document.getElementById('btn-quick-start')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startGame();
    });
    document.getElementById('orientation-fullscreen-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.resumeAfterOrientation()) return;
      tryEnterFullscreen();
      try { window.screen?.orientation?.lock?.('landscape')?.catch(() => {}); } catch (error) {}
    });
    document.getElementById('btn-view-help')?.addEventListener('click', () => {
      this.openTutorial();
    });
    document.getElementById('help-btn')?.addEventListener('click', () => {
      this.openTutorial();
    });
    document.getElementById('btn-tutorial-start')?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay').classList.add('hidden');
      if (this.state === 'TITLE') {
        this.startGame();
      }
    });
    document.getElementById('btn-tutorial-back')?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay').classList.add('hidden');
      if (this.state === 'PLAYING') this.returnToTitle();
    });
    document.getElementById('restart-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startGame();
    });

    const soundBtn = document.getElementById('sound-btn');
    soundBtn?.addEventListener('click', () => {
      this.sound.init();
      const on = this.sound.toggleSound();
      soundBtn.textContent = on ? '🔊 BGM ON' : '🔇 BGM OFF';
    });
  }

  initPointerEvents() {
    // ========================================================
    // PC用：マウス操作（カーソル追従 / ドラッグ移動）
    // ========================================================
    const updateMousePos = (e) => {
      const point = this.getCanvasPoint(e.clientX, e.clientY);
      if (!point) return false;
      this.mouseInput.x = point.x;
      this.mouseInput.y = point.y;
      return true;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isGameInputBlocked() && this.mouseInput.isDown) {
        updateMousePos(e);
        this.mouseInput.active = true;
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.assistCutin) {
        if (this.assistCutin.lockoutTimer <= 0) {
          this.endAssistCutin();
        }
        return;
      }
      if (this.eventState !== 'NONE') {
        if (this.eventLockoutTimer <= 0) {
          this.endEventCutin();
        }
        return;
      }
      if (e.button === 0 && this.state === 'PLAYING') {
        if (this.isGameInputBlocked()) return;
        if (!updateMousePos(e)) return;
        this.mouseInput.isDown = true;
        this.mouseInput.active = true;
      }
    });

    window.addEventListener('mouseup', () => {
      this.mouseInput.isDown = false;
      this.mouseInput.active = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseInput.isDown = false;
      this.mouseInput.active = false;
    });

    // ========================================================
    // スマホ用：画面どこでもタッチ＆ドラッグ移動（スクロール誤爆防止でノンストップ操作！）
    // ========================================================
    const updateTouchPos = (touch) => {
      const point = this.getCanvasPoint(touch.clientX, touch.clientY);
      if (!point) return false;
      this.mouseInput.x = point.x;
      this.mouseInput.y = point.y;
      return true;
    };

    this.directTouchId = null;

    this.canvas.addEventListener('touchstart', (e) => {
      if (this.assistCutin) {
        e.preventDefault();
        if (this.assistCutin.lockoutTimer <= 0) {
          this.endAssistCutin();
        }
        return;
      }
      if (this.eventState !== 'NONE') {
        e.preventDefault();
        if (this.eventLockoutTimer <= 0) {
          this.endEventCutin();
        }
        return;
      }
      if (!this.isGameInputBlocked()) {
        e.preventDefault();
        if (this.directTouchId !== null) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        if (!updateTouchPos(touch)) return;
        this.directTouchId = touch.identifier;
        this.mouseInput.isDown = true;
        this.mouseInput.active = true;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.isGameInputBlocked()) {
        e.preventDefault();
        if (this.directTouchId !== null) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.directTouchId) {
              updateTouchPos(touch);
              this.mouseInput.isDown = true;
              this.mouseInput.active = true;
              break;
            }
          }
        }
      }
    }, { passive: false });

    const handleDirectTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.directTouchId) {
          this.directTouchId = null;
          this.mouseInput.isDown = false;
          this.mouseInput.active = false;
          break;
        }
      }
    };

    this.canvas.addEventListener('touchend', handleDirectTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', handleDirectTouchEnd, { passive: false });
  }

  initJoystickEvents() {
    // ========================================================
    // スマートフォン横画面用の右下バーチャルジョイスティック
    // ========================================================
    // 画面内に重ねる操作レイヤー
    // ========================================================
    const ctrlZone = document.getElementById('mobile-controller-zone');
    const joyZone = document.getElementById('joystick-zone');
    const joyBase = document.getElementById('joystick-base');
    const joyKnob = document.getElementById('joystick-knob');

    this.joyTouchId = null;
    let joyBaseCenter = { x: 0, y: 0 };
    this.isMouseJoy = false;
    const getMaxJoyRadius = () => {
      const baseSize = joyBase?.getBoundingClientRect().width || 88;
      const knobSize = joyKnob?.getBoundingClientRect().width || 42;
      return Math.max(16, (baseSize - knobSize) / 2 - 3);
    };

    const updateJoyBaseCenter = () => {
      if (joyBase) {
        const rect = joyBase.getBoundingClientRect();
        joyBaseCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    };

    const handleJoyStart = (clientX, clientY, identifier) => {
      if (this.isGameInputBlocked()) return;
      this.joyTouchId = identifier;
      updateJoyBaseCenter();
      handleJoyMove(clientX, clientY);
    };

    const handleJoyMove = (clientX, clientY) => {
      if (this.isGameInputBlocked()) {
        handleJoyEnd();
        return;
      }
      const dx = clientX - joyBaseCenter.x;
      const dy = clientY - joyBaseCenter.y;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) {
        this.joystickVector.x = 0;
        this.joystickVector.y = 0;
        if (joyKnob) joyKnob.style.transform = 'translate(0px, 0px)';
        return;
      }

      const maxJoyRadius = getMaxJoyRadius();
      const clampedDist = Math.min(dist, maxJoyRadius);
      const nx = dx / dist;
      const ny = dy / dist;

      // 移動入力ベクトル（0.0 〜 1.0）
      this.joystickVector.x = nx * (clampedDist / maxJoyRadius);
      this.joystickVector.y = ny * (clampedDist / maxJoyRadius);

      if (joyKnob) {
        joyKnob.style.transform = `translate(${nx * clampedDist}px, ${ny * clampedDist}px)`;
      }
    };

    const handleJoyEnd = () => {
      this.joyTouchId = null;
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
      if (joyKnob) {
        joyKnob.style.transform = 'translate(0px, 0px)';
      }
    };

    this.cancelInputPointers = () => {
      this.directTouchId = null;
      this.joyTouchId = null;
      this.isMouseJoy = false;
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
      if (joyKnob) joyKnob.style.transform = 'translate(0px, 0px)';
    };

    const targetTouchArea = ctrlZone || joyZone;
    if (targetTouchArea) {
      targetTouchArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.joyTouchId !== null) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        handleJoyStart(touch.clientX, touch.clientY, touch.identifier);
      }, { passive: false });

      // window に touchmove / touchend を登録することで指がゾーン外に多少外れても追従！
      window.addEventListener('touchmove', (e) => {
        if (this.joyTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.joyTouchId) {
            handleJoyMove(touch.clientX, touch.clientY);
            break;
          }
        }
      }, { passive: false });

      const onJoyTouchEnd = (e) => {
        if (this.joyTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joyTouchId) {
            handleJoyEnd();
            break;
          }
        }
      };
      window.addEventListener('touchend', onJoyTouchEnd);
      window.addEventListener('touchcancel', onJoyTouchEnd);

      // PCマウスでもスティックをドラッグ操作可能（テスト・デバッグ用）
      targetTouchArea.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.isMouseJoy = true;
          handleJoyStart(e.clientX, e.clientY, 'mouse');
        }
      });
      window.addEventListener('mousemove', (e) => {
        if (this.isMouseJoy) handleJoyMove(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', () => {
        if (this.isMouseJoy) {
          this.isMouseJoy = false;
          handleJoyEnd();
        }
      });
    }
  }

  startMainLoop() {
    // メインループ起動（例外発生時も決して止まらない完全ノンストップループ）
    let lastTime = performance.now();
    const loop = (now) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = (!rawDt || isNaN(rawDt) || rawDt <= 0) ? 0.016 : Math.min(0.08, rawDt);
      lastTime = now;
      try {
        if (document.hidden) {
          requestAnimationFrame(loop);
          return;
        }
        const canRenderGameplay = this.state === 'PLAYING' && !this.isGameInputBlocked();
        if (this.state === 'PLAYING') this.update(dt);
        if (canRenderGameplay && this.state === 'PLAYING') this.render();
      } catch (err) {
        if (!this.frameErrorLogged) {
          this.frameErrorLogged = true;
          console.error('Game frame error; further repeats are suppressed:', err);
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  startGame() {
    if (!this.assetsLoaded) {
      console.warn('Assets still loading, please wait...');
      return;
    }
    if (this.state === 'PLAYING') return;
    this.refreshPresentationState();
    if (this.mobilePortrait) return;
    this.orientationResumeRequired = false;

    this.runId++;
    this.peaceScene?.reset();
    this.resultFinalizedForRun = false;
    this.victoryClearTimerRemaining = 0;
    this.assistCutin = null;
    this.assistCutinQueue = [];
    this.clearInputState();
    this.keys = Object.create(null);
    this.mouseInput = { active: false, x: 0, y: 0, isDown: false };
    this.joystickVector = { x: 0, y: 0 };
    this.touchDash = false;
    this.lastEnemyDropSec = null;
    this.hordeTimer = 0;
    this.enemySpawnTimer = 0;
    this.lightningFlashTimer = 0;
    this.lightningBolts = [];

    this.sound.init();
    this.sound.startPeaceBGM(); // ★平和モード開始！のどかな朝市のレトロチップチューンBGM

    this.state = 'PLAYING';
    this.refreshPresentationState();
    this.survivalTime = 0;
    this.simulationTime = 0;
    this.killCount = 0;
    this.screenShake = 0;
    this.bossSpawned1 = false;
    this.bossSpawned2 = false;
    this.assistCutinSeen = { tandem: false, mikoshi: false, noraneko: false }; // 新規プレイで各初回カットインをリセット

    // プレイヤー初期化
    this.player.x = 660;
    this.player.y = 530;
    this.player.hp = 100;
    this.player.maxHp = 100;
    this.player.stamina = this.player.maxStamina;
    this.player.isDashing = false;
    this.player.level = 1;
    this.player.exp = 0;
    this.player.nextExp = 8;
    this.player.dir = 'down';
    this.player.invincibleTimer = 0;
    this.player.speedBuffTimer = 0;
    this.player.speedSmokeTimer = 0;
    this.player.knockbackTimer = 0;
    this.player.knockbackVx = 0;
    this.player.knockbackVy = 0;
    this.player.meowAnimTimer = 0;
    this.player.isMoving = false;
    this.player.facing = 1;
    this.player.animTimer = 0;
    this.player.animFrame = 0;

    // ゲーム開始時に上部HUDヘッダーを表示＆カメラをミケにセンタリング
    document.getElementById('ui-header')?.classList.remove('hidden');
    this.camera.x = Math.max(0, Math.min(this.worldW - this.viewW, this.player.x - this.viewW / 2));
    this.camera.y = Math.max(0, Math.min(this.worldH - this.viewH, this.player.y - this.viewH / 2));

    this.player.trail = []; // 移動履歴（子猫の追従用）

    // 初期スキル（Lv1: 基本爪撃）
    this.skills = {
      scratch:  { level: 1, timer: 0 },
      bonito:   { level: 0, timer: 0, angle: 0 },
      meow:     { level: 0, timer: 0 },
      shichirin:{ level: 0, timer: 0 },
      boots:    { level: 0 },
      magnet:   { level: 0 },
      spice:    { level: 0 },
      lightning: null
    };
    LEVEL_EVOLUTION[1].apply(this);

    // 新要素リスト
    this.tandemRushes = [];
    this.mikoshiRushes = [];
    this.kittens = [];
    this.lightningTimer = 0;
    this.levelUpBanner = null;

    // クリア目標時間と最終決戦フラグ（クリア条件可視化＆大乱闘ラストボス）
    this.targetClearTime = 120; // 120秒（2分）でクリア！
    this.finalBossPhase = false;
    this.remainingBossCount = 0;
    this.isVictoryClear = false;

    // 敵は【完全に0体】からスタート！！
    this.enemies = [];
    this.enemySpawnTimer = 0;
    this.projectiles = [];
    this.meowWaves = [];
    this.dropItems = [];
    this.itemSpawnTimer = 9999; // 平和モード中はアイテムを出さない！戦闘開始後に2.0秒セット
    this.firstCoffeeSpawned = false;
    this.joystickVector = { x: 0, y: 0 };
    this.mouseInput.active = false;
    this.allyCats = [];
    this.particles = [];
    this.damageNumbers = [];
    this.comicPopups = [];

    // イベントフラグ初期化
    this.eventState = 'NONE';
    this.eventTimer = 0;
    this.eventLockoutTimer = 0;
    this.firstPeaceEventDone = false;
    this.firstYankeeEventDone = false;
    this.firstKyonEventDone = false;

    // 開幕平和イベントを発火（敵0体、平和な朝市を満喫！）
    this.triggerPeaceEvent();

    const titleEl = document.getElementById('title-overlay');
    if (titleEl) {
      titleEl.classList.add('hidden');
      titleEl.style.display = 'none';
    }
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
    document.getElementById('levelup-overlay')?.classList.add('hidden');
    document.getElementById('result-overlay')?.classList.add('hidden');

    this.updateUI();
  }

  // 1. 開幕イベント（ゲーム開始時：ゲームを止めずに上部バナーで歓迎演出！）
  triggerPeaceEvent() {
    this.firstPeaceEventDone = true;
    this.eventState = 'NONE';
    this.sound.playMeowRoar();
    // 平和モードBGMが流れていなければ確実にスタート
    if (this.sound.currentBgmType !== 'PEACE') {
      this.sound.startPeaceBGM();
    }
    this.showLevelUpBanner('🌸 平和な勝浦朝市へようこそ！', '移動して朝市をお散歩するニャ！');
  }

  // 告知バナーヘルパー（ゲームを止めずに画面上部に通知）
  showLevelUpBanner(title, sub = '') {
    this.levelUpBanner = {
      title,
      sub,
      timer: 2.8,
      maxTimer: 2.8
    };
  }

  // 自然経過とスキップで同じ戦闘開始処理を使い、BGM・初回敵を二重起動しない。
  startBattle() {
    if (this.isGameInputBlocked() || this.firstYankeeEventDone || this.isVictoryClear ||
        this.eventState !== 'NONE' || this.assistCutin) return false;
    this.survivalTime = Math.max(15, this.survivalTime);
    this.clearInputState();
    this.peaceScene?.reset();
    this.levelUpBanner = null;
    const spawnSide = this.player.x > 600 ? -25 : this.worldW + 25;
    this.triggerYankeeEvent(this.spawnEnemy('tsuppari', spawnSide, 600));
    this.updateUI();
    this.mobileUI?.syncVisibility();
    return true;
  }

  // 2. 初回ヤンキー遭遇（★平和モードから戦闘モードへの転換！スト6風大迫力カットインイベント発動！）
  triggerYankeeEvent(yankeeEnemy) {
    if (this.firstYankeeEventDone) return;
    this.firstYankeeEventDone = true;
    this.eventState = 'YANKEE';
    this.eventTimer = 0;
    this.eventLockoutTimer = 0.5; // 最初の0.5秒は誤タップ防止

    // ★メリハリ演出：平和BGMをストップし、ドラクエ風戦闘エンカウント音 ＋ 即座に戦闘BGMを大迫力で再生！
    this.sound.stopPeaceBGM();
    this.sound.playYankeeEncounter();
    this.sound.startBattleBGM();
    this.screenShake = 0.5;
  }

  // 3. 初回キョン遭遇（★野生キョン専用の奇襲アラート＆甲高い威嚇鳴き声！スト6風カットイン発動！）
  triggerKyonEvent(kyonEnemy) {
    if (this.firstKyonEventDone) return;
    this.firstKyonEventDone = true;
    this.eventState = 'KYON';
    this.eventTimer = 0;
    this.eventLockoutTimer = 0.5;

    // キョン専用の野生奇襲警戒音！
    this.sound.playKyonEncounter();
    this.screenShake = 0.4;
  }

  // カットイン終了＆ゲーム復帰処理（タップ／キー入力または4秒経過でスムーズにバトル突入！）
  endEventCutin() {
    if (this.eventState === 'NONE') return;
    const prevState = this.eventState;
    this.eventState = 'NONE';
    this.eventTimer = 0;
    this.eventLockoutTimer = 0;

    if (prevState === 'YANKEE') {
      // 戦闘BGMスタート！
      this.sound.startBattleBGM();
      this.itemSpawnTimer = 2.0; // 2秒後に最初のアイスコーヒー確定出現
      this.screenShake = 0.45;
      this.showLevelUpBanner('⚠️ 勝浦ヤンキー集団が朝市に乱入！', 'アイテムを急いで拾って、助っ人の援護をつなごう！');
    } else if (prevState === 'KYON') {
      this.screenShake = 0.35;
      this.showLevelUpBanner('🦌 野生のキョンが乱入！', 'すばしっこいキョンに気をつけろ！');
    }
  }

  // ========================================================
  // 格闘ゲーム必殺技風・お助けキャラカットイン演出
  // ========================================================
  triggerAssistCutin(type, speechText) {
    if (this.assistCutin) {
      this.assistCutinQueue.push({ type, speechText });
      return;
    }
    this.assistCutin = {
      type, // 'tandem' | 'mikoshi' | 'noraneko'
      title: 'お助けキャラ登場！',
      speech: speechText,
      timer: 0,
      maxTimer: 1.4, // 約1.4秒のダイナミック必殺技演出
      lockoutTimer: 0.25 // 誤タップ防止
    };
    this.sound.playAssistCutinSE();
    this.screenShake = 0.45;
  }

  endAssistCutin() {
    if (!this.assistCutin) return;
    const type = this.assistCutin.type;
    this.assistCutin = null;

    // カットイン終了時にド派手突進アクションがスタート！
    if (type === 'tandem') {
      this.triggerTandemBikeRush();
    } else if (type === 'mikoshi') {
      this.triggerMikoshiRush(2);
    } else if (type === 'noraneko') {
      this.spawnAllyCat();
    }

    const nextCutin = this.assistCutinQueue.shift();
    if (nextCutin) this.triggerAssistCutin(nextCutin.type, nextCutin.speechText);
  }

  // ★クライマックス最終決戦：真のラスボス「初代 勝浦暴走族総長」降臨！！
  startFinalBossBattle() {
    if (this.finalBossPhase) return;
    this.finalBossPhase = true;
    this.remainingBossCount = 1; // ラスボス総長1体との真剣勝負！

    this.sound.playMeowRoar();
    this.sound.playTaiko();
    this.screenShake = 0.65;

    // ★ユーザー要望：ラスボスが出た時は、他の雑魚敵を完全に0にする！
    this.enemies.forEach(e => {
      for (let s = 0; s < 6; s++) this.addParticle(e.x, e.y, 'smoke');
    });
    this.enemies = []; // 他の敵を完全消去（敵0体）！

    this.showLevelUpBanner('⚠️ 最終決戦！初代 勝浦暴走族総長 降臨！！', '🔥 ラスボス総長を倒して、勝浦朝市の平和を奪還せよ！');

    // プレイヤーの正面から堂々と現れる真のラスボス総長（1体単騎）！
    const bossX = this.player.x + (this.player.dir === 'left' ? -300 : 300);
    const bossY = Math.max(545, Math.min(660, this.player.y));
    const boss = this.spawnEnemy('boss_yankee', bossX, bossY);
    boss.isBoss = true;
    boss.isFinalBoss = true;
    boss.hp = GAME_BALANCE.finalBossHp;
    boss.maxHp = boss.hp;
    boss.speed = 2.0;
    boss.atk = 42;
    boss.name = '👑 初代 勝浦暴走族総長';

    // ボス降臨の特大スパーク
    for (let s = 0; s < 24; s++) {
      this.addParticle(boss.x, boss.y, 'spark');
    }
  }

  // ★完全勝利クリア演出（敵0状態・戦闘BGM停止・勝利ファンファーレ・エンディング移行）
  triggerVictoryClear() {
    if (this.isVictoryClear) return;
    this.isVictoryClear = true;

    // ★ユーザー要望：ラスボスを倒しきったら敵0状態に！
    this.enemies.forEach(e => {
      e.hp = 0;
      for (let s = 0; s < 14; s++) this.addParticle(e.x, e.y, 'confetti');
    });
    this.enemies = []; // 完全な敵0状態！

    // ★戦闘BGM完全停止＆勝利のグランドファンファーレ再生！
    this.sound.stopBGM();
    this.sound.playVictoryFanfare();
    this.sound.playTaiko();
    this.screenShake = 0.6;

    // 画面いっぱいに大量の勝利花火＆紙吹雪
    for (let i = 0; i < 90; i++) {
      this.addParticle(this.player.x + (Math.random() - 0.5) * 500, this.player.y + (Math.random() - 0.5) * 300, 'confetti');
      this.addParticle(this.player.x + (Math.random() - 0.5) * 500, this.player.y + (Math.random() - 0.5) * 300, 'spark');
    }

    this.showLevelUpBanner('🎉 勝浦朝市平和奪還！完全勝利！！', '暴走族総長を撃破！勝浦朝市に平和が戻ったニャ！！');

    // ファンファーレが響き渡った後（3.2秒後）に感動のエンディング画面へ！
    this.victoryClearTimerRemaining = 3.2;
  }

  // ========================================================
  // 4. 更新ロジック（サバイバーコア）
  // ========================================================
  update(dt) {
    if (this.isGameInputBlocked()) return;

    const tutorialOverlay = document.getElementById('tutorial-overlay');
    if (tutorialOverlay && !tutorialOverlay.classList.contains('hidden')) return;

    this.simulationTime = (this.simulationTime || 0) + dt;
    if (this.lightningFlashTimer > 0) this.lightningFlashTimer = Math.max(0, this.lightningFlashTimer - dt);

    if (this.isVictoryClear) {
      this.victoryClearTimerRemaining = Math.max(0, this.victoryClearTimerRemaining - dt);
      this.updateParticles(dt);
      this.updateDamageNumbers(dt);
      this.updateComicPopups(dt);
      if (this.levelUpBanner) {
        this.levelUpBanner.timer -= dt;
        if (this.levelUpBanner.timer <= 0) this.levelUpBanner = null;
      }
      if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 2.5);
      if (this.victoryClearTimerRemaining === 0) this.endGame(true);
      return;
    }

    // カットインイベント中（ヤンキー乱入・キョン乱入時：演出をしっかり見せる）
    if (this.eventState !== 'NONE') {
      this.eventTimer += dt;
      if (this.eventLockoutTimer > 0) this.eventLockoutTimer -= dt;
      // 4.0秒経過で自動進行（安全弁）
      if (this.eventTimer >= 4.0) {
        this.endEventCutin();
      }
      // イベント中は敵の動きや攻撃、タイマーを一時停止して演出に集中
      this.updateCamera();
      return;
    }

    // お助けキャラカットイン演出中（1.4秒後に自動復帰、またはタップ/クリックで即スキップ！）
    if (this.assistCutin) {
      this.assistCutin.timer += dt;
      if (this.assistCutin.lockoutTimer > 0) this.assistCutin.lockoutTimer -= dt;
      // 1.4秒の演出完了で自動的に戦闘へ爽快復帰！（操作不要でテンポ抜群）
      if (this.assistCutin.timer >= (this.assistCutin.maxTimer || 1.4)) {
        this.endAssistCutin();
      }
      this.updateCamera();
      return;
    }

    this.survivalTime += dt;

    // 平和時間（15.0秒）を過ぎたら、最初のヤンキーが襲来！（格ゲーカットイン発動！）
    if (this.survivalTime >= 15.0 && !this.firstYankeeEventDone) {
      this.startBattle();
    }


    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 2.5);
    }

    this.updatePlayer(dt);
    this.peaceScene?.update(dt);
    this.updateKittens(dt);
    this.updateSkills(dt);
    this.updateTandemRushes(dt);
    this.updateMikoshiRushes(dt);
    this.updateLightning(dt);
    this.updateProjectiles(dt);
    this.updateEnemyWaves(dt);
    this.updateEnemies(dt);
    this.updateAllyCats(dt);
    this.updateDropItems(dt);
    this.updateParticles(dt);
    this.updateDamageNumbers(dt);
    this.updateComicPopups(dt);

    // バナータイマー更新
    if (this.levelUpBanner) {
      this.levelUpBanner.timer -= dt;
      if (this.levelUpBanner.timer <= 0) {
        this.levelUpBanner = null;
      }
    }

    // 定期的な朝市アイテム自然ポップ（敵ドロップではなく歩道にランダム自然発生）
    this.updateRandomItemSpawns(dt);

    this.updateCamera();

    // UIのDOM更新（毎フレームのレイアウト再計算を完全防止！0.1秒ごとにスムーズ更新）
    this.uiTimer = (this.uiTimer || 0) + dt;
    if (this.uiTimer >= 0.10) {
      this.uiTimer = 0;
      this.updateUI();
    }

    // プレイヤー死亡チェック
    if (this.isVictoryClear) {
      this.updateUI();
      return;
    }
    if (this.player.hp <= 0) {
      this.endGame(false);
      return;
    }
    // ★制限時間到達：勝手に終わらず、クライマックス最終ボス決戦を発動！
    if (this.survivalTime >= this.targetClearTime && !this.finalBossPhase && !this.isVictoryClear) {
      this.startFinalBossBattle();
    }
  }

  updatePlayer(dt) {
    const p = this.player;

    // バフ・アニメーションタイマー
    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
    if (p.speedBuffTimer > 0) p.speedBuffTimer -= dt;
    if (p.scratchAnimTimer > 0) p.scratchAnimTimer -= dt; // ひっかき攻撃モーションタイマー

    // ノックバック処理
    if (p.knockbackTimer > 0) {
      p.knockbackTimer -= dt;
      this.moveWithCollision(p, p.knockbackVx * dt * 60, p.knockbackVy * dt * 60);
      p.knockbackVx *= 0.86;
      p.knockbackVy *= 0.86;
      p.animFrame = 3;
      return;
    }

    // ========================================================
    // 移動入力（PCキーボード・マウスドラッグ / スマホスティック）
    // ========================================================
    let moveX = 0, moveY = 0;

    // 1. キーボード入力（WASD / 矢印キー）
    const isUp = this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W'];
    const isDown = this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S'];
    const isLeft = this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A'];
    const isRight = this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'] || this.keys['D'];

    if (isUp) moveY -= 1;
    if (isDown) moveY += 1;
    if (isLeft) moveX -= 1;
    if (isRight) moveX += 1;

    const hasKeyboardInput = (isUp || isDown || isLeft || isRight);
    if (hasKeyboardInput) {
      // キーボード操作時はマウス追従を無効化（入力の競合・カクつきを完全防止！）
      if (this.mouseInput) this.mouseInput.active = false;
    }

    // 2. スマホ用：右下バーチャルスティック（グリグリ操作）
    const joyMag = Math.hypot(this.joystickVector.x, this.joystickVector.y);
    if (joyMag > 0.08) {
      moveX += this.joystickVector.x;
      moveY += this.joystickVector.y;
    }

    // 3. PC用：マウス操作（左クリック・ドラッグ中のみ滑らかに追従！）
    if (!hasKeyboardInput && joyMag <= 0.08 && this.mouseInput && this.mouseInput.isDown) {
      const mouseWorldX = this.mouseInput.x + this.camera.x;
      const mouseWorldY = this.mouseInput.y + this.camera.y;
      const mdx = mouseWorldX - p.x;
      const mdy = mouseWorldY - p.y;
      const mdist = Math.hypot(mdx, mdy);

      // デッドゾーン付近での急停止ジッターを無くすスムース減速
      if (mdist > 16) {
        const smoothFactor = Math.min(1.0, (mdist - 16) / 28);
        moveX = (mdx / mdist) * smoothFactor;
        moveY = (mdy / mdist) * smoothFactor;
      }
    }

    const inputLen = Math.hypot(moveX, moveY);
    const isMoving = inputLen > 0.05;
    p.isMoving = isMoving;

    // 韋駄天ブーツ＆コーヒーバフ適用（ボタンなしでも常に爽快に走れる快速スピード）
    let currentSpeed = 5.6 * (1 + this.skills.boots.level * 0.15);
    if (p.speedBuffTimer > 0) currentSpeed *= 1.4;

    // ダッシュ（スマホ右側ダッシュボタン、またはPC Shift/Spaceキーで1.4倍ダッシュ！）
    const isDashing = this.touchDash || this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['Space'];
    p.isDashing = isDashing;
    if (isDashing) currentSpeed *= 1.4;

    if (isMoving) {
      const nx = moveX / inputLen;
      const ny = moveY / inputLen;

      if (Math.abs(nx) >= Math.abs(ny) * 0.7) {
        p.dir = nx > 0 ? 'right' : 'left';
        p.facing = nx > 0 ? 1 : -1;
      } else {
        p.dir = ny < 0 ? 'up' : 'down';
        if (Math.abs(nx) > 0.15) p.facing = nx > 0 ? 1 : -1;
      }

      // フレームレート非依存の安定移動（dt * 60 で常に滑らか！）
      const speedFactor = Math.min(1.0, inputLen);
      const frameSpeed = currentSpeed * speedFactor * dt * 60;
      const vx = nx * frameSpeed;
      const vy = ny * frameSpeed;
      this.moveWithCollision(p, vx, vy);

      // アニメーション進行（秒間12コマで軽快にダッシュ）
      p.animTimer += dt * 12;
      p.animFrame = Math.floor(p.animTimer) % 4;

      // 走っているときの足元土煙エフェクト
      p.smokeTimer = (p.smokeTimer || 0) + dt;
      if (p.smokeTimer > 0.16) {
        p.smokeTimer = 0;
        this.addParticle(p.x - p.facing * 10, p.y + 10, 'smoke');
      }
    } else {
      p.animFrame = 0;
      p.animTimer = 0;
    }

    if (p.speedBuffTimer > 0) {
      p.speedSmokeTimer = (p.speedSmokeTimer || 0) + dt;
      while (p.speedSmokeTimer >= 0.12) {
        p.speedSmokeTimer -= 0.12;
        this.addParticle(p.x + (Math.random() - 0.5) * 16, p.y - 12, 'smoke');
      }
    } else {
      p.speedSmokeTimer = 0;
    }

    // 子猫追従用の移動履歴記録
    if (!p.trail) p.trail = [];
    p.trail.unshift({ x: p.x, y: p.y, facing: p.facing, dir: p.dir, isMoving: p.isMoving });
    if (p.trail.length > 50) p.trail.pop();
  }

  // なめらかな壁ずり（Wall Slide）衝突判定移動システム
  moveWithCollision(entity, vx, vy) {
    const totalDist = Math.hypot(vx, vy);
    if (totalDist < 0.001) return;

    const steps = Math.max(1, Math.ceil(totalDist / 2.0));
    const stepVx = vx / steps;
    const stepVy = vy / steps;

    for (let s = 0; s < steps; s++) {
      // X軸移動（壁に当たったらXだけ止まり、Y軸移動を阻害しない！）
      const targetX = entity.x + stepVx;
      if (!this.checkFootCollision(targetX, entity.y)) {
        entity.x = Math.max(20, Math.min(this.worldW - 20, targetX));
      }

      // Y軸移動（壁に当たったらYだけ止まり、X軸移動を阻害しない！）
      const targetY = entity.y + stepVy;
      if (!this.checkFootCollision(entity.x, targetY)) {
        entity.y = Math.max(20, Math.min(this.worldH - 20, targetY));
      }
    }
  }

  // ========================================================
  // 5. スキル・自動攻撃システム（ダダサバイバー超爽快・ド派手無双仕様）
  // ========================================================
  updateSkills(dt) {
    const p = this.player;
    const spiceLv = this.skills.spice.level;
    const cdMult = Math.max(0.35, 1.0 - spiceLv * 0.12);
    const dmgMult = 1.0 + spiceLv * 0.35;

    // 1. 三毛猫の爪撃（Lv1:単発、Lv2:2連撃、Lv3:3連撃＆広角化！）
    if (this.skills.scratch.level > 0) {
      this.skills.scratch.timer += dt;
      const scratchCD = Math.max(0.18, (0.42 - this.skills.scratch.level * 0.04) * cdMult);
      if (this.skills.scratch.timer >= scratchCD) {
        this.skills.scratch.timer = 0;
        this.fireAutoScratch(dmgMult);
      }
    }

    // 2. 勝浦特産・ブーメランカツオ（常にミケから放たれ、弧を描いて戻ってくる！）
    if (this.skills.bonito.level > 0) {
      // 画面上を現在飛んでいるブーメランカツオの数
      const activeBonitos = this.projectiles.filter(pr => pr.type === 'bonito_throw').length;
      const maxBonitos = this.skills.bonito.level; // Lv1なら1匹、Lv2なら2匹、Lv3なら3匹

      this.skills.bonito.timer += dt;
      // カツオが最大数未満であれば、短い間隔（0.22秒）で次弾を射出！
      // 戻ってキャッチされたら即座に再発射され、常に放たれて戻ってくるループを維持！
      if (activeBonitos < maxBonitos && this.skills.bonito.timer >= 0.22) {
        this.skills.bonito.timer = 0;
        this.fireBonitoBoomerang(dmgMult);
      }
    }

    // 3. ニャー威嚇衝撃波（巨大黄金ブラスト）
    if (this.skills.meow.level > 0) {
      this.skills.meow.timer += dt;
      const meowCD = Math.max(0.45, (1.2 - this.skills.meow.level * 0.16) * cdMult);
      if (this.skills.meow.timer >= meowCD) {
        this.skills.meow.timer = 0;
        this.fireMeowShockwave(dmgMult);
      }
    }

    // 4. 炭火七輪ファイア（扇状火炎弾幕）
    if (this.skills.shichirin.level > 0) {
      this.skills.shichirin.timer += dt;
      const fireCD = Math.max(0.35, (0.9 - this.skills.shichirin.level * 0.14) * cdMult);
      if (this.skills.shichirin.timer >= fireCD) {
        this.skills.shichirin.timer = 0;
        this.fireShichirinFlames(dmgMult);
      }
    }
  }

  // 手動爪撃ラッシュ（Spaceキーで近接奥義！目の前の敵を薙ぎ払う！）
  manualScratchRush() {
    this.sound.playSlash();
    this.screenShake = 0.22;
    const p = this.player;
    p.scratchAnimTimer = 0.25; // 手動奥義ひっかきモーション発動！
    const baseAngle = p.dir === 'right' ? 0 : p.dir === 'left' ? Math.PI : p.dir === 'up' ? -Math.PI/2 : Math.PI/2;
    for (let i = -3; i <= 3; i++) {
      const a = baseAngle + i * 0.16;
      this.projectiles.push({
        type: 'scratch',
        x: p.x + Math.cos(a) * 16,
        y: p.y - 12 + Math.sin(a) * 16,
        vx: Math.cos(a) * 480,
        vy: Math.sin(a) * 480,
        life: 0.28,
        damage: 65 * (1 + this.skills.spice.level * 0.35),
        penetrate: 99,
        hitEnemies: []
      });
    }
    for (let s = 0; s < 6; s++) {
      this.addParticle(p.x + (p.dir === 'right' ? 24 : -24), p.y - 10, 'spark');
    }
  }

  // 手動ニャー威嚇（Cキーで全画面吹き飛ばし！）
  manualMeowRoar() {
    if (this.player.stamina < 20) return;
    this.player.stamina -= 20;
    this.sound.playMeowRoar();
    this.screenShake = 0.35;
    this.fireMeowShockwave(2.2);
  }

  // 最寄り敵の探索（O(N)超軽量・高速処理）
  getClosestEnemy(x, y, maxDist = Infinity) {
    let closest = null;
    let minDistSq = maxDist * maxDist;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dx = e.x - x;
      const dy = e.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = e;
      }
    }
    return closest;
  }

  // 自動爪撃（親ミケ＋子ミケ連動：ツメLv3＆子ミケ3匹で合計14ツメ一斉射出！）
  fireAutoScratch(dmgMult) {
    if (this.enemies.length === 0) return;
    const p = this.player;
    const lv = this.skills.scratch.level;

    // 最寄りの敵を索敵（O(N)で超高速化！165px以内）
    const target = this.getClosestEnemy(p.x, p.y - 12, 165);
    if (!target) return; // 間合いに入った時だけ発動

    const baseAngle = Math.atan2(target.y - (p.y - 12), target.x - p.x);
    this.sound.playSlash();

    // 親ミケのひっかきモーション発動！（前足を突き出して鋭い爪を光らせる）
    p.scratchAnimTimer = 0.22;
    if (Math.cos(baseAngle) > 0.2) {
      p.facing = 1;
      p.dir = 'right';
    } else if (Math.cos(baseAngle) < -0.2) {
      p.facing = -1;
      p.dir = 'left';
    }

    // ========================================================
    // 1. 親ミケのツメ発射（Lv1: 2本, Lv2: 3本, Lv3: 5本）
    // 範囲をタイトに狭め、鋭い近接爪撃に！
    // ========================================================
    const parentBladeCount = lv === 1 ? 2 : lv === 2 ? 3 : 5;
    for (let i = 0; i < parentBladeCount; i++) {
      // 扇状拡散角度（タイトでシャープな扇状）
      const spread = (i - (parentBladeCount - 1) / 2) * 0.11;
      const angle = baseAngle + spread;
      this.projectiles.push({
        type: 'scratch',
        isKitten: false,
        x: p.x + (p.facing || 1) * 12,
        y: p.y - 12,
        vx: Math.cos(angle) * 440,
        vy: Math.sin(angle) * 440,
        life: 0.22, // 寿命を短くして飛びすぎないように（有効射程約95px）
        damage: (45 + lv * 16) * dmgMult,
        penetrate: 2 + lv,
        hitEnemies: []
      });
    }

    // ========================================================
    // 2. 子ミケたちの連動ミニツメ発射！
    // 1匹あたり：Lv1: 1本, Lv2: 2本, Lv3: 3本
    // ➜ 子ミケ3匹＋ツメLv3なら：親5本 ＋ 子3匹×3本 ＝ 合計 14ツメ！！
    // ========================================================
    if (this.kittens && this.kittens.length > 0) {
      const kittenBladeCount = lv === 1 ? 1 : lv === 2 ? 2 : 3;

      this.kittens.forEach((kit, kIdx) => {
        // 各子ミケからターゲットへの角度
        const kitAngle = Math.atan2(target.y - (kit.y - 6), target.x - kit.x);

        for (let k = 0; k < kittenBladeCount; k++) {
          const kSpread = (k - (kittenBladeCount - 1) / 2) * 0.14;
          const finalAngle = kitAngle + kSpread;

          // 子ミケもひっかきモーション発動！
          kit.scratchAnimTimer = 0.22;
          if (Math.cos(finalAngle) > 0.2) {
            kit.facing = 1;
            kit.dir = 'right';
          } else if (Math.cos(finalAngle) < -0.2) {
            kit.facing = -1;
            kit.dir = 'left';
          }

          this.projectiles.push({
            type: 'scratch',
            isKitten: true, // 子ミケ専用ミニツメ（さらに小さい爪撃）
            x: kit.x + (kit.facing || 1) * 8,
            y: kit.y - 6,
            vx: Math.cos(finalAngle) * 410,
            vy: Math.sin(finalAngle) * 410,
            life: 0.19, // 極小射程（約78px）
            damage: (20 + lv * 8) * dmgMult,
            penetrate: 1 + lv,
            hitEnemies: []
          });
          this.addParticle(kit.x, kit.y - 6, 'spark');
        }
      });
    }
  }

  // 勝浦特産・ブーメランカツオ（常に放たれ、弧を描いて戻ってくる！）
  fireBonitoBoomerang(dmgMult = 1.0) {
    const p = this.player;
    const lv = this.skills.bonito.level;
    if (lv <= 0) return;

    // ターゲット角度（最寄りの敵、敵がいない時はプレイヤーの向き）
    let targetAngle = 0;
    const target = this.getClosestEnemy(p.x, p.y - 10);
    if (target) {
      targetAngle = Math.atan2(target.y - (p.y - 10), target.x - p.x);
    } else {
      if (p.facing === 1) targetAngle = 0;
      else if (p.facing === -1) targetAngle = Math.PI;
      if (p.dir === 'up') targetAngle = -Math.PI / 2;
      if (p.dir === 'down') targetAngle = Math.PI / 2;
    }

    // 自然な放物線のための微小スプレッド＆左右カーブ
    const spread = (Math.random() - 0.5) * 0.3;
    const launchAngle = targetAngle + spread;
    const speed = 460;
    const curveDir = Math.random() < 0.5 ? 1 : -1;

    this.sound.playBoomerang();
    this.projectiles.push({
      type: 'bonito_throw',
      x: p.x,
      y: p.y - 10,
      vx: Math.cos(launchAngle) * speed,
      vy: Math.sin(launchAngle) * speed,
      startX: p.x,
      startY: p.y - 10,
      maxDist: 220 + lv * 15,
      state: 'flying_out', // 'flying_out' -> 'returning'
      age: 0,
      outTime: 0.44, // 約0.44秒間前方へ弧を描く
      curveAngle: curveDir * 3.2, // 旋回角速度
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: 22.0, // カツオの高速回転
      damage: (48 + lv * 18) * dmgMult,
      hitCooldowns: new Map(), // 敵ごとの多段ヒットタイマー
      life: 2.8 // セーフティ制限時間
    });

    for (let s = 0; s < 3; s++) this.addParticle(p.x, p.y - 10, 'splash');
  }

  // ========================================================
  // 子猫（チビミケ1号・2号）の追従・援護システム
  // ========================================================
  updateKittens(dt) {
    if (!this.kittens || this.kittens.length === 0) return;
    const p = this.player;
    if (!p.trail || p.trail.length === 0) return;

    this.kittens.forEach((kit, idx) => {
      // 履歴インデックス（親猫の足跡をたどる）
      const tIdx = Math.min(p.trail.length - 1, (idx + 1) * 12);
      const targetPos = p.trail[tIdx];

      if (targetPos) {
        // 1号は左後ろ、2号は右後ろにオフセットをつけて親猫と重ならず並走！
        const offsetX = (idx === 0 ? -22 : 22);
        const offsetY = (idx === 0 ? 6 : -6);
        const tx = targetPos.x + offsetX;
        const ty = targetPos.y + offsetY;

        if (kit.x === undefined) { kit.x = tx; kit.y = ty; }
        kit.x += (tx - kit.x) * 0.22;
        kit.y += (ty - kit.y) * 0.22;
        // 攻撃中でなければ親の向きに追従
        if (!kit.scratchAnimTimer || kit.scratchAnimTimer <= 0) {
          kit.facing = targetPos.facing || 1;
          kit.dir = targetPos.dir || 'down';
        }
        kit.isMoving = p.isMoving;
      }

      // 子猫のひっかきアニメーションタイマー減算
      if (kit.scratchAnimTimer > 0) {
        kit.scratchAnimTimer -= dt;
      }

      kit.animTimer = (kit.animTimer || 0) + dt * (kit.isMoving ? 12 : 2);
      kit.animFrame = Math.floor(kit.animTimer) % 4;

      // 子猫の定期援護牽制（親ミケのツメクールダウン中も近くの敵へミニツメ牽制！）
      kit.attackTimer = (kit.attackTimer || 0) + dt;
      const attackInterval = idx === 0 ? 0.90 : idx === 1 ? 0.95 : 0.85;
      if (kit.attackTimer >= attackInterval) {
        kit.attackTimer = 0;
        this.fireKittenScratch(kit);
      }
    });
  }

  // 子猫のミニ爪撃（ミケのツメをさらに小さくした極小鋭利な爪痕！O(N)超軽量索敵）
  fireKittenScratch(kit) {
    if (this.enemies.length === 0) return;
    const target = this.getClosestEnemy(kit.x, kit.y, 140);
    if (!target) return; // 至近距離の敵へ牽制

    const lv = this.skills.scratch.level;
    const dmg = (20 + lv * 7) * (1 + this.skills.spice.level * 0.35);
    const angle = Math.atan2(target.y - kit.y, target.x - kit.x);

    // 子ミケもひっかきモーション発動！
    kit.scratchAnimTimer = 0.22;
    if (Math.cos(angle) > 0.2) {
      kit.facing = 1;
      kit.dir = 'right';
    } else if (Math.cos(angle) < -0.2) {
      kit.facing = -1;
      kit.dir = 'left';
    }

    this.sound.playSlash();
    this.projectiles.push({
      type: 'scratch',
      isKitten: true, // 子猫専用ミニツメ
      x: kit.x + (kit.facing || 1) * 8,
      y: kit.y - 6,
      vx: Math.cos(angle) * 410,
      vy: Math.sin(angle) * 410,
      life: 0.19,
      damage: dmg,
      penetrate: 1 + lv,
      hitEnemies: []
    });
    this.addParticle(kit.x, kit.y - 6, 'spark');
  }

  // 子猫2号のミニカツオ投擲
  fireKittenFish(kit) {
    if (this.enemies.length === 0) return;
    const sorted = [...this.enemies].sort((a, b) => {
      return Math.hypot(a.x - kit.x, a.y - kit.y) - Math.hypot(b.x - kit.x, b.y - kit.y);
    });
    const target = sorted[0];
    const dist = Math.hypot(target.x - kit.x, target.y - kit.y);
    if (dist > 250) return;

    this.sound.playBoomerang();
    const angle = Math.atan2(target.y - kit.y, target.x - kit.x);
    this.projectiles.push({
      type: 'bonito_throw',
      isKitten: true,
      x: kit.x,
      y: kit.y - 6,
      vx: Math.cos(angle) * 390,
      vy: Math.sin(angle) * 390,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: 14.0,
      life: 0.85,
      damage: 34,
      penetrate: 3,
      hitEnemies: []
    });
  }

  // ========================================================
  // 最終電撃（勝浦神罰落雷システム：Lv8以上）
  // ========================================================
  updateLightning(dt) {
    if (!this.skills.lightning || this.skills.lightning.level <= 0) return;
    this.lightningTimer += dt;
    const interval = this.skills.lightning.interval || 4.0;
    if (this.lightningTimer >= interval) {
      this.lightningTimer = 0;
      this.triggerLightningStrike();
    }
  }

  triggerLightningStrike() {
    if (this.enemies.length === 0) return;
    this.sound.playHit();
    this.screenShake = 0.4;

    // 画面内にいる敵を最大10体選定
    const visibleEnemies = this.enemies.filter(e => {
      return e.x >= this.camera.x - 50 && e.x <= this.camera.x + this.viewW + 50 &&
             e.y >= this.camera.y - 50 && e.y <= this.camera.y + this.viewH + 50;
    });

    const targets = visibleEnemies.length > 0 ? visibleEnemies.slice(0, 10) : this.enemies.slice(0, 6);
    const dmg = 120 * (1 + (this.skills.lightning.level - 1) * 0.35) * GAME_BALANCE.autoAttackMultiplier;

    targets.forEach(e => {
      if (!this.damageEnemy(e, dmg)) return;
      e.knockbackVx = (Math.random() - 0.5) * 80;
      e.knockbackVy = 80;
      e.stunTimer = 1.8;

      // 激しい落雷エフェクト用パーティクル
      for (let s = 0; s < 12; s++) {
        this.addParticle(e.x + (Math.random() - 0.5) * 24, e.y - s * 14, 'spark');
      }
    });

    // 画面フラッシュ用タイマー
    this.lightningFlashTimer = 0.12;
    this.lightningBolts = Array.from({ length: 3 }, (_, index) => {
      let x = (index + 1) * (this.viewW / 4) + (Math.random() - 0.5) * 60;
      let y = 0;
      const points = [{ x, y }];
      while (y < this.viewH) {
        x += (Math.random() - 0.5) * 50;
        y += 30 + Math.random() * 40;
        points.push({ x, y });
      }
      return points;
    });
  }

  // ========================================================
  // タンデムクロスバイク爆走（60代男女の超高速薙ぎ払い）
  // ========================================================
  triggerTandemBikeRush() {
    if (this.tandemRushes.length >= GAME_BALANCE.maxTandems) this.tandemRushes.shift();
    const dir = Math.random() < 0.5 ? 1 : -1; // 1: 左から右, -1: 右から左
    const startX = dir === 1 ? this.camera.x - 220 : this.camera.x + this.viewW + 220;
    const y = Math.max(130, Math.min(this.worldH - 130, this.player.y + (Math.random() - 0.5) * 40));

    this.tandemRushes.push({
      x: startX,
      y: y,
      dir: dir,
      speed: 480, // 速度を落としてしっかり視認できる爽快スピード！
      w: 180,     // サイズを大きく！
      h: 107,
      hitEnemies: [],
      smokeTimer: 0,
      bellTimer: 0
    });

    // ★自転車の澄んだ「チリリリーン♪」ベル効果音！
    this.sound.playBicycleBell();
    this.screenShake = 0.25;
  }

  updateTandemRushes(dt) {
    const enemySnapshot = this.enemies.slice();
    for (let i = this.tandemRushes.length - 1; i >= 0; i--) {
      const t = this.tandemRushes[i];
      t.x += t.dir * t.speed * dt;
      t.smokeTimer += dt;
      t.bellTimer = (t.bellTimer || 0) + dt;

      // 走行中に少し進んだらもう一度ベルをチリン！
      if (t.bellTimer >= 0.75 && !t.secondBellDone) {
        t.secondBellDone = true;
        this.sound.playBicycleBell();
      }

      if (t.smokeTimer > 0.05) {
        t.smokeTimer = 0;
        this.addParticle(t.x - t.dir * 60, t.y + 25, 'smoke');
        this.addParticle(t.x, t.y + 25, 'spark');
      }

      // 敵との衝突判定（当たり判定を半径100pxに大幅拡大！通り道の敵をごっそり跳ね飛ばす）
      enemySnapshot.forEach(e => {
        if (t.hitEnemies.includes(e)) return;
        const dist = Math.hypot(e.x - t.x, e.y - t.y);
        if (dist < 100) {
          if (!this.damageEnemy(e, 160, t.x - t.dir * 40, t.y)) return;
          t.hitEnemies.push(e);
          // 特大ダメージ！
          this.sound.playHit();
          e.knockbackVx = t.dir * 480;
          e.knockbackVy = -180;
          for (let s = 0; s < 6; s++) this.addParticle(e.x, e.y, 'spark');
          for (let s = 0; s < 4; s++) this.addParticle(e.x, e.y, 'confetti');
        }
      });

      // 画面外に抜けたら終了
      const isOut = t.dir === 1 ? (t.x > this.camera.x + this.viewW + 350) : (t.x < this.camera.x - 350);
      if (isOut) {
        this.tandemRushes.splice(i, 1);
      }
    }
  }

  // ========================================================
  // ========================================================
  // 勝浦神輿軍団爆走（白装束の担ぎ手たちが黄金神輿で大突進！★複数出現OK！）
  // ========================================================
  triggerMikoshiRush(count = 2) {
    const dir = Math.random() < 0.5 ? 1 : -1; // 1: 左から右, -1: 右から左
    const spawnOne = (c) => {
      if (this.state !== 'PLAYING') return;
      const startX = dir === 1 ? this.camera.x - 340 - c * 180 : this.camera.x + this.viewW + 340 + c * 180;
      // 上下段に散らして朝市通りを面で制圧！
      const yOffset = (c === 0 ? -40 : 40) + (Math.random() - 0.5) * 20;
      const y = Math.max(450, Math.min(this.worldH - 140, this.player.y + yOffset));

      if (this.mikoshiRushes.length >= GAME_BALANCE.maxMikoshi) this.mikoshiRushes.shift();
      this.mikoshiRushes.push({
        delay: c * 0.14,
        x: startX,
        y: y,
        dir: dir,
        speed: 440 + Math.random() * 40,
        w: 240,     // 黄金神輿と担ぎ手たちの堂々たるワイドサイズ！
        h: 134,
        hitEnemies: [],
        smokeTimer: 0,
        bobTimer: Math.random() * 10,
        shoutTimer: 0
      });

      // 祭り太鼓 ＋ 神輿音源
      this.sound.playTaiko();
      this.sound.playMikoshiSound();
    };

    // ゲーム時間で遅延させるため、一時停止中・リトライ後に出現しない。
    for (let c = 0; c < count; c++) spawnOne(c);

    this.screenShake = 0.38; // 重厚な地響き！
    this.addComicPopup(this.player.x, this.player.y - 45, '🏮 勝浦神輿軍団 参上！！', '#f59e0b');
  }

  updateMikoshiRushes(dt) {
    if (!this.mikoshiRushes || this.mikoshiRushes.length === 0) return;
    const enemySnapshot = this.enemies.slice();

    for (let i = this.mikoshiRushes.length - 1; i >= 0; i--) {
      const t = this.mikoshiRushes[i];
      if (t.delay > 0) { t.delay -= dt; continue; }
      t.x += t.dir * t.speed * dt;
      t.smokeTimer += dt;
      t.bobTimer += dt * 14; // リズミカルな上下「ヨイショ！」の波
      t.shoutTimer += dt;

      // 足元の力強い砂煙＆金色の祭り火花
      if (t.smokeTimer > 0.04) {
        t.smokeTimer = 0;
        this.addParticle(t.x - t.dir * 80 + (Math.random() - 0.5) * 40, t.y + 35, 'smoke');
        this.addParticle(t.x + (Math.random() - 0.5) * 80, t.y + 20, 'spark');
      }

      // 定期的な威勢のいい掛け声ポップアップ＆太鼓
      if (t.shoutTimer > 0.65) {
        t.shoutTimer = 0;
        const shouts = ['🏮 ソリャ！', '🏮 セイヤ！', '🏮 ヨイショ！', '🏮 大漁！'];
        const shout = shouts[Math.floor(Math.random() * shouts.length)];
        this.addComicPopup(t.x + (Math.random() - 0.5) * 60, t.y - 45 - Math.random() * 20, shout, '#fbbf24');
        this.sound.playTaiko();
      }

      // 敵との豪快な衝突判定（当たり判定半径125px！）
      enemySnapshot.forEach(e => {
        if (t.hitEnemies.includes(e)) return;
        const dist = Math.hypot(e.x - t.x, e.y - t.y);
        if (dist < 125) {
          if (!this.damageEnemy(e, 220, t.x - t.dir * 60, t.y)) return;
          t.hitEnemies.push(e);
          // 神輿の一撃必殺超ド級ダメージ！
          this.sound.playHit();
          e.knockbackVx = t.dir * 520;
          e.knockbackVy = -240; // 上空へ豪快に打ち上げ！
          for (let s = 0; s < 8; s++) this.addParticle(e.x, e.y, 'spark');
          for (let s = 0; s < 6; s++) this.addParticle(e.x, e.y, 'confetti');
        }
      });

      // 画面外に抜けたら終了
      const isOut = t.dir === 1 ? (t.x > this.camera.x + this.viewW + 400) : (t.x < this.camera.x - 400);
      if (isOut) {
        this.mikoshiRushes.splice(i, 1);
        if (this.mikoshiRushes.length === 0) {
          this.sound.stopMikoshiSound();
        }
      }
    }
  }

  // ニャー威嚇衝撃波（超広範囲爆発＆敵大群ノックバック）
  fireMeowShockwave(dmgMult) {
    const p = this.player;
    const lv = this.skills.meow.level;
    const radius = 180 + lv * 38;
    const dmg = (35 + lv * 18) * dmgMult;
    const stunDuration = 1.6 + lv * 0.25;

    this.sound.playMeowRoar();
    this.screenShake = 0.25;
    this.meowWaves.push({
      x: p.x,
      y: p.y,
      currentRadius: 15,
      maxRadius: radius,
      life: 0.45,
      maxLife: 0.45
    });

    // 周囲の敵を一網打尽
    [...this.enemies].forEach(e => {
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist <= radius) {
        if (!this.damageEnemy(e, dmg)) return;
        e.stunTimer = Math.max(e.stunTimer, stunDuration);
        const nx = (e.x - p.x) || 1;
        const ny = (e.y - p.y) || 0;
        const nd = Math.hypot(nx, ny);
        e.x += (nx / nd) * 55;
        e.y += (ny / nd) * 55;
      }
    });
  }

  // 炭火七輪ファイア（扇状大火炎放射）
  fireShichirinFlames(dmgMult) {
    const p = this.player;
    const lv = this.skills.shichirin.level;
    const count = 3 + lv * 2;
    const baseAngle = p.dir === 'right' ? 0 : p.dir === 'left' ? Math.PI : p.dir === 'up' ? -Math.PI/2 : Math.PI/2;

    this.sound.playSlash();
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.18;
      const a = baseAngle + spread;
      this.projectiles.push({
        type: 'fire',
        x: p.x,
        y: p.y - 10,
        vx: Math.cos(a) * 380,
        vy: Math.sin(a) * 380,
        life: 0.55,
        damage: (24 + lv * 12) * dmgMult,
        penetrate: 4,
        hitEnemies: []
      });
    }
  }

  // （旧周回カツオ処理は全廃し、放たれて戻るブーメランカツオのみに統一）
  checkBonitoCollisions(dmgMult) {}

  // 投射物更新
  // 投射物更新（ブーメランカツオの往復ホーミング・キャッチ＆通常弾）
  updateProjectiles(dt) {
    const p = this.player;
    const enemySnapshot = this.enemies.slice();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];

      // ==========================================
      // A. 勝浦ブーメランカツオ（弧を描いて飛び、ミケに戻ってキャッチされる！）
      // ==========================================
      if (pr.type === 'bonito_throw') {
        pr.age = (pr.age || 0) + dt;
        pr.life -= dt;
        pr.rotation = (pr.rotation || 0) + (pr.rotSpeed || 22.0) * dt;

        if (pr.state === 'flying_out') {
          // 往路：前方に飛び出しながら、ブーメラン特有の美しい弧（カーブ）を描く
          const currentSpeed = Math.hypot(pr.vx, pr.vy);
          let currentAngle = Math.atan2(pr.vy, pr.vx);
          currentAngle += (pr.curveAngle || 3.0) * dt;
          const newSpeed = Math.max(140, currentSpeed - 420 * dt);
          pr.vx = Math.cos(currentAngle) * newSpeed;
          pr.vy = Math.sin(currentAngle) * newSpeed;
          pr.x += pr.vx * dt;
          pr.y += pr.vy * dt;

          const distFromStart = Math.hypot(pr.x - pr.startX, pr.y - pr.startY);
          if (pr.age >= pr.outTime || distFromStart >= pr.maxDist) {
            pr.state = 'returning';
          }
        } else {
          // 復路：プレイヤー（ミケ）の現在地へ向かってホーミング加速して戻る！
          const dx = p.x - pr.x;
          const dy = (p.y - 10) - pr.y;
          const dist = Math.hypot(dx, dy);

          // ミケがナイスキャッチ！
          if (dist < 32) {
            this.sound.playSlash();
            for (let s = 0; s < 4; s++) this.addParticle(pr.x, pr.y, 'splash');
            this.projectiles.splice(i, 1);
            continue;
          }

          // プレイヤーに向かってスピードアップ！
          const returnSpeed = Math.min(640, 280 + (pr.age - (pr.outTime || 0.44)) * 480);
          pr.vx = (dx / (dist || 1)) * returnSpeed;
          pr.vy = (dy / (dist || 1)) * returnSpeed;
          pr.x += pr.vx * dt;
          pr.y += pr.vy * dt;
        }

        // 敵との多段ヒット判定（二乗距離比較で平方根計算を排除！0.20秒ごとにヒット）
        for (let e of enemySnapshot) {
          const dx = e.x - pr.x;
          const dy = e.y - pr.y;
          const hitR = e.w / 2 + 18;
          if (dx * dx + dy * dy < hitR * hitR) {
            const lastHit = pr.hitCooldowns ? pr.hitCooldowns.get(e) || 0 : 0;
            if (pr.age - lastHit >= 0.20) {
              if (pr.hitCooldowns) pr.hitCooldowns.set(e, pr.age);
              if (!this.damageEnemy(e, pr.damage * GAME_BALANCE.autoAttackMultiplier, pr.x, pr.y)) continue;
              this.sound.playHit();
              for (let s = 0; s < 3; s++) this.addParticle(pr.x, pr.y, 'splash');
              for (let s = 0; s < 2; s++) this.addParticle(pr.x, pr.y, 'spark');
            }
          }
        }

        if (pr.life <= 0) {
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      // ==========================================
      // B. 通常弾（爪撃・七輪火炎・子猫爪等）
      // ==========================================
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.rotSpeed) {
        pr.rotation = (pr.rotation || 0) + pr.rotSpeed * dt;
      }

      // 敵との衝突判定（二乗距離比較で超高速化！親ミケは範囲狭めの11px、子ミケは極小の8px）
      for (let e of enemySnapshot) {
        if (pr.hitEnemies && pr.hitEnemies.includes(e)) continue;
        const dx = e.x - pr.x;
        const dy = e.y - pr.y;
        const hitRadius = pr.isKitten ? (e.w / 2 + 8) : (e.w / 2 + 11);
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          if (!this.damageEnemy(e, pr.damage * GAME_BALANCE.autoAttackMultiplier, pr.x, pr.y)) continue;
          if (pr.hitEnemies) pr.hitEnemies.push(e);
          this.sound.playHit();
          pr.penetrate--;
          for (let s = 0; s < 4; s++) this.addParticle(pr.x, pr.y, 'spark');
          if (pr.penetrate <= 0) break;
        }
      }

      if (pr.life <= 0 || (pr.penetrate !== undefined && pr.penetrate <= 0)) {
        this.projectiles.splice(i, 1);
      }
    }

    // ニャー衝撃波リングの拡大
    for (let i = this.meowWaves.length - 1; i >= 0; i--) {
      const mw = this.meowWaves[i];
      mw.life -= dt;
      mw.currentRadius += (mw.maxRadius - mw.currentRadius) * 12 * dt;
      if (mw.life <= 0) {
        this.meowWaves.splice(i, 1);
      }
    }
  }

  // ========================================================
  // 6. 敵ウェーブ・スポーンマネージャー（段階的プログレッシブ仕様）
  // ========================================================
  updateEnemyWaves(dt) {
    // ★ユーザー要望：ラスボス登場中および完全勝利後は、雑魚敵スポーンを完全停止！
    if (this.finalBossPhase || this.isVictoryClear) return;

    this.enemySpawnTimer += dt;
    this.hordeTimer = (this.hordeTimer || 0) + dt;
    const time = this.survivalTime;

    // ★ユーザー要望：15.0秒未満は敵スポーン完全停止（平和な勝浦朝市散策タイムを満喫！）
    if (time < 15.0) return;

    const wave = GAME_BALANCE.waves.reduce((current, next) => time >= next.from ? next : current);
    const { interval: spawnInterval, cap: maxEnemies, batch: spawnBatch } = wave;

    if (this.enemySpawnTimer >= spawnInterval && this.enemies.length < maxEnemies) {
      this.enemySpawnTimer = 0;

      for (let b = 0; b < spawnBatch; b++) {
        if (this.enemies.length >= maxEnemies) break;
        const rand = Math.random();

        if (time < 35) {
          // 序盤（15〜35秒）：ヤンキーが左右・下の通路から次々に出現！
          this.spawnEnemy(rand < 0.7 ? 'tsuppari' : 'skater');
        } else if (time < 60) {
          // 35秒以降：キョン初登場！（初回は確定でキョン＆カットイン発動！）
          if (!this.firstKyonEventDone || rand < 0.5) {
            const kyon = this.spawnEnemy('kyon');
            if (!this.firstKyonEventDone && kyon) {
              this.triggerKyonEvent(kyon);
            }
          } else {
            this.spawnEnemy('tsuppari');
          }
        } else if (time < 85) {
          // 中盤：特攻ヤンキーやトンビも混ざる
          if (rand < 0.35) this.spawnEnemy('kyon');
          else if (rand < 0.60) this.spawnEnemy('tsuppari');
          else if (rand < 0.82) this.spawnEnemy('tokko');
          else this.spawnEnemy('tonbi');
        } else {
          // 後半：大群サバイバル
          if (rand < 0.35) this.spawnEnemy('kyon');
          else if (rand < 0.60) this.spawnEnemy('tonbi');
          else if (rand < 0.82) this.spawnEnemy('tokko');
          else this.spawnEnemy('tsuppari');
        }
      }
    }

    // ラッシュイベント（中盤以降に発生。画面外通路から大軍勢が押し寄せる！）
    if (time >= GAME_BALANCE.horde.start && this.hordeTimer >= (time >= 80 ? GAME_BALANCE.horde.lateInterval : GAME_BALANCE.horde.interval)) {
      this.hordeTimer = 0;
      const hordeType = Math.random() < 0.5 ? 'kyon' : 'tsuppari';
      const hordeCount = time >= 80 ? GAME_BALANCE.horde.lateCount : GAME_BALANCE.horde.count;
      for (let h = 0; h < hordeCount; h++) {
        if (this.enemies.length < maxEnemies) {
          this.spawnEnemy(hordeType);
        }
      }
      this.screenShake = 0.2;
    }

    // ボス出現トリガー（中盤70秒の巨大キョン王）
    if (time >= 70 && !this.bossSpawned1) {
      this.bossSpawned1 = true;
      this.spawnEnemy('boss_kyon');
      this.sound.playLevelUp();
      this.screenShake = 0.4;
    }
  }

  // 画面左・右・下の通路から敵をスポーン（ユーザー指定赤目印エリアの出入口限定！）
  spawnEnemy(type, fixedX = null, fixedY = null) {
    let sx = fixedX, sy = fixedY;

    if (sx === null || sy === null) {
      // ユーザー要望：添付画像赤目印エリアの3つの出入口から発生！
      const corridorChoice = Math.random();
      if (corridorChoice < 0.40) {
        // 通路1: 画面左端メインストリート（x: -25, y: 550〜670）
        sx = -25;
        sy = 550 + Math.random() * 120;
      } else if (corridorChoice < 0.80) {
        // 通路2: 画面右端メインストリート（x: worldW + 25, y: 550〜670）
        sx = this.worldW + 25;
        sy = 550 + Math.random() * 120;
      } else {
        // 通路3: 画面下の南参道中央通路（x: 585〜645, y: worldH + 25）
        sx = 585 + Math.random() * 60;
        sy = this.worldH + 25;
      }
    } else {
      // 固定座標が指定された場合でも、赤目印エリア外なら安全な通路位置にスナップ
      if (!this.isPointWalkable(sx, sy)) {
        sx = Math.random() < 0.5 ? -25 : this.worldW + 25;
        sy = 585 + Math.random() * 80;
      }
    }

    // 敵タイプ別ステータス（難易度アップ＆スリルある戦闘バランス）
    let conf = {
      type,
      hp: 24, maxHp: 24,
      speed: 2.2, atk: 16,
      w: 36, h: 48,
      color: '#1e293b'
    };

    if (type === 'tsuppari') {
      conf = { type, hp: 26, maxHp: 26, speed: 2.2, atk: 18, w: 36, h: 48, color: '#1e293b' };
    } else if (type === 'tokko') {
      conf = { type, hp: 55, maxHp: 55, speed: 1.6, atk: 26, w: 42, h: 50, color: '#dc2626' };
    } else if (type === 'skater') {
      conf = { type, hp: 16, maxHp: 16, speed: 3.6, atk: 14, w: 36, h: 46, color: '#7c3aed' };
    } else if (type === 'kyon') {
      conf = { type, hp: 20, maxHp: 20, speed: 3.4, atk: 15, w: 32, h: 32, color: '#b45309' };
    } else if (type === 'tonbi') {
      conf = { type, hp: 22, maxHp: 22, speed: 4.2, atk: 20, w: 38, h: 34, color: '#78350f', isFlying: true };
    } else if (type === 'boss_kyon') {
      conf = { type, hp: 500, maxHp: 500, speed: 2.4, atk: 35, w: 68, h: 68, color: '#b45309', isBoss: true, name: '巨大キョン王' };
    } else if (type === 'boss_yankee') {
      conf = { type, hp: 1200, maxHp: 1200, speed: 2.1, atk: 42, w: 64, h: 72, color: '#991b1b', isBoss: true, name: '暴走族総長' };
    }

    if (!conf.isBoss) {
      conf.hp = Math.round(conf.hp * GAME_BALANCE.enemyHpMultiplier);
      conf.maxHp = conf.hp;
      conf.speed *= GAME_BALANCE.enemySpeedMultiplier;
    }
    const enemyObj = {
      ...conf,
      x: sx,
      y: sy,
      dir: 'left',
      animTimer: Math.random() * 10,
      stunTimer: 0,
      bonitoHitTimer: 0,
      state: 'CHASE',
      vx: 0, vy: 0
    };
    this.enemies.push(enemyObj);
    return enemyObj;
  }

  // 敵専用の超軽量・確実な進入＆歩行ゾーン制御移動システム
  moveEnemy(e, vx, vy) {
    // 1. まだ歩行可能ゾーン外（画面外の出現地点等）にいる場合：障害物チェックなしでゾーン内へ直進進入！
    if (!this.isPointWalkable(e.x, e.y)) {
      e.x += vx;
      e.y += vy;
      return;
    }

    // 2. 既にゾーン内にいる場合：ゾーン外（露店や建物）へ出ないように制御
    const nextX = e.x + vx;
    const nextY = e.y + vy;

    if (this.isPointWalkable(nextX, nextY)) {
      e.x = nextX;
      e.y = nextY;
      return;
    }

    // 斜め移動時のスライド（X軸のみ or Y軸のみ）
    if (this.isPointWalkable(nextX, e.y)) {
      e.x = nextX;
      return;
    }
    if (this.isPointWalkable(e.x, nextY)) {
      e.y = nextY;
      return;
    }

    // 微小推進も歩行可能判定を通し、角から押し出されて立入禁止区域へ入るのを防ぐ。
    const nudgeX = e.x + vx * 0.2;
    const nudgeY = e.y + vy * 0.2;
    if (this.isPointWalkable(nudgeX, nudgeY)) {
      e.x = nudgeX;
      e.y = nudgeY;
    } else if (this.isPointWalkable(nudgeX, e.y)) {
      e.x = nudgeX;
    } else if (this.isPointWalkable(e.x, nudgeY)) {
      e.y = nudgeY;
    }
  }

  // 敵の行動・AI
  updateEnemies(dt) {
    const p = this.player;

    // NPCビビり演出クールダウン（敵ループの外で1回だけ減算！）
    for (let s of this.npcSpots) {
      if (s.cooldown > 0) s.cooldown -= dt;
    }

    for (let i = this.enemies.length - 1; i >= 0 && i < this.enemies.length; i--) {
      const e = this.enemies[i];

      // ボニートヒットクールダウン
      if (e.bonitoHitTimer > 0) e.bonitoHitTimer -= dt;
      if (e.allyHitTimer > 0) e.allyHitTimer -= dt;

      // 被弾リアクション（点滅・揺れ・のけぞり・ノックバック）
      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;
      if (e.hitShakeTimer > 0) e.hitShakeTimer -= dt;
      if (e.hitTilt) {
        e.hitTilt *= 0.82;
        if (Math.abs(e.hitTilt) < 0.01) e.hitTilt = 0;
      }
      if (e.knockbackVx || e.knockbackVy) {
        const kbX = e.knockbackVx || 0;
        const kbY = e.knockbackVy || 0;
        if (e.isFlying) {
          e.x += kbX * dt;
          e.y += kbY * dt;
        } else {
          this.moveEnemy(e, kbX * dt, kbY * dt);
        }
        const damping = Math.pow(0.82, dt * 60);
        e.knockbackVx = Math.abs(kbX * damping) < 1 ? 0 : kbX * damping;
        e.knockbackVy = Math.abs(kbY * damping) < 1 ? 0 : kbY * damping;
      }

      // スタン中
      if (e.stunTimer > 0) {
        e.stunTimer -= dt;
        continue;
      }

      // プレイヤーへの追尾
      const dist = Math.hypot(p.x - e.x, p.y - e.y);
      const d = Math.max(1, dist);
      const dx = (p.x - e.x) / d;
      const dy = (p.y - e.y) / d;

      e.dir = dx > 0 ? 'right' : 'left';
      e.animTimer += dt * (e.speed * 3);

      // 移動（トンビは飛行、地上敵は moveEnemy でスムーズ進入＆ゾーン内制御）
      const frameScale = dt * 60;
      const vx = dx * e.speed * frameScale;
      const vy = dy * e.speed * frameScale;
      if (e.isFlying) {
        e.x += vx;
        e.y += vy;
      } else {
        this.moveEnemy(e, vx, vy);
      }

      // 敵同士の重なり回避（分離：二乗距離で超高速計算＆余計なループ判定を排除！）
      for (let j = 0; j < Math.min(this.enemies.length, 8); j++) {
        const other = this.enemies[j];
        if (other !== e) {
          const sepDx = e.x - other.x;
          const sepDy = e.y - other.y;
          const sepDistSq = sepDx * sepDx + sepDy * sepDy;
          if (sepDistSq < 484 && sepDistSq > 0.01) { // 22px * 22px = 484
            const sepD = Math.sqrt(sepDistSq);
            const separateX = (sepDx / sepD) * 0.6 * frameScale;
            const separateY = (sepDy / sepD) * 0.6 * frameScale;
            if (e.isFlying) {
              e.x += separateX;
              e.y += separateY;
            } else {
              this.moveEnemy(e, separateX, separateY);
            }
          }
        }
      }

      // 店主・観光客のビビりリアクション演出
      for (let s of this.npcSpots) {
        if (s.cooldown <= 0) {
          const nDist = Math.hypot(e.x - s.x, e.y - s.y);
          if (nDist < 120) {
            s.cooldown = 2.5 + Math.random() * 2.0;
            const pickType = Math.random() < 0.65 ? 'sweat' : 'exclamation';
            this.addParticle(s.x + (Math.random() - 0.5) * 16, s.y - 35, pickType);
          }
        }
      }

      // プレイヤーへの接触ダメージ判定
      if (dist < 32 && p.invincibleTimer <= 0) {
          // 通常被弾
          p.hp = Math.max(0, p.hp - e.atk);
          p.invincibleTimer = 0.8;
          this.sound.playDamage();
          this.screenShake = 0.18;

          // ノックバック
          p.knockbackVx = dx * 6.0;
          p.knockbackVy = dy * 6.0;
          p.knockbackTimer = 0.18;

          this.addDamageNumber(p.x, p.y - 20, e.atk, '#ef4444');
      }
    }
  }

  // 敵へのダメージ処理（数字ポップアップを廃止し、点滅・揺れ・のけぞり・ヒットスパークで爽快演出！）
  damageEnemy(enemy, amount, fromX = null, fromY = null) {
    if (!enemy || !Number.isFinite(amount) || amount <= 0 || enemy.hp <= 0 || !this.enemies.includes(enemy)) return false;
    enemy.hp = Math.max(0, enemy.hp - amount);

    // 1. 白熱フラッシュ＆点滅タイマー
    enemy.hitFlashTimer = 0.16;

    // 2. 被弾ヒットシェイク（激しい振動）
    enemy.hitShakeTimer = 0.18;

    // 3. のけぞりチルト（仰け反る回転角度）
    const p = this.player;
    const srcX = fromX !== null ? fromX : p.x;
    const dirSign = enemy.x >= srcX ? 1 : -1;
    enemy.hitTilt = dirSign * 0.28; // 進行方向と逆、または攻撃の飛来方向にのけぞる

    // 4. 軽微なヒットバック（手応えのある押し戻し）
    const srcY = fromY !== null ? fromY : p.y;
    const dist = Math.hypot(enemy.x - srcX, enemy.y - srcY) || 1;
    const kbForce = enemy.isBoss ? 55 : 140;
    enemy.knockbackVx = ((enemy.x - srcX) / dist) * kbForce;
    enemy.knockbackVy = ((enemy.y - srcY) / dist) * kbForce;

    // 5. ヒットスパーク（閃光火花エフェクト）
    for (let s = 0; s < 4; s++) {
      this.addParticle(enemy.x + (Math.random() - 0.5) * 14, enemy.y - 15 + (Math.random() - 0.5) * 14, 'spark');
    }

    if (enemy.hp <= 0) {
      this.defeatEnemy(enemy);
    }
    return true;
  }

  // 敵撃破＆ドロップ処理
  defeatEnemy(enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (!enemy || idx === -1) return false;
    this.enemies.splice(idx, 1);
    enemy.hp = 0;

    this.killCount++;
    this.sound.playEnemyDefeat();

    // ★最終決戦：ボスヤンキー総長撃破チェック！
    if (this.finalBossPhase && enemy.isFinalBoss) {
      this.remainingBossCount = 0;
      this.enemies = []; // ★ユーザー要望：ボスを倒しきったら敵0状態に！
      this.sound.playTaiko();
      this.addComicPopup(enemy.x, enemy.y - 30, '💥 総長完全撃破！！', '#ef4444');
      for (let s = 0; s < 40; s++) {
        this.addParticle(enemy.x + (Math.random() - 0.5) * 80, enemy.y + (Math.random() - 0.5) * 80, 'spark');
        this.addParticle(enemy.x, enemy.y, 'confetti');
      }

      // ラスボス撃破で完全勝利クリア演出へ！
      if (!this.isVictoryClear) {
        this.triggerVictoryClear();
        return;
      }
    }

    // キョンの鳴き声
    if (enemy.type === 'kyon' || enemy.type === 'boss_kyon') {
      this.sound.playKyonSound();
    }

    // 撃破パーティクル
    for (let s = 0; s < (enemy.isBoss ? 20 : 7); s++) {
      this.addParticle(enemy.x, enemy.y, 'confetti');
    }

    // 敵を倒した瞬間にEXP獲得（ダダサバイバー黄金律：程よい成長バランス！）
    const expVal = enemy.isBoss ? 16 : (enemy.type === 'tokko' || enemy.type === 'kyon') ? 3 : 1;
    this.addExp(expVal);

    // 敵撃破時のアイテムドロップ（★ゲームバランス調整：適度なドロップで緊張感を維持！）
    const nowSec = this.survivalTime || 0;
    const maxItems = GAME_BALANCE.items.cap; // 画面上に最大3個まで
    const currentItemCount = this.dropItems ? this.dropItems.length : 0;
    const canDropByCount = currentItemCount < maxItems;
    const isBossDrop = enemy.isBoss;
    const dropRate = isBossDrop ? 1.0 : 0.06; // 通常敵は6%（適度な出現率）
    const cooldownTime = 4.0;
    const cooldownOk = !this.lastEnemyDropSec || (nowSec - this.lastEnemyDropSec >= cooldownTime);

    if (canDropByCount && cooldownOk && (isBossDrop || Math.random() < dropRate)) {
      this.lastEnemyDropSec = nowSec;
      // 画面上に出ていないアイテム種別を優先抽選（コーヒー、わらび餅、タンタン麺の3種ローテ）
      const currentTypes = this.dropItems.map(i => i.type);
      const candidates = ['coffee', 'warabi', 'tantan'].filter(t => !currentTypes.includes(t));
      const dropType = candidates.length > 0 
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : ['coffee', 'warabi', 'tantan'][Math.floor(Math.random() * 3)];

      // ドロップ位置が立入禁止エリア内、または壁に近すぎる場合は安全な通路位置にスナップ！
      let dropX = enemy.x;
      let dropY = enemy.y;
      if (this.isInsideForbiddenArea(dropX, dropY, 20)) {
        dropY = 590 + Math.random() * 45; // メインストリート（590〜635）
        dropX = Math.max(30, Math.min(this.worldW - 30, dropX));
      }

      this.dropItems.push({
        type: dropType,
        x: dropX,
        y: dropY,
        life: GAME_BALANCE.items.life, age: 0
      });
      for (let s = 0; s < 6; s++) {
        this.addParticle(dropX, dropY, dropType === 'coffee' ? 'smoke' : dropType === 'tantan' ? 'spark' : 'confetti');
      }
    }
    return true;
  }

  // アイテム定期ランダム発生（★適度な出現ペースでハラハラサバイバル！）
  updateRandomItemSpawns(dt) {
    if (!this.firstYankeeEventDone) return; // 戦闘開始前はアイテム自然発生させない！

    if (this.itemSpawnTimer === undefined) this.itemSpawnTimer = 3.0;
    this.itemSpawnTimer -= dt;

    if (this.itemSpawnTimer <= 0) {
      // 次の品物まで約3〜4秒。早期回収時は collectItem で短縮する。
      this.itemSpawnTimer = GAME_BALANCE.items.interval + (Math.random() * 2 - 1) * GAME_BALANCE.items.jitter;

      // フィールド上の最大数は3個
      const maxItems = GAME_BALANCE.items.cap;
      if (this.dropItems && this.dropItems.length >= maxItems) return;

      this.spawnRandomMarketItem();
    }
  }

  // 朝市名物アイテムの自然スポーン（★ユーザー指定の赤目印エリア限定！）
  spawnRandomMarketItem() {
    const p = this.player;
    const maxItems = GAME_BALANCE.items.cap;

    // 画面全体の上限を超えていたら生成しない
    if (this.dropItems && this.dropItems.length >= maxItems) return;

    // ユーザー要望：赤目印エリア（walkableZones）の中から安全に出現！
    let spawnX = 660, spawnY = 600;
    let foundSafeSpot = false;

    for (let attempt = 0; attempt < 25; attempt++) {
      // メイン大通り（ゾーン0）に重みを持たせつつ全ゾーンから抽選
      const zoneIdx = Math.random() < 0.65 ? 0 : Math.floor(Math.random() * this.walkableZones.length);
      const z = this.walkableZones[zoneIdx];
      const pad = 12;
      const testX = z.x + pad + Math.random() * Math.max(1, z.w - pad * 2);
      const testY = z.y + pad + Math.random() * Math.max(1, z.h - pad * 2);

      const dist = Math.hypot(p.x - testX, p.y - testY);
      if (this.isPointWalkable(testX, testY) && dist >= GAME_BALANCE.items.minDistance && dist <= GAME_BALANCE.items.maxDistance) {
        spawnX = testX;
        spawnY = testY;
        foundSafeSpot = true;
        break;
      }
    }

    if (!foundSafeSpot) {
      // フォールバック：大通り中央
      spawnX = Math.max(60, Math.min(this.worldW - 60, p.x + (Math.random() < 0.5 ? -140 : 140)));
      spawnY = 600 + (Math.random() - 0.5) * 30;
    }

    // アイテム種別決定：
    // 初回は確定で「アイスコーヒー」！
    // その後はコーヒー、わらび餅、タンタン麺を被りなしでローテーション！
    let itemType = 'coffee';
    if (!this.firstCoffeeSpawned) {
      this.firstCoffeeSpawned = true;
      itemType = 'coffee';
    } else {
      const currentTypes = this.dropItems.map(i => i.type);
      const candidates = ['coffee', 'warabi', 'tantan'].filter(t => !currentTypes.includes(t));
      itemType = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : ['coffee', 'warabi', 'tantan'][Math.floor(Math.random() * 3)];
    }

    this.dropItems.push({
      type: itemType,
      x: spawnX,
      y: spawnY,
      life: GAME_BALANCE.items.life, age: 0
    });

    // ポップ出現のパーティクル
    for (let s = 0; s < 8; s++) {
      this.addParticle(spawnX, spawnY, itemType === 'coffee' ? 'smoke' : itemType === 'tantan' ? 'spark' : 'confetti');
    }
  }

  // ========================================================
  // 7. ドロップアイテム回収（マグネット吸引 ＆ 取得判定拡大でストレス完全ゼロ！）
  // ========================================================
  updateDropItems(dt) {
    const p = this.player;
    // 磁石吸引距離（基本85px、マグネットスキルでさらに拡大！）
    const magnetRadius = 85 + (this.skills.magnet ? this.skills.magnet.level * 45 : 0);
    // 直接回収判定距離（以前の26から45へ拡大！）
    const collectRadius = 45;

    for (let i = this.dropItems.length - 1; i >= 0; i--) {
      const item = this.dropItems[i];
      item.life -= dt;
      item.age = (item.age || 0) + dt;

      const dist = Math.hypot(p.x - item.x, p.y - item.y);

      // ★直接回収判定
      if (dist < collectRadius) {
        this.collectItem(item);
        this.dropItems.splice(i, 1);
        continue;
      }

      // ★マグネット吸引：プレイヤーが近づくとアイテムがスーッと引き寄せられる！
      // 障害物のキワに落ちていてもプレイヤーに吸い付いて確実に拾える！
      if (dist < magnetRadius && dist > 0) {
        const pullSpeed = Math.min(dist, 420 * dt);
        item.x += ((p.x - item.x) / dist) * pullSpeed;
        item.y += ((p.y - item.y) / dist) * pullSpeed;
      }

      if (item.life <= 0) {
        this.dropItems.splice(i, 1);
      }
    }
  }

  // アイテム回収効果（★ユーザー要望：HP回復の過剰を完全是正！回復ではなく援護攻撃・バフに特化！）
  collectItem(item) {
    const p = this.player;
    // すぐ回収したら次が早く現れる。回収を止めると通常間隔へ戻る。
    if ((item.age ?? GAME_BALANCE.items.life) <= GAME_BALANCE.items.quickPickupWindow) {
      this.itemSpawnTimer = Math.min(this.itemSpawnTimer, GAME_BALANCE.items.nextAfterQuickPickup);
    }

    if (item.type === 'coffee') {
      // ☕ SPICE COFFEE（アイスコーヒー）：移動速度1.3倍加速バフ ＋ タンデム自転車突進！
      p.speedBuffTimer = 4.5; // 4.5秒間ダッシュ！
      for (let s = 0; s < 8; s++) this.addParticle(p.x, p.y, 'smoke');
      if (!this.assistCutinSeen.tandem) {
        this.assistCutinSeen.tandem = true;
        this.triggerAssistCutin('tandem', 'あ！タンデムライダーだにゃ！！');
      } else {
        this.sound.playBicycleBell();
        this.triggerTandemBikeRush();
      }
    } else if (item.type === 'warabi') {
      for (let s = 0; s < 8; s++) this.addParticle(p.x, p.y, 'confetti');
      if (!this.assistCutinSeen.noraneko) {
        this.assistCutinSeen.noraneko = true;
        this.triggerAssistCutin('noraneko', 'あ！ノラネコだにゃー！');
      } else {
        if (this.sound && typeof this.sound.playCatHiss === 'function') {
          this.sound.playCatHiss();
        } else if (this.sound && typeof this.sound.playMeowRoar === 'function') {
          this.sound.playMeowRoar();
        }
        this.spawnAllyCat();
      }
    } else if (item.type === 'tantan') {
      for (let s = 0; s < 16; s++) this.addParticle(p.x, p.y, 'spark');
      for (let s = 0; s < 8; s++) this.addParticle(p.x, p.y, 'smoke');
      if (!this.assistCutinSeen.mikoshi) {
        this.assistCutinSeen.mikoshi = true;
        this.triggerAssistCutin('mikoshi', 'あ！お神輿だにゃー！！');
      } else {
        this.sound.playMikoshiSound();
        this.triggerMikoshiRush(2);
      }
    }
  }

  // ========================================================
  // ========================================================
  // 助太刀仲間にゃんこシステム（電光石火の疾風援護：カットイン格闘ノラネコ豪快突入！）
  // ========================================================
  spawnAllyCat() {
    const cfg = GAME_BALANCE.nora;
    const p = this.player;
    const direction = Math.random() < 0.5 ? 1 : -1;
    if (this.allyCats.length >= cfg.maxActive) this.allyCats.shift();
    this.allyCats.push({
      x: Math.max(25, Math.min(this.worldW - 25, p.x - direction * 290)),
      y: Math.max(550, Math.min(665, p.y)),
      baseY: Math.max(555, Math.min(650, p.y)),
      direction, dir: direction > 0 ? 'right' : 'left',
      elapsed: 0, animFrame: 0, scale: 1, smokeTimer: 0, hits: new Map()
    });
    this.sound.playMeowRoar();
  }

  updateAllyCats(dt) {
    const cfg = GAME_BALANCE.nora;
    for (let i = this.allyCats.length - 1; i >= 0; i--) {
      const cat = this.allyCats[i];
      cat.elapsed += dt;
      if (cat.elapsed >= cfg.duration) { this.allyCats.splice(i, 1); continue; }
      // 街路内を左右に駆け抜ける。三角波の折返しでジグザグを描く。
      cat.x += cat.direction * cfg.speed * dt;
      if (cat.x < 25 || cat.x > this.worldW - 25) {
        cat.x = Math.max(25, Math.min(this.worldW - 25, cat.x));
        cat.direction *= -1;
      }
      const phase = (cat.elapsed / cfg.zigzagPeriod) % 1;
      const zigzag = 1 - 4 * Math.abs(phase - 0.5);
      cat.y = Math.max(542, Math.min(682, cat.baseY + zigzag * cfg.amplitude));
      cat.dir = cat.direction > 0 ? 'right' : 'left';
      cat.animFrame = Math.floor(cat.elapsed * 12) % 4;
      cat.smokeTimer += dt;
      if (cat.smokeTimer >= 0.12) {
        cat.smokeTimer = 0;
        this.addParticle(cat.x - cat.direction * 18, cat.y, 'smoke');
      }
      // 同じ敵への連続ヒットに間隔を設け、ボスを瞬殺するのを防ぐ。
      for (const enemy of [...this.enemies]) {
        if (Math.hypot(enemy.x - cat.x, enemy.y - cat.y) > cfg.hitRadius) continue;
        if (cat.elapsed < (cat.hits.get(enemy) || 0)) continue;
        cat.hits.set(enemy, cat.elapsed + cfg.hitCooldown);
        if (!this.damageEnemy(enemy, cfg.damage, cat.x, cat.y)) continue;
        enemy.stunTimer = 0.3;
        enemy.knockbackVx = cat.direction * 180;
        this.addParticle(enemy.x, enemy.y - 18, 'spark');
      }
    }
  }

  // 4コマを同じ接地位置で切り出す。上下の透明余白でキャラが小さくならないようにする。
  getNoraFrame(frame = 0) {
    const sprite = this.images.allyCat;
    return { sx: (frame % 4) * sprite.naturalWidth / 4, sy: 80,
      sw: sprite.naturalWidth / 4, sh: 220 };
  }

  drawAllyCat(ctx, cat) {
    ctx.save();
    ctx.translate(cat.x, cat.y);

    // 足元接地影
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 * cat.scale, 7 * cat.scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const sprite = this.images.allyCat;
    if (sprite.complete && sprite.naturalWidth > 0) {
      const { sx, sy, sw, sh } = this.getNoraFrame(cat.animFrame);
      const height = 76;
      const width = height * sw / sh;
      ctx.save();
      if (cat.dir === 'left') ctx.scale(-1, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, sx, sy, sw, sh, -width / 2, -height, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  // 経験値加算＆ノンストップ自動レベルアップ進化！
  addExp(amount) {
    const p = this.player;
    p.exp += amount;

    while (p.exp >= p.nextExp) {
      p.exp -= p.nextExp;
      p.level++;
      // ダダサバイバー黄金比：Lv1=8, Lv2=22, Lv3=41, Lv4=67, Lv5=98...
      p.nextExp = Math.round(8 + Math.pow(p.level, 1.75) * GAME_BALANCE.levelExpGrowth);

      this.sound.playLevelUp();
      this.applyAutomaticEvolution(p.level);
    }
  }

  // 自動進化の適用＆スタイリッシュなレベルアップバナー表示
  applyAutomaticEvolution(level) {
    const p = this.player;
    const evo = LEVEL_EVOLUTION[level] || {
      title: `極限強化（LV.${level}）！`,
      sub: '全攻撃の威力＆スピードがさらに底上げ！',
      apply: (game) => {
        game.skills.spice.level = (game.skills.spice.level || 0) + 1;
        p.maxHp += 20;
      }
    };

    evo.apply(this);

    // 画面上部に華やかなゴールドバナーをセット（2.8秒間表示）
    this.levelUpBanner = {
      title: `⭐ LEVEL UP! [LV.${level}] ${evo.title}`,
      sub: evo.sub,
      timer: 2.8,
      maxTimer: 2.8
    };

    // プレイヤーの周囲に金色のレベルアップ光輪パーティクル
    for (let i = 0; i < 16; i++) {
      if (this.particles.length >= 60) break;
      const angle = (i / 16) * Math.PI * 2;
      this.particles.push({
        type: 'spark',
        x: p.x,
        y: p.y - 12,
        vx: Math.cos(angle) * 3.5,
        vy: Math.sin(angle) * 3.5,
        color: '#fbbf24',
        alpha: 1.0,
        life: 0.7,
        maxLife: 0.7,
        size: 4
      });
    }

    // レベルアップ時の衝撃波（身近な敵を軽く弾く）
    [...this.enemies].forEach(e => {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 160) {
        this.damageEnemy(e, 35);
        e.knockbackVx = ((e.x - p.x) / (d || 1)) * 260;
        e.knockbackVy = ((e.y - p.y) / (d || 1)) * 260;
      }
    });

    this.updateUI();
  }


  // ========================================================
  // 8. カメラ・描画システム
  // ========================================================
  updateCamera() {
    const p = this.player;
    // プレイヤーの足元中央にカメラをダイレクト完全同期（Lerp遅れとジッターを根絶！）
    this.camera.x = Math.max(0, Math.min(this.worldW - this.viewW, p.x - this.viewW / 2));
    this.camera.y = Math.max(0, Math.min(this.worldH - this.viewH, p.y - this.viewH / 2));
  }

  render() {
    const ctx = this.ctx;
    this.mobileUI?.syncVisibility();
    ctx.clearRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    // 画面揺れ（スクリーンシェイク）
    if (this.screenShake > 0) {
      const sx = Math.sin(this.simulationTime * 97) * this.screenShake * 9;
      const sy = Math.cos(this.simulationTime * 89) * this.screenShake * 9;
      ctx.translate(sx, sy);
    }

    // カメラ移動（サブピクセル描画で丸めジッターを排除し等速スクロール！）
    ctx.translate(-this.camera.x, -this.camera.y);

    // A. 背景マップ描画（新横長朝市マップ：SPICE COFFEE自転車屋台＆遠見岬神社石段）
    this.renderMap(ctx);

    // B. ドロップアイテム
    this.renderDropItems(ctx);

    // C. Yソート立体描画（敵、プレイヤー、ブーメラン）
    this.renderYSortedEntities(ctx);

    // D. 投射物・衝撃波
    this.renderProjectiles(ctx);

    // D-2. タンデムクロスバイク爆走（60代男女の超高速突進）
    this.renderTandemRushes(ctx);

    // D-3. 勝浦神輿軍団爆走（白装束の担ぎ手たちと黄金神輿の超ド級突進）
    this.renderMikoshiRushes(ctx);

    // E. パーティクル＆ダメージ数字
    this.renderEffects(ctx);

    // F. 手前オブジェクト前景オーバーレイ（手前の人・パラソル・屋台の後ろにミケや敵が回り込む立体描写！）
    this.renderForeground(ctx);

    ctx.restore();

    this.peaceScene?.render(ctx);

    // F. 落雷全画面フラッシュ
    this.renderLightningFlash(ctx);

    // H. レベルアップ＆告知バナー（スタイリッシュなネオンテロップ）
    this.renderLevelUpBanner(ctx);

    // I. 初回エンカウントイベント演出カットイン
    if (this.eventState !== 'NONE') this.renderCinematic(ctx, this.renderEventCutin);

    // J. 格ゲー必殺技風・お助けキャラカットイン演出
    if (this.assistCutin) {
      this.renderCinematic(ctx, this.renderAssistCutin);
    }
  }

  // カットインは共通座標で描画し、横長画面でも文字と絵を切らない。
  renderCinematic(ctx, draw) {
    const scale = Math.min(this.viewW / 880, this.viewH / 495);
    ctx.save();
    ctx.fillStyle = '#080c10';
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    ctx.translate((this.viewW - 880 * scale) / 2, (this.viewH - 495 * scale) / 2);
    ctx.scale(scale, scale);
    draw.call(this, ctx);
    ctx.restore();
  }

  // ストリートファイター6風「HERE COMES A NEW CHALLENGER!」対戦乱入カットイン演出！
  renderEventCutin(ctx) {
    if (this.eventState === 'NONE') return;

    ctx.save();

    const isPeace = this.eventState === 'PEACE';
    const isYankee = this.eventState === 'YANKEE';
    const isKyon = this.eventState === 'KYON';

    const viewW = 880;
    const viewH = 495;

    // 1. 上部〜中央：格ゲー乱入スプラッシュ画面（y: 0 〜 365）
    const splashH = 365;

    // A. スプラッシュ背景画像描画
    let splashImg = null;
    if (isYankee) splashImg = this.images.splashYankee;
    else if (isKyon) splashImg = this.images.splashKyon;
    else if (isPeace) splashImg = this.images.mapPeace;

    if (splashImg && splashImg.complete && splashImg.naturalWidth > 0) {
      // 16:9比率を保って中央に迫力クロップ描画
      ctx.drawImage(splashImg, 0, 0, splashImg.naturalWidth, splashImg.naturalHeight, 0, 0, viewW, splashH);
    } else {
      // フォールバックグラデーション
      const grad = ctx.createLinearGradient(0, 0, viewW, splashH);
      if (isYankee) {
        grad.addColorStop(0, '#3b0764');
        grad.addColorStop(1, '#831843');
      } else if (isKyon) {
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(1, '#713f12');
      } else {
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(1, '#38bdf8');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, viewW, splashH);
    }

    // B. スプラッシュ上部の暗幕＆集中線オーバーレイ
    const topVignette = ctx.createLinearGradient(0, 0, 0, splashH);
    topVignette.addColorStop(0, 'rgba(15, 23, 42, 0.6)');
    topVignette.addColorStop(0.5, 'rgba(15, 23, 42, 0.1)');
    topVignette.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
    ctx.fillStyle = topVignette;
    ctx.fillRect(0, 0, viewW, splashH);

    // C. スト6風「HERE COMES A NEW CHALLENGER!」メタリック超巨大タイポグラフィ！
    if (isYankee) {
      // サブタイトル
      ctx.font = 'italic 900 18px "Impact", "Arial Black", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText('⚡ HERE COMES A NEW CHALLENGER! ⚡', 35, 48);

      // 超巨大立体メインロゴ「勝浦ヤンキー 参戦！！」
      ctx.font = 'italic 900 42px "Impact", "Arial Black", sans-serif';
      // 3D影
      ctx.fillStyle = '#450a0a';
      ctx.fillText('勝浦ヤンキー 乱入！！', 38, 98);
      // メタリックグラデーション
      const textGrad = ctx.createLinearGradient(35, 60, 35, 95);
      textGrad.addColorStop(0, '#ffffff');
      textGrad.addColorStop(0.3, '#fde047');
      textGrad.addColorStop(0.7, '#ef4444');
      textGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = textGrad;
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 16;
      ctx.fillText('勝浦ヤンキー 乱入！！', 35, 95);
      ctx.shadowBlur = 0;

      // 危険度バッジ
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath();
      ctx.roundRect(35, 110, 165, 24, 4);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('⚠️ DANGER LEVEL: S', 45, 126);

    } else if (isKyon) {
      // サブタイトル
      ctx.font = 'italic 900 18px "Impact", "Arial Black", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText('🦌 WARNING! WILD BEAST INTRUSION! 🦌', 35, 48);

      // 超巨大立体メインロゴ「房総キョン軍団 襲来！！」
      ctx.font = 'italic 900 42px "Impact", "Arial Black", sans-serif';
      ctx.fillStyle = '#064e3b';
      ctx.fillText('房総キョン軍団 襲来！！', 38, 98);
      const textGrad = ctx.createLinearGradient(35, 60, 35, 95);
      textGrad.addColorStop(0, '#ffffff');
      textGrad.addColorStop(0.3, '#a7f3d0');
      textGrad.addColorStop(0.7, '#10b981');
      textGrad.addColorStop(1, '#047857');
      ctx.fillStyle = textGrad;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 16;
      ctx.fillText('房総キョン軍団 襲来！！', 35, 95);
      ctx.shadowBlur = 0;

      // 敏捷度バッジ
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.roundRect(35, 110, 175, 24, 4);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('⚡ AGILITY: MAXIMUM', 45, 126);

    } else if (isPeace) {
      // 平和開幕タイトル
      ctx.font = 'italic 900 18px "Impact", "Arial Black", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText('🌸 WELCOME TO KATSUURA MORNING MARKET 🌸', 35, 48);

      ctx.font = 'italic 900 40px "Impact", "Arial Black", sans-serif';
      ctx.fillStyle = '#0369a1';
      ctx.fillText('天正年間より続く朝市！', 38, 98);
      const textGrad = ctx.createLinearGradient(35, 60, 35, 95);
      textGrad.addColorStop(0, '#ffffff');
      textGrad.addColorStop(0.5, '#7dd3fc');
      textGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = textGrad;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.fillText('天正年間より続く朝市！', 35, 95);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.9)';
      ctx.beginPath();
      ctx.roundRect(35, 110, 155, 24, 4);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('☀️ STATUS: PEACEFUL', 45, 126);
    }

    // 2. 下部：にゃんこ（ミケ）のメッセージウィンドウ（y: 360 〜 480）
    const winX = 25;
    const winY = 360;
    const winW = viewW - 50; // 830px
    const winH = 118;

    const mainBorderColor = isYankee ? '#f59e0b' : isKyon ? '#10b981' : '#38bdf8';

    // A. ウィンドウ背景（高級感ある半透明ダークスレート＋光彩）
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = mainBorderColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = mainBorderColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(winX, winY, winW, winH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // B. 左側：ミケの顔ポートレートアイコン
    const iconSize = 84;
    const iconX = winX + 16;
    const iconY = winY + 17;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = mainBorderColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize, iconSize, 8);
    ctx.fill();
    ctx.stroke();

    if (this.images.cutinCat && this.images.cutinCat.complete && this.images.cutinCat.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(iconX + 3, iconY + 3, iconSize - 6, iconSize - 6, 6);
      ctx.clip();
      ctx.drawImage(this.images.cutinCat, 0, 0, this.images.cutinCat.naturalWidth, this.images.cutinCat.naturalHeight, iconX + 3, iconY + 3, iconSize - 6, iconSize - 6);
      ctx.restore();
    } else if (this.images.cat && this.images.cat.complete) {
      ctx.imageSmoothingEnabled = false;
      const cell = 256;
      ctx.drawImage(this.images.cat, 0, cell * 2, cell, cell, iconX + 5, iconY + 5, iconSize - 10, iconSize - 10);
    }

    // C. 右側：セリフ＆テキスト情報
    const textStartX = iconX + iconSize + 20;

    // 名前バッジ
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(textStartX, winY + 16, 150, 22, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('🐾 看板三毛猫 ミケ', textStartX + 10, winY + 31);

    // メインセリフ
    let speechText = '「今日も朝市はたのしいにゃー！美味しい魚がいっぱいニャ！」';
    let subText = '勝浦朝市を自由にお散歩するニャ！（WASD / 矢印キーで移動）';
    if (isYankee) {
      speechText = '「ヤンキーだにゃ！朝市の平和を守るにゃー！」';
      subText = '朝市アイテムを急いで拾って、助っ人を呼ぶニャ！';
    } else if (isKyon) {
      speechText = '「キョンが現れたにゃ！すばしっこいから気をつけるニャ！」';
      subText = 'ピョンピョン跳ねて突進してくるニャ！周囲をよく見て回避するニャ！';
    }

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(speechText, textStartX, winY + 64);
    ctx.shadowBlur = 0;

    // サブ説明文
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(subText, textStartX, winY + 92);

    // D. 右下：プレイヤーの操作が必須の「次へ進むボタン」（自動進行は完全廃止！）
    if (this.eventLockoutTimer <= 0) {
      const btnW = 190;
      const btnH = 38;
      const btnX = winX + winW - btnW - 16;
      const btnY = winY + winH - btnH - 14;

      // ボタン背景グラデーション
      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      if (isYankee) {
        btnGrad.addColorStop(0, '#f59e0b');
        btnGrad.addColorStop(1, '#d97706');
      } else if (isKyon) {
        btnGrad.addColorStop(0, '#10b981');
        btnGrad.addColorStop(1, '#059669');
      } else {
        btnGrad.addColorStop(0, '#38bdf8');
        btnGrad.addColorStop(1, '#0284c7');
      }

      ctx.save();
      // ボタンの光彩パルス
      ctx.shadowColor = isYankee ? '#f59e0b' : isKyon ? '#10b981' : '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.restore();

      // ボタン枠線
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 8);
      ctx.stroke();

      // ボタン文言
      let btnLabel = '朝市へGO！ ▶';
      if (isYankee) btnLabel = '撃退するニャ！ ⚔️';
      else if (isKyon) btnLabel = '警戒するニャ！ 🐾';

      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(btnLabel, btnX + btnW / 2, btnY + 24);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';

      // ボタン下の補助キー案内
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.fillText('[ TAP / SPACEキー ]', btnX + btnW / 2, btnY + btnH + 11);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  // ========================================================
  // 格闘ゲーム必殺技風・お助けキャラカットイン演出（斜めスリット・集中線・大迫力）
  // ========================================================
  renderAssistCutin(ctx) {
    if (!this.assistCutin) return;

    const cutin = this.assistCutin;
    const viewW = 880;
    const viewH = 495;
    const t = cutin.timer;
    const maxT = cutin.maxTimer;
    const p = Math.min(1.0, t / maxT);

    ctx.save();

    // 1. 全体暗転オーバーレイ（登場時のみスムーズにフェードイン）
    const enterDuration = 0.12;
    const overlayAlpha = t < enterDuration ? (t / enterDuration) * 0.82 : 0.82;
    ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
    ctx.fillRect(0, 0, viewW, viewH);

    // お助けキャラ画像の判定
    let targetCutinImg = null;
    if (cutin.type === 'tandem') targetCutinImg = this.images.cutinTandem;
    else if (cutin.type === 'mikoshi') targetCutinImg = this.images.cutinMikoshi;
    else if (cutin.type === 'noraneko') targetCutinImg = this.images.cutinNoraneko;

    const hasCustomImg = targetCutinImg && targetCutinImg.complete && targetCutinImg.naturalWidth > 0;

    if (hasCustomImg) {
      // ========================================================
      // パターンA: ユーザー提供の超美麗・文字入り必殺技カットイン画面
      // （16:9 全画面フルサイズ描画！クリック/タップで閉じるまでじっくり表示）
      // ========================================================
      let zoom = 1.0;
      if (t < enterDuration) {
        const enterP = t / enterDuration;
        zoom = 1.15 - enterP * 0.15; // 1.15 -> 1.0 へ衝撃ズームイン
      }

      // 登場直後のインパクトシェイク（0.35秒で安定）
      let shakeX = 0;
      let shakeY = 0;
      if (t < 0.35) {
        const shakeDecay = (0.35 - t) / 0.35;
        shakeX = Math.sin(t * 50) * 3.0 * shakeDecay;
        shakeY = Math.cos(t * 40) * 2.0 * shakeDecay;
      }

      ctx.save();
      ctx.translate(viewW / 2 + shakeX, viewH / 2 + shakeY);
      ctx.scale(zoom, zoom);

      // 画像描画（16:9比率を崩さず全画面フィット）
      ctx.drawImage(targetCutinImg, -viewW / 2, -viewH / 2, viewW, viewH);
      ctx.restore();

      // 上下の格ゲー風ゴールドネオンフレーム（画面をスタイリッシュに引き締める）
      ctx.save();
      const goldGrad = ctx.createLinearGradient(0, 0, viewW, 0);
      goldGrad.addColorStop(0, 'rgba(234, 179, 8, 0)');
      goldGrad.addColorStop(0.2, '#fef08a');
      goldGrad.addColorStop(0.5, '#f59e0b');
      goldGrad.addColorStop(0.8, '#fef08a');
      goldGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');

      ctx.fillStyle = goldGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.fillRect(0, 0, viewW, 4);
      ctx.fillRect(0, viewH - 4, viewW, 4);
      ctx.restore();

    } else {
      // ========================================================
      // パターンB: 専用画像読み込み前／未配置時のフォールバック
      // （斜めスリット帯 ＋ Canvas生成タイトルプレート ＋ セリフ枠 ＋ ドット絵）
      // ========================================================
      const centerX = viewW / 2;
      const centerY = viewH / 2;
      const slitHeight = 310;
      const angle = -0.12; // 約 -6.9度

      let slideOffsetX = 0;
      if (t < enterDuration) {
        const enterP = t / enterDuration;
        slideOffsetX = (1.0 - Math.sin(enterP * Math.PI * 0.5)) * (viewW * 0.6);
      }

      ctx.save();
      ctx.translate(centerX + slideOffsetX, centerY);
      ctx.rotate(angle);

      const slitW = viewW * 1.6;
      const slitHalfH = slitHeight / 2;

      ctx.beginPath();
      ctx.rect(-slitW / 2, -slitHalfH, slitW, slitHeight);
      ctx.save();
      ctx.clip();

      // スリット帯背景
      const bgGrad = ctx.createLinearGradient(-slitW / 2, -slitHalfH, slitW / 2, slitHalfH);
      if (cutin.type === 'tandem') {
        bgGrad.addColorStop(0, '#1e1b4b');
        bgGrad.addColorStop(0.5, '#431407');
        bgGrad.addColorStop(1, '#7c2d12');
      } else if (cutin.type === 'mikoshi') {
        bgGrad.addColorStop(0, '#311042');
        bgGrad.addColorStop(0.5, '#78350f');
        bgGrad.addColorStop(1, '#9a3412');
      } else {
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.5, '#1e293b');
        bgGrad.addColorStop(1, '#0f766e');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-slitW / 2, -slitHalfH, slitW, slitHeight);

      // スピード集中線
      const animOffset = (t * 600) % 80;
      ctx.lineWidth = 4;
      for (let lx = -slitW / 2 - 100; lx < slitW / 2 + 100; lx += 40) {
        const lineX = lx + animOffset;
        const alpha = 0.08 + Math.abs(Math.sin((lx + t * 200) * 0.02)) * 0.12;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(lineX, -slitHalfH);
        ctx.lineTo(lineX + 90, slitHalfH);
        ctx.stroke();
      }

      // 放射状インパクト集中線
      const burstOriginX = slitW * 0.15;
      const burstOriginY = 0;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      const rayCount = 18;
      const rayAngleBase = (t * 2.0) % (Math.PI * 2);
      for (let r = 0; r < rayCount; r++) {
        const ra = rayAngleBase + (r / rayCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(burstOriginX, burstOriginY);
        ctx.lineTo(burstOriginX + Math.cos(ra) * 900, burstOriginY + Math.sin(ra) * 500);
        ctx.lineTo(burstOriginX + Math.cos(ra + 0.08) * 900, burstOriginY + Math.sin(ra + 0.08) * 500);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // フォールバックキャラ描画
      const charZoom = 1.0;
      const charX = slitW * 0.10;
      const charY = 0;
      ctx.save();
      ctx.translate(charX, charY);
      ctx.scale(charZoom, charZoom);

      if (cutin.type === 'tandem') {
        if (this.images.tandemBike && this.images.tandemBike.complete && this.images.tandemBike.naturalWidth > 0) {
          const bw = 240;
          const bh = 135;
          ctx.drawImage(this.images.tandemBike, -bw / 2, -bh / 2, bw, bh);
        } else {
          ctx.font = 'bold 70px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚴💨 60代タンデムライダー！', 0, 0);
        }
      } else if (cutin.type === 'mikoshi') {
        if (this.images.mikoshi && this.images.mikoshi.complete && this.images.mikoshi.naturalWidth > 0) {
          const mw = 220;
          const mh = 220;
          ctx.drawImage(this.images.mikoshi, -mw / 2, -mh / 2, mw, mh);
        } else {
          ctx.font = 'bold 70px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏮 勝浦神輿軍団！！ 🏮', 0, 0);
        }
      } else {
        if (this.images.allyCat.complete && this.images.allyCat.naturalWidth > 0) {
          const sprite = this.images.allyCat;
          const { sx, sy, sw, sh } = this.getNoraFrame();
          const width = 160 * sw / sh;
          ctx.drawImage(sprite, sx, sy, sw, sh, -width / 2, -80, width, 160);
        } else {
          ctx.font = 'bold 70px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🐾 助太刀ノラネコ！！', 0, 0);
        }
      }
      ctx.restore();
      ctx.restore(); // clip 終了

      // スリット帯ボーダー
      ctx.save();
      const borderGrad = ctx.createLinearGradient(-slitW / 2, 0, slitW / 2, 0);
      borderGrad.addColorStop(0, 'rgba(234, 179, 8, 0.2)');
      borderGrad.addColorStop(0.2, '#fef08a');
      borderGrad.addColorStop(0.5, '#f59e0b');
      borderGrad.addColorStop(0.8, '#fef08a');
      borderGrad.addColorStop(1, 'rgba(234, 179, 8, 0.2)');

      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.moveTo(-slitW / 2, -slitHalfH);
      ctx.lineTo(slitW / 2, -slitHalfH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-slitW / 2, slitHalfH);
      ctx.lineTo(slitW / 2, slitHalfH);
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // rotate 終了

      // フォールバック時のCanvas UI
      const bannerW = 380;
      const bannerH = 46;
      const bannerX = (viewW - bannerW) / 2;
      const bannerY = 48;

      ctx.save();
      const titleGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX, bannerY + bannerH);
      titleGrad.addColorStop(0, '#fef08a');
      titleGrad.addColorStop(0.4, '#f59e0b');
      titleGrad.addColorStop(1, '#b45309');

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = titleGrad;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = 'italic 900 24px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText('⚡ ' + cutin.title + ' ⚡', viewW / 2, bannerY + bannerH / 2);
      ctx.fillText('⚡ ' + cutin.title + ' ⚡', viewW / 2, bannerY + bannerH / 2);
      ctx.restore();

      const boxX = 35;
      const boxY = viewH - 125;
      const boxW = viewW - 70;
      const boxH = 92;

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const mikeIconSize = 68;
      const mikeX = boxX + 12;
      const mikeY = boxY + 12;

      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(mikeX, mikeY, mikeIconSize, mikeIconSize, 8);
      ctx.fill();
      ctx.stroke();
      ctx.clip();

      if (this.images.cutinCat && this.images.cutinCat.complete && this.images.cutinCat.naturalWidth > 0) {
        ctx.drawImage(this.images.cutinCat, 0, 0, this.images.cutinCat.naturalWidth, this.images.cutinCat.naturalHeight, mikeX, mikeY, mikeIconSize, mikeIconSize);
      } else if (this.images.cat && this.images.cat.complete) {
        ctx.imageSmoothingEnabled = false;
        const cell = 256;
        ctx.drawImage(this.images.cat, 0, cell * 2, cell, cell, mikeX, mikeY, mikeIconSize, mikeIconSize);
      }
      ctx.restore();

      const textStartX = mikeX + mikeIconSize + 16;
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🐾 看板三毛猫 ミケ', textStartX, boxY + 24);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.strokeText(cutin.speech, textStartX, boxY + 56);
      ctx.fillText(cutin.speech, textStartX, boxY + 56);

      let effectDesc = '強烈なタンデムアタックで敵を一網打尽にするニャ！';
      if (cutin.type === 'mikoshi') {
        effectDesc = '勝浦の熱気あふれる神輿が敵を豪快に吹き飛ばすニャ！';
      } else if (cutin.type === 'noraneko') {
        effectDesc = '心強い仲間猫が一緒に戦ってくれるニャ！';
      }
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(effectDesc, textStartX, boxY + 76);
      ctx.restore();
    }

    // 3. クリック/タップで閉じる（出撃）ボタンUI（点滅案内）
    if (cutin.lockoutTimer <= 0) {
      const blink = 0.8 + Math.sin(t * 8) * 0.2;
      const btnW = 360;
      const btnH = 46;
      const btnX = (viewW - btnW) / 2;
      const btnY = viewH - 58;

      ctx.save();
      // 半透明グラデーション背景
      const btnBg = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnBg.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
      btnBg.addColorStop(1, 'rgba(30, 41, 59, 0.95)');
      ctx.fillStyle = btnBg;
      ctx.strokeStyle = `rgba(245, 158, 11, ${blink})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14 * blink;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 23);
      ctx.fill();
      ctx.stroke();

      // ボタン内テキスト
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText('⚡ 画面クリック / タップで出撃！ ▶', viewW / 2, btnY + btnH / 2);
      ctx.restore();
    }

    // 4. 開始時の白閃光フラッシュ（必殺技炸裂の衝撃）
    if (t < 0.10) {
      const flashAlpha = (1.0 - t / 0.10) * 0.55;
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    ctx.restore();
  }

  // 背景マップ描画（平和モード時と戦闘モード時で背景を切り替え！）
  renderMap(ctx) {
    // 平和モード：ヤンキー襲来前は明るい平和な朝市マップ！
    const isPeaceMode = !this.firstYankeeEventDone;
    const targetImg = isPeaceMode
      ? (this.images.mapPeace && this.images.mapPeace.complete && this.images.mapPeace.naturalWidth > 0 ? this.images.mapPeace : this.images.mapHorizontal)
      : (this.images.mapHorizontal && this.images.mapHorizontal.complete && this.images.mapHorizontal.naturalWidth > 0 ? this.images.mapHorizontal : this.images.mapPeace);

    if (targetImg && targetImg.complete && targetImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      // カメラ視界の範囲だけクリップして高速転送（GPU帯域とフィルレートを60%削減！）
      const sx = Math.max(0, Math.min(this.worldW - this.viewW, Math.floor(this.camera.x)));
      const sy = Math.max(0, Math.min(this.worldH - this.viewH, Math.floor(this.camera.y)));
      const sw = Math.min(this.viewW, this.worldW - sx);
      const sh = Math.min(this.viewH, this.worldH - sy);
      ctx.drawImage(targetImg, sx, sy, sw, sh, sx, sy, sw, sh);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, this.worldW, this.worldH);
    }
  }

  // 手前オブジェクト前景描画（人やパラソル・屋台を透過オーバーレイ描画し、後ろを歩く演出を実現！）
  renderForeground(ctx) {
    const isPeaceMode = !this.firstYankeeEventDone;
    const fgImg = isPeaceMode
      ? (this.images.mapForegroundPeace && this.images.mapForegroundPeace.complete && this.images.mapForegroundPeace.naturalWidth > 0 ? this.images.mapForegroundPeace : this.images.mapForeground)
      : (this.images.mapForeground && this.images.mapForeground.complete && this.images.mapForeground.naturalWidth > 0 ? this.images.mapForeground : this.images.mapForegroundPeace);

    if (fgImg && fgImg.complete && fgImg.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // 透過処理：プレイヤー（ミケ）が手前オブジェクト周辺（y >= 580）にいる時は半透明（0.55）に透過
      const isPlayerBehind = (this.player && this.player.y >= 580);
      ctx.globalAlpha = isPlayerBehind ? 0.55 : 0.82;

      // カメラ視界の範囲だけ高速クリップ転送（重苦しい全画面アルファブレンドを解消！）
      const sx = Math.max(0, Math.min(this.worldW - this.viewW, Math.floor(this.camera.x)));
      const sy = Math.max(0, Math.min(this.worldH - this.viewH, Math.floor(this.camera.y)));
      const sw = Math.min(this.viewW, this.worldW - sx);
      const sh = Math.min(this.viewH, this.worldH - sy);
      ctx.drawImage(fgImg, sx, sy, sw, sh, sx, sy, sw, sh);
      ctx.restore();
    }
  }

  // ドロップアイテム描画
  renderDropItems(ctx) {
    const now = this.simulationTime * 1000;
    const minX = this.camera.x - 40;
    const maxX = this.camera.x + this.viewW + 40;
    const minY = this.camera.y - 40;
    const maxY = this.camera.y + this.viewH + 40;

    for (let i = 0; i < this.dropItems.length; i++) {
      const item = this.dropItems[i];
      // 画面外カリング
      if (item.x < minX || item.x > maxX || item.y < minY || item.y > maxY) continue;

      const bob = Math.sin(now / 160 + item.x) * 3.5;
      const ix = item.x;
      const iy = item.y + bob;

      // 地面の影
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.ellipse(item.x, item.y + 10, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (item.type === 'matatabi') {
        // ★金のまたたび（黄金の招き猫の鈴＆神々しい光輪）
        ctx.save();
        // 鈴本体
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ix, iy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // ハイライト
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(ix - 3, iy - 3, 4, 0, Math.PI * 2);
        ctx.fill();

        // 鈴のスリットと穴
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(ix, iy + 3.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(ix - 5, iy + 2, 10, 2);

        // 赤い飾り紐
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(ix - 4, iy - 15, 8, 4);

        // 神秘のオーラリング
        const pulse = (Math.sin(now / 120) + 1) / 2;
        ctx.strokeStyle = `rgba(254, 240, 138, ${0.45 + pulse * 0.45})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ix, iy, 16 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (item.type === 'bonito') {
        // ★勝浦名物「生カツオ」（一本釣りの新鮮な青魚！）
        ctx.save();
        ctx.translate(ix, iy);

        // 魚体（背中の鮮やかな群青色）
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.ellipse(0, -2, 14, 7, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // お腹（銀白色）
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(1, 2, 12, 5, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // カツオの縦縞模様（3本）
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, 1); ctx.lineTo(7, 1);
        ctx.moveTo(-5, 3); ctx.lineTo(6, 3);
        ctx.moveTo(-3, 5); ctx.lineTo(4, 5);
        ctx.stroke();

        // 尾びれ
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.moveTo(-12, -2);
        ctx.lineTo(-18, -8);
        ctx.lineTo(-15, -2);
        ctx.lineTo(-18, 4);
        ctx.closePath();
        ctx.fill();

        // 胸びれ
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.ellipse(2, 0, 4, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // つぶらな黒目＆白ハイライト
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(10, -2, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10.5, -3, 1, 1);

        ctx.restore();
      } else if (item.type === 'coffee') {
        // ★勝浦名物「SPICE COFFEE」（氷たっぷりアイスコーヒー＆ストロー）
        ctx.save();
        ctx.translate(ix, iy);

        // 透明プラスチックカップ
        ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-8, -10);
        ctx.lineTo(8, -10);
        ctx.lineTo(6, 10);
        ctx.lineTo(-6, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 深煎りアイスコーヒー液面
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(7, -4);
        ctx.lineTo(5.5, 9);
        ctx.lineTo(-5.5, 9);
        ctx.closePath();
        ctx.fill();

        // クラッシュアイス（氷の粒）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(-4, -2, 3, 3);
        ctx.fillRect(1, 0, 3.5, 3);

        // ドーム蓋
        ctx.fillStyle = 'rgba(186, 230, 253, 0.9)';
        ctx.beginPath();
        ctx.arc(0, -10, 8, Math.PI, 0);
        ctx.fill();

        // 赤白ストロー
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(1, -9);
        ctx.lineTo(4, -16);
        ctx.stroke();

        ctx.restore();
      } else if (item.type === 'warabi') {
        // ★勝浦朝市名物「南蛮屋のぷるぷるわらび餅」
        ctx.save();
        ctx.translate(ix, iy);

        // 笹の葉の器（緑）
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(0, 5, 14, 6, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // ぷるぷる透明わらび餅（3粒）
        ctx.fillStyle = 'rgba(254, 240, 138, 0.95)'; // きな粉色
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;

        // 粒1
        ctx.beginPath();
        ctx.arc(-5, 0, 5.5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 粒2
        ctx.beginPath();
        ctx.arc(4, -2, 6, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 粒3
        ctx.beginPath();
        ctx.arc(0, 3, 5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // とろ〜り黒蜜（濃い黒糖ライン）
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-6, -3);
        ctx.quadraticCurveTo(0, 2, 6, -1);
        ctx.stroke();

        // つまようじ
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-8, 6);
        ctx.lineTo(-2, -6);
        ctx.stroke();

        ctx.restore();
      } else if (item.type === 'tandem_bike') {
        // ★タンデムクロスバイク（青い自転車＆仲良し老夫婦アイテム）
        ctx.save();
        ctx.translate(ix, iy);

        // オーラリング
        const pulse = (Math.sin(now / 110) + 1) / 2;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        // 青いフレームのカプセル
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 自転車絵文字
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚲', 0, 1);

        ctx.restore();
      } else if (item.type === 'tantan') {
        // ★勝浦名物「勝浦タンタン麺」（真っ赤なラー油スープ、玉ねぎ、ひき肉、白ネギ、レンゲ）
        ctx.save();
        ctx.translate(ix, iy);

        // 1. 赤い情熱のオーラリング
        const pulse = (Math.sin(now / 110) + 1) / 2;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        // 2. ラーメンどんぶり（黒×金の高級漆器どんぶり）
        ctx.fillStyle = '#1e1b4b'; // 漆黒の外側
        ctx.strokeStyle = '#f59e0b'; // 金の縁取り
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 4, 15, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. 真っ赤な激辛ラー油スープ面！
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(0, 2, 13, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // ラー油の赤いグラデーション
        const soupGrad = ctx.createRadialGradient(0, 2, 2, 0, 2, 12);
        soupGrad.addColorStop(0, '#f97316');
        soupGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = soupGrad;
        ctx.beginPath();
        ctx.ellipse(0, 2, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. 炒め玉ねぎ＆豚ひき肉（中央の具材の山）
        ctx.fillStyle = '#78350f'; // ひき肉
        ctx.beginPath();
        ctx.arc(-2, 1, 3.5, 0, Math.PI * 2);
        ctx.arc(3, 0, 3, 0, Math.PI * 2);
        ctx.arc(0, 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a'; // 飴色玉ねぎ
        ctx.beginPath();
        ctx.ellipse(-1, 0, 4, 1.8, 0.3, 0, Math.PI * 2);
        ctx.ellipse(2, 2, 3.5, 1.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 5. シャキシャキ刻み白ネギ＆青ネギ
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -1, 3, 1.5);
        ctx.fillRect(1, 1, 3, 1.5);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-1, 2, 2.5, 1.5);

        // 6. 陶器の白いレンゲ
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, 4);
        ctx.quadraticCurveTo(12, -2, 10, -7);
        ctx.stroke();

        // 7. 熱々の立ちのぼる湯気
        ctx.strokeStyle = 'rgba(254, 205, 211, 0.8)';
        ctx.lineWidth = 1.5;
        const steamBob = Math.sin(now / 90) * 2;
        ctx.beginPath();
        ctx.moveTo(-4, -4 + steamBob);
        ctx.quadraticCurveTo(-7, -10 + steamBob, -3, -15 + steamBob);
        ctx.moveTo(3, -5 - steamBob);
        ctx.quadraticCurveTo(6, -11 - steamBob, 2, -16 - steamBob);
        ctx.stroke();

        ctx.restore();
      }

      // ★目立つ下矢印インジケーター（▼）＆足元パルス光輪！
      ctx.save();
      // 1. 足元の光輪パルスエフェクト
      const pulse = (Math.sin(now / 150 + item.x) + 1) / 2;
      const ringColor = item.type === 'coffee' 
        ? `rgba(56, 189, 248, ${0.45 + pulse * 0.45})` 
        : item.type === 'tantan'
        ? `rgba(239, 68, 68, ${0.5 + pulse * 0.5})`
        : `rgba(250, 204, 21, ${0.45 + pulse * 0.45})`;
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(item.x, item.y + 10, 18 + pulse * 7, 7 + pulse * 3, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 2. 頭上で上下にピョンピョン跳ねる下矢印マーカー（▼）
      const arrowBob = Math.sin(now / 130 + item.x) * 4;
      const arrowY = iy - 24 + arrowBob;
      ctx.translate(item.x, arrowY);

      // 下矢印ポリゴン（鮮やかなイエロー、黒の太枠、赤ハイライト）
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 7); // 下向きの矢印先端
      ctx.lineTo(8, -4);
      ctx.lineTo(3.5, -4);
      ctx.lineTo(3.5, -11);
      ctx.lineTo(-3.5, -11);
      ctx.lineTo(-3.5, -4);
      ctx.lineTo(-8, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 内側の赤・橙ハイライト
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(5, -2);
      ctx.lineTo(2, -2);
      ctx.lineTo(2, -9);
      ctx.lineTo(-2, -9);
      ctx.lineTo(-2, -2);
      ctx.lineTo(-5, -2);
      ctx.closePath();
      ctx.fill();

      // アイテム名のミニラベル（COFFEE / わらび餅 / 勝浦タンタン麺）
      const itemLabel = item.type === 'coffee' 
        ? '☕ COFFEE' 
        : item.type === 'warabi' 
        ? '🍡 わらび餅' 
        : item.type === 'tantan'
        ? '🍜 勝浦タンタン麺'
        : item.type === 'tandem_bike' 
        ? '🚲 バイク' 
        : '';
      if (itemLabel) {
        ctx.font = 'bold 9.5px "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(itemLabel, 0, -12);
      }

      ctx.restore();
    }
  }

  drawItemIcon(ctx, key, x, y, size) {
    const spr = SPRITES.items[key];
    if (spr && this.images.items.complete && this.images.items.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.images.items, spr.sx, spr.sy, spr.sw, spr.sh, x - size / 2, y - size / 2, size, size);
    } else {
      ctx.fillStyle = key === 'BONITO' ? '#2563eb' : key === 'ICED_COFFEE' ? '#78350f' : '#d97706';
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
  }

  // Yソート立体レンダリング（カメラ視界カリングで画面外の敵の描画を完全カット！）
  renderYSortedEntities(ctx) {
    const list = [];
    const minX = this.camera.x - 60;
    const maxX = this.camera.x + this.viewW + 60;
    const minY = this.camera.y - 60;
    const maxY = this.camera.y + this.viewH + 60;

    // 敵（画面内に入っている敵のみリストアップ！）
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY) {
        list.push({
          y: e.y,
          draw: () => this.drawEnemy(ctx, e)
        });
      }
    }

    // プレイヤー（三毛猫ミケ）
    list.push({
      y: this.player.y,
      draw: () => this.drawPlayer(ctx)
    });

    // 助太刀仲間にゃんこ（クロ、トラ吉、チビ、シロ）
    this.allyCats.forEach(cat => {
      list.push({
        y: cat.y,
        draw: () => this.drawAllyCat(ctx, cat)
      });
    });

    // 子猫たち（チビミケ1号・2号）
    this.kittens.forEach(kit => {
      if (kit.x !== undefined) {
        list.push({
          y: kit.y,
          draw: () => this.drawKitten(ctx, kit)
        });
      }
    });

    list.sort((a, b) => a.y - b.y);
    list.forEach(item => item.draw());
  }

  // 子猫描画（チビミケ1号・2号：チョコチョコついてくる可愛いミニ猫！）
  drawKitten(ctx, kit) {
    ctx.save();
    const hopY = kit.isMoving ? -Math.abs(Math.sin((kit.animTimer || 0) * Math.PI)) * 4 : 0;
    ctx.translate(kit.x, kit.y + hopY);

    // 足元接地影
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // スプライト画像があれば使用（256x256グリッドから正確に切り出し！）、なければプロシージャル描画
    if (this.images.cat.complete && this.images.cat.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      let col = 0, row = 0;
      let flipX = (kit.dir === 'left' || kit.facing === -1);

      if (kit.scratchAnimTimer > 0) {
        // 子ミケもひっかき攻撃ポーズ！（Row 3 Col 2）
        row = 3;
        col = 2;
      } else if (kit.dir === 'left') {
        flipX = true;
        row = kit.isMoving ? 1 : 0;
        col = (kit.animFrame || 0) % 4;
      } else if (kit.dir === 'up') {
        row = 2; col = 1; // 後ろ姿
      } else if (kit.dir === 'down') {
        row = 2; col = 0; // 正面
      } else {
        row = kit.isMoving ? 1 : 0;
        col = (kit.animFrame || 0) % 4;
      }

      ctx.save();
      if (flipX) ctx.scale(-1, 1);
      // 子猫サイズ：親猫（52x52）に対して愛らしく目立つ36x36px！（原点は足元中央）
      ctx.drawImage(this.images.cat, col * 256, row * 256, 256, 256, -18, -34, 36, 36);
      ctx.restore();
    } else {
      // プロシージャル子猫（胴体・耳・三毛模様）
      const baseColor = kit.type === 'black' ? '#1e293b' : kit.type === 'white' ? '#f8fafc' : '#fef3c7';
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 頭
      ctx.beginPath();
      ctx.arc(6, -6, 9, 0, Math.PI * 2);
      ctx.fill();

      // 耳
      ctx.fillStyle = kit.type === 'black' ? '#0f172a' : kit.type === 'white' ? '#fda4af' : '#b45309';
      ctx.beginPath();
      ctx.moveTo(3, -13); ctx.lineTo(7, -18); ctx.lineTo(9, -12);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -12); ctx.lineTo(13, -17); ctx.lineTo(14, -10);
      ctx.closePath(); ctx.fill();

      // 目（クロ猫はキラリと光る金目！）
      ctx.fillStyle = kit.type === 'black' ? '#fde047' : '#0f172a';
      ctx.beginPath(); ctx.arc(9, -6, 1.8, 0, Math.PI * 2); ctx.fill();

      // 三毛パッチ
      if (kit.type === 'calico') {
        ctx.fillStyle = '#b45309';
        ctx.beginPath(); ctx.arc(-2, -2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(4, 2, 4, 0, Math.PI * 2); ctx.fill();
      }

      // しっぽ
      ctx.strokeStyle = kit.type === 'black' ? '#0f172a' : kit.type === 'white' ? '#e2e8f0' : '#d97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-18, -10, -14, -14);
      ctx.stroke();
    }

    ctx.restore();
  }

  // プレイヤー描画（三毛猫ミケ：滑らかな歩行・立ち姿・トコトコ歩き＆激走ダッシュ）
  drawPlayer(ctx) {
    const p = this.player;
    ctx.save();

    // 走っているときの上下ボブ（ピョコピョコ跳ねる自然なリズム）
    let hopY = 0;
    let tilt = 0;
    const isMoving = !!p.isMoving;

    if (isMoving) {
      // 過剰な震えを抑え、自然で愛らしい歩行ボブ
      hopY = -Math.abs(Math.sin(p.animTimer * 0.5 * Math.PI)) * (p.isDashing ? 3.0 : 2.0);
      if (p.dir === 'left' || p.dir === 'right') {
        tilt = p.facing * (p.isDashing ? 0.08 : 0.04);
      }
    }

    ctx.translate(p.x, p.y + hopY);
    if (tilt !== 0) ctx.rotate(tilt);

    // 足元接地影（自然なスケール変化）
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    const shadowScale = Math.max(0.7, 1 - Math.abs(hopY) / 12);
    ctx.ellipse(0, -hopY * 0.4, 18 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // コーヒー爆速湯気エフェクト
    // 点滅（被弾無敵）
    if (p.invincibleTimer > 0 && Math.floor(this.simulationTime * 1000 / 60) % 2 === 0) {
      ctx.restore();
      return;
    }

    // ネコスプライト描画
    if (this.images.cat && this.images.cat.complete && this.images.cat.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      const cell = SPRITES.cat.cell; // 256
      let row = 0;
      let col = 0;
      let flipX = false;

      if (p.dir === 'up') {
        // 後ろ姿（唐草風呂敷）: 移動中は歩き（Row 3 Col 1）、静止中はおすわり（Row 2 Col 1）
        col = 1;
        row = isMoving ? 3 : 2;
      } else if (p.dir === 'down') {
        // 正面（笑顔）: 移動中は歩き（Row 3 Col 0）、静止中はおすわり（Row 2 Col 0）
        col = 0;
        row = isMoving ? 3 : 2;
      } else {
        // 左右の横向き
        flipX = (p.dir === 'left' || p.facing === -1);
        if (isMoving) {
          // 通常移動はRow 0（トコトコ歩き4コマ）、スピードバフ中はRow 1（激走ダッシュ4コマ）
          row = p.isDashing ? 1 : 0;
          col = p.animFrame % 4;
        } else {
          // 静止時は横向き立ち姿（Row 0 Col 0）
          row = 0;
          col = 0;
        }
      }

      ctx.save();
      // 左右移動時のみ向き反転（上下移動でのチラつきを完全防止！）
      if (flipX) {
        ctx.scale(-1, 1);
      }

      // 静止時のやわらか呼吸アニメーション
      if (!isMoving) {
        const breathe = 1 + Math.sin(this.simulationTime * (1000 / 350)) * 0.02;
        ctx.scale(1, breathe);
      }

      // ドット絵描画（256x256 から 52x52 にスケール）
      ctx.drawImage(this.images.cat, col * cell, row * cell, cell, cell, -26, -46, 52, 52);
      ctx.restore();
    } else {
      // 画像ロード待ち時のフォールバック描画（オレンジの四角形を全廃し、可愛い三毛猫シルエットを描画！）
      ctx.save();
      // 体（白）
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -14, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // 背中の三毛ブチ（茶色・黒）
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(4, -16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-5, -13, 5, 0, Math.PI * 2);
      ctx.fill();
      // 頭（白）
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -26, 11, 0, Math.PI * 2);
      ctx.fill();
      // 耳（右：茶色、左：黒）
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(3, -33);
      ctx.lineTo(10, -42);
      ctx.lineTo(11, -30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-3, -33);
      ctx.lineTo(-10, -42);
      ctx.lineTo(-11, -30);
      ctx.closePath();
      ctx.fill();
      // 目と鼻
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-4, -26, 1.8, 0, Math.PI * 2);
      ctx.arc(4, -26, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, -23, 1.2, 0, Math.PI * 2);
      ctx.fill();
      // しっぽ
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-12, -14);
      ctx.quadraticCurveTo(-20, -22, -16, -30);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // （旧周回カツオ描画は全廃）
  drawBonitoBoomerangOrbit(ctx) {}

  // 敵描画（ヤンキー、キョン、トンビ、ボス：被弾時の揺れ・のけぞり・白熱点滅対応）
  drawEnemy(ctx, e) {
    ctx.save();

    // 1. 被弾ヒットシェイク（激しい振動）
    let shakeX = 0;
    let shakeY = 0;
    if (e.hitShakeTimer > 0) {
      shakeX = Math.sin(this.simulationTime * 145 + e.x * 0.07) * 4.0;
      shakeY = Math.cos(this.simulationTime * 131 + e.y * 0.09) * 2.75;
    }

    ctx.translate(e.x + shakeX, e.y + shakeY);

    // 2. 被弾のけぞりチルト（仰け反る回転角度）
    if (e.hitTilt) {
      ctx.rotate(e.hitTilt);
    }

    // 足元影
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, e.w / 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. 被弾ホワイトフラッシュ・白熱点滅（超激重な ctx.filter を完全撤廃し、超軽量オーバーレイで実現！）
    const isHitFlashing = (e.hitFlashTimer > 0);
    const isStunFlashing = (e.stunTimer > 0 && Math.floor(this.simulationTime * 1000 / 80) % 2 === 0);

    if (e.type === 'kyon' || e.type === 'boss_kyon') {
      // 房総名物キョン（ピョンピョン跳ねる小型シカのプロシージャルドット絵）
      const hopY = -Math.abs(Math.sin(e.animTimer * 2.5)) * (e.isBoss ? 16 : 9);
      const scale = e.isBoss ? 2.3 : 1.0;
      ctx.scale(e.dir === 'right' ? scale : -scale, scale);

      // 胴体（茶色）
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, -14 + hopY, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // お腹・胸（白〜クリーム）
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(3, -12 + hopY, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 頭部
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(10, -22 + hopY, 8, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // 小さな角（キョンの特徴！）
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(9, -28 + hopY);
      ctx.lineTo(8, -34 + hopY);
      ctx.moveTo(12, -28 + hopY);
      ctx.lineTo(13, -34 + hopY);
      ctx.stroke();

      // ピンとした耳
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(5, -28 + hopY, 3, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // つぶらな黒目＆鼻
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(13, -23 + hopY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(16, -20 + hopY, 2, 2);

      // 細い脚（ピョンピョン走る）
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      const legA = Math.sin(e.animTimer * 3) * 6;
      ctx.beginPath();
      ctx.moveTo(-6, -6 + hopY); ctx.lineTo(-8 + legA, 0);
      ctx.moveTo(-2, -6 + hopY); ctx.lineTo(-2 - legA, 0);
      ctx.moveTo(4, -6 + hopY);  ctx.lineTo(4 + legA, 0);
      ctx.moveTo(8, -6 + hopY);  ctx.lineTo(10 - legA, 0);
      ctx.stroke();

    } else if (e.type === 'tonbi') {
      // 鳶（トンビ：翼を広げて上空から急降下）
      const wingBob = Math.sin(e.animTimer * 4) * 8;
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, -22, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 大きな翼
      ctx.fillStyle = '#542805';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-24, -28 + wingBob);
      ctx.lineTo(-8, -20);
      ctx.lineTo(0, -22);
      ctx.lineTo(24, -28 + wingBob);
      ctx.lineTo(8, -20);
      ctx.fill();

      // クチバシ
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(e.dir === 'right' ? 12 : -12, -22);
      ctx.lineTo(e.dir === 'right' ? 18 : -18, -20);
      ctx.lineTo(e.dir === 'right' ? 12 : -18, -18);
      ctx.fill();

    } else {
      // ヤンキー軍団（ツッパリ、特攻服、スケボー、総長）
      const hasSprite = this.images.yankees && this.images.yankees.complete && this.images.yankees.naturalWidth > 0;
      if (hasSprite) {
        ctx.imageSmoothingEnabled = false;
        const yankeeType = (SPRITES.yankees && SPRITES.yankees[e.type === 'boss_yankee' ? 'tokko' : e.type]) || (SPRITES.yankees && SPRITES.yankees.tsuppari);
        const walkFrames = (yankeeType && yankeeType.walk) ? yankeeType.walk : [];
        const frameIdx = walkFrames.length > 0 ? (Math.floor(e.animTimer || 0) % walkFrames.length) : 0;
        const spr = walkFrames[frameIdx];

        const scale = e.isBoss ? 1.6 : 1.0;
        ctx.scale(e.dir === 'right' ? scale : -scale, scale);
        if (spr && spr.sx !== undefined) {
          ctx.drawImage(this.images.yankees, spr.sx, spr.sy, spr.sw, spr.sh, -18, -48, 36, 48);
        } else {
          ctx.fillStyle = e.color || '#ef4444';
          ctx.fillRect(-16, -42, 32, 42);
        }
      } else {
        // 画像ロード前フォールバック（紫の四角形を全廃し、学ラン・リーゼントのシルエットを描画！）
        ctx.save();
        const scale = e.isBoss ? 1.6 : 1.0;
        ctx.scale(e.dir === 'right' ? scale : -scale, scale);
        // 学ラン
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-12, -26, 24, 26);
        // 顔（肌色）
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(-8, -38, 16, 12);
        // リーゼント（黒髪）
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(-10, -46, 22, 10);
        ctx.fillRect(8, -44, 6, 8);
        // サングラス
        ctx.fillStyle = '#000000';
        ctx.fillRect(-6, -35, 12, 3);
        ctx.restore();
      }
    }

    // 4. 被弾ヒットインパクトの閃光（Hit Spark & Slash Impact）
    if (isHitFlashing) {
      ctx.save();
      const sparkR = e.isBoss ? 26 : 16;

      // 外側イエローオーラ発光（shadowBlurを使わず太い半透明ストロークで超高速描画！）
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-sparkR, -22); ctx.lineTo(sparkR, -22);
      ctx.moveTo(0, -22 - sparkR); ctx.lineTo(0, -22 + sparkR);
      ctx.stroke();

      // 中心白熱コア
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-sparkR, -22); ctx.lineTo(sparkR, -22);
      ctx.moveTo(0, -22 - sparkR); ctx.lineTo(0, -22 + sparkR);
      ctx.stroke();

      // 斜め火花
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.8;
      const diagR = sparkR * 0.7;
      ctx.beginPath();
      ctx.moveTo(-diagR, -22 - diagR); ctx.lineTo(diagR, -22 + diagR);
      ctx.moveTo(-diagR, -22 + diagR); ctx.lineTo(diagR, -22 - diagR);
      ctx.stroke();

      ctx.restore();
    }

    // 被弾ホワイトフラッシュ・白熱点滅の軽量オーバーレイ
    if (isHitFlashing || isStunFlashing) {
      ctx.fillStyle = isHitFlashing ? 'rgba(255, 255, 255, 0.75)' : 'rgba(253, 224, 71, 0.6)';
      ctx.beginPath();
      ctx.ellipse(0, -e.h * 0.45, e.w * 0.45, e.h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 敵HPバー（被ダメージ時またはボス時）
    if (e.hp < e.maxHp || e.isBoss) {
      const barW = e.isBoss ? 56 : 28;
      const barH = e.isBoss ? 6 : 4;
      const barY = e.y - (e.isBoss ? 65 : 48);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(e.x - barW / 2, barY, barW, barH);

      const ratio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = e.isBoss ? '#f59e0b' : '#ef4444';
      ctx.fillRect(e.x - barW / 2, barY, barW * ratio, barH);

      // ★最終決戦のヤンキー総長には目立つ「👑 ヤンキー総長」バッジを表示！
      if (e.isFinalBoss) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText('👑 ヤンキー総長', e.x, barY - 4);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
      }
    }
  }

  // 投射物描画（超ド派手ネオン光刃・極炎火炎・三重発光衝撃波）
  renderProjectiles(ctx) {
    // 1. 爪撃＆七輪ファイア
    this.projectiles.forEach(pr => {
      ctx.save();
      ctx.translate(pr.x, pr.y);

      if (pr.type === 'scratch') {
        const angle = Math.atan2(pr.vy, pr.vx);
        ctx.rotate(angle);

        // 仲間にゃんこ／子猫／プレイヤーごとのブレード色とスケール
        const isKitten = !!pr.isKitten;
        const isAlly = !!pr.isAlly;
        const mainColor = isKitten ? '#38bdf8' : isAlly ? '#c084fc' : '#00f0ff';
        const subColor = isKitten ? '#7dd3fc' : isAlly ? '#a855f7' : '#0284c7';

        // シャープで洗練された猫爪痕（親ミケは0.72で範囲狭くスマート、子ミケは0.38でさらに小さく可愛い！）
        const scale = isKitten ? 0.38 : (isAlly ? 0.65 : 0.72);
        const bladeOffsets = [-4.5 * scale, 0, 4.5 * scale];
        bladeOffsets.forEach((offY, idx) => {
          const arcLen = (idx === 1 ? 14 : 11) * scale;

          // 外側オーラブレード（shadowBlurを使わず太いストロークで高速描画！）
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 2.4 * scale;
          ctx.beginPath();
          ctx.arc(-4 * scale, offY, arcLen, -Math.PI / 3.0, Math.PI / 3.0);
          ctx.stroke();

          // 中心白熱コア
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2 * scale;
          ctx.beginPath();
          ctx.arc(-4 * scale, offY, arcLen, -Math.PI / 3.4, Math.PI / 3.4);
          ctx.stroke();
        });

        // 残光トレイル
        ctx.strokeStyle = subColor;
        ctx.lineWidth = 1.0 * scale;
        ctx.beginPath();
        ctx.moveTo(-14 * scale, -7 * scale);
        ctx.lineTo(-2 * scale, 0);
        ctx.lineTo(-14 * scale, 7 * scale);
        ctx.stroke();

      } else if (pr.type === 'bonito_throw') {
        // 回転する勝浦特産生カツオ投擲弾！
        ctx.rotate(pr.rotation || 0);

        // カツオ魚体（紡錘形ボディ）
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 腹部の銀白色
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI);
        ctx.fill();

        // 背中の濃青ライン
        ctx.strokeStyle = '#0369a1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, -3); ctx.lineTo(10, -3);
        ctx.stroke();

        // 尾びれ
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-24, -8);
        ctx.lineTo(-20, 0);
        ctx.lineTo(-24, 8);
        ctx.closePath();
        ctx.fill();

        // つぶらな黒目
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(11, -2, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(12, -2, 1.4, 0, Math.PI * 2); ctx.fill();

        // 水流リングエフェクト
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();

      } else if (pr.type === 'fire') {
        // 七輪の紅蓮大火球（3層レイヤーで鮮やかに発光）
        // 外炎
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();

        // 中炎
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // 白熱コア
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 2. ニャー衝撃波リング（三重の極太エナジーブラスト）
    this.meowWaves.forEach(mw => {
      ctx.save();
      const alpha = Math.max(0, mw.life / mw.maxLife);

      // 最外層：ネオンシアン衝撃波
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(mw.x, mw.y, mw.currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 中間層：マゼンタ衝撃リング
      ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * 0.85})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(mw.x, mw.y, mw.currentRadius * 0.88, 0, Math.PI * 2);
      ctx.stroke();

      // 最内層：純白・黄金コア
      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.95})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(mw.x, mw.y, mw.currentRadius * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  // パーティクル＆ダメージ数字
  renderEffects(ctx) {
    // ダメージ数字（shadowBlurを使わず太い黒フチで超高速・クッキリ表示！）
    this.damageNumbers.forEach(d => {
      ctx.save();
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    });

    // パーティクル（外側で1度だけsave/restoreし、Canvasコンテキストの負荷を極小化！）
    if (this.particles.length > 0) {
      ctx.save();
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const a = (typeof p.alpha === 'number' && !isNaN(p.alpha)) ? Math.max(0, Math.min(1, p.alpha)) : 0;
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        if (p.type === 'sweat') {
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💦', p.x, p.y);
        } else if (p.type === 'exclamation') {
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('❗', p.x, p.y);
        } else {
          ctx.fillStyle = p.color || '#fbbf24';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }


  }

  // タンデムクロスバイク爆走描画（60代男女の超高速薙ぎ払い演出）
  renderTandemRushes(ctx) {
    if (!this.tandemRushes || this.tandemRushes.length === 0) return;

    this.tandemRushes.forEach(t => {
      const bikeImg = this.images.tandemBike;
      const bw = t.w || 180;
      const bh = t.h || 107;

      ctx.save();
      ctx.translate(t.x, t.y);

      // 地面の高速影
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, bh / 2 - 2, bw / 2 + 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 残像エフェクト（スピード感倍増！）
      [-1, -2].forEach((mul, idx) => {
        ctx.save();
        ctx.translate(mul * t.dir * 28, 0);
        ctx.globalAlpha = idx === 0 ? 0.35 : 0.18;
        ctx.scale(t.dir, 1);
        if (bikeImg && (bikeImg.width > 0 || (bikeImg.complete && bikeImg.naturalWidth > 0))) {
          ctx.drawImage(bikeImg, -bw / 2, -bh / 2, bw, bh);
        }
        ctx.restore();
      });

      // バイク本体描画（進行方向に向き合わせ）
      ctx.save();
      ctx.scale(t.dir, 1);
      if (bikeImg && (bikeImg.width > 0 || (bikeImg.complete && bikeImg.naturalWidth > 0))) {
        ctx.drawImage(bikeImg, -bw / 2, -bh / 2, bw, bh);
      } else {
        // フォールバック自転車
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-bw/2, -10, bw, 20);
        ctx.font = '36px sans-serif';
        ctx.fillText('🚲', -20, 10);
      }
      ctx.restore();

      // 風切りスピードライン
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      for (let s = 0; s < 3; s++) {
        const lineY = (s - 1) * 22;
        const lineLen = 62.5 + Math.sin(t.x * 0.07 + s * 1.7) * 17.5;
        ctx.beginPath();
        ctx.moveTo(-t.dir * (bw / 2 + 10), lineY);
        ctx.lineTo(-t.dir * (bw / 2 + 10 + lineLen), lineY);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  // 勝浦神輿軍団爆走描画（白装束の男たちと黄金神輿のド迫力突進）
  renderMikoshiRushes(ctx) {
    if (!this.mikoshiRushes || this.mikoshiRushes.length === 0) return;

    this.mikoshiRushes.forEach(t => {
      if (t.delay > 0) return;
      const mikoshiImg = this.images.mikoshi;
      const bw = t.w || 240;
      const bh = t.h || 134;

      // 「ヨイショ！ヨイショ！」と上下にリズミカルに波打つ神輿の担ぎボブ運動！
      const bobY = Math.sin(t.bobTimer) * 7;

      ctx.save();
      ctx.translate(t.x, t.y + bobY);

      // 1. 地面の巨大な影（担ぎ手全員と神輿の重厚な楕円影）
      ctx.fillStyle = 'rgba(15, 23, 42, 0.48)';
      ctx.beginPath();
      ctx.ellipse(0, bh / 2 - 4 - bobY, bw / 2 + 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. 黄金の残像エフェクト（威勢と熱気が残る！）
      [-1, -2].forEach((mul, idx) => {
        ctx.save();
        ctx.translate(mul * t.dir * 32, 0);
        ctx.globalAlpha = idx === 0 ? 0.30 : 0.15;
        ctx.scale(t.dir, 1);
        if (mikoshiImg && (mikoshiImg.width > 0 || (mikoshiImg.complete && mikoshiImg.naturalWidth > 0))) {
          ctx.drawImage(mikoshiImg, -bw / 2, -bh / 2, bw, bh);
        }
        ctx.restore();
      });

      // 3. 神輿本体描画（進行方向に向き合わせ）
      ctx.save();
      ctx.scale(t.dir, 1);
      if (mikoshiImg && (mikoshiImg.width > 0 || (mikoshiImg.complete && mikoshiImg.naturalWidth > 0))) {
        ctx.drawImage(mikoshiImg, -bw / 2, -bh / 2, bw, bh);
      } else {
        // フォールバック神輿
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
        ctx.font = '48px sans-serif';
        ctx.fillText('⛩️', -24, 10);
      }
      ctx.restore();

      // 4. 黄金のオーラ＆お祭り紙吹雪パーティクル
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      for (let s = 0; s < 3; s++) {
        const lineY = (s - 1) * 26;
        const lineLen = 70 + Math.sin(t.x * 0.06 + s * 1.9) * 20;
        ctx.beginPath();
        ctx.moveTo(-t.dir * (bw / 2 + 12), lineY);
        ctx.lineTo(-t.dir * (bw / 2 + 12 + lineLen), lineY);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  // 落雷全画面フラッシュ＆稲妻ボルト描画
  renderLightningFlash(ctx) {
    if (this.lightningFlashTimer > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(224, 242, 254, ${Math.min(0.7, this.lightningFlashTimer * 4.5)})`;
      ctx.fillRect(0, 0, this.viewW, this.viewH);

      // 稲妻ボルトの閃光ライン（shadowBlurを使わず太いシアン＋白熱コアで超高速描画！）
      for (const points of this.lightningBolts) {
        // 外側シアンオーラ
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let p = 1; p < points.length; p++) ctx.lineTo(points[p].x, points[p].y);
        ctx.stroke();

        // 中心白熱コア
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let p = 1; p < points.length; p++) ctx.lineTo(points[p].x, points[p].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // レベルアップ＆告知バナー描画（画面上部中央の豪華ネオンテロップ）
  renderLevelUpBanner(ctx) {
    if (this.isMobilePhoneActive) return; // モバイルは読みやすいDOM通知を使用
    if (!this.levelUpBanner || this.levelUpBanner.timer <= 0) return;

    const b = this.levelUpBanner;
    const progress = Math.min(1, (b.maxTimer - b.timer) / 0.3); // フェードイン
    const fadeOut = b.timer < 0.4 ? b.timer / 0.4 : 1; // フェードアウト
    const alpha = progress * fadeOut;

    ctx.save();
    ctx.globalAlpha = alpha;

    const bannerW = 540;
    const bannerH = 50;
    const bx = (this.viewW - bannerW) / 2;
    const by = 24;

    // バナー外枠のグロー
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 18;

    // バナー背景（ダークサイバーグラデーション）
    const grad = ctx.createLinearGradient(bx, by, bx + bannerW, by);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.94)');
    grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.97)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.94)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(bx, by, bannerW, bannerH, 8);
    ctx.fill();

    // ゴールド＆シアンの豪華2重ボーダー
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // タイトルテキスト
    ctx.shadowBlur = 6;
    ctx.font = '900 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.fillText(b.title, this.viewW / 2, by + 20);

    // サブテキスト
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(b.sub, this.viewW / 2, by + 39);

    ctx.restore();
  }

  addParticle(x, y, type) {
    if (this.particles.length >= 60) return; // パーティクル最大数制限（軽量化・メモリ保護）

    let vy = (Math.random() - 0.5) * 2;
    if (type === 'smoke') vy = -1.4 - Math.random();
    if (type === 'sweat' || type === 'exclamation') vy = -1.6 - Math.random() * 0.8;
    if (type === 'splash') vy = -1.2 - Math.random() * 1.5;

    this.particles.push({
      x, y,
      type,
      vx: (Math.random() - 0.5) * (type === 'confetti' ? 4 : type === 'splash' ? 3 : 1.2),
      vy,
      size: type === 'smoke' ? 6 : type === 'splash' ? 4 : 3,
      alpha: 1.0,
      color: type === 'confetti' ? ['#fbbf24', '#38bdf8', '#ef4444', '#10b981'][Math.floor(Math.random()*4)] :
             type === 'splash' ? '#38bdf8' :
             type === 'spark' ? '#fde047' : '#94a3b8'
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = (typeof p.alpha === 'number' && !isNaN(p.alpha)) ? p.alpha - dt * 2.2 : 0;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  addDamageNumber(x, y, text, color = '#f8fafc') {
    if (this.damageNumbers.length >= 30) return; // ダメージ数字最大数制限
    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 14,
      y,
      text: String(text),
      color,
      vy: -35,
      life: 0.65
    });
  }

  updateDamageNumbers(dt) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.life <= 0) this.damageNumbers.splice(i, 1);
    }
  }

  addComicPopup(x, y, text, color = '#38bdf8', duration = 1.0) {
    // 画面を邪魔する文字ポップアップは完全廃止
  }

  updateComicPopups(dt) {
    // 空処理
  }

  // ミニマップレーダーHUD（撤廃に伴い安全に停止）
  renderRadar() {
    return;
  }

  // UI表示の更新
  updateUI() {
    this.mobileUI?.updateHUD();
    // レベル ＆ EXPバー
    const lvBadge = document.getElementById('player-level-badge');
    if (lvBadge) lvBadge.textContent = `LV. ${this.player.level}`;

    const expFill = document.getElementById('exp-bar-fill');
    const expText = document.getElementById('exp-text');
    if (expFill && expText) {
      const pct = Math.min(100, Math.round((this.player.exp / this.player.nextExp) * 100));
      expFill.style.width = `${pct}%`;
      expText.textContent = `${this.player.exp} / ${this.player.nextExp} EXP`;
    }

    // HPバー
    const hpFill = document.getElementById('hp-bar-fill');
    const hpText = document.getElementById('hp-text');
    if (hpFill && hpText) {
      const pct = Math.max(0, Math.min(100, Math.round((this.player.hp / this.player.maxHp) * 100)));
      hpFill.style.width = `${pct}%`;
      hpText.textContent = `${Math.round(this.player.hp)} / ${this.player.maxHp}`;
    }

    // 総長登場までのカウントダウン。最終決戦へ移った後は状態を表示する。
    const timerDisplay = document.getElementById('timer-display');
    const timerLabel = timerDisplay?.parentElement?.querySelector('.label');
    if (timerLabel) timerLabel.textContent = this.finalBossPhase || this.isVictoryClear
      ? '最終決戦'
      : '総長登場まで';
    if (timerDisplay) {
      if (this.isVictoryClear) {
        timerDisplay.textContent = '🎉 完全制覇！';
        timerDisplay.style.color = '#10b981';
        timerDisplay.style.fontWeight = 'bold';
      } else if (this.finalBossPhase) {
        timerDisplay.textContent = '🔥 決戦! 総長を倒せ！';
        timerDisplay.style.color = '#ef4444';
        timerDisplay.style.fontWeight = 'bold';
      } else {
        const remainSec = Math.max(0, Math.ceil(this.targetClearTime - this.survivalTime));
        const m = Math.floor(remainSec / 60);
        const s = Math.floor(remainSec % 60);
        timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        timerDisplay.style.color = remainSec <= 15 ? '#ef4444' : '#ffffff';
        timerDisplay.style.fontWeight = remainSec <= 15 ? 'bold' : 'normal';
      }
    }

    // 撃破数
    const koDisplay = document.getElementById('ko-display');
    if (koDisplay) koDisplay.textContent = `${this.killCount} 体`;
  }

  // ゲーム終了（クリア or ゲームオーバー）
  endGame(isClear = false) {
    if (this.resultFinalizedForRun || this.state === 'RESULT') return;
    if (this.isVictoryClear && !isClear) return;
    this.resultFinalizedForRun = true;
    this.runId++;
    this.state = 'RESULT';
    this.refreshPresentationState();
    this.sound.stopBGM();

    const resultOverlay = document.getElementById('result-overlay');
    const headline = document.getElementById('result-headline');
    const rankTitle = document.getElementById('rank-title');
    const starRating = document.getElementById('star-rating');

    const m = Math.floor(this.survivalTime / 60);
    const s = Math.floor(this.survivalTime % 60);
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const endingBanner = document.getElementById('ending-banner');
    const gameoverBanner = document.getElementById('gameover-banner');
    const restartBtn = document.getElementById('restart-btn');

    if (isClear) {
      this.sound.startClearBGM(); // ★感動のクリア・エンディングBGM再生！
      if (headline) headline.textContent = '🎉 勝浦朝市平和奪還！完全勝利！！';
      if (starRating) starRating.textContent = '★★★★★';
      if (rankTitle) rankTitle.textContent = '勝浦朝市 伝説の守護神大明神猫';
      if (endingBanner) {
        endingBanner.classList.remove('hidden');
        endingBanner.style.display = 'block';
      }
      if (gameoverBanner) {
        gameoverBanner.classList.add('hidden');
        gameoverBanner.style.display = 'none';
      }
      if (restartBtn) restartBtn.textContent = 'もう一度朝市を守るニャ！（REPLAY）';
    } else {
      if (headline) headline.textContent = 'ミケ、力尽きる…';
      if (starRating) starRating.textContent = this.survivalTime > 60 ? '★★★' : '★';
      if (rankTitle) {
        if (this.survivalTime > 100) rankTitle.textContent = '勇敢なる朝市パトロール隊長';
        else if (this.survivalTime > 50) rankTitle.textContent = '駆け出しの元気な看板猫';
        else rankTitle.textContent = '朝寝坊ののんびり子猫';
      }
      if (endingBanner) {
        endingBanner.classList.add('hidden');
        endingBanner.style.display = 'none';
      }
      if (gameoverBanner) {
        gameoverBanner.classList.remove('hidden');
        gameoverBanner.style.display = 'block';
      }
      if (restartBtn) restartBtn.textContent = 'もう一度リベンジするニャ！';
    }

    document.getElementById('final-survival-time').textContent = timeStr;
    document.getElementById('final-ko-count').textContent = `${this.killCount} 体`;
    document.getElementById('final-level').textContent = `LV. ${this.player.level}`;
    resultOverlay?.classList.remove('hidden');
    this.refreshPresentationState();
  }
}

// 起動
window.addEventListener('load', () => {
  window.game = new AsaichiGame();
});
