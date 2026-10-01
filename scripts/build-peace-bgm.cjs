'use strict';
// 朝市メロディの正本。mono / 44.1kHzのWAVを生成し、afconvertでAACへ変換する。
const fs = require('node:fs');
const target = process.argv[2];
if (!target) throw new Error('WAVの保存先を指定してください');
class PeaceComposer {
  constructor() { this.ctx = { sampleRate:44100, createBuffer(_, length) {
    const data = new Float32Array(length); return { getChannelData:() => data };
  } }; }
  createPeaceBgmBuffer() {
    const rate = this.ctx.sampleRate;
    const melody = [
      [440, .22], [493.88, .22], [554.37, .22], [659.25, .44],
      [554.37, .22], [493.88, .22], [440, .44], [0, .22],
      [659.25, .22], [739.99, .22], [880, .44], [739.99, .22],
      [659.25, .22], [554.37, .44], [440, .44], [0, .22]
    ];
    const lengths = melody.map(([, duration]) => Math.round(duration * rate));
    const buffer = this.ctx.createBuffer(1, lengths.reduce((a, b) => a + b, 0), rate);
    const data = buffer.getChannelData(0);
    let offset = 0;
    melody.forEach(([frequency, duration], index) => {
      const length = lengths[index];
      if (frequency > 0) {
        const leadLength = Math.round(duration * .85 * rate);
        const bassLength = Math.round(duration * .9 * rate);
        const leadDecay = Math.pow(.0001 / .035, 1 / leadLength);
        const bassDecay = Math.pow(.0001 / .040, 1 / bassLength);
        let leadGain = .035, bassGain = .040;
        for (let i = 0; i < length; i++) {
          const phase = i * frequency / rate;
          // 高域の倍音を抑えた矩形波と三角波。先頭3msは立ち上げてクリックを防ぐ。
          let square = 0;
          for (let harmonic = 1; harmonic <= 5; harmonic += 2) {
            if (frequency * harmonic < rate / 2) square += Math.sin(phase * Math.PI * 2 * harmonic) / harmonic;
          }
          const bassPhase = phase / 2;
          const triangle = 1 - 4 * Math.abs((bassPhase % 1) - .5);
          const attack = Math.min(1, i / (rate * .003));
          data[offset + i] = attack * ((i < leadLength ? square * (4 / Math.PI) * leadGain : 0) +
            (i < bassLength ? triangle * bassGain : 0));
          leadGain *= leadDecay;
          bassGain *= bassDecay;
        }
      }
      offset += length;
    });
    this.peaceBgmBuffer = buffer;
    return buffer;
  }

}
const pcm = new PeaceComposer().createPeaceBgmBuffer().getChannelData(0);
const wav = Buffer.alloc(44 + pcm.length*2);
wav.write('RIFF',0); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
wav.writeUInt32LE(44100,24); wav.writeUInt32LE(88200,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34);
wav.write('data',36); wav.writeUInt32LE(pcm.length*2,40);
for(let i=0;i<pcm.length;i++) wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),44+i*2);
fs.writeFileSync(target,wav);
console.log(`Peace melody: ${pcm.length/44100}s, ${wav.length} bytes`);
