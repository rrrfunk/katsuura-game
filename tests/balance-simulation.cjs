'use strict';
// 実ゲームの更新処理を固定乱数・30fpsで走らせ、同じ移動方針で回収有無を比較する。
// 描画・音声を省略した自動操作の比較であり、人のクリア率や実機FPSの測定ではない。
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const node = () => ({ classList: { toggle() {}, add() {}, remove() {}, contains: () => true },
  style: {}, getContext: () => ({}), querySelector: () => null, textContent: '', width: 880, height: 495 });
const nodes = new Map();
let seed = 1;
const math = Object.create(Math);
math.random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed / 4294967296; };
const c = vm.createContext({ console, Math: math, performance, Image: class {},
  window: { addEventListener() {}, screen: { width: 1440, height: 900 }, matchMedia: () => ({ matches:false }) },
  navigator: { maxTouchPoints: 0 }, document: { hidden: false, body: node(), getElementById(id) { if(!nodes.has(id)) nodes.set(id,node());return nodes.get(id); } },
  SoundSystem: class { constructor() { return new Proxy({}, {get:()=>()=>{}}); } },
  setTimeout:()=>1, clearTimeout() {}, requestAnimationFrame() {} });
for(const file of ['balance.js','constants.js','enemy-tactics.js','kimie.js','game.js']) vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),c);
vm.runInContext('AsaichiGame.prototype.initEvents=function(){};AsaichiGame.prototype.loadAssets=function(){this.assetsLoaded=true};this.Game=AsaichiGame;',c);
function clearPath(g,a,b) {
  const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/18);
  for(let i=1;i<=n;i++) if(!g.isPointWalkable(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;
  return true;
}
function simulate(seedValue, collect) {
  seed=seedValue;
  const g=new c.Game();g.startGame();
  let pickups=0,peak=0,heading=1,headingY=0;
  const realCollect=g.collectItem.bind(g);g.collectItem=item=>{pickups++;realCollect(item);};
  // 比較対象は同じ敵・アイテム発生処理。無視する側だけ拾える距離でも取得しない。
  if(!collect) g.collectItem=()=>{};
  const start=performance.now();
  for(let tick=0;tick<30*220 && g.state==='PLAYING';tick++) {
    const p=g.player;
    if(tick%3===0) {
      let target=null;
      if(collect && g.dropItems.length) target=g.dropItems.reduce((best,it)=>!best||Math.hypot(it.x-p.x,it.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?it:best,null);
      if(target && !clearPath(g,p,target)) target={x:p.y<535?p.x:target.x,y:590};
      let best=-Infinity,move={x:0,y:0};
      for(let i=0;i<16;i++) {
        const angle=i*Math.PI/8,dx=Math.cos(angle),dy=Math.sin(angle);
        const q={x:p.x+dx*48,y:p.y+dy*48};
        if(q.x<30||q.x>g.worldW-30||!clearPath(g,p,q))continue;
        let score=target ? (Math.hypot(p.x-target.x,p.y-target.y)-Math.hypot(q.x-target.x,q.y-target.y))*1.8 : (dx*heading+dy*headingY)*20;
        for(const e of g.enemies) {
          const d=Math.hypot(q.x-e.x,q.y-e.y);
          if(d<130) score-=(130-d)*1.5;
        }
        // 壁ぎわで反転し続けないよう、移動継続方向を少し優先。
        score+=(dx*heading+dy*headingY)*4;
        if(score>best){best=score;move={x:dx,y:dy};}
      }
      g.joystickVector=move;heading=move.x;headingY=move.y;
    }
    // 手動で進めるカットインを、自動操作でも待ち時間後に一枚ずつ確認する。
    if (g.eventState !== 'NONE' && g.eventLockoutTimer <= 0) g.continueCutin();
    if (g.assistCutin && g.assistCutin.lockoutTimer <= 0) g.continueCutin();
    g.update(1/30);peak=Math.max(peak,g.enemies.length);
  }
  return {seed:seedValue,policy:collect?'collect':'ignore',clear:g.isVictoryClear,hp:g.player.hp,time:+g.survivalTime.toFixed(1),kills:g.killCount,level:g.player.level,pickups,peakEnemies:peak,bossHp:g.enemies.find(e=>e.isFinalBoss)?.hp??null,ms:Math.round(performance.now()-start)};
}
const seeds=process.argv.slice(2).map(Number);if(!seeds.length)seeds.push(11,29,47,83,101,157);
for(const n of seeds)for(const collect of [true,false]) console.log(JSON.stringify(simulate(n,collect)));
