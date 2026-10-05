import {Sound,DangerMusic} from './sound.js';
import {Camera,mini} from './camera.js';
import {Game,W,H,points,obstacles,jail,RESCUE_POINT,WORLD_W,WORLD_H,sightPolygon} from './engine.js';
const $=id=>document.getElementById(id),canvas=$('park'),ctx=canvas.getContext('2d');
let game=new Game(),selectedTime=60,active=false,paused=false,last=0,soundOn=true,audio,beatAt=0,eventIndex=0,toastUntil=0;
const sound=new Sound();let music=new DangerMusic();
const camera=new Camera();camera.center(game.controlled.x,game.controlled.y);
const viewSettings={showVision:true}; // Future difficulty modes can turn off the cone.
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function unlock(){sound.unlock();audio=sound.ctx;}
function tone(freq,duration=.12,volume=.035,type='sine',delay=0){if(!audio||!soundOn||audio.state!=='running')return;const t=audio.currentTime+delay,osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.45),t+duration);gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.012);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+duration+.02);}
function start(){sound.start();music=new DangerMusic();unlock();game=new Game(selectedTime);camera.follow=true;camera.center(game.controlled.x,game.controlled.y);active=true;paused=false;eventIndex=0;beatAt=0;toastUntil=0;$('startPanel').hidden=true;$('resultPanel').hidden=true;$('pause').disabled=false;$('pause').textContent='一時停止';$('hint').textContent='光る場所をタップして移動';tone(420,.2);updateUI();}
function go(p){if(!active||paused)return;if(game.move(game.controlledId,p)){tone(510,.07,.02);$('hint').textContent=points[p].name+'へ移動中…';}else if(game.controlled.state==='moving'){showToast('移動が終わったら、次の場所を選ぼう');}}
function showToast(text){$('hint').textContent=text;toastUntil=game.elapsed+3;}
$('start').onclick=start;$('again').onclick=start;$('back').onclick=()=>{active=false;sound.stop();$('resultPanel').hidden=true;$('startPanel').hidden=false;$('pause').disabled=true;game=new Game(selectedTime);updateUI();};
for(const b of document.querySelectorAll('[data-time]'))b.onclick=()=>{selectedTime=+b.dataset.time;document.querySelectorAll('[data-time]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));game=new Game(selectedTime);updateUI();};
$('sound').onclick=()=>{soundOn=!soundOn;sound.setEnabled(soundOn);if(soundOn)unlock();$('sound').textContent=soundOn?'♪ ON':'♪ OFF';$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'音を切る':'音を出す');};
function pause(){if(!active||game.state==='ended')return;paused=!paused;if(paused)sound.pause();else sound.resume();$('pause').textContent=paused?'再開 ▶':'一時停止';$('hint').textContent=paused?'一時停止中': '光る場所をタップして移動';if(!paused)unlock();}
$('pause').onclick=pause;document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused&&game.state==='playing')pause();});
points.forEach((p,i)=>{const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>{go(i);document.querySelector('details').open=false;document.querySelector('header').scrollIntoView({block:'start',behavior:'auto'});};$('locations').append(b);});
let drag=null;
canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,sx:(e.clientX-r.left)*W/r.width,sy:(e.clientY-r.top)*H/r.height};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(drag.moved){camera.pan((drag.lastX-e.clientX)*W/r.width,(drag.lastY-e.clientY)*H/r.height);drag.lastX=e.clientX;drag.lastY=e.clientY;}});
canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('pointerup',e=>{if(!drag)return;const gesture=drag;drag=null;if(gesture.moved)return;
 const r=canvas.getBoundingClientRect(),sx=(e.clientX-r.left)*W/r.width,sy=(e.clientY-r.top)*H/r.height;
 if(sx>=mini.x&&sx<=mini.x+mini.w&&sy>=mini.y&&sy<=mini.y+mini.h){camera.follow=false;camera.center((sx-mini.x)/mini.w*WORLD_W,(sy-mini.y)/mini.h*WORLD_H);return;}
 const p=camera.world(sx,sy);let closest=-1,d=Infinity;points.forEach((n,i)=>{const screen=camera.screen(n.x,n.y);if(screen.x<0||screen.x>W||screen.y<0||screen.y>H)return;const nd=Math.hypot(n.x-p.x,n.y-p.y);if(nd<d){d=nd;closest=i;}});
 if(d<Math.max(30,22*W/r.width))go(closest);
});
function resumeFollow(){camera.follow=true;showToast('青い帽子を追いかける');}
$('follow').onclick=resumeFollow;
$('follow').onpointerup=e=>{e.preventDefault();resumeFollow();};
function updateUI(){if(sound.failed)$('sound').textContent='♪ 再読込';const c=game.controlled,prisoners=game.characters.filter(c=>c.state==='captured').length,focused=game.focus.remaining>0;
 $('clock').textContent=`${Math.floor(Math.ceil(game.remaining)/60)}:${String(Math.ceil(game.remaining)%60).padStart(2,'0')}`;
 $('clock').style.color=game.remaining<=10&&active?'#ff9e8b':'';
 $('members').replaceChildren(...game.characters.map((member,i)=>{const s=document.createElement('span');s.textContent=member.state==='captured'?'×':'●';s.style.color=member.state==='captured'?'#aa8492':i===game.controlledId?'#77d7f9':'#f7ce84';s.title=member.state==='captured'?'牢屋にいる':i===game.controlledId?'操作中':'逃げている';return s;}));
 $('danger').textContent=paused?'おやすみ中':!active?'かくれよう':focused?'！危機スロー':c.state==='spotted'?'見つかった！':game.danger>.59?'鬼がこっちを…':prisoners?`牢屋に${prisoners}人`:'鬼を見て隠れよう';
 $('danger').style.color=focused||game.danger>.59?'#ff9e8b':'';
 $('status').textContent=paused?'一時停止中':c.state==='captured'?'みんな捕まった…':c.state==='spotted'?'見つかった！ 鬼がこちらへ来る…':c.state==='moving'?`青い帽子${c.id?`（仲間${c.id}）`:''}が移動中`:c.point===RESCUE_POINT?(prisoners?'鬼を見て、入り直すと救出できる':'牢屋の前 · 仲間はみんな自由！'):`◌ ${points[c.point].name} · 操作${c.id?`：仲間${c.id}`:'：あなた'}`;
 [...$('locations').children].forEach((b,i)=>{b.disabled=!active||paused||['captured','spotted'].includes(c.state)||c.route.length&&!game.focus.redirect||c.point===i;b.textContent=i===RESCUE_POINT?(prisoners?`→ 仲間${prisoners}人をたすける`:'→ 牢屋の前'):points[i].name;});
 $('vignette').style.opacity=active&&!paused?(focused?.85:game.danger*.72):0;
 $('focusLabel').hidden=!active||paused||!focused;
 $('focusLabel').textContent=game.focus.redirect?'！見つかりそう · 行き先を選べる':'！見つかりそう · じっと見よう';
 if(active&&!paused&&toastUntil<game.elapsed&&c.state==='hidden')$('hint').textContent=prisoners?'光る牢屋の前へ行くと、全員救出':game.danger>.5?'動く？ それとも、ここで待つ？':'光る場所をタップして移動';
}
function end(){active=false;sound.finish();$('pause').disabled=true;const r=game.result;$('resultTitle').textContent=r.survivors?'逃げきった！':'みんな捕まった…';$('playerResult').textContent=r.survivors?`仲間をたすけた回数：${r.rescues}回`:'次は、鬼が離れたら牢屋へ行こう。';$('resultStats').innerHTML=`<div><strong>${r.survivors}</strong>逃げきった人数</div><div><strong>${r.caught}</strong>捕まった人数</div><div><strong>${r.duration/60}分</strong>選んだ時間</div>`;$('resultPanel').hidden=false;tone(r.survivors?520:180,.3);}
// All artwork is drawn locally. No image, font, analytics or network dependencies.
function rect(x,y,w,h,fill,r=0){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function circle(x,y,r,fill){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function line(x,y,x2,y2,color,width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function text(str,x,y,size=11,color='#f6e4b4'){ctx.font=`600 ${size}px system-ui,sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(str,x,y);}
function bush(x,y){circle(x-17,y+3,16,'#384d43');circle(x+14,y+4,18,'#425448');circle(x,y-9,21,'#52644b');circle(x-5,y-12,10,'#657451');circle(x+12,y-5,8,'#687654');}
function equipment(o){const {x,y,w,h,type}=o;rect(x+6,y+8,w,h,'#30333455',9);if(type==='tree'){rect(x+w*.45,y+h*.45,8,h*.6,'#71513d',3);circle(x+w/2-10,y+h*.48,w*.38,'#3d4b40');circle(x+w/2+9,y+h*.4,w*.38,'#46563f');circle(x+w/2,y+h*.22,w*.4,'#66704a');circle(x+w/2-5,y+h*.1,w*.23,'#798055');}
 if(type==='slide'){rect(x,y,w,h,'#626152',9);line(x+15,y+10,x+15,y+60,'#e5bb82',5);line(x+35,y+10,x+35,y+60,'#e5bb82',5);for(let i=0;i<5;i++)line(x+15,y+15+i*10,x+35,y+15+i*10,'#aa9876',3);rect(x+36,y+9,48,23,'#cc9666',4);rect(x+48,y+32,30,35,'#84aaa1',3);line(x+48,y+32,x+48,y+66,'#cbd2ad',3);line(x+78,y+32,x+78,y+66,'#cbd2ad',3);text('滑り台',x+w/2,y-8,11);}
 if(type==='swing'){line(x+5,y+8,x+w-5,y+8,'#9a8471',6);for(let i=0;i<2;i++){const bx=x+29+i*49;line(bx-9,y+8,bx-9,y+39,'#dab994',2);line(bx+9,y+8,bx+9,y+39,'#dab994',2);rect(bx-13,y+36,26,11,'#a65f50',3);}circle(x+5,y+8,5,'#d4bd92');circle(x+w-5,y+8,5,'#d4bd92');text('ブランコ',x+w/2,y-8,11);}
 if(type==='toilet'){rect(x,y,w,h,'#a39b81',6);rect(x-4,y-4,w+8,72,'#656778',6);for(let i=0;i<5;i++)line(x+4,y+6+i*13,x+w-4,y+6+i*13,'#77788a',2);rect(x+19,y+73,24,27,'#454a51',3);rect(x+52,y+73,22,27,'#454a51',3);text('WC',x+w/2,y+42,21,'#e8d8bc');text('トイレ',x+w/2,y-13,11);}
 if(type==='bench'){rect(x,y,w,h,'#9f7354',4);line(x+4,y+7,x+w-4,y+7,'#c79b6d',2);line(x+4,y+15,x+w-4,y+15,'#c79b6d',2);rect(x+9,y+h,6,7,'#474941');rect(x+w-15,y+h,6,7,'#474941');text('ベンチ',x+w/2,y-8,11);}}
function character(c){const isPlayer=c.id===game.controlledId,cap=c.state==='captured',color=isPlayer?'#66d5f6':['#f5c47a','#d7a3d1','#b9d487','#f1a58d'][c.id%4];ctx.save();ctx.globalAlpha=cap?.8:1;const {x,y}=c;ctx.fillStyle='#252b3d66';ctx.beginPath();ctx.ellipse(x+3,y+9,11,5,0,0,Math.PI*2);ctx.fill();line(x-3,y+6,x-5,y+13,'#332e40',3);line(x+3,y+6,x+5,y+13,'#332e40',3);rect(x-7,y-2,14,12,color,4);line(x-7,y+1,x-10,y+6,'#d8af87',3);line(x+7,y+1,x+10,y+6,'#d8af87',3);circle(x,y-7,7,'#efc49d');rect(x-8,y-14,16,6,color,4);if(isPlayer){rect(x+3,y-10,8,3,'#baeefa',2);text(cap?'牢屋':'操作中',x,y-22,10,'#bdefff');}else text(String(c.id),x,y-22,10,color);
 if(c.deniedUntil>game.elapsed){text('だれかいる！',x,y-40,11,'#ffe5a3');}if(c.state==='spotted'){circle(x,y-34,10,'#f8da93');text('!',x,y-30,15,'#8f423e');}if(cap){circle(x,y,17,'#24213177');text('×',x,y+5,23,'#f7c3ad');}ctx.restore();}
function oni(o){const {x,y}=o;ctx.save();if(viewSettings.showVision){ctx.fillStyle=o.mode==='chase'?'#ed835127':'#efca7e13';ctx.beginPath();sightPolygon(o).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.strokeStyle='#f5c48b30';ctx.lineWidth=1;ctx.stroke();}ctx.restore();ctx.fillStyle='#24203877';ctx.beginPath();ctx.ellipse(x+4,y+12,16,6,0,0,7);ctx.fill();line(x-5,y+6,x-8,y+16,'#4b3440',5);line(x+5,y+6,x+8,y+16,'#4b3440',5);rect(x-11,y-2,22,13,'#dbc078',4);for(let i=0;i<3;i++)line(x-8+i*7,y+1,x-5+i*7,y+7,'#524231',3);line(x-10,y-3,x-15,y+5,'#c55751',5);line(x+10,y-3,x+15,y+5,'#c55751',5);circle(x,y-11,12,'#e77663');circle(x-5,y-18,7,'#673641');circle(x+4,y-19,7,'#673641');for(const dx of [-7,7]){ctx.beginPath();ctx.moveTo(x+dx-4,y-20);ctx.lineTo(x+dx,y-30);ctx.lineTo(x+dx+4,y-20);ctx.fillStyle='#efd19b';ctx.fill();}circle(x-4,y-12,2,'#382939');circle(x+4,y-12,2,'#382939');line(x-4,y-4,x+4,y-4,'#fff0c2',3);if(game.focus.remaining>0&&o===game.dangerousOni){ctx.strokeStyle='#f5da95';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.stroke();}const ax=x+Math.cos(o.angle)*23,ay=y+Math.sin(o.angle)*23;circle(ax,ay,3,'#ffe2aa');text(`鬼${o.id+1}`,x,y-37,11,'#ffc2a1');if(o.mode==='search')text('…？',x+22,y-24,15,'#ffe4a9');}
function drawJail(){const count=game.characters.filter(c=>c.state==='captured').length,flash=game.elapsed<game.rescueFlashUntil;
 rect(jail.x,jail.y,jail.w,jail.h,flash?'#ebd99890':'#443945bb',7);
 ctx.strokeStyle=count?'#e7a979':'#97867c';ctx.lineWidth=2;ctx.strokeRect(jail.x,jail.y,jail.w,jail.h);
 for(let x=jail.x+13;x<jail.x+jail.w;x+=16)line(x,jail.y+3,x,jail.y+jail.h-3,count?'#b69a7d':'#87796e',2);
 text(flash?'たすけた！':count?`牢屋 · ${count}人`:'鬼の牢屋',jail.x+jail.w/2,jail.y-8,11,flash?'#fff8bc':'#f2d1a6');
}
function drawMapHUD(){
 rect(mini.x-4,mini.y-19,mini.w+8,mini.h+24,'#242435dc',8);text('全体 · タップで見る',mini.x+mini.w/2,mini.y-7,8,'#dbc9ab');rect(mini.x,mini.y,mini.w,mini.h,'#707b54',3);
 const px=x=>mini.x+x/WORLD_W*mini.w,py=y=>mini.y+y/WORLD_H*mini.h;
 obstacles.forEach(o=>rect(px(o.x),py(o.y),o.w/WORLD_W*mini.w,o.h/WORLD_H*mini.h,'#434e42'));
 points.forEach(p=>circle(px(p.x),py(p.y),1.5,p.rescue?'#f6e4a0':'#d4c99a'));
 game.characters.forEach(c=>circle(px(c.x),py(c.y),c.id===game.controlledId?3:2,c.state==='captured'?'#a48ca5':c.id===game.controlledId?'#84e3ff':'#f4c581'));
 game.onis.forEach(o=>circle(px(o.x),py(o.y),3,'#ff8775'));ctx.strokeStyle='#dbe8d4';ctx.lineWidth=1;ctx.strokeRect(px(camera.x),py(camera.y),W/WORLD_W*mini.w,H/WORLD_H*mini.h);
 for(const oni of game.onis){const o=camera.screen(oni.x,oni.y);if(o.x<20||o.x>W-20||o.y<45||o.y>H-40){const x=Math.max(18,Math.min(W-18,o.x)),y=Math.max(48,Math.min(H-36,o.y));circle(x,y,13,'#603641dd');text(`鬼${oni.id+1}`,x,y+4,11,'#ffc39c');}}
 $('follow').hidden=camera.follow;
}
function draw(t){ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,W,H);ctx.save();if(!reduced&&active&&!paused&&game.danger>.8){ctx.translate(Math.sin(t*28)*.7,Math.cos(t*24)*.5);}ctx.translate(-camera.x,-camera.y);const bg=ctx.createLinearGradient(0,0,WORLD_W,WORLD_H);bg.addColorStop(0,'#9b8e60');bg.addColorStop(.5,'#767d55');bg.addColorStop(1,'#555c4e');ctx.fillStyle=bg;ctx.fillRect(0,0,WORLD_W,WORLD_H);
 // park wall, looping footpath and small scenery
 rect(12,49,WORLD_W-24,WORLD_H-66,'#424b4355',18);rect(20,57,WORLD_W-40,WORLD_H-83,'#75805b',13);ctx.strokeStyle='#b9a280';ctx.lineWidth=30;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(260,779);ctx.lineTo(218,310);ctx.lineTo(145,310);ctx.lineTo(145,80);ctx.lineTo(252,80);ctx.lineTo(252,310);ctx.lineTo(505,310);ctx.lineTo(505,731);ctx.lineTo(145,731);ctx.stroke();ctx.strokeStyle='#baa78555';ctx.lineWidth=1;ctx.stroke();
 for(let i=0;i<140;i++){const x=24+(i*73%(WORLD_W-51)),y=68+(i*113%(WORLD_H-108));line(x,y,x+2,y-4,'#d4c38b22',1);}
 rect(12,36,WORLD_W-24,11,'#514e51',3);for(let x=18;x<WORLD_W-15;x+=18)rect(x,24,3,27,'#6c6260',1);text('夕暮れ公園',210,24,12,'#f9d8a6');rect(222,774,75,23,'#baa785',3);text('入口',260,790,10,'#5c574d');bush(53,275);bush(229,111);bush(135,637);text('北の林',455,50,14,'#e8cca0');text('芝生ひろば',290,565,14,'#ebd1a5');text('休憩エリア',195,695,12,'#e8cca0');
 line(252,80,505,80,'#b9a280',22);line(260,431,260,735,'#baa785',24);line(145,637,260,637,'#baa785',20);
 // Movement routes preview while walking.
 const player=game.controlled;if(player.route.length){ctx.setLineDash([3,6]);ctx.strokeStyle='#b3e6e78c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(player.x,player.y);for(const p of player.route)ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);}
 obstacles.forEach(equipment);drawJail();
 points.forEach((p,i)=>{const chosen=player.destination===i;const pulse=reduced?0:Math.sin(t*2.5+i)*1.7;circle(p.x,p.y,22+pulse,'#faf0b40d');ctx.strokeStyle=chosen?'#b5edff':'#e9d7a68c';ctx.lineWidth=chosen?2.5:1.5;ctx.setLineDash(chosen?[]:[3,4]);ctx.beginPath();ctx.arc(p.x,p.y,20,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);circle(p.x,p.y,4,chosen?'#b5edff':'#e4d6a6');if(p.bush)text('茂み',p.x,p.y+34,10);if(p.rescue){const prisoners=game.characters.filter(c=>c.state==='captured').length;circle(p.x,p.y,19,prisoners?'#f6d98e55':'#f6d98e15');circle(p.x-4,p.y,5,'#ffe3a0');circle(p.x-4,p.y,2,'#756146');line(p.x+1,p.y,p.x+10,p.y,'#ffe3a0',3);line(p.x+7,p.y,p.x+7,p.y+4,'#ffe3a0',3);text('たすける',p.x,p.y+34,10,prisoners?'#fff0ac':'#d0baa1');}});
 game.onis.forEach(oni);[...game.characters].sort((a,b)=>a.y-b.y).forEach(character);
 const dusk=ctx.createLinearGradient(0,0,WORLD_W,WORLD_H);dusk.addColorStop(0,'#eb965313');dusk.addColorStop(1,'#22274322');ctx.fillStyle=dusk;ctx.fillRect(0,0,WORLD_W,WORLD_H);ctx.restore();drawMapHUD();}
let uiTimer=0;function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(active&&!paused){game.update(dt);sound.setMode(music.update(game.danger,game.focus.remaining>0,dt));
 let controlEvent=null;for(const e of game.events.filter(e=>e.seq>eventIndex)){eventIndex=e.seq;
  if(e.type==='spotted'){sound.effect('spotted',e.seq);showToast(e.id===game.controlledId?'！見つかった！':`仲間${e.id}が見つかった！`);}
  if(e.type==='capture'){sound.effect('captured',e.seq);showToast(`${e.id===0?'あなた':`仲間${e.id}`}が牢屋へ…`);}
  if(e.type==='occupied'&&e.id===game.controlledId){tone(290,.1,.025);showToast('だれかいる！ 別の場所へ…');}
  if(e.type==='oni-added')showToast('鬼が増えた！');
  if(e.type==='control'){tone(470,.13);controlEvent=e;camera.follow=true;}
  if(e.type==='rescue'){tone(540,.16,.025);tone(720,.22,.025,'sine',.12);showToast(`たすけた！ ${e.count}人が自由に！`);}
  if(e.type==='focus'){tone(90,.19,.05);showToast('！見つかりそう · 次の場所を選ぼう');}
 }
 if(controlEvent&&game.state==='playing')showToast(`捕まった！ 青い帽子の仲間${controlEvent.id}へ交代`);
 if(game.state==='ended')end();
 if(game.danger>.25&&game.elapsed>beatAt){const focus=game.focus.remaining>0,interval=focus?.38:1.3-game.danger*.85;beatAt=game.elapsed+interval;tone(75,.13,focus?.045:.02+game.danger*.018);tone(60,.12,focus?.035:.018,'sine',.15);}
 }
 uiTimer+=dt;if(uiTimer>.1){updateUI();uiTimer=0;}camera.track(game.controlled,dt);draw(now/1000);requestAnimationFrame(frame);}updateUI();requestAnimationFrame(frame);
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
