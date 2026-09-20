/**
 * 勝浦朝市サバイバー！ - 定数・スプライト・進化テーブル定義
 */

// ========================================================
// 2. スプライト・スキル定義
// ========================================================
const SPRITES = {
  cat: { cell: 256 },
  yankees: {
    tsuppari: {
      walk: [
        { sx: 35, sy: 35, sw: 110, sh: 275 },
        { sx: 165, sy: 35, sw: 110, sh: 275 },
        { sx: 285, sy: 35, sw: 110, sh: 275 }
      ],
      surprise: { sx: 410, sy: 35, sw: 110, sh: 275 },
      hit: { sx: 535, sy: 35, sw: 120, sh: 275 },
      ko: { sx: 650, sy: 220, sw: 230, sh: 100 }
    },
    tokko: {
      walk: [
        { sx: 30, sy: 360, sw: 140, sh: 280 },
        { sx: 190, sy: 360, sw: 140, sh: 280 },
        { sx: 360, sy: 360, sw: 140, sh: 280 }
      ],
      hit: { sx: 530, sy: 380, sw: 140, sh: 260 },
      ko: { sx: 710, sy: 540, sw: 240, sh: 100 }
    },
    skater: {
      walk: [
        { sx: 25, sy: 690, sw: 130, sh: 270 },
        { sx: 170, sy: 690, sw: 130, sh: 270 },
        { sx: 295, sy: 690, sw: 130, sh: 270 }
      ],
      ride: { sx: 425, sy: 690, sw: 130, sh: 270 },
      hit: { sx: 565, sy: 700, sw: 130, sh: 260 },
      ko: { sx: 710, sy: 870, sw: 240, sh: 90 }
    }
  },
  items: {
    BONITO:       { sx: 28, sy: 40, sw: 195, sh: 95 },
    WARABI_MOCHI: { sx: 35, sy: 530, sw: 180, sh: 120 },
    ICED_COFFEE:  { sx: 320, sy: 515, sw: 105, sh: 145 },
    TAIYAKI:      { sx: 545, sy: 685, sw: 160, sh: 110 }
  }
};

// ========================================================
// 自動レベルアップ進化テーブル（ノンストップ・オートエボリューション）
// 順序：ツメLv1 ➜ カツオLv1 ➜ 子猫Lv1 ➜ ツメLv2 ➜ カツオLv2 ➜ 子猫Lv2 ➜ ツメLv3 ➜ カツオLv3 ➜ 子猫Lv3 ➜ 勝浦神罰落雷！
// ========================================================
const LEVEL_EVOLUTION = {
  1: {
    title: '基本爪撃（ツメ LV.1）',
    sub: '前方の敵へ鋭い爪撃スワイプ！',
    apply: (game) => {
      game.skills.scratch.level = 1;
    }
  },
  2: {
    title: '勝浦ブーメランカツオ（カツオ LV.1）！',
    sub: '常に放たれ弧を描いて戻ってくる回転ブーメランカツオ参戦！',
    apply: (game) => {
      game.skills.bonito.level = 1;
    }
  },
  3: {
    title: 'チビミケ参戦（子猫 LV.1）！',
    sub: '可愛い子猫1号が追従！チビ爪撃で援護攻撃！',
    apply: (game) => {
      if (game.kittens.length < 1) {
        game.kittens.push({
          id: 1,
          name: 'チビミケ１号',
          type: 'calico',
          trailIndex: 7,
          attackTimer: 0,
          scale: 0.65,
          facing: 1
        });
      }
    }
  },
  4: {
    title: '神速爪撃・二連撃（ツメ LV.2）！',
    sub: '爪撃が高速２連撃にパワーアップ！',
    apply: (game) => {
      game.skills.scratch.level = 2;
    }
  },
  5: {
    title: 'ブーメランカツオ・ツイン（カツオ LV.2）！',
    sub: 'ブーメランカツオが２匹に増殖！常に２匹が飛び交う！',
    apply: (game) => {
      game.skills.bonito.level = 2;
    }
  },
  6: {
    title: '子猫増員・ツインキャット（子猫 LV.2）！',
    sub: 'チビミケ２号が合流！２匹でチビ爪＆ミニカツオ援護！',
    apply: (game) => {
      if (game.kittens.length < 2) {
        game.kittens.push({
          id: 2,
          name: 'チビミケ２号',
          type: 'white',
          trailIndex: 14,
          attackTimer: 0.4,
          scale: 0.65,
          facing: 1
        });
      }
    }
  },
  7: {
    title: '烈風爪撃・三連撃（ツメ LV.3）！',
    sub: '爪撃が怒涛の３連撃＆範囲拡大！',
    apply: (game) => {
      game.skills.scratch.level = 3;
    }
  },
  8: {
    title: 'ブーメランカツオ・トリプル（カツオ LV.3）！',
    sub: 'ブーメランカツオが３匹に大増殖！常に飛び交うカツオの嵐！',
    apply: (game) => {
      game.skills.bonito.level = 3;
    }
  },
  9: {
    title: '子猫大行進・トリプルキャット（子猫 LV.3）！',
    sub: 'チビミケ３号（クロ猫）が合流！３匹で強力サポート！',
    apply: (game) => {
      if (game.kittens.length < 3) {
        game.kittens.push({
          id: 3,
          name: 'チビミケ３号',
          type: 'black',
          trailIndex: 21,
          attackTimer: 0.2,
          scale: 0.65,
          facing: 1
        });
      }
    }
  },
  10: {
    title: '最終奥義・勝浦神罰落雷！',
    sub: '遠見岬神社の御神威！全画面の敵へ激しい青白き落雷！',
    apply: (game) => {
      game.skills.lightning = { level: 1, timer: 0, interval: 4.0 };
    }
  },
  11: {
    title: '極限覚醒・朝市の守護神！',
    sub: '全攻撃の威力・速度が極限突破！',
    apply: (game) => {
      game.skills.scratch.level = 4;
      game.skills.bonito.level = 4;
      if (game.skills.lightning) game.skills.lightning.level = 2;
    }
  }
};

// スキル定義（互換保持用）
const SKILL_DEFS = {
  scratch: {
    id: 'scratch',
    name: '三毛猫の爪撃',
    icon: '🐾',
    desc: '最寄りの敵へ自動で鋭い爪撃波を放つ！',
    maxLevel: 5,
    getDesc: (lv) => `威力 ${25 + lv * 12}、同時発射数 ${Math.min(4, 1 + Math.floor(lv/2))}発！`
  },
  bonito: {
    id: 'bonito',
    name: '勝浦カツオブーメラン',
    icon: '🐟',
    desc: '周囲を高速回転しながら敵をまとめて貫通！',
    maxLevel: 5,
    getDesc: (lv) => `カツオ ${Math.min(5, 1 + lv)}匹が旋回して敵を薙ぎ払う！`
  },
  meow: {
    id: 'meow',
    name: 'ニャー威嚇衝撃波',
    icon: '📢',
    desc: '一定間隔で全方位に音波を放ち、周囲の敵を吹き飛ばす！',
    maxLevel: 5,
    getDesc: (lv) => `衝撃波範囲 ${120 + lv * 30}px、気絶時間 ${1.0 + lv * 0.2}秒！`
  },
  shichirin: {
    id: 'shichirin',
    name: '炭火七輪ファイア',
    icon: '🔥',
    desc: '前方に炭火の火の粉を撒き散らし、敵を炎上させる！',
    maxLevel: 5,
    getDesc: (lv) => `火球 ${2 + lv}発発射！炎上継続ダメージ！`
  },
  boots: {
    id: 'boots',
    name: '韋駄天キャット',
    icon: '⚡',
    desc: 'ミケの移動速度がアップする！',
    maxLevel: 5,
    getDesc: (lv) => `移動速度 +${lv * 15}%！`
  },
  magnet: {
    id: 'magnet',
    name: 'マグネットヒゲ',
    icon: '🧲',
    desc: '落ちている小判や回復アイテムの吸引範囲が広がる！',
    maxLevel: 5,
    getDesc: (lv) => `アイテム吸引範囲 +${lv * 45}px！`
  },
  can: {
    id: 'can',
    name: '頑丈な極上猫缶',
    icon: '🥫',
    desc: '最大HPが増加し、HPが自動回復する！',
    maxLevel: 5,
    getDesc: (lv) => `最大HP +${lv * 25}、毎秒リジェネ +${lv * 1.5}！`
  },
  spice: {
    id: 'spice',
    name: 'SPICEドリップ',
    icon: '☕',
    desc: '全スキルの攻撃力アップ ＆ クールダウン短縮！',
    maxLevel: 5,
    getDesc: (lv) => `全攻撃力 +${lv * 20}%、CT -${lv * 10}%！`
  }
};

