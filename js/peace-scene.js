/** 平和時間だけ動く店の挨拶。同時1件、4店舗の距離判定だけに抑える。 */
class PeaceScene {
  constructor(game) {
    this.game = game;
    this.stalls = [
      { x: 310, y: 558, speakerX: 304, speakerY: 480, lines: ['お！ミケ！', '今日も元気そうだなー。'] },
      { x: 490, y: 520, speakerX: 490, speakerY: 410, lines: ['ミケ、おはよう！', '今日も朝市をよろしくね。'] },
      { x: 870, y: 550, speakerX: 862, speakerY: 397, lines: ['おーい、ミケ！', '今日の魚もぴっちぴちだぞ！'] },
      { x: 1090, y: 561, speakerX: 1090, speakerY: 474, lines: ['ミケ、見回りおつかれ！', '今日もいい天気だねえ。'] }
    ];
    this.reset();
  }

  reset() {
    this.bubble = null;
    this.gap = 0;
    for (const stall of this.stalls) { stall.near = false; stall.cooldown = 0; }
  }

  update(dt) {
    if (this.game.firstYankeeEventDone || this.game.survivalTime >= 15) {
      this.bubble = null;
      return;
    }
    this.gap = Math.max(0, this.gap - dt);
    if (this.bubble) {
      this.bubble.life -= dt;
      if (this.bubble.life <= 0) this.bubble = null;
    }
    let closest = null;
    let best = 88;
    for (const stall of this.stalls) {
      stall.cooldown = Math.max(0, stall.cooldown - dt);
      const distance = Math.hypot(this.game.player.x - stall.x, this.game.player.y - stall.y);
      if (distance > 120) stall.near = false;
      if (!stall.near && stall.cooldown === 0 && distance < best) { closest = stall; best = distance; }
    }
    if (closest && !this.bubble && this.gap === 0) {
      closest.near = true;
      closest.cooldown = 8;
      this.bubble = { stall: closest, life: 2.6 };
      this.gap = 3.0;
    }
  }

  render(ctx) {
    if (!this.bubble) return;
    const g = this.game;
    const scale = g.isMobilePhoneActive ? g.viewW / (g.mobileUI?.viewportWidth || g.viewW) : 1;
    const { stall, life } = this.bubble;
    const w = 252 * scale, h = 58 * scale;
    const anchorX = stall.speakerX - g.camera.x;
    const anchorY = stall.speakerY - g.camera.y;
    const x = Math.max(12 * scale, Math.min(g.viewW - w - 12 * scale, anchorX - w / 2));
    const y = Math.max(68 * scale, Math.min(g.viewH - h - 12 * scale, anchorY - h - 12 * scale));
    const tailX = Math.max(x + 16 * scale, Math.min(x + w - 16 * scale, anchorX));
    const edgeY = anchorY < y ? y : y + h;
    const tipY = edgeY + (anchorY < y ? -10 : 10) * scale;
    ctx.save();
    ctx.globalAlpha = Math.min(1, life / 0.25, (2.6 - life) / 0.18);
    ctx.fillStyle = '#fff9e9';
    ctx.strokeStyle = '#5b4030';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10 * scale); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tailX - 6 * scale, edgeY); ctx.lineTo(tailX, tipY); ctx.lineTo(tailX + 6 * scale, edgeY); ctx.fill();
    ctx.fillStyle = '#37271e';
    ctx.font = `bold ${16 * scale}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    stall.lines.forEach((line, i) => ctx.fillText(g.player.character === 'kimie' ? line.replaceAll('ミケ', 'きみえ') : line,
      x + w / 2, y + (19 + i * 22) * scale));
    ctx.restore();
  }
}
