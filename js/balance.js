/** 援護を取りに走る攻略に合わせた調整値。秒数は戦闘中のゲーム時間。 */
const GAME_BALANCE = Object.freeze({
  waves: [
    { from: 15, interval: 0.65, cap: 18, batch: 2 },
    { from: 30, interval: 0.50, cap: 28, batch: 3 },
    { from: 50, interval: 0.40, cap: 40, batch: 3 },
    { from: 80, interval: 0.32, cap: 52, batch: 4 }
  ],
  horde: { start: 45, interval: 10, lateInterval: 7, count: 5, lateCount: 8 },
  items: { cap: 3, interval: 3.6, jitter: 0.6, life: 10, minDistance: 140, maxDistance: 340,
    quickPickupWindow: 3.0, nextAfterQuickPickup: 1.4 },
  nora: { duration: 2.4, speed: 430, amplitude: 55, zigzagPeriod: 0.65, hitRadius: 74,
    damage: 155, hitCooldown: 0.42, maxActive: 3 },
  enemyHpMultiplier: 1.85,
  enemySpeedMultiplier: 1.16,
  autoAttackMultiplier: 0.45,
  levelExpGrowth: 8,
  finalBossHp: 3000,
  maxTandems: 3,
  maxMikoshi: 4
});
