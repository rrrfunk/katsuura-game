/**
 * 勝浦朝市サバイバー！
 * 〜看板猫ミケの敵薙ぎ払い大乱闘【ダダサバイバー風】〜
 * 
 * 千葉県勝浦市の「勝浦朝市」を舞台にした、16-bitレトロ調サバイバーアクションゲーム！
 * 押し寄せるヤンキー、房総名物キョン、空飛ぶトンビをオート爪撃＆カツオブーメランで薙ぎ倒せ！
 */

// ========================================================
// 1. サウンドシステム（8bit Web Audio シンセサイザー）
// ========================================================
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.soundEnabled = true;
    this.bgmPlaying = false;
    this.currentBgmType = 'NONE'; // 'NONE' | 'PEACE' | 'BATTLE'

    // 平和モードBGM用タイマー・状態
    this.peaceBgmTimer = null;
    this.peaceBgmPlaying = false;

    // ユーザー提供の本格戦闘BGM（assets/bgm.mp3）
    this.bgmAudio = new Audio('assets/bgm.mp3');
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.16; // さらに音量を控えめにして心地よいバランスに調整！

    // ★ユーザー提供の高品質リアル効果音オーディオプール
    this.audioPool = {
      bicycle: new Audio('assets/se_bicycle.mp3'),
      mikoshi: new Audio('assets/se_mikoshi.mp3'),
      cat: new Audio('assets/se_cat.mp3')
    };
    this.audioPool.bicycle.volume = 0.55;
    this.audioPool.mikoshi.volume = 0.55;
    this.audioPool.cat.volume = 0.65;

    // Web Audio API でのゼロ遅延再生用バッファ
    this.customBuffers = {
      bicycle: null,
      mikoshi: null,
      cat: null
    };
    this.mikoshiActiveSource = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.createNoiseBuffer();
      this.loadCustomAudioBuffers();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ユーザー提供リアル音声ファイルのWeb Audioデコード
  async loadCustomAudioBuffers() {
    if (!this.ctx) return;
    const files = {
      bicycle: 'assets/se_bicycle.mp3',
      mikoshi: 'assets/se_mikoshi.mp3',
      cat: 'assets/se_cat.mp3'
    };
    for (const [key, path] of Object.entries(files)) {
      try {
        const res = await fetch(path);
        const buf = await res.arrayBuffer();
        this.ctx.decodeAudioData(buf, (decoded) => {
          this.customBuffers[key] = decoded;
        }, () => {});
      } catch(e) {}
    }
  }

  // ホワイトノイズバッファ生成（打撃音、斬撃風切り音、爆発音、祭り太鼓用）
  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate; // 1秒分
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (!this.soundEnabled) {
      this.stopBGM();
    } else {
      if (this.currentBgmType === 'BATTLE') {
        this.startBattleBGM();
      } else {
        this.startPeaceBGM();
      }
    }
    return this.soundEnabled;
  }

  // 汎用トーン再生（まろやかなエンベロープ）
  playTone(freq, type, duration, gainVal = 0.1, decay = true) {
    if (!this.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      if (decay) {
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      }
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  // 1. 爪撃音（鋭い風切り＆肉球爪スラッシュ「シュバッ！」）
  playSlash() {
    if (!this.soundEnabled || !this.ctx || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.08;

      // バンドパスノイズの高速ピッチスイープ（風を切り裂く音）
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(700, now + dur);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + dur);

      // 金属的な爪のキラリ音
      this.playTone(880, 'sine', 0.04, 0.08);
    } catch(e) {}
  }

  // 2. 打撃ヒット音（重厚なキック＋インパクト「ドスッ！」「バシッ！」）
  playHit() {
    if (!this.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.12;

      // A. 低音ボディキック（サイン波の急降下 130Hz -> 42Hz）
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + dur);

      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);

      // B. 表面アタックノイズ（パシッ！）
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.Q.setValueAtTime(1.5, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.18, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.04);
      }
    } catch(e) {}
  }

  // 3. 敵撃破・吹っ飛び音（豪快な爆散「ドガァン！」）
  playEnemyDefeat() {
    if (!this.soundEnabled || !this.ctx || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.22;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + dur);

      this.playTone(85, 'triangle', 0.16, 0.25);
    } catch(e) {}
  }

  // 4. 勝浦神輿・祭り太鼓音（腹に響くド迫力「ドンッ！！」）
  playTaiko() {
    if (!this.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.35;

      // 大太鼓の胴鳴り（65Hz -> 32Hz）
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + dur);

      oscGain.gain.setValueAtTime(0.48, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);

      // 皮の打音アタック
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.35, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.08);
      }
    } catch(e) {}
  }

  // 5. キョン鳴き声（ピョコッ！と跳ねる可愛らしい声）
  playKyonSound() {
    this.playTone(620, 'triangle', 0.07, 0.16);
    setTimeout(() => this.playTone(480, 'sine', 0.09, 0.14), 35);
  }

  // 6. 小判チャリン音（マリオやレトロ名作のような澄んだクリスタルコイン「チャリーン♪」）
  playCoin() {
    if (!this.soundEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    // B5 (987.77Hz) -> E6 (1318.51Hz)
    this.playTone(987.77, 'sine', 0.09, 0.16);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.25, 0.18), 50);
  }

  // 7. レベルアップ（華やかなファンファーレアルペジオ♪）
  playLevelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((note, idx) => {
      setTimeout(() => this.playTone(note, 'sine', 0.18, 0.16), idx * 60);
    });
  }

  // ★完全勝利クリア専用：感動と栄光のグランドファンファーレ（金管ブラス合奏）！
  playVictoryFanfare() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    // トランペット／ブラス風の音を合成する内部関数
    const playBrass = (freq, time, dur, vol = 0.24) => {
      try {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.003, time); // 豊かな倍音と厚み

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3.5, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.3, time + dur);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.04);
        gain.gain.setValueAtTime(vol * 0.88, time + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + dur);
        osc2.stop(time + dur);
      } catch(e) {}
    };

    const now = this.ctx.currentTime + 0.05;
    // イントロ：勇ましい連打（C5 C5 C5）
    playBrass(523.25, now + 0.00, 0.14, 0.22);
    playBrass(523.25, now + 0.16, 0.14, 0.22);
    playBrass(523.25, now + 0.32, 0.14, 0.22);
    // 上昇アルペジオ（C5 -> E5 -> G5）
    playBrass(523.25, now + 0.48, 0.36, 0.25);
    playBrass(659.25, now + 0.86, 0.32, 0.26);
    playBrass(783.99, now + 1.20, 0.32, 0.28);
    // 栄光のクライマックス重厚和音！（C5 + E5 + G5 + C6）
    const chordTime = now + 1.55;
    playBrass(523.25, chordTime, 2.2, 0.20);
    playBrass(659.25, chordTime, 2.2, 0.22);
    playBrass(783.99, chordTime, 2.2, 0.24);
    playBrass(1046.50, chordTime, 2.4, 0.30);
  }

  // 8. カツオブーメラン（ヒュンヒュン！と回転する風切り音）
  playBoomerang() {
    this.playTone(380, 'triangle', 0.09, 0.12);
    setTimeout(() => this.playTone(520, 'sine', 0.12, 0.12), 40);
  }

  // 9. ★ミケの鳴き声・威嚇咆哮（ユーザー提供のリアル猫ちゃん音声「ミャオ〜〜ン！」「ニャ〜〜オ！」）
  playMeowRoar() {
    if (!this.soundEnabled) return;
    this.init();

    // 1. Web Audio API バッファ再生（ゼロ遅延・多重発音対応）
    if (this.ctx && this.customBuffers && this.customBuffers.cat) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.customBuffers.cat;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.65;
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(0);
        return;
      } catch(e) {}
    }

    // 2. HTML5 Audio プールでのフォールバック再生
    if (this.audioPool && this.audioPool.cat) {
      try {
        const audio = this.audioPool.cat.cloneNode();
        audio.volume = 0.65;
        audio.play().catch(() => {});
      } catch(e) {}
    }
  }

  // 10. 回復アイテムGET（ピロリロリーン♪）
  playHeal() {
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 'sine', 0.16, 0.16), i * 45);
    });
  }

  // 11. プレイヤー被弾（鈍い衝撃音）
  playDamage() {
    this.playTone(150, 'triangle', 0.12, 0.28);
    setTimeout(() => this.playTone(90, 'sine', 0.18, 0.24), 40);
  }

  // 12. ★ヤンキー登場：ドラクエ風の劇的戦闘エンカウント効果音（平和モードから戦闘モードへの転換！）
  playYankeeEncounter() {
    if (!this.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      // A. ドラクエ伝統の超高速ディミニッシュ・アルペジオ（急上昇＆急降下！）
      // 減七の和音（A - C - D# - F#）を1音0.02秒のレトロ8bit矩形波で目まぐるしく走らせる
      const arpeggioNotes = [
        440.00, 523.25, 622.25, 739.99, 880.00, 1046.50, 1244.51, 1479.98,
        1760.00, 1479.98, 1244.51, 1046.50, 880.00, 622.25, 523.25, 440.00,
        523.25, 622.25, 739.99, 880.00, 1046.50, 1244.51, 1479.98, 1760.00
      ];

      arpeggioNotes.forEach((freq, idx) => {
        const t = now + idx * 0.021;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square'; // レトロ8bitファミコン・スーファミサウンド
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.20, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.032);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.035);
      });

      // B. アルペジオ後の大迫力インパクト和音（「ジャーン！！」）
      const impactTime = now + arpeggioNotes.length * 0.021;
      const chordPitches = [440, 622.25, 880, 1244.51];
      chordPitches.forEach(f => {
        const chordOsc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();
        chordOsc.type = 'sawtooth';
        chordOsc.frequency.setValueAtTime(f, impactTime);
        chordGain.gain.setValueAtTime(0.16, impactTime);
        chordGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.38);
        chordOsc.connect(chordGain);
        chordGain.connect(this.ctx.destination);
        chordOsc.start(impactTime);
        chordOsc.stop(impactTime + 0.39);
      });

      // C. 重低音エンカウントキック（「ズズゥン！」）
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(160, impactTime);
      kickOsc.frequency.exponentialRampToValueAtTime(36, impactTime + 0.32);
      kickGain.gain.setValueAtTime(0.42, impactTime);
      kickGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.32);
      kickOsc.connect(kickGain);
      kickGain.connect(this.ctx.destination);
      kickOsc.start(impactTime);
      kickOsc.stop(impactTime + 0.33);

      // D. 金属的クラッシュノイズ
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2400, impactTime);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.24, impactTime);
        nGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.28);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(impactTime);
        noise.stop(impactTime + 0.28);
      }
    } catch(e) {}
  }

  // 13. ★キョン登場：野生動物奇襲アラート＆威嚇鳴き声（ヤンキーのドラクエ音と明確に差別化！）
  playKyonEncounter() {
    if (!this.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      // A. 素早い警戒警報サイレン（「ピュイッ！ピュイッ！」）
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.11;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(1450, t + 0.08);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.10);
      }

      // B. 野生キョンの甲高い威嚇鳴き声（「ギョエーッ！」）
      const kyonTime = now + 0.24;
      const kyonOsc = this.ctx.createOscillator();
      const kyonGain = this.ctx.createGain();
      const kyonFilter = this.ctx.createBiquadFilter();

      kyonOsc.type = 'sawtooth';
      kyonOsc.frequency.setValueAtTime(780, kyonTime);
      kyonOsc.frequency.exponentialRampToValueAtTime(1600, kyonTime + 0.08);
      kyonOsc.frequency.exponentialRampToValueAtTime(420, kyonTime + 0.28);

      kyonFilter.type = 'bandpass';
      kyonFilter.frequency.setValueAtTime(1350, kyonTime);
      kyonFilter.Q.setValueAtTime(4.2, kyonTime);

      kyonGain.gain.setValueAtTime(0.001, kyonTime);
      kyonGain.gain.linearRampToValueAtTime(0.32, kyonTime + 0.04);
      kyonGain.gain.exponentialRampToValueAtTime(0.001, kyonTime + 0.30);

      kyonOsc.connect(kyonFilter);
      kyonFilter.connect(kyonGain);
      kyonGain.connect(this.ctx.destination);

      kyonOsc.start(kyonTime);
      kyonOsc.stop(kyonTime + 0.32);
    } catch(e) {}
  }

  // 14. ★お助けキャラ：タンデム自転車のリアルベル音（ユーザー提供の本格「チリリリーン♪」）
  playBicycleBell() {
    if (!this.soundEnabled) return;
    this.init();

    // 1. Web Audio API バッファ再生（ゼロ遅延）
    if (this.ctx && this.customBuffers && this.customBuffers.bicycle) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.customBuffers.bicycle;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.60;
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(0);
        return;
      } catch(e) {}
    }

    // 2. HTML5 Audio プールでのフォールバック再生
    if (this.audioPool && this.audioPool.bicycle) {
      try {
        const audio = this.audioPool.bicycle.cloneNode();
        audio.volume = 0.60;
        audio.play().catch(() => {});
      } catch(e) {}
    }
  }

  // 15. ★お助けキャラ：勝浦神輿軍団のリアル祭り太鼓＆熱気あふれる掛け声音（ユーザー提供の本格音源）
  playMikoshiSound() {
    if (!this.soundEnabled) return;
    this.init();

    // 既に神輿軍団の音が鳴り響いている場合は、巻き戻さず太鼓を追加連打して熱気をブースト！
    if (this.mikoshiActiveSource) {
      this.playTaiko();
      return;
    }
    if (this.audioPool && this.audioPool.mikoshi && !this.audioPool.mikoshi.paused && this.audioPool.mikoshi.currentTime > 0.1) {
      this.playTaiko();
      return;
    }

    // 1. Web Audio API バッファ再生
    if (this.ctx && this.customBuffers && this.customBuffers.mikoshi) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.customBuffers.mikoshi;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.58, this.ctx.currentTime);
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(0);
        this.mikoshiActiveSource = { src, gain };
        return;
      } catch(e) {}
    }

    // 2. HTML5 Audio プールでのフォールバック再生
    if (this.audioPool && this.audioPool.mikoshi) {
      try {
        this.audioPool.mikoshi.currentTime = 0;
        this.audioPool.mikoshi.volume = 0.58;
        this.audioPool.mikoshi.play().catch(() => {});
      } catch(e) {}
    }
  }

  // お神輿音のスマート停止（神輿が画面外に抜けた時）
  stopMikoshiSound() {
    if (this.mikoshiActiveSource && this.ctx) {
      try {
        const { src, gain } = this.mikoshiActiveSource;
        const now = this.ctx.currentTime;
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        setTimeout(() => {
          try { src.stop(); } catch(e) {}
        }, 400);
      } catch(e) {}
      this.mikoshiActiveSource = null;
    }
    if (this.audioPool && this.audioPool.mikoshi) {
      try {
        this.audioPool.mikoshi.pause();
        this.audioPool.mikoshi.currentTime = 0;
      } catch(e) {}
    }
  }

  // 神輿掛け声用エイリアス
  playMikoshiChant() {
    this.playMikoshiSound();
  }

  // ★平和モードBGM開始（のどかな朝市のWeb Audioレトロチップチューン！）
  startPeaceBGM() {
    this.stopBattleBGM();
    this.stopPeaceBGM();
    if (!this.soundEnabled) return;
    this.init();

    this.currentBgmType = 'PEACE';
    this.peaceBgmPlaying = true;

    // のどかな朝市のメロディループ
    const melody = [
      { f: 440, d: 0.22 }, { f: 493.88, d: 0.22 }, { f: 554.37, d: 0.22 }, { f: 659.25, d: 0.44 },
      { f: 554.37, d: 0.22 }, { f: 493.88, d: 0.22 }, { f: 440, d: 0.44 }, { f: 0, d: 0.22 },
      { f: 659.25, d: 0.22 }, { f: 739.99, d: 0.22 }, { f: 880, d: 0.44 }, { f: 739.99, d: 0.22 },
      { f: 659.25, d: 0.22 }, { f: 554.37, d: 0.44 }, { f: 440, d: 0.44 }, { f: 0, d: 0.22 }
    ];

    let noteIdx = 0;
    const playNext = () => {
      if (!this.peaceBgmPlaying || !this.soundEnabled) return;
      const note = melody[noteIdx];
      const duration = note.d;

      if (note.f > 0) {
        // 主旋律（柔らかな矩形波、耳に優しい控えめ音量）
        this.playTone(note.f, 'square', duration * 0.85, 0.022);
        // 優しい三角波ベース
        this.playTone(note.f / 2, 'triangle', duration * 0.9, 0.028);
      }

      noteIdx = (noteIdx + 1) % melody.length;
      this.peaceBgmTimer = setTimeout(playNext, duration * 1000);
    };

    playNext();
  }

  // 平和モードBGM停止
  stopPeaceBGM() {
    this.peaceBgmPlaying = false;
    if (this.peaceBgmTimer) {
      clearTimeout(this.peaceBgmTimer);
      this.peaceBgmTimer = null;
    }
  }

  // ★戦闘モードBGM開始（ヤンキー登場以降：ユーザー提供の神曲MP3！）
  startBattleBGM() {
    this.stopPeaceBGM();
    if (!this.soundEnabled) return;
    this.init();

    this.currentBgmType = 'BATTLE';
    this.bgmPlaying = true;
    try {
      this.bgmAudio.currentTime = 0;
      const promise = this.bgmAudio.play();
      if (promise !== undefined) {
        promise.catch(e => {
          console.log('Battle BGM play prevented or waiting for user interaction', e);
        });
      }
    } catch(e) {}
  }

  // 戦闘モードBGM停止
  stopBattleBGM() {
    this.bgmPlaying = false;
    try {
      this.bgmAudio.pause();
    } catch(e) {}
  }

  // 汎用BGM開始（デフォルトは現在の状態、未指定なら平和モード）
  startBGM() {
    if (this.currentBgmType === 'BATTLE') {
      this.startBattleBGM();
    } else {
      this.startPeaceBGM();
    }
  }

  // 全BGM完全停止
  stopBGM() {
    this.stopPeaceBGM();
    this.stopBattleBGM();
    this.stopMikoshiSound();
    this.currentBgmType = 'NONE';
  }
}

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
      splashYankee: new Image(),
      splashKyon: new Image(),
      cutinCat: new Image(),
      cutinYankee: new Image(),
      cutinKyon: new Image(),
      tandemBike: new Image(),
      mikoshi: new Image(),
      cat: new Image(),
      yankees: new Image(),
      items: new Image()
    };
    this.tandemBikeCanvas = null; // 黒背景を透明化したCanvasキャッシュ
    this.tandemRushes = []; // 走行中のタンデムバイクリスト
    this.mikoshiRushes = []; // 走行中の勝浦神輿軍団リスト
    this.kittens = []; // ミケについてくる子猫リスト
    this.lightningTimer = 0; // 電撃タイマー
    this.levelUpBanner = null; // レベルアップ自動通知バナー

    // 操作入力（PCマウス操作 ＆ スマホ右下バーチャルスティック）
    this.joystickVector = { x: 0, y: 0 };
    this.mouseInput = { active: false, x: 0, y: 0, isDown: false };
    this.itemSpawnTimer = 3.0; // アイテム自然ポップタイマー

    // ゲーム状態
    this.state = 'TITLE'; // 'TITLE' | 'PLAYING' | 'LEVELUP' | 'RESULT'
    this.survivalTime = 0;
    this.killCount = 0;
    this.gold = 0;
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
      shieldBuffTimer: 0,
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
      can:      { level: 0 },
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

    // ドロップアイテム（小判、回復アイテム、金のまたたび）
    this.dropItems = [];

    // 助太刀仲間にゃんこ（クロ、トラ吉、チビ、シロ）
    this.allyCats = [];
    this.coinStreak = 0;

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

  loadAssets() {
    let loaded = 0;
    const cacheKey = Date.now();
    const list = [
      { img: this.images.mapHorizontal, src: `assets/map_horizontal.jpg?v=${cacheKey}` },
      { img: this.images.mapPeace,      src: `assets/map_peace.jpg?v=${cacheKey}` },
      { img: this.images.splashYankee,  src: `assets/splash_yankee.jpg?v=${cacheKey}` },
      { img: this.images.splashKyon,    src: `assets/splash_kyon.jpg?v=${cacheKey}` },
      { img: this.images.cutinCat,      src: `assets/cutin_cat.jpg?v=${cacheKey}` },
      { img: this.images.cutinYankee,   src: `assets/cutin_yankee.jpg?v=${cacheKey}` },
      { img: this.images.cutinKyon,     src: `assets/cutin_kyon.jpg?v=${cacheKey}` },
      { img: this.images.tandemBike,    src: `assets/tandem_bike.png?v=${cacheKey}` },
      { img: this.images.mikoshi,       src: `assets/katsuura_mikoshi.png?v=${cacheKey}` },
      { img: this.images.cat,           src: `assets/cat_sprites.png?v=${cacheKey}` },
      { img: this.images.yankees,       src: `assets/yankee_sprites.png?v=${cacheKey}` },
      { img: this.images.items,         src: `assets/items.png?v=${cacheKey}` }
    ];
    const total = list.length;
    const check = () => {
      loaded++;
      if (loaded >= total) {
        this.assetsLoaded = true;
        this.prepareTransparentTandemBike();
      }
    };

    list.forEach(item => {
      item.img.onload = check;
      item.img.onerror = () => {
        console.warn('Asset failed to load:', item.src);
        check();
      };
      item.img.src = item.src;
      if (item.img.complete && item.img.naturalWidth > 0) {
        check();
      }
    });
  }

  // タンデムクロスバイクの黒背景を自動透過してキャッシュ
  prepareTransparentTandemBike() {
    try {
      const img = this.images.tandemBike;
      if (!img || !img.naturalWidth) return;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(img, 0, 0);
      const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        // 真っ黒・暗所背景を透過
        if (r < 35 && g < 35 && b < 35) {
          data[i+3] = 0;
        } else if (r < 60 && g < 60 && b < 60) {
          data[i+3] = Math.max(0, Math.floor((r + g + b - 90) * 2.8));
        }
      }
      offCtx.putImageData(imgData, 0, 0);
      this.tandemBikeCanvas = offCanvas;
    } catch (e) {
      console.warn('Tandem bike transparency failed, fallback to original image', e);
    }
  }

  // コライダー設定（新マップ：遠見岬神社雛人形・広々メインストリート）
  initColliders() {
    this.colliders = [
      // 外周境界壁
      { x: 0, y: 0, w: 1376, h: 20 },
      { x: 0, y: 755, w: 1376, h: 20 },
      { x: 0, y: 0, w: 15, h: 768 },
      { x: 1361, y: 0, w: 15, h: 768 },

      // 北側（上部）町屋建物
      { x: 0, y: 0, w: 500, h: 420 },
      { x: 780, y: 0, w: 596, h: 420 },

      // 遠見岬神社：雛人形の石段（保護エリア・立ち入り禁止）
      { x: 535, y: 0, w: 215, h: 375 },
      // 鳥居の柱・石灯籠
      { x: 485, y: 360, w: 45, h: 65 },
      { x: 750, y: 360, w: 45, h: 65 },

      // 北側屋台の足元コライダー（すり抜けやすさを優先）
      { x: 150, y: 520, w: 160, h: 35 }, // SPICE COFFEE自転車屋台
      { x: 860, y: 510, w: 160, h: 35 }, // 魚トロ箱屋台
      { x: 1100, y: 510, w: 160, h: 35 }, // 野菜果物屋台

      // 南側（手前側）屋台コライダー
      { x: 0, y: 690, w: 430, h: 65 },
      { x: 780, y: 690, w: 596, h: 65 }
    ];
  }

  // 足元接地衝突判定
  checkFootCollision(fx, fy) {
    const boxW = 16;
    const boxH = 8;
    for (let c of this.colliders) {
      if (fx + boxW / 2 > c.x && fx - boxW / 2 < c.x + c.w &&
          fy + boxH / 2 > c.y && fy - boxH / 2 < c.y + c.h) {
        return true;
      }
    }
    return false;
  }

  // アンスタック救出機構（壁めり込み完全防止！）
  unstuckEntity(entity) {
    if (!this.checkFootCollision(entity.x, entity.y)) return;

    for (let r = 2; r <= 80; r += 4) {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const testX = entity.x + Math.cos(angle) * r;
        const testY = entity.y + Math.sin(angle) * r;
        if (testX >= 25 && testX <= this.worldW - 25 && testY >= 25 && testY <= this.worldH - 25) {
          if (!this.checkFootCollision(testX, testY)) {
            entity.x = testX;
            entity.y = testY;
            return;
          }
        }
      }
    }
    entity.x = 660;
    entity.y = 460;
  }

  // キーボード・UIイベント
  initEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.key) {
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.key] = true;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (this.state === 'TITLE') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.startGame();
        }
      } else if (this.state === 'PLAYING') {
        if (this.eventState !== 'NONE') {
          // イベント中：ロックアウト解除後、SpaceまたはEnterでスキップ
          if (this.eventLockoutTimer <= 0 && (e.code === 'Space' || e.code === 'Enter')) {
            e.preventDefault();
            this.endEventCutin();
          }
          return;
        }
      } else if (this.state === 'LEVELUP') {
        if (e.key === '1') this.chooseSkillByIndex(0);
        if (e.key === '2') this.chooseSkillByIndex(1);
        if (e.key === '3') this.chooseSkillByIndex(2);
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

    // UIボタン＆タイトル画面タップ
    document.getElementById('btn-quick-start')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startGame();
    });
    document.getElementById('title-overlay')?.addEventListener('click', (e) => {
      if (this.state === 'TITLE') {
        this.startGame();
      }
    });
    document.getElementById('btn-view-help')?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay').classList.remove('hidden');
    });
    document.getElementById('help-btn')?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay').classList.remove('hidden');
    });
    document.getElementById('btn-tutorial-start')?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay').classList.add('hidden');
      if (this.state === 'TITLE') this.startGame();
    });
    document.getElementById('btn-tutorial-back')?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay').classList.add('hidden');
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

    // キャンバスクリック/タップでイベントスキップ
    const trySkipEvent = (e) => {
      if (this.state === 'PLAYING' && this.eventState !== 'NONE') {
        if (this.eventLockoutTimer <= 0) {
          this.endEventCutin();
        }
      }
    };
    this.canvas.addEventListener('click', trySkipEvent);
    this.canvas.addEventListener('touchstart', trySkipEvent);

    // ========================================================
    // PC用：マウス操作（カーソル追従 / ドラッグ移動）
    // ========================================================
    const updateMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouseInput.x = (e.clientX - rect.left) * scaleX;
      this.mouseInput.y = (e.clientY - rect.top) * scaleY;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.state === 'PLAYING' && this.mouseInput.isDown) {
        updateMousePos(e);
        this.mouseInput.active = true;
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.state === 'PLAYING') {
        updateMousePos(e);
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
    // スマホ用：右下バーチャルジョイスティック（グリグリ操作）
    // ========================================================
    const joyZone = document.getElementById('joystick-zone');
    const joyBase = document.getElementById('joystick-base');
    const joyKnob = document.getElementById('joystick-knob');

    let joyTouchId = null;
    let joyBaseCenter = { x: 0, y: 0 };
    const maxJoyRadius = 38; // 最大傾斜半径（px）

    const handleJoyStart = (clientX, clientY, identifier) => {
      joyTouchId = identifier;
      if (joyBase) {
        const rect = joyBase.getBoundingClientRect();
        joyBaseCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
      handleJoyMove(clientX, clientY);
    };

    const handleJoyMove = (clientX, clientY) => {
      const dx = clientX - joyBaseCenter.x;
      const dy = clientY - joyBaseCenter.y;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) {
        this.joystickVector.x = 0;
        this.joystickVector.y = 0;
        if (joyKnob) joyKnob.style.transform = 'translate(0px, 0px)';
        return;
      }

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
      joyTouchId = null;
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
      if (joyKnob) {
        joyKnob.style.transform = 'translate(0px, 0px)';
      }
    };

    if (joyZone) {
      joyZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        handleJoyStart(touch.clientX, touch.clientY, touch.identifier);
      }, { passive: false });

      joyZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === joyTouchId) {
            handleJoyMove(touch.clientX, touch.clientY);
            break;
          }
        }
      }, { passive: false });

      const onJoyTouchEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyTouchId) {
            handleJoyEnd();
            break;
          }
        }
      };
      joyZone.addEventListener('touchend', onJoyTouchEnd);
      joyZone.addEventListener('touchcancel', onJoyTouchEnd);

      // PCマウスでもスティックをドラッグ操作可能（テスト・デバッグ用）
      let isMouseJoy = false;
      joyZone.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          isMouseJoy = true;
          handleJoyStart(e.clientX, e.clientY, 'mouse');
        }
      });
      window.addEventListener('mousemove', (e) => {
        if (isMouseJoy) handleJoyMove(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', () => {
        if (isMouseJoy) {
          isMouseJoy = false;
          handleJoyEnd();
        }
      });
    }

    // メインループ起動
    let lastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  startGame() {
    this.sound.init();
    this.sound.startPeaceBGM(); // ★平和モード開始！のどかな朝市のレトロチップチューンBGM

    this.state = 'PLAYING';
    this.survivalTime = 0;
    this.killCount = 0;
    this.gold = 0;
    this.screenShake = 0;
    this.bossSpawned1 = false;
    this.bossSpawned2 = false;

    // プレイヤー初期化
    this.player.x = 660;
    this.player.y = 530;
    this.player.hp = 100;
    this.player.maxHp = 100;
    this.player.level = 1;
    this.player.exp = 0;
    this.player.nextExp = 8;
    this.player.dir = 'down';
    this.player.invincibleTimer = 0;
    this.player.speedBuffTimer = 0;
    this.player.shieldBuffTimer = 0;
    this.player.knockbackTimer = 0;
    this.player.meowAnimTimer = 0;
    this.player.isMoving = false;
    this.player.facing = 1;

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
      can:      { level: 0 },
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
    this.coinStreak = 0;
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

  // 1. 開幕イベント（ゲーム開始時：平和モードのミケの可愛いセリフ演出カットイン！）
  triggerPeaceEvent() {
    this.firstPeaceEventDone = true;
    this.eventState = 'PEACE';
    this.eventCutinTimer = 2.4;
    this.eventLockoutTimer = 0.2;
    this.sound.playMeowRoar();
    // 平和モードBGMが流れていなければ確実にスタート
    if (this.sound.currentBgmType !== 'PEACE') {
      this.sound.startPeaceBGM();
    }
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

  // 2. 初回ヤンキー遭遇（★平和モードから戦闘モードへの転換！ドラクエ風エンカウント音＋戦闘BGM突入！）
  triggerYankeeEvent(yankeeEnemy) {
    if (this.firstYankeeEventDone) return;
    this.firstYankeeEventDone = true;
    this.eventState = 'YANKEE';
    this.eventCutinTimer = 2.5;
    this.eventLockoutTimer = 0.2;

    // ★メリハリ演出：平和BGMをストップし、ドラクエ風戦闘エンカウント音を大迫力で再生！
    this.sound.stopPeaceBGM();
    this.sound.playYankeeEncounter();

    // ドラクエ風エンカウント音（約0.5秒）のインパクト・和音炸裂に合わせてユーザー提供の神曲戦闘MP3をスタート！
    setTimeout(() => {
      if (this.state === 'PLAYING') {
        this.sound.startBattleBGM();
      }
    }, 480);

    this.screenShake = 0.45;
    this.showLevelUpBanner('⚠️ 勝浦ヤンキー集団が朝市に乱入！', '迫りくるヤンキーを自動爪撃で撃退せよ！');
  }

  // 3. 初回キョン遭遇（★野生キョン専用の奇襲アラート＆甲高い威嚇鳴き声！ヤンキーのドラクエ音とは明確に差別化！）
  triggerKyonEvent(kyonEnemy) {
    if (this.firstKyonEventDone) return;
    this.firstKyonEventDone = true;
    this.eventState = 'KYON';
    this.eventCutinTimer = 2.2;
    this.eventLockoutTimer = 0.2;

    // キョン専用の野生奇襲警戒音！
    this.sound.playKyonEncounter();

    this.screenShake = 0.35;
    this.showLevelUpBanner('🦌 野生のキョンが乱入！', 'すばしっこいキョンに気をつけろ！');
  }

  // カットイン終了＆ゲーム復帰処理（戦闘BGMの確実なスタート＆戦闘後アイテムタイマー起動）
  endEventCutin() {
    if (this.eventState === 'YANKEE') {
      // ヤンキー登場演出終了時：戦闘BGMが未再生なら確実に再生開始
      if (this.sound.currentBgmType !== 'BATTLE') {
        this.sound.startBattleBGM();
      }
      // ★戦闘開始！2秒後に最初のアイスコーヒーが確定出現！
      this.itemSpawnTimer = 2.0;
    }
    this.eventState = 'NONE';
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
    const bossX = this.player.x + (this.player.dir === 'left' ? -340 : 340);
    const bossY = Math.max(480, Math.min(640, this.player.y));
    const boss = this.spawnEnemy('boss_yankee', bossX, bossY);
    boss.isBoss = true;
    boss.isFinalBoss = true;
    boss.hp = 2200; // 手応えと爽快感を両立したボスHP
    boss.maxHp = 2200;
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
    setTimeout(() => {
      this.endGame(true);
    }, 3200);
  }

  // ========================================================
  // 4. 更新ロジック（サバイバーコア）
  // ========================================================
  update(dt) {
    if (this.state !== 'PLAYING') return;

    // イベントカットイン表示中：プレイヤーの操作（ボタン押下・タップ・SPACE）があるまで完全待機！
    if (this.eventState !== 'NONE') {
      if (this.eventLockoutTimer > 0) this.eventLockoutTimer -= dt;
      // ※自動進行は廃止！プレイヤーがボタンを押すまでしっかり待機
      this.updateCamera();
      this.updateUI();
      return;
    }

    this.survivalTime += dt;

    // 平和時間（開始後3.5秒）を過ぎたら、最初のヤンキーが襲来！（格ゲーカットイン発動！）
    if (this.survivalTime >= 3.5 && !this.firstYankeeEventDone) {
      const spawnSide = this.player.x > 600 ? -200 : 200;
      const firstYankee = this.spawnEnemy('tsuppari', this.player.x + spawnSide, this.player.y);
      this.triggerYankeeEvent(firstYankee);
    }


    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 2.5);
    }

    this.updatePlayer(dt);
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
    this.updateUI();

    // プレイヤー死亡チェック
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
    if (p.shieldBuffTimer > 0) p.shieldBuffTimer -= dt;
    if (p.scratchAnimTimer > 0) p.scratchAnimTimer -= dt; // ひっかき攻撃モーションタイマー

    // 猫缶パッシブHPリジェネ（適正な微量回復でスリルを維持）
    if (this.skills.can.level > 0) {
      const regen = this.skills.can.level * 0.4 * dt;
      p.hp = Math.min(p.maxHp, p.hp + regen);
    }

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

  // 自動爪撃（親ミケ＋子ミケ連動：ツメLv3＆子ミケ3匹で合計14ツメ一斉射出！）
  fireAutoScratch(dmgMult) {
    if (this.enemies.length === 0) return;
    const p = this.player;
    const lv = this.skills.scratch.level;

    // 最寄りの敵を索敵（範囲を狭くコンパクトに：165px以内）
    const sorted = [...this.enemies].sort((a, b) => {
      return Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y);
    });

    const target = sorted[0];
    const targetDist = Math.hypot(target.x - p.x, target.y - (p.y - 12));
    if (targetDist > 165) return; // 間合いに入った時だけ発動（範囲を狭く！）

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

          // 親の爪撃からわずか20msの時間差でパパパッと爽快に連射！
          setTimeout(() => {
            if (this.state !== 'PLAYING') return;

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
          }, (kIdx + 1) * 20);
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
    if (this.enemies.length > 0) {
      const sorted = [...this.enemies].sort((a, b) => {
        return Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y);
      });
      const target = sorted[0];
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

  // 子猫のミニ爪撃（ミケのツメをさらに小さくした極小鋭利な爪痕！）
  fireKittenScratch(kit) {
    if (this.enemies.length === 0) return;
    const sorted = [...this.enemies].sort((a, b) => {
      return Math.hypot(a.x - kit.x, a.y - kit.y) - Math.hypot(b.x - kit.x, b.y - kit.y);
    });
    const target = sorted[0];
    const dist = Math.hypot(target.x - kit.x, target.y - kit.y);
    if (dist > 140) return; // 至近距離の敵へ牽制

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
    const dmg = 120 * (1 + (this.skills.lightning.level - 1) * 0.35);

    targets.forEach(e => {
      this.damageEnemy(e, dmg);
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
  }

  // ========================================================
  // タンデムクロスバイク爆走（60代男女の超高速薙ぎ払い）
  // ========================================================
  triggerTandemBikeRush() {
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
      this.enemies.forEach(e => {
        if (t.hitEnemies.includes(e)) return;
        const dist = Math.hypot(e.x - t.x, e.y - t.y);
        if (dist < 100) {
          t.hitEnemies.push(e);
          this.damageEnemy(e, 160, t.x - t.dir * 40, t.y); // 特大ダメージ！
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

      this.mikoshiRushes.push({
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

    // 1基目は即座に同期出撃！
    spawnOne(0);

    // 2基目以降はわずかなディレイ（140ms）で時間差追従出撃！
    for (let c = 1; c < count; c++) {
      setTimeout(() => spawnOne(c), c * 140);
    }

    this.screenShake = 0.38; // 重厚な地響き！
    this.addComicPopup(this.player.x, this.player.y - 45, '🏮 勝浦神輿軍団 参上！！', '#f59e0b');
  }

  updateMikoshiRushes(dt) {
    if (!this.mikoshiRushes || this.mikoshiRushes.length === 0) return;

    for (let i = this.mikoshiRushes.length - 1; i >= 0; i--) {
      const t = this.mikoshiRushes[i];
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
      this.enemies.forEach(e => {
        if (t.hitEnemies.includes(e)) return;
        const dist = Math.hypot(e.x - t.x, e.y - t.y);
        if (dist < 125) {
          t.hitEnemies.push(e);
          this.damageEnemy(e, 220, t.x - t.dir * 60, t.y); // 神輿の一撃必殺超ド級ダメージ！
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
    this.enemies.forEach(e => {
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist <= radius) {
        this.damageEnemy(e, dmg);
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

        // 敵との多段ヒット判定（貫通しつつ同一敵には0.20秒ごとにヒット！）
        for (let e of this.enemies) {
          const eDist = Math.hypot(e.x - pr.x, e.y - pr.y);
          if (eDist < (e.w / 2 + 18)) {
            const lastHit = pr.hitCooldowns ? pr.hitCooldowns.get(e) || 0 : 0;
            if (pr.age - lastHit >= 0.20) {
              if (pr.hitCooldowns) pr.hitCooldowns.set(e, pr.age);
              this.damageEnemy(e, pr.damage, pr.x, pr.y);
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

      // 敵との衝突判定
      // 敵との衝突判定（親ミケは範囲狭めの11px、子ミケは極小の8px）
      for (let e of this.enemies) {
        if (pr.hitEnemies && pr.hitEnemies.includes(e)) continue;
        const dist = Math.hypot(e.x - pr.x, e.y - pr.y);
        const hitRadius = pr.isKitten ? (e.w / 2 + 8) : (e.w / 2 + 11);
        if (dist < hitRadius) {
          if (pr.hitEnemies) pr.hitEnemies.push(e);
          this.damageEnemy(e, pr.damage, pr.x, pr.y);
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

    // 4.0秒未満は敵スポーン完全停止（平和な朝市散策タイム！）
    if (time < 4.0) return;

    // 序盤は超ゆったりスタートし、段階的に増えていく王道サバイバー曲線！
    let spawnInterval = 2.0;
    let maxEnemies = 5;
    let spawnBatch = 1;

    if (time > 22) { spawnInterval = 1.0; maxEnemies = 14; spawnBatch = 1; }
    if (time > 45) { spawnInterval = 0.5; maxEnemies = 35; spawnBatch = 2; }
    if (time > 75) { spawnInterval = 0.25; maxEnemies = 70; spawnBatch = 3; }

    if (this.enemySpawnTimer >= spawnInterval && this.enemies.length < maxEnemies) {
      this.enemySpawnTimer = 0;

      for (let b = 0; b < spawnBatch; b++) {
        if (this.enemies.length >= maxEnemies) break;
        const rand = Math.random();

        if (time < 22) {
          // 序盤（4〜22秒）：ヤンキーのみが1体ずつゆっくり出現！（最大5体）
          this.spawnEnemy(rand < 0.7 ? 'tsuppari' : 'skater');
        } else if (time < 45) {
          // 22秒以降：キョン初登場！
          if (rand < 0.5 || !this.firstKyonEventDone) {
            const kyon = this.spawnEnemy('kyon');
            if (!this.firstKyonEventDone && kyon) {
              this.triggerKyonEvent(kyon);
            }
          } else {
            this.spawnEnemy('tsuppari');
          }
        } else if (time < 75) {
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

    // ラッシュイベント（序盤は発生させず、中盤以降に発生。ポップアップは出さずにスマートに演出）
    if (time >= 40 && this.hordeTimer >= (time >= 70 ? 8.0 : 12.0)) {
      this.hordeTimer = 0;
      const hordeType = Math.random() < 0.5 ? 'kyon' : 'tsuppari';
      const hordeCount = time >= 70 ? 16 : 8;
      for (let h = 0; h < hordeCount; h++) {
        if (this.enemies.length < maxEnemies + 15) {
          this.spawnEnemy(hordeType);
        }
      }
      this.screenShake = 0.2;
    }

    // ボス出現トリガー（中盤60秒の巨大キョン王）
    if (time >= 60 && !this.bossSpawned1) {
      this.bossSpawned1 = true;
      this.spawnEnemy('boss_kyon');
      this.sound.playLevelUp();
      this.screenShake = 0.4;
    }
  }

  // 画面外の安全な歩道に敵をスポーン
  spawnEnemy(type, fixedX = null, fixedY = null) {
    let sx = fixedX, sy = fixedY;

    if (sx === null || sy === null) {
      // プレイヤーから適度に離れた画面端・通り沿いにスポーン
      const p = this.player;
      const angle = Math.random() * Math.PI * 2;
      const dist = 480 + Math.random() * 120;
      sx = p.x + Math.cos(angle) * dist;
      sy = p.y + Math.sin(angle) * dist;

      // 広くなったメインストリート（430〜670）に敵をスポーン
      sy = Math.max(430, Math.min(670, sy));
      sx = Math.max(30, Math.min(this.worldW - 30, sx));
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

  // 敵の行動・AI
  updateEnemies(dt) {
    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // ボニートヒットクールダウン
      if (e.bonitoHitTimer > 0) e.bonitoHitTimer -= dt;

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
        e.x += kbX * dt;
        e.y += kbY * dt;
        e.knockbackVx = Math.abs(kbX * 0.82) < 1 ? 0 : kbX * 0.82;
        e.knockbackVy = Math.abs(kbY * 0.82) < 1 ? 0 : kbY * 0.82;
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

      // 移動
      const vx = dx * e.speed;
      const vy = dy * e.speed;
      if (e.isFlying) {
        // トンビは障害物無視で飛行
        e.x += vx;
        e.y += vy;
      } else {
        this.moveWithCollision(e, vx, vy);
        this.unstuckEntity(e);
      }

      // 敵同士の重なり回避（分離）
      for (let j = 0; j < Math.min(this.enemies.length, 12); j++) {
        const other = this.enemies[j];
        if (other !== e) {
          const sepD = Math.hypot(e.x - other.x, e.y - other.y);
          if (sepD < 24 && sepD > 0.1) {
            e.x += ((e.x - other.x) / sepD) * 0.8;
            e.y += ((e.y - other.y) / sepD) * 0.8;
          }
        }
      }

      // 店主・観光客のビビりリアクション演出
      for (let s of this.npcSpots) {
        if (s.cooldown > 0) s.cooldown -= dt;
        const nDist = Math.hypot(e.x - s.x, e.y - s.y);
        if (nDist < 130 && s.cooldown <= 0) {
          s.cooldown = 2.2 + Math.random() * 2.0;
          const pickType = Math.random() < 0.65 ? 'sweat' : 'exclamation';
          this.addParticle(s.x + (Math.random() - 0.5) * 16, s.y - 35, pickType);
        }
      }

      // プレイヤーへの接触ダメージ判定
      if (dist < 32 && p.invincibleTimer <= 0) {
        if (p.shieldBuffTimer > 0) {
          // わらび餅シールド発動中！ノーダメージ＆敵を弾き返す
          this.sound.playHit();
          this.damageEnemy(e, 30);
          e.x -= dx * 30;
          e.y -= dy * 30;
          for (let s = 0; s < 4; s++) this.addParticle(p.x, p.y, 'spark');
        } else {
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
  }

  // 敵へのダメージ処理（数字ポップアップを廃止し、点滅・揺れ・のけぞり・ヒットスパークで爽快演出！）
  damageEnemy(enemy, amount, fromX = null, fromY = null) {
    enemy.hp -= amount;

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
  }

  // 敵撃破＆ドロップ処理
  defeatEnemy(enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

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
    const maxItems = 3; // 画面上に最大3個まで
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

      this.dropItems.push({
        type: dropType,
        x: enemy.x,
        y: enemy.y,
        life: 20 // 生存時間20秒
      });
      for (let s = 0; s < 6; s++) {
        this.addParticle(enemy.x, enemy.y, dropType === 'coffee' ? 'smoke' : dropType === 'tantan' ? 'spark' : 'confetti');
      }
    }
  }

  // アイテム定期ランダム発生（★適度な出現ペースでハラハラサバイバル！）
  updateRandomItemSpawns(dt) {
    if (!this.firstYankeeEventDone) return; // 戦闘開始前はアイテム自然発生させない！

    if (this.itemSpawnTimer === undefined) this.itemSpawnTimer = 3.0;
    this.itemSpawnTimer -= dt;

    if (this.itemSpawnTimer <= 0) {
      // 次の出現タイマー（6.0〜9.0秒の適正ペース）
      this.itemSpawnTimer = 6.0 + Math.random() * 3.0;

      // フィールド上の最大数は3個
      const maxItems = 3;
      if (this.dropItems && this.dropItems.length >= maxItems) return;

      this.spawnRandomMarketItem();
    }
  }

  spawnRandomMarketItem() {
    const p = this.player;
    const maxItems = 3;

    // 画面全体の上限を超えていたら生成しない
    if (this.dropItems && this.dropItems.length >= maxItems) return;

    // プレイヤーから120〜220px離れた歩道（朝市メイン通り y: 480〜640、x: 100〜1250）
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 100;
    let spawnX = p.x + Math.cos(angle) * dist;
    let spawnY = p.y + Math.sin(angle) * dist;

    // メイン通り沿いにクランプ
    spawnX = Math.max(120, Math.min(this.worldW - 120, spawnX));
    spawnY = Math.max(480, Math.min(650, spawnY));

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
      life: 20 // 20秒で自然消滅
    });

    // ポップ出現のパーティクル
    for (let s = 0; s < 8; s++) {
      this.addParticle(spawnX, spawnY, itemType === 'coffee' ? 'smoke' : itemType === 'tantan' ? 'spark' : 'confetti');
    }
  }

  // ========================================================
  // 7. ドロップアイテム回収（吸い込みなし！プレイヤー直接接触時のみ回収）
  // ========================================================
  updateDropItems(dt) {
    const p = this.player;

    for (let i = this.dropItems.length - 1; i >= 0; i--) {
      const item = this.dropItems[i];
      item.life -= dt;

      const dist = Math.hypot(p.x - item.x, p.y - item.y);

      // ★吸引は完全撤廃！アイテムはその場に静止。
      // プレイヤーと直接接触（当たり判定 dist < 26）した時のみ回収！
      if (dist < 26) {
        this.collectItem(item);
        this.dropItems.splice(i, 1);
        continue;
      }

      if (item.life <= 0) {
        this.dropItems.splice(i, 1);
      }
    }
  }

  // アイテム回収効果（★ユーザー要望：HP回復の過剰を完全是正！回復ではなく援護攻撃・バフに特化！）
  collectItem(item) {
    const p = this.player;

    if (item.type === 'coffee') {
      // ☕ SPICE COFFEE（アイスコーヒー）：HP回復なし！移動速度1.3倍加速バフ ＋ タンデム自転車突進！
      p.speedBuffTimer = 4.5; // 4.5秒間ダッシュ！
      for (let s = 0; s < 8; s++) this.addParticle(p.x, p.y, 'smoke');
      this.addComicPopup(p.x, p.y - 30, '☕ カフェイン加速！', '#38bdf8');
      this.triggerTandemBikeRush();
    } else if (item.type === 'warabi') {
      // 🍡 南蛮屋わらび餅：HP回復はわずか+3（ほんの気持ち程度）！助太刀ネコ出撃 ＋ 接触防御シールド！
      this.sound.playHeal();
      p.hp = Math.min(p.maxHp, p.hp + 3); // わずか+3のみ（過剰回復を防止）
      p.shieldBuffTimer = 3.5; // 3.5秒間シールド展開（敵接触を弾く）
      for (let s = 0; s < 8; s++) this.addParticle(p.x, p.y, 'confetti');
      this.addComicPopup(p.x, p.y - 30, '🍡 助太刀ネコ参上！', '#10b981');
      this.spawnAllyCat();
    } else if (item.type === 'tantan') {
      // 🍜 勝浦タンタン麺：HP回復ゼロ！勝浦神輿軍団の大突進（敵一網打尽）に特化！
      this.sound.playTaiko();
      for (let s = 0; s < 16; s++) this.addParticle(p.x, p.y, 'spark');
      for (let s = 0; s < 8; s++) this.addParticle(p.x, p.y, 'smoke');
      this.triggerMikoshiRush(2); // 神輿2基の迫力編隊大突進！
    }
  }

  // ========================================================
  // 助太刀仲間にゃんこシステム（電光石火の疾風援護：約0.8秒で瞬殺離脱）
  // ========================================================
  spawnAllyCat(specificType = null) {
    const types = ['kuro', 'tora', 'chibi', 'shiro'];
    const type = specificType || types[Math.floor(Math.random() * types.length)];
    const p = this.player;

    // 登場位置（画面左右の外側から音速突入）
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? p.x - 360 : p.x + 360;
    const startY = p.y + (Math.random() - 0.5) * 60;

    const ally = {
      type,
      x: startX,
      y: startY,
      targetX: p.x + (fromLeft ? 65 : -65),
      targetY: p.y,
      dir: fromLeft ? 'right' : 'left',
      state: 'entering', // 'entering' (約0.2s) -> 'acting' (約0.5s) -> 'leaving' (約0.25s)
      stateTimer: 0,
      animTimer: 0,
      animFrame: 0,
      scale: type === 'tora' ? 1.4 : 1.0,
      actTick: 0
    };

    this.allyCats.push(ally);
    this.sound.playMeowRoar();
  }

  updateAllyCats(dt) {
    const p = this.player;

    for (let i = this.allyCats.length - 1; i >= 0; i--) {
      const cat = this.allyCats[i];
      cat.stateTimer += dt;
      cat.animTimer += dt * 14;
      cat.animFrame = Math.floor(cat.animTimer);

      if (cat.state === 'entering') {
        // 音速ダッシュでプレイヤーの近くへ急行（約0.2秒）
        const dx = cat.targetX - cat.x;
        const dy = cat.targetY - cat.y;
        const dist = Math.hypot(dx, dy);
        cat.dir = dx >= 0 ? 'right' : 'left';

        if (dist < 50 || cat.stateTimer > 0.22) {
          cat.state = 'acting';
          cat.stateTimer = 0;
        } else {
          cat.x += (dx / dist) * 1400 * dt;
          cat.y += (dy / dist) * 1400 * dt;
        }
      } else if (cat.state === 'acting') {
        // 凝縮された大技炸裂（0.5秒間）
        this.executeAllyAction(cat, dt);

        if (cat.stateTimer >= 0.50) {
          cat.state = 'leaving';
          cat.stateTimer = 0;
          cat.leaveDirX = cat.dir === 'right' ? 1 : -1;
        }
      } else if (cat.state === 'leaving') {
        // 一瞬で画面外へ音速離脱（約0.25秒）
        cat.x += cat.leaveDirX * 1550 * dt;

        if (Math.abs(cat.x - p.x) > 520 || cat.stateTimer > 0.28) {
          this.allyCats.splice(i, 1);
        }
      }
    }
  }

  executeAllyAction(cat, dt) {
    cat.actTick = (cat.actTick || 0) + dt;

    if (cat.type === 'kuro') {
      // 忍びのクロ：電光石火のチビ爪撃（0.15秒ごとに2本の紫黒光刃で援護）
      if (cat.actTick >= 0.15) {
        cat.actTick = 0;
        this.sound.playSlash();

        for (let a = 0; a < 2; a++) {
          const ang = Math.random() * Math.PI * 2;
          this.projectiles.push({
            type: 'scratch',
            x: cat.x,
            y: cat.y - 12,
            vx: Math.cos(ang) * 580,
            vy: Math.sin(ang) * 580,
            life: 0.28,
            damage: 24,
            penetrate: 2,
            hitEnemies: [],
            isAlly: true
          });
        }
        for (let s = 0; s < 3; s++) this.addParticle(cat.x, cat.y - 10, 'spark');
      }

      // 近接周囲の敵への牽制斬撃
      this.enemies.forEach(e => {
        const d = Math.hypot(e.x - cat.x, e.y - cat.y);
        if (d < 110 && (!e.allyHitTimer || e.allyHitTimer <= 0)) {
          e.allyHitTimer = 0.25;
          this.damageEnemy(e, 22);
          e.stunTimer = 0.5;
        }
      });

    } else if (cat.type === 'tora') {
      // 豪快トラ吉：跳躍から0.18秒でドォォォンと巨大メガスタンプ着地！
      if (cat.stateTimer < 0.18) {
        cat.y -= 220 * dt;
      } else if (!cat.stomped) {
        cat.stomped = true;
        cat.y = this.player.y + 10;
        this.sound.playEnemyDefeat();
        this.sound.playMeowRoar();
        this.screenShake = 0.40;

        const stompRadius = 290;
        this.enemies.forEach(e => {
          const d = Math.hypot(e.x - cat.x, e.y - cat.y);
          if (d <= stompRadius) {
            this.damageEnemy(e, 240);
            e.stunTimer = 2.0;
            const nx = (e.x - cat.x) || 1;
            const ny = (e.y - cat.y) || 0;
            const nd = Math.hypot(nx, ny);
            e.x += (nx / nd) * 85;
            e.y += (ny / nd) * 85;
          }
        });

        this.meowWaves.push({
          x: cat.x,
          y: cat.y,
          currentRadius: 25,
          maxRadius: stompRadius,
          life: 0.45,
          maxLife: 0.45
        });

        for (let s = 0; s < 20; s++) {
          this.addParticle(cat.x, cat.y, 'spark');
          this.addParticle(cat.x, cat.y, 'confetti');
        }
      }

    } else if (cat.type === 'chibi') {
      // 疾風チビ：超高速回転（ギュルンと旋回）しながら全方位に魚雷乱射
      const rotSpeed = 16.0;
      cat.orbitAngle = (cat.orbitAngle || 0) + rotSpeed * dt;
      const orbitR = 120;
      cat.x = this.player.x + Math.cos(cat.orbitAngle) * orbitR;
      cat.y = this.player.y + Math.sin(cat.orbitAngle) * (orbitR * 0.7);

      if (cat.actTick >= 0.08) {
        cat.actTick = 0;
        this.sound.playBoomerang();
        for (let b = 0; b < 2; b++) {
          const shootAng = cat.orbitAngle + (b === 0 ? Math.PI / 2 : -Math.PI / 2);
          this.projectiles.push({
            type: 'scratch',
            x: cat.x,
            y: cat.y,
            vx: Math.cos(shootAng) * 720,
            vy: Math.sin(shootAng) * 720,
            life: 0.40,
            damage: 55,
            penetrate: 99,
            hitEnemies: [],
            isAlly: true
          });
        }
      }

      this.enemies.forEach(e => {
        const d = Math.hypot(e.x - cat.x, e.y - cat.y);
        if (d < 80 && (!e.allyHitTimer || e.allyHitTimer <= 0)) {
          e.allyHitTimer = 0.12;
          this.damageEnemy(e, 65);
          e.stunTimer = 1.0;
        }
      });

    } else if (cat.type === 'shiro') {
      // 神使シロ：瞬時に全体天罰落雷＆スタン、プレイヤーHP全快
      if (!cat.heavensFired) {
        cat.heavensFired = true;
        this.sound.playLevelUp();
        this.screenShake = 0.32;

        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
        this.addDamageNumber(this.player.x, this.player.y - 25, '+40 HP', '#38bdf8');

        this.enemies.forEach(e => {
          this.damageEnemy(e, 150);
          e.stunTimer = 2.0;
          for (let s = 0; s < 2; s++) this.addParticle(e.x, e.y, 'spark');
        });

        this.meowWaves.push({
          x: cat.x,
          y: cat.y,
          currentRadius: 30,
          maxRadius: 420,
          life: 0.5,
          maxLife: 0.5
        });
      }
    }
  }

  // 助太刀仲間にゃんこ描画（文字吹き出し完全撤廃・スタイリッシュなアクションのみ）
  drawAllyCat(ctx, cat) {
    ctx.save();
    ctx.translate(cat.x, cat.y);

    // 足元接地影
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 * cat.scale, 7 * cat.scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 仲間にゃんこのスプライト描画
    if (this.images.cat && this.images.cat.complete && this.images.cat.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      const cell = SPRITES.cat.cell;
      const col = cat.animFrame % 4;
      const row = 1;

      ctx.save();
      if (cat.dir === 'left') ctx.scale(-1, 1);
      ctx.scale(cat.scale, cat.scale);

      if (cat.type === 'kuro') {
        ctx.filter = 'brightness(0.25) contrast(1.6) drop-shadow(0 0 6px #a855f7)';
      } else if (cat.type === 'tora') {
        ctx.filter = 'sepia(0.85) saturate(3.0) hue-rotate(-20deg) contrast(1.2)';
      } else if (cat.type === 'chibi') {
        ctx.filter = 'saturate(0.1) contrast(1.9) brightness(1.1)';
      } else if (cat.type === 'shiro') {
        ctx.filter = 'brightness(1.9) drop-shadow(0 0 8px #fef08a)';
      }

      ctx.drawImage(this.images.cat, col * cell, row * cell, cell, cell, -26, -46, 52, 52);
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
      p.nextExp = Math.round(8 + Math.pow(p.level, 1.75) * 5);

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
        p.hp = Math.min(p.maxHp, p.hp + 30);
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
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      this.particles.push({
        type: 'spark',
        x: p.x,
        y: p.y - 12,
        vx: Math.cos(angle) * 160,
        vy: Math.sin(angle) * 160,
        color: '#fbbf24',
        life: 0.8,
        maxLife: 0.8,
        size: 5
      });
    }

    // レベルアップ時の衝撃波（身近な敵を軽く弾く）
    this.enemies.forEach(e => {
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
    ctx.clearRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    // 画面揺れ（スクリーンシェイク）
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake * 18;
      const sy = (Math.random() - 0.5) * this.screenShake * 18;
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

    ctx.restore();

    // F. 落雷全画面フラッシュ
    this.renderLightningFlash(ctx);

    // H. レベルアップ＆告知バナー（スタイリッシュなネオンテロップ）
    this.renderLevelUpBanner(ctx);

    // I. 初回エンカウントイベント演出カットイン
    this.renderEventCutin(ctx);
  }

  // ストリートファイター6風「HERE COMES A NEW CHALLENGER!」対戦乱入カットイン演出！
  renderEventCutin(ctx) {
    if (this.eventState === 'NONE') return;

    ctx.save();

    const isPeace = this.eventState === 'PEACE';
    const isYankee = this.eventState === 'YANKEE';
    const isKyon = this.eventState === 'KYON';

    const viewW = this.viewW;
    const viewH = this.viewH;

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
      subText = 'オート攻撃でヤンキーを蹴散らし、落とした小判を拾うニャ！';
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

  // 背景マップ描画（平和モード時と戦闘モード時で背景を切り替え！）
  renderMap(ctx) {
    // 平和モード：ヤンキー襲来前は明るい平和な朝市マップ！
    const isPeaceMode = !this.firstYankeeEventDone;
    const targetImg = isPeaceMode
      ? (this.images.mapPeace && this.images.mapPeace.complete && this.images.mapPeace.naturalWidth > 0 ? this.images.mapPeace : this.images.mapHorizontal)
      : (this.images.mapHorizontal && this.images.mapHorizontal.complete && this.images.mapHorizontal.naturalWidth > 0 ? this.images.mapHorizontal : this.images.mapPeace);

    if (targetImg && targetImg.complete && targetImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(targetImg, 0, 0, this.worldW, this.worldH);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, this.worldW, this.worldH);
    }
  }

  // ドロップアイテム描画（超美麗ピクセルアート小判・生カツオ・SPICE COFFEE・わらび餅・金のまたたび）
  renderDropItems(ctx) {
    const now = Date.now();
    this.dropItems.forEach(item => {
      const bob = Math.sin(now / 160 + item.x) * 3.5;
      const ix = item.x;
      const iy = item.y + bob;

      // 地面の影
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.ellipse(item.x, item.y + 10, item.type === 'coin' ? 9 : 14, item.type === 'coin' ? 4 : 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (item.type === 'coin') {
        // ★本物の江戸黄金小判（刻印・打目・ハイライト光沢！）
        ctx.save();
        const isBig = item.val >= 10;
        const kw = isBig ? 12 : 8;
        const kh = isBig ? 18 : 13;

        // 1. 小判本体（山吹色〜黄金の立体感）
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(ix, iy, kw, kh, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. 内側のゴールドハイライト面
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(ix - 1, iy - 1, kw - 2.5, kh - 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. 小判特有の茣蓙目（打目模様ライン）
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix - kw + 3, iy - 4); ctx.lineTo(ix + kw - 3, iy - 4);
        ctx.moveTo(ix - kw + 2, iy);     ctx.lineTo(ix + kw - 2, iy);
        ctx.moveTo(ix - kw + 3, iy + 4); ctx.lineTo(ix + kw - 3, iy + 4);
        ctx.stroke();

        // 4. 中央の刻印「壱」
        ctx.fillStyle = '#78350f';
        ctx.fillRect(ix - 2, iy - 1, 4, 1.5);

        // 5. 左上のキラリ光沢ハイライト
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ix - kw/2, iy - kh/2 + 2, isBig ? 2.5 : 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (item.type === 'matatabi') {
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
    });
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

  // Yソート立体レンダリング
  renderYSortedEntities(ctx) {
    const list = [];

    // 敵
    this.enemies.forEach(e => {
      list.push({
        y: e.y,
        draw: () => this.drawEnemy(ctx, e)
      });
    });

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

  // プレイヤー描画（三毛猫ミケ：向き・走りモーション・反転完全対応）
  drawPlayer(ctx) {
    const p = this.player;
    ctx.save();

    // 走っているときの上下ボブ（ピョンピョン跳ねるリズミカルな上下運動）
    let hopY = 0;
    let tilt = 0;
    const isMoving = !!p.isMoving;

    if (isMoving) {
      // 走る時のリズミカルなボブ
      hopY = -Math.abs(Math.sin(p.animTimer * Math.PI)) * (p.isDashing ? 5 : 3.5);
      // 前傾姿勢・傾き
      if (p.dir === 'left' || p.dir === 'right') {
        tilt = p.facing * (p.isDashing ? 0.12 : 0.06);
      } else {
        tilt = Math.sin(p.animTimer * Math.PI) * 0.05;
      }
    }

    ctx.translate(p.x, p.y + hopY);
    ctx.rotate(tilt);

    // 足元接地影（ジャンプで浮いたときは影が小さく薄くなる）
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    const shadowScale = Math.max(0.65, 1 - Math.abs(hopY) / 14);
    ctx.ellipse(0, -hopY * 0.5, 20 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // わらび餅バリアシールド（回転する金色の円環）
    if (p.shieldBuffTimer > 0) {
      const rot = Date.now() / 200;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -18, 34, rot, rot + Math.PI * 1.5);
      ctx.stroke();
    }

    // コーヒー爆速湯気エフェクト
    if (p.speedBuffTimer > 0 && Math.random() < 0.35) {
      this.addParticle(p.x + (Math.random() - 0.5) * 16, p.y - 12, 'smoke');
    }

    // 点滅（被弾無敵）
    if (p.invincibleTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.restore();
      return;
    }

    // ネコスプライト描画
    if (this.images.cat && this.images.cat.complete && this.images.cat.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      const cell = SPRITES.cat.cell; // 256
      let row = 0;
      let col = 0;

      // 向きと走りモーションの完全マッピング！
      if (p.scratchAnimTimer > 0) {
        // ひっかき攻撃ポーズ！（前足を突き出して鋭い爪を光らせる！ Row 3 Col 2）
        row = 3;
        col = 2;
      } else if (p.dir === 'up') {
        // 後ろ姿（唐草風呂敷）: Row 2 Col 1 と Row 3 Col 1 を交互に足踏み
        col = 1;
        row = (isMoving && Math.floor(p.animTimer * 2) % 2 === 1) ? 3 : 2;
      } else if (p.dir === 'down') {
        // 正面（笑顔）: Row 2 Col 0 と Row 3 Col 0 を交互に足踏み
        col = 0;
        row = (isMoving && Math.floor(p.animTimer * 2) % 2 === 1) ? 2 : 3;
      } else {
        // 左右の横向き！
        if (isMoving) {
          // 激走ダッシュアニメーション（Row 1: Col 0〜3 の4コマ）
          row = 1;
          col = p.animFrame % 4;
        } else {
          // 立ち姿（Row 0 Col 0）
          row = 0;
          col = 0;
        }
      }

      ctx.save();
      // 向き反転（左向きの時は左右反転！）
      if (p.dir === 'left' || (p.dir !== 'right' && p.facing === -1)) {
        ctx.scale(-1, 1);
      }

      // 静止時のやわらか呼吸アニメーション
      if (!isMoving) {
        const breathe = 1 + Math.sin(Date.now() / 320) * 0.025;
        ctx.scale(1, breathe);
      }

      // ドット絵描画（256x256 から 52x52 にスケール）
      ctx.drawImage(this.images.cat, col * cell, row * cell, cell, cell, -26, -46, 52, 52);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-18, -36, 36, 36);
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
      shakeX = (Math.random() - 0.5) * 8.0;
      shakeY = (Math.random() - 0.5) * 5.5;
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

    // 3. 被弾ホワイトフラッシュ・白熱点滅
    const isHitFlashing = (e.hitFlashTimer > 0);
    if (isHitFlashing) {
      ctx.filter = 'brightness(3.2) contrast(1.4)';
    } else if (e.stunTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.filter = 'brightness(2.0)';
    }

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
        ctx.fillStyle = e.color;
        ctx.fillRect(-16, -42, 32, 42);
      }
    }

    // 4. 被弾ヒットインパクトの閃光（Hit Spark & Slash Impact）
    if (isHitFlashing) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 12;

      // 十字閃光
      const sparkR = e.isBoss ? 26 : 16;
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

        ctx.shadowColor = mainColor;
        ctx.shadowBlur = isKitten ? 4 : 6;

        // シャープで洗練された猫爪痕（親ミケは0.72で範囲狭くスマート、子ミケは0.38でさらに小さく可愛い！）
        const scale = isKitten ? 0.38 : (isAlly ? 0.65 : 0.72);
        const bladeOffsets = [-4.5 * scale, 0, 4.5 * scale];
        bladeOffsets.forEach((offY, idx) => {
          const arcLen = (idx === 1 ? 14 : 11) * scale;

          // 外側オーラブレード
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
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;

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
        // 七輪の紅蓮大火球
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;

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
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
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
    // ダメージ数字
    this.damageNumbers.forEach(d => {
      ctx.save();
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = d.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      ctx.textAlign = 'center';
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    });

    // パーティクル
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
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
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });


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
        const lineLen = 45 + Math.random() * 35;
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
        const lineLen = 50 + Math.random() * 40;
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

      // 稲妻ボルトの閃光ライン
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        let lx = (i + 1) * (this.viewW / 4) + (Math.random() - 0.5) * 60;
        let ly = 0;
        ctx.moveTo(lx, ly);
        while (ly < this.viewH) {
          lx += (Math.random() - 0.5) * 50;
          ly += 30 + Math.random() * 40;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
      ctx.restore();

      this.lightningFlashTimer -= 0.016;
    }
  }

  // レベルアップ＆告知バナー描画（画面上部中央の豪華ネオンテロップ）
  renderLevelUpBanner(ctx) {
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
    let vy = (Math.random() - 0.5) * 2;
    if (type === 'smoke') vy = -1.4 - Math.random();
    if (type === 'sweat' || type === 'exclamation') vy = -1.6 - Math.random() * 0.8;

    this.particles.push({
      x, y,
      type,
      vx: (Math.random() - 0.5) * (type === 'confetti' ? 4 : 1.2),
      vy,
      size: type === 'smoke' ? 6 : 3,
      alpha: 1.0,
      color: type === 'confetti' ? ['#fbbf24', '#38bdf8', '#ef4444', '#10b981'][Math.floor(Math.random()*4)] :
             type === 'spark' ? '#fde047' : '#94a3b8'
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= dt * 2.2;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  addDamageNumber(x, y, text, color = '#f8fafc') {
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

    // クリアまで残り時間タイマー表示（生存時間ではなくカウントダウン！）
    const timerDisplay = document.getElementById('timer-display');
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

    // 小判
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) scoreDisplay.textContent = `💰 ${this.gold}`;
  }

  // ゲーム終了（クリア or ゲームオーバー）
  endGame(isClear = false) {
    this.state = 'RESULT';
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
      if (headline) headline.textContent = '🎉 勝浦朝市平和奪還！完全勝利！！';
      if (starRating) starRating.textContent = '★★★★★';
      if (rankTitle) rankTitle.textContent = '勝浦朝市 伝説の守護神大明神猫';
      if (endingBanner) endingBanner.classList.remove('hidden');
      if (gameoverBanner) gameoverBanner.classList.add('hidden');
      if (restartBtn) restartBtn.textContent = 'もう一度朝市を守るニャ！（REPLAY）';
    } else {
      if (headline) headline.textContent = '💀 ミケ力尽きる…ゲームオーバー';
      if (starRating) starRating.textContent = this.survivalTime > 60 ? '★★★' : '★';
      if (rankTitle) {
        if (this.survivalTime > 100) rankTitle.textContent = '勇敢なる朝市パトロール隊長';
        else if (this.survivalTime > 50) rankTitle.textContent = '駆け出しの元気な看板猫';
        else rankTitle.textContent = '朝寝坊ののんびり子猫';
      }
      if (endingBanner) endingBanner.classList.add('hidden');
      if (gameoverBanner) gameoverBanner.classList.remove('hidden');
      if (restartBtn) restartBtn.textContent = 'もう一度リベンジするニャ！';
    }

    document.getElementById('final-survival-time').textContent = timeStr;
    document.getElementById('final-ko-count').textContent = `${this.killCount} 体`;
    document.getElementById('final-level').textContent = `LV. ${this.player.level}`;
    document.getElementById('final-score').textContent = `💰 ${this.gold}`;

    resultOverlay?.classList.remove('hidden');
  }
}

// 起動
window.addEventListener('load', () => {
  window.game = new AsaichiGame();
});
