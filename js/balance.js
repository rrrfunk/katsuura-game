/** 援護を取りに走る攻略に合わせた調整値。秒数は戦闘中のゲーム時間。 */
const GAME_BALANCE = Object.freeze({
  waves: [
    { from: 15, interval: 0.65, cap: 18, batch: 2 },
    { from: 30, interval: 0.50, cap: 28, batch: 3 },
    { from: 50, interval: 0.40, cap: 40, batch: 3 },
    { from: 80, interval: 0.32, cap: 52, batch: 4 }
  ],
  horde: { start: 45, interval: 10, lateInterval: 7, count: 5, lateCount: 8 },
  tempo: { start: 45, surge: 12, rest: 6, restSpeed: 0.82 },
  items: { cap: 3, interval: 3.6, jitter: 0.6, life: 12, minDistance: 140, maxDistance: 300, pickupRadius: 22,
    quickPickupWindow: 3.0, nextAfterQuickPickup: 1.4 },
  nora: { duration: 2.8, speed: 430, amplitude: 45, zigzagPeriod: 0.65, patrolRadius: 145, hitRadius: 74,
    damage: 105, hitCooldown: 0.42, knockback: 330, maxActive: 3 },
  tandem: { speed: 580, halfWidth: 76, halfHeight: 38, damage: 160 },
  mikoshi: { speed: 350, halfWidth: 140, halfHeight: 78, damage: 220 },
  attacks: { maxActive: 3, skater: { windup: 0.8, duration: 0.46, speed: 560, recovery: 0.8 },
    tonbi: { windup: 0.95, duration: 0.3, radius: 35, recovery: 0.9 } },
  enemyHpMultiplier: 1.85,
  enemySpeedMultiplier: 1.16,
  autoAttackMultiplier: 0.45,
  levelExpGrowth: 8,
  finalBossHp: 3000,
  maxTandems: 3,
  maxMikoshi: 4
});
