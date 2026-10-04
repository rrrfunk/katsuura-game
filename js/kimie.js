/** 神社で見つかる隠しキャラ。通常の成長・攻撃はゲーム本体と共有する。 */
const Kimie = {
  shrine: Object.freeze({ x: 688, y: 74, radius: 22 }),
  stairs: Object.freeze({ x: 622, y: 90, w: 130, h: 280 }),
  slash: Object.freeze({ radius: 90, halfAngle: Math.PI / 3, interval: 0.36, duration: 0.12 }),

  reset(game) {
    Object.assign(game.player, {
      character: 'mike', aimAngle: Math.PI / 2,
      daikonCooldown: 0, daikonSwing: null, characterNoticeTimer: 0
    });
  },

  isOnStairs(x, y) {
    const s = this.stairs;
    return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
  },

  companionOffset(angle) {
    // 人物の背中に隠れきらないよう、少し斜め後ろへ付く。
    return { x: -Math.cos(angle) * 56 - Math.sin(angle) * 18,
      y: -Math.sin(angle) * 56 + Math.cos(angle) * 18 };
  },

  canDiscover(game) {
    const img = game.images?.kimie;
    return game.state === 'PLAYING' && game.player.character !== 'kimie' &&
      !game.firstYankeeEventDone && game.survivalTime < 15 &&
      game.eventState === 'NONE' && !game.assistCutin &&
      !!img?.complete && img.naturalWidth > 0;
  },

  updateDiscovery(game, dt, fromX, fromY) {
    const p = game.player;
    p.characterNoticeTimer = Math.max(0, (p.characterNoticeTimer || 0) - dt);
    if (!this.canDiscover(game)) return;
    const item = this.shrine;
    if (distanceToSegmentSquared(item.x, item.y, fromX, fromY, p.x, p.y) > item.radius ** 2) return;
    p.character = 'kimie';
    p.daikonCooldown = 0;
    p.daikonSwing = null;
    p.characterNoticeTimer = 2.2;
    game.levelUpBanner = null;
    // 初期同行ミケを進化の子猫とは別IDにし、Lv3/6/9の追加を妨げない。
    game.addKitten({ id: 'mike-companion', name: 'ミケ', type: 'calico', isCompanion: true, attackTimer: 0 });
    game.sound.playLevelUp();
    for (let i = 0; i < 6; i++) game.addParticle(p.x, p.y - 20, 'spark');
  },

  isInSlash(p, enemy, angle) {
    const dx = enemy.x - p.x, dy = enemy.y - p.y;
    const distance = Math.hypot(dx, dy);
    return enemy.hp > 0 && distance <= this.slash.radius &&
      (distance < 0.001 || (dx * Math.cos(angle) + dy * Math.sin(angle)) / distance >= Math.cos(this.slash.halfAngle) - 1e-9);
  },

  updateAttack(game, dt) {
    const p = game.player;
    if (p.character !== 'kimie') return;
    if (p.daikonSwing) {
      p.daikonSwing.age += dt;
      if (p.daikonSwing.age >= this.slash.duration) p.daikonSwing = null;
    }
    p.daikonCooldown = Math.max(0, (p.daikonCooldown || 0) - dt);
    if (!game.firstYankeeEventDone || game.survivalTime < 15 || p.daikonCooldown > 0 || game.isVictoryClear) return;
    const angle = p.aimAngle;
    if (!game.enemies.some(e => this.isInSlash(p, e, angle))) return;
    const spice = game.skills.spice.level;
    p.daikonCooldown = this.slash.interval * Math.max(0.55, 1 - spice * 0.08);
    p.daikonSwing = { angle, age: 0, dir: p.dir };
    game.sound.playSlash();
    const damage = (60 + game.skills.scratch.level * 12) * (1 + spice * 0.35) * GAME_BALANCE.autoAttackMultiplier;
    // 描画フレームでは判定しない。撃破・進化が起きても1振りにつき各敵へ1回だけ。
    for (const enemy of [...game.enemies]) {
      if (this.isInSlash(p, enemy, angle)) game.damageEnemy(enemy, damage, p.x, p.y);
    }
  },

  drawDaikon(ctx, length = 40) {
    ctx.save();
    ctx.scale(length / 40, length / 40);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#314532'; ctx.fillStyle = '#f8ffe9';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(12, -7); ctx.lineTo(31, -3);
    ctx.lineTo(40, 0); ctx.lineTo(31, 3); ctx.lineTo(12, 7); ctx.lineTo(0, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a4bd99'; ctx.lineWidth = 1;
    for (let x = 10; x <= 24; x += 7) {
      ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x + 3, 2); ctx.stroke();
    }
    ctx.fillStyle = '#55a53b'; ctx.strokeStyle = '#284e28';
    ctx.beginPath();
    ctx.moveTo(2, -4); ctx.lineTo(-8, -14); ctx.lineTo(-6, -3);
    ctx.lineTo(-15, -7); ctx.lineTo(-10, 1); ctx.lineTo(-15, 7);
    ctx.lineTo(-6, 4); ctx.lineTo(-8, 12); ctx.lineTo(2, 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  },

  drawDiscovery(game, ctx) {
    if (!this.canDiscover(game)) return;
    const item = this.shrine;
    if (item.y < game.camera.y - 45 || item.y > game.camera.y + game.viewH + 45) return;
    ctx.save(); ctx.translate(item.x, item.y);
    ctx.fillStyle = 'rgba(20,25,22,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    const bob = game.reduceMotion ? 0 : Math.sin(game.simulationTime * 3) * 2;
    ctx.translate(0, -8 + bob); ctx.rotate(-Math.PI / 3);
    this.drawDaikon(ctx, 29);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#fff4b0'; ctx.lineWidth = 1.5;
    const glint = game.reduceMotion ? 1 : 0.6 + Math.sin(game.simulationTime * 4) * 0.3;
    ctx.globalAlpha = glint;
    ctx.beginPath(); ctx.moveTo(item.x + 15, item.y - 32); ctx.lineTo(item.x + 15, item.y - 22);
    ctx.moveTo(item.x + 10, item.y - 27); ctx.lineTo(item.x + 20, item.y - 27); ctx.stroke();
    ctx.restore();
  },

  drawShrineGate(game, ctx) {
    if (game.camera.y > 215) return;
    const img = game.firstYankeeEventDone ? game.images.mapHorizontal : game.images.mapPeace;
    if (!img?.naturalWidth) return;
    // 階段の奥を歩く時は、既存背景の鳥居だけを手前へ重ねる。追加画像は不要。
    ctx.save();
    ctx.globalAlpha = this.isOnStairs(game.player.x, game.player.y) && game.player.y < 265 ? 0.65 : 1;
    ctx.drawImage(img, 610, 109, 156, 39, 610, 109, 156, 39);
    ctx.drawImage(img, 610, 176, 156, 22, 610, 176, 156, 22);
    ctx.drawImage(img, 666, 148, 41, 41, 666, 148, 41, 41);
    ctx.restore();
  },

  // drawPlayerと同じ足元原点を使い、影・被弾・LVUPの処理を再利用する。
  drawBody(game, ctx) {
    const p = game.player, img = game.images.kimie;
    const swing = p.daikonSwing;
    const row = { down: 0, right: 1, up: 2, left: 3 }[swing?.dir || p.dir] ?? 0;
    // 大根・握る手・腕を同じ絵に含め、歩行4コマと斬撃4コマを切り替える。
    const col = swing ? 4 + Math.min(3, Math.floor(swing.age / this.slash.duration * 4)) :
      (p.isMoving ? p.animFrame % 4 : 1);
    const sw = img.naturalWidth / 8, sh = img.naturalHeight / 4;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(col * sw), Math.round(row * sh), Math.floor(sw), Math.floor(sh), -38, -71, 76, 76);
    if (swing) this.drawSlash(game, ctx);
  },

  drawNotice(game, ctx) {
    const p = game.player;
    if (p.characterNoticeTimer > 0) {
      ctx.save(); ctx.shadowBlur = 0; ctx.globalAlpha = Math.min(1, p.characterNoticeTimer / 0.3);
      ctx.translate(p.x, p.y - 76);
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = '#17291b'; ctx.fillStyle = '#f2ffda';
      ctx.strokeText('きみえ ＆ ミケ', 0, 0); ctx.fillText('きみえ ＆ ミケ', 0, 0);
      ctx.restore();
    }
  },

  drawSlash(game, ctx) {
    const p = game.player, swing = p.daikonSwing;
    if (!swing) return;
    const aim = swing.angle;
    const progress = Math.min(1, swing.age / this.slash.duration);
    const angle = aim - this.slash.halfAngle + progress * this.slash.halfAngle * 2;
    ctx.save(); ctx.shadowBlur = 0;
    ctx.translate(0, -20);
    ctx.globalAlpha = (1 - progress) * 0.8;
    ctx.strokeStyle = '#edffd2'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, this.slash.radius - 8, aim - this.slash.halfAngle, angle); ctx.stroke();
    ctx.strokeStyle = '#a3d977'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, this.slash.radius - 17, aim - this.slash.halfAngle, angle); ctx.stroke();
    ctx.restore();
  }
};
