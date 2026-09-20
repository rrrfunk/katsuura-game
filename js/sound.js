/**
 * 勝浦朝市サバイバー！ - サウンドシステム
 * 8-bit Web Audio API 合成シンセサイザー
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
