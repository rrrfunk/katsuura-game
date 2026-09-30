/** スマホの表示・メニューをゲームの戦闘処理から分離する。 */
class MobileUI {
  constructor(game) {
    this.game = game;
    this.elements = {};
    for (const id of ['mobile-hud', 'mobile-notice', 'mobile-hp', 'mobile-level', 'mobile-hp-fill',
      'mobile-exp-fill', 'mobile-timer', 'mobile-timer-label', 'mobile-controller-zone', 'pause-menu',
      'pause-stats', 'mobile-pause', 'mobile-resume', 'mobile-sound', 'mobile-fullscreen']) {
      this.elements[id] = document.getElementById(id);
    }
    this.menu = this.elements['pause-menu'];
    this.elements['mobile-pause'].addEventListener('click', () => this.openMenu());
    this.elements['mobile-resume'].addEventListener('click', () => this.closeMenu());
    this.menu.addEventListener('cancel', e => { e.preventDefault(); this.closeMenu(); });
    this.elements['mobile-sound'].addEventListener('click', () => {
      document.getElementById('sound-btn').click();
      this.syncSound();
    });
    this.elements['mobile-fullscreen'].addEventListener('click', () => {
      this.closeMenu();
      document.getElementById('fullscreen-btn').click();
    });
    document.getElementById('mobile-help').addEventListener('click', () => {
      this.closeMenu();
      game.openTutorial();
      this.syncVisibility();
    });
    document.getElementById('mobile-title').addEventListener('click', () => {
      this.closeMenu();
      game.returnToTitle();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.isMobilePhoneActive && game.state === 'PLAYING') this.openMenu();
    });
  }

  get isPaused() { return this.menu.open; }

  openMenu() {
    if (this.game.state !== 'PLAYING' || this.menu.open) return;
    this.game.clearInputState();
    this.elements['pause-stats'].textContent = `Lv.${this.game.player.level}　／　撃破 ${this.game.killCount} 体`;
    this.syncSound();
    this.elements['mobile-fullscreen'].hidden = document.getElementById('fullscreen-btn').hidden;
    this.elements['mobile-fullscreen'].textContent = document.getElementById('fullscreen-btn').textContent;
    this.menu.showModal();
    this.syncVisibility();
  }

  closeMenu() {
    this.game.clearInputState();
    this.menu.close();
    this.game.sound.resumeCurrentBGM();
    this.syncVisibility();
  }

  syncSound() {
    this.elements['mobile-sound'].textContent = document.getElementById('sound-btn').textContent;
  }

  // バーの伸縮で変わる可視高さを使用。ピンチ拡大中はカメラを再設定しない。
  resize() {
    const g = this.game;
    const viewport = window.visualViewport;
    const normalScale = !viewport || Math.abs(viewport.scale - 1) < 0.01;
    const width = normalScale && viewport ? viewport.width : window.innerWidth;
    const height = normalScale && viewport ? viewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--play-width', `${width}px`);
    document.documentElement.style.setProperty('--play-height', `${height}px`);
    const viewH = g.isMobilePhoneActive && !g.mobilePortrait ? Math.round(880 * height / width) : 495;
    if (g.canvas.height !== viewH) {
      g.clearInputState();
      g.viewH = viewH;
      g.canvas.height = viewH;
      g.updateCamera();
      if (g.state === 'PLAYING' && g.assetsLoaded) g.render();
    }
    if (g.mobilePortrait && this.menu.open) this.menu.close();
  }

  syncVisibility() {
    const g = this.game;
    const tutorialOpen = !document.getElementById('tutorial-overlay').classList.contains('hidden');
    const cinematic = g.eventState !== 'NONE' || !!g.assistCutin;
    const visible = g.state === 'PLAYING' && !g.mobilePortrait && !g.orientationResumeRequired &&
      !this.isPaused && !tutorialOpen && !cinematic;
    document.body.classList.toggle('play-controls-visible', visible);
    this.elements['mobile-hud'].hidden = !g.isMobilePhoneActive || !visible;
    this.elements['mobile-controller-zone'].hidden = !visible;
    const banner = g.levelUpBanner;
    const notice = this.elements['mobile-notice'];
    notice.hidden = !g.isMobilePhoneActive || !visible || !banner || banner.timer <= 0;
    if (!notice.hidden) this.setText('mobile-notice', banner.title);
  }

  setText(id, text) {
    const el = this.elements[id];
    if (el.textContent !== text) el.textContent = text;
  }

  updateHUD() {
    const g = this.game;
    if (!g.isMobilePhoneActive) return;
    const p = g.player;
    this.setText('mobile-hp', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    this.setText('mobile-level', `Lv.${p.level}`);
    this.elements['mobile-hp-fill'].style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    this.elements['mobile-hp-fill'].classList.toggle('low', p.hp / p.maxHp <= 0.3);
    this.elements['mobile-exp-fill'].style.width = `${Math.min(100, p.exp / p.nextExp * 100)}%`;
    const seconds = Math.max(0, Math.ceil(g.targetClearTime - g.survivalTime));
    this.setText('mobile-timer-label', g.isVictoryClear ? '朝市を守った！' : g.finalBossPhase ? '総長を倒せ！' : '総長登場まで');
    this.setText('mobile-timer', g.isVictoryClear ? 'クリア' : g.finalBossPhase ? `残り ${g.remainingBossCount} 体` :
      `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
  }
}
