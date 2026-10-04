/** 点と移動経路の距離。高速移動中の回収・突進で当たり判定が抜けないようにする。 */
function distanceToSegmentSquared(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSq)) : 0;
  return (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2;
}

/** 予告→固定方向への攻撃→隙を、ゲーム時間だけで更新する。 */
const EnemyTactics = {
  isAttacking(e) { return e.attackPhase === 'WINDUP' || e.attackPhase === 'RUSH' || e.attackPhase === 'IMPACT'; },

  recover(game, e) {
    const cfg = GAME_BALANCE.attacks[e.type];
    if (this.isAttacking(e)) game.activeEnemyAttacks = Math.max(0, (game.activeEnemyAttacks || 0) - 1);
    e.attackPhase = 'RECOVER';
    e.attackTimer = cfg?.recovery || 0.8;
  },

  update(game, e, dt) {
    const cfg = GAME_BALANCE.attacks[e.type];
    if (!cfg) return false;
    if (e.attackPhase === 'RECOVER') {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) { e.attackPhase = null; e.attackCooldown = 1.6; }
      return true;
    }
    if (!e.attackPhase) {
      e.attackCooldown = Math.max(0, (e.attackCooldown ?? 1.2) - dt);
      const p = game.player, dist = Math.hypot(p.x - e.x, p.y - e.y);
      const visible = e.x >= game.camera.x + 20 && e.x <= game.camera.x + game.viewW - 20 &&
        e.y >= game.camera.y + 20 && e.y <= game.camera.y + game.viewH - 20;
      if (!visible || game.wavePhase === 'REST' || e.attackCooldown > 0 || dist < 65 || dist > 310 ||
          game.activeEnemyAttacks >= GAME_BALANCE.attacks.maxActive) return false;
      e.attackPhase = 'WINDUP';
      e.attackTimer = cfg.windup;
      e.attackFromX = e.x; e.attackFromY = e.y;
      e.attackDx = (p.x - e.x) / dist; e.attackDy = (p.y - e.y) / dist;
      e.attackX = p.x; e.attackY = p.y;
      e.dir = e.attackDx >= 0 ? 'right' : 'left';
      game.activeEnemyAttacks++;
      return true;
    }
    if (e.attackPhase === 'WINDUP') {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) { e.attackPhase = 'RUSH'; e.attackTimer = cfg.duration; }
      return true;
    }
    if (e.attackPhase === 'RUSH') {
      const step = Math.min(dt, Math.max(0, e.attackTimer));
      if (e.type === 'tonbi') {
        const progress = 1 - Math.max(0, e.attackTimer - step) / cfg.duration;
        e.x = e.attackFromX + (e.attackX - e.attackFromX) * progress;
        e.y = e.attackFromY + (e.attackY - e.attackFromY) * progress;
      } else {
        const x = e.x, y = e.y;
        game.moveEnemy(e, e.attackDx * cfg.speed * step, e.attackDy * cfg.speed * step);
        if (step > 0 && Math.hypot(e.x - x, e.y - y) < cfg.speed * step * 0.3) {
          this.recover(game, e);
          return true;
        }
      }
      e.animTimer += step * 16;
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        if (e.type === 'tonbi') { e.attackPhase = 'IMPACT'; e.attackTimer = 0.14; }
        else this.recover(game, e);
      }
      return true;
    }
    if (e.attackPhase === 'IMPACT') {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) this.recover(game, e);
      return true;
    }
    return false;
  },

  canHit(e) {
    if (e.type === 'tonbi') return e.attackPhase === 'IMPACT';
    return e.attackPhase !== 'WINDUP' && e.attackPhase !== 'RECOVER';
  },

  draw(game, ctx) {
    for (const e of game.enemies) {
      if (!this.isAttacking(e)) continue;
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#fbbf24';
      ctx.fillStyle = 'rgba(220,38,38,0.28)';
      if (e.type === 'tonbi') {
        ctx.beginPath();
        ctx.arc(e.attackX, e.attackY, GAME_BALANCE.attacks.tonbi.radius, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // 十字も重ね、色だけで危険を伝えない。
        ctx.beginPath();
        ctx.moveTo(e.attackX - 9, e.attackY - 9); ctx.lineTo(e.attackX + 9, e.attackY + 9);
        ctx.moveTo(e.attackX + 9, e.attackY - 9); ctx.lineTo(e.attackX - 9, e.attackY + 9); ctx.stroke();
      } else if (e.attackPhase === 'WINDUP') {
        const cfg = GAME_BALANCE.attacks.skater;
        const length = cfg.speed * cfg.duration;
        ctx.translate(e.attackFromX, e.attackFromY);
        ctx.rotate(Math.atan2(e.attackDy, e.attackDx));
        ctx.fillRect(0, -32, length, 64);
        ctx.strokeRect(0, -32, length, 64);
        ctx.beginPath();
        ctx.moveTo(length - 20, -10); ctx.lineTo(length - 8, 0); ctx.lineTo(length - 20, 10); ctx.stroke();
      }
      if (e.attackPhase === 'WINDUP') {
        ctx.restore(); ctx.save();
        ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = '#080c10'; ctx.lineWidth = 4; ctx.fillStyle = '#fbbf24';
        ctx.strokeText('!', e.x, e.y - e.h - 6); ctx.fillText('!', e.x, e.y - e.h - 6);
      }
      ctx.restore();
    }
  }
};
