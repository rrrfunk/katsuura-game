/** 生成した遊び方を1枚ずつ見せる。戦闘の開始・再開は最後の操作だけで行う。 */
class TutorialGuide {
  constructor(game) {
    this.game = game;
    this.dialog = document.getElementById('tutorial-overlay');
    this.art = document.getElementById('guide-art');
    this.image = document.getElementById('guide-image');
    this.next = document.getElementById('btn-tutorial-start');
    this.prev = document.getElementById('guide-prev');
    this.closeButton = document.getElementById('btn-tutorial-back');
    this.pages = [
      'ジョイスティックでミケを動かそう。スマホは横向き、右下のスティックで移動。',
      '敵に近づくと自動で攻撃。攻撃ボタンは押さなくてOK！',
      '敵はヤンキー・キョン・トンビの3種類。',
      'アイテムを取って助けてもらおう。神輿・タンデム・ノラネコが援護！'
    ];
    this.page = 0;
    this.failed = false;
    this.next.addEventListener('click', () => this.advance(1));
    this.prev.addEventListener('click', () => this.advance(-1));
    this.closeButton.addEventListener('click', () => this.close());
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown', e => {
      if (e.repeat && ['Enter', 'Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (!e.repeat) this.advance(e.code === 'ArrowRight' ? 1 : -1);
      }
    });
    this.image.addEventListener('error', () => { this.failed = true; this.render(); });
    if (this.image.complete && !this.image.naturalWidth) this.failed = true;
  }

  get isOpen() { return this.dialog.open; }

  open() {
    if (this.isOpen || !this.game.assetsLoaded) return;
    this.fromTitle = this.game.state === 'TITLE';
    this.page = 0;
    this.lastAdvanceAt = performance.now();
    this.game.clearInputState();
    this.dialog.classList.remove('hidden');
    this.render();
    this.dialog.showModal();
    this.next.focus({ preventScroll: true });
    this.game.mobileUI?.syncVisibility();
  }

  close(restoreFocus = true) {
    this.dialog.classList.add('hidden');
    if (this.isOpen) this.dialog.close();
    this.game.clearInputState();
    this.game.mobileUI?.syncVisibility();
    if (restoreFocus) {
      const target = this.fromTitle ? document.getElementById('btn-quick-start') : this.game.canvas;
      target?.focus({ preventScroll: true });
    }
  }

  advance(direction) {
    if (!this.isOpen) return;
    // ダブルタップやキー長押しで説明を飛ばしたり、そのまま開始したりしない。
    const now = performance.now();
    if (now - this.lastAdvanceAt < 220) return;
    this.lastAdvanceAt = now;
    if (direction < 0) { this.page = Math.max(0, this.page - 1); this.render(); return; }
    if (this.page < this.pages.length - 1) { this.page++; this.render(); return; }
    if (this.fromTitle) {
      this.game.refreshPresentationState();
      if (this.game.mobilePortrait) { this.refreshStartButton(); return; }
      this.close(false);
      this.game.startGame();
      this.game.canvas.focus({ preventScroll: true });
    } else {
      this.close();
      this.game.sound.resumeCurrentBGM();
    }
  }

  refreshStartButton() {
    const last = this.page === this.pages.length - 1;
    const needsLandscape = last && this.fromTitle && this.game.mobilePortrait;
    this.next.textContent = !last ? '次へ ▶' : needsLandscape ? '横向きにして開始' : this.fromTitle ? 'ゲーム開始 ▶' : 'ゲームに戻る';
    this.next.disabled = !!needsLandscape;
  }

  render() {
    this.art.style.setProperty('--guide-x', this.page % 2 ? '-100%' : '0%');
    this.art.style.setProperty('--guide-y', this.page >= 2 ? '-100%' : '0%');
    // 同じアトラスを表示範囲だけ変えて使い、ページ送りの追加通信をなくす。
    this.image.alt = this.pages[this.page];
    document.getElementById('guide-page').textContent = `${this.page + 1} / ${this.pages.length}`;
    document.getElementById('guide-caption').textContent = `${this.page + 1}ページ。${this.pages[this.page]}`;
    const fallback = document.getElementById('guide-fallback');
    this.art.hidden = this.failed;
    fallback.hidden = !this.failed;
    fallback.textContent = this.pages[this.page];
    document.getElementById('guide-pc-tip').hidden = this.page !== 0 || this.game.isMobilePhoneActive;
    this.prev.disabled = this.page === 0;
    this.closeButton.setAttribute('aria-label', this.fromTitle ? '遊び方を閉じてタイトルへ戻る' : '遊び方を閉じてゲームに戻る');
    this.refreshStartButton();
    this.dialog.querySelector('.guide-content').scrollTop = 0;
  }
}
