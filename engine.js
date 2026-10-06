export const W=420,H=600; // Fixed viewport; canvas resolution is unchanged.
export const WORLD_W=560,WORLD_H=800;
export const WALK_SPEED=61;
export const obstacles=[
 {x:30,y:100,w:98,h:75,type:'slide'}, {x:399,y:97,w:108,h:57,type:'swing'},
 {x:30,y:460,w:87,h:100,type:'toilet'}, {x:387,y:407,w:79,h:22,type:'bench'},
 {x:157,y:205,w:48,h:44,type:'tree'}, {x:430,y:648,w:50,h:48,type:'tree'},
 {x:54,y:715,w:42,h:42,type:'tree'}, {x:442,y:283,w:40,h:40,type:'tree'},
 {x:455,y:65,w:44,h:44,type:'tree'}, {x:337,y:582,w:45,h:45,type:'tree'},
 {x:165,y:620,w:58,h:24,type:'bench'}, {x:65,y:615,w:44,h:44,type:'tree'}
];
export const points=[
 {x:77,y:193,name:'滑り台の裏',cover:.6}, {x:452,y:177,name:'ブランコ',cover:.18},
 {x:134,y:511,name:'トイレの横',cover:.78}, {x:53,y:275,name:'茂み',cover:.88,bush:true},
 {x:432,y:449,name:'ベンチ',cover:.28}, {x:182,y:272,name:'木の裏',cover:.7},
 {x:412,y:677,name:'大きな木',cover:.72}, {x:107,y:747,name:'入口の木',cover:.65},
 {x:229,y:111,name:'花だんの茂み',cover:.86,bush:true}, {x:215,y:431,name:'広場',cover:.05}
];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const blocked=(x,y,pad=6)=>x<15||x>WORLD_W-15||y<57||y>WORLD_H-23||obstacles.some(o=>x>o.x-pad&&x<o.x+o.w+pad&&y>o.y-pad&&y<o.y+o.h+pad);
function intersects(a,b,o){let t0=0,t1=1;for(const [s,d,min,max] of [[a.x,b.x-a.x,o.x,o.x+o.w],[a.y,b.y-a.y,o.y,o.y+o.h]]){if(Math.abs(d)<.0001){if(s<min||s>max)return false;}else{let lo=(min-s)/d,hi=(max-s)/d;if(lo>hi)[lo,hi]=[hi,lo];t0=Math.max(t0,lo);t1=Math.min(t1,hi);if(t0>t1)return false;}}return true;}
export function lineClear(a,b){return !obstacles.some(o=>intersects(a,b,o));}
// Small navigation grid: all characters walk around park equipment, never through it.
const step=10,cols=Math.ceil(WORLD_W/step),rows=Math.ceil(WORLD_H/step);
export function pathfind(a,b){
 const key=(x,y)=>y*cols+x;const cell=p=>({x:Math.max(0,Math.min(cols-1,Math.floor(p.x/step))),y:Math.max(0,Math.min(rows-1,Math.floor(p.y/step)))});
 const start=cell(a),end=cell(b),queue=[start],seen=new Set([key(start.x,start.y)]),parent=new Map();let found=false;
 for(let i=0;i<queue.length;i++){const n=queue[i];if(n.x===end.x&&n.y===end.y){found=true;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=n.x+dx,y=n.y+dy,k=key(x,y);if(x<0||x>=cols||y<0||y>=rows||seen.has(k)||blocked(x*step+5,y*step+5))continue;seen.add(k);parent.set(k,n);queue.push({x,y});}}
 if(!found)return [];
 let n=end,route=[];while(n.x!==start.x||n.y!==start.y){route.push({x:n.x*step+5,y:n.y*step+5});n=parent.get(key(n.x,n.y));}route.reverse();route.push({x:b.x,y:b.y});return route;
}
function walk(c,speed,dt){let travel=speed*dt;while(c.route.length&&travel>0){const p=c.route[0],d=dist(c,p);if(d>0)c.angle=Math.atan2(p.y-c.y,p.x-c.x);if(d<=travel){c.x=p.x;c.y=p.y;c.route.shift();travel-=d;}else{c.x+=(p.x-c.x)*travel/d;c.y+=(p.y-c.y)*travel/d;travel=0;}}}

export const jail={x:299,y:274,w:88,h:46,slots:[{x:316,y:287},{x:340,y:287},{x:364,y:287},{x:326,y:308},{x:352,y:308}]};
export const RESCUE_POINT=points.length;
points.push({x:275,y:292,name:'仲間をたすける',cover:0,rescue:true});
points.push(
 {x:515,y:85,name:'北の林',cover:.7,area:'林'},
 {x:515,y:349,name:'東の散歩道',cover:.18,area:'散歩道'},
 {x:325,y:642,name:'芝生の木',cover:.65,area:'芝生'},
 {x:195,y:663,name:'休憩ベンチ',cover:.3,area:'休憩所'},
 {x:135,y:637,name:'南の茂み',cover:.86,bush:true,area:'芝生'}
);
// Phase 3 rules seam. State transitions and presentation remain independent of mode.
export const rescueRules={
 id:'park-rescue',oniCount:2,rescueEnabled:true,rescueCooldown:6,releaseGrace:2.2,
 capturedPosition(character){return jail.slots[character.id];},
 rescueTargets(game){return game.characters.filter(c=>c.state==='captured');},
 outcome(game){if(game.characters.every(c=>c.state==='captured'))return 'defeat';if(game.remaining<=0)return 'timeout';return null;}
};
// Open spaces and the rescue gate have no capacity limit. Occupancy is checked at arrival.
points.forEach((p,i)=>p.capacity=[1,9,10,12].includes(i)?Infinity:1);
export const VISION={range:175,halfAngle:.84,notice: .72}; // 96-degree forward vision.
export function sightPolygon(o){
 const result=[{x:o.x,y:o.y}];
 for(let i=0;i<=32;i++){const a=o.angle-VISION.halfAngle+2*VISION.halfAngle*i/32;
  const end={x:o.x+Math.cos(a)*VISION.range,y:o.y+Math.sin(a)*VISION.range};let length=VISION.range;
  // Analytic ray/rectangle entry; the drawn cone stops at exactly the same blockers as LOS.
  for(const r of obstacles){let lo=0,hi=1;for(const [start,d,min,max] of [[o.x,end.x-o.x,r.x,r.x+r.w],[o.y,end.y-o.y,r.y,r.y+r.h]]){if(Math.abs(d)<1e-8){if(start<min||start>max){lo=2;break;}}else{let a=(min-start)/d,b=(max-start)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);}}if(lo<=hi&&hi>=0&&lo<=1)length=Math.min(length,Math.max(0,lo)*VISION.range);}
  result.push({x:o.x+Math.cos(a)*length,y:o.y+Math.sin(a)*length});
 }return result;
}
export class Game{
 constructor(seconds=60,random=Math.random,rules=rescueRules){
  this.random=random;this.rules=rules;this.duration=seconds;this.remaining=seconds;this.elapsed=0;this.simTime=0;this.state='playing';
  this.events=[];this.nextEvent=1;this.controlledId=0;this.rescueReadyAt=0;this.rescueFlashUntil=0;
  this.focus={remaining:0,cooldown:0,scale:1,redirect:false,armed:true};
  this.characters=[7,0,2,6,8].map((p,i)=>({id:i,x:points[p].x,y:points[p].y,point:p,origin:p,destination:p,route:[],angle:0,state:'hidden',exposure:0,exposures:[],decision:2+i*1.4,grace:0,deniedUntil:0,noticeUntil:0}));
  this.onis=Array.from({length:rules.oniCount??2},(_,id)=>this.makeOni(id));
  this.danger=0;this.result=null;this.stats={moves:0,comMoves:0,discoveries:0,captures:0,patrols:0,rescues:0,released:0,switches:0,focuses:0,occupied:0};
 }
 makeOni(id){return {id,x:id===2?515:id%2?465:215,y:id===2?349:id%2?585:320,angle:id%2?-Math.PI/2:Math.PI/2,route:[],target:null,mode:'patrol',wait:.6+id*.9,inspect:null,lastPatrol:null};}
 get oni(){return this.onis[0];} // Existing integrations can still address the primary oni.
 get controlled(){return this.characters[this.controlledId];}
 emit(type,id,extra={}){this.events.push({seq:this.nextEvent++,type,id,time:this.elapsed,...extra});if(this.events.length>100)this.events.shift();}
 occupant(p,except=-1){return this.characters.find(c=>c.id!==except&&['hidden','spotted'].includes(c.state)&&c.point===p);}
 available(p,id){return points[p].capacity!==1||!this.occupant(p,id);}
 move(id,p){
  const c=this.characters[id],redirect=id===this.controlledId&&this.focus.remaining>0&&this.focus.redirect;
  if(this.state!=='playing'||!c||!points[p]||['captured','spotted'].includes(c.state)||c.route.length&&!redirect||c.noticeUntil>this.elapsed||p===c.point)return false;
  const route=pathfind(c,points[p]);if(!route.length)return false;
  if(c.route.length&&redirect)this.focus.redirect=false;
  if(c.point!==null)c.origin=c.point;
  c.route=route;c.destination=p;c.state='moving';c.point=null;this.stats[id===this.controlledId?'moves':'comMoves']++;return true;
 }
 rerouteOccupied(c){
  const rejected=c.destination;c.deniedUntil=this.elapsed+1.4;c.noticeUntil=this.elapsed+.6;this.stats.occupied++;this.emit('occupied',c.id,{point:rejected});
  const alternatives=points.map((p,i)=>({i,d:dist(c,p)})).filter(p=>p.i!==rejected&&points[p.i].capacity===1&&this.available(p.i,c.id)&&p.d<150).sort((a,b)=>a.d-b.d);
  if(c.origin!==null&&c.origin!==rejected&&this.available(c.origin,c.id))alternatives.push({i:c.origin});
  // If every shelter is taken, an open square is always reachable. Never teleport or overlap.
  alternatives.push({i:9});
  for(const {i} of alternatives){const route=pathfind(c,points[i]);if(route.length){c.destination=i;c.route=route;return;}}
 }
 visible(c,range=VISION.range,halfAngle=VISION.halfAngle,o=this.oni){const d=dist(c,o),angle=Math.atan2(c.y-o.y,c.x-o.x),delta=Math.atan2(Math.sin(angle-o.angle),Math.cos(angle-o.angle));return d<range&&Math.abs(delta)<halfAngle&&lineClear(o,c);}
 riskFrom(c,o){if(!c||c.state==='captured'||c.grace>0)return 0;if(o.target===c.id)return 1;const near=Math.max(0,1-dist(c,o)/225);if(this.visible(c,VISION.range,VISION.halfAngle,o))return Math.min(1,.48+near*.38+(c.exposures[o.id]||0)*.24);if(this.visible(c,205,1.05,o))return .42+near*.32;return lineClear(o,c)?near*.28:0;}
 risk(c){return Math.max(0,...this.onis.map(o=>this.riskFrom(c,o)));}
 get dangerousOni(){return this.onis.reduce((a,b)=>this.riskFrom(this.controlled,b)>this.riskFrom(this.controlled,a)?b:a);}
 switchControl(){if(this.controlled.state!=='captured')return;const next=this.characters.filter(c=>c.state!=='captured').sort((a,b)=>(a.state==='spotted')-(b.state==='spotted')||(a.state==='moving')-(b.state==='moving')||a.id-b.id)[0];if(next){this.controlledId=next.id;this.stats.switches++;this.focus.remaining=0;this.focus.redirect=false;this.focus.armed=true;this.emit('control',next.id);}}
 clearTarget(o){o.target=null;o.route=[];o.wait=.7;o.mode='patrol';o.inspect=null;}
 capture(c){if(!c||c.state==='captured'||this.state!=='playing')return;
  c.state='captured';c.route=[];c.point=null;c.exposure=0;c.exposures=[];c.grace=0;c.noticeUntil=0;c.deniedUntil=0;Object.assign(c,this.rules.capturedPosition(c));
  this.stats.captures++;this.emit('capture',c.id);for(const o of this.onis)if(o.target===c.id)this.clearTarget(o);
  this.switchControl();if(this.rules.outcome(this)==='defeat')this.finish('defeat');
 }
 rescue(rescuer){
  if(!this.rules.rescueEnabled||this.state!=='playing'||rescuer.state!=='hidden'||rescuer.point!==RESCUE_POINT||dist(rescuer,points[RESCUE_POINT])>12||this.elapsed<this.rescueReadyAt)return false;
  const targets=this.rules.rescueTargets(this);if(!targets.length)return false;
  this.rescueReadyAt=this.elapsed+this.rules.rescueCooldown;this.rescueFlashUntil=this.elapsed+2;
  const exits=[5,1,9,4,8];
  for(const c of targets){c.state='moving';c.point=null;c.origin=RESCUE_POINT;c.destination=exits[c.id];c.exposure=0;c.exposures=[];c.noticeUntil=0;c.deniedUntil=0;c.grace=this.rules.releaseGrace;c.decision=2+this.random()*3;c.route=pathfind(c,points[c.destination]);}
  this.stats.rescues++;this.stats.released+=targets.length;this.emit('rescue',rescuer.id,{count:targets.length});return true;
 }
 updateFocus(dt){const f=this.focus;f.remaining=Math.max(0,f.remaining-dt);f.cooldown=Math.max(0,f.cooldown-dt);this.danger=this.risk(this.controlled);
  if(this.danger<.35)f.armed=true;
  if(f.remaining===0){f.scale=1;f.redirect=false;}
  if(f.remaining===0&&f.cooldown===0&&f.armed&&this.danger>.59&&this.controlled.state!=='spotted'){
   f.remaining=1.35;f.cooldown=8;f.scale=this.controlled.exposure>.45?.42:.6;f.redirect=true;f.armed=false;this.stats.focuses++;this.emit('focus',this.controlledId);
  }
  if(f.remaining>0&&this.controlled.exposure>.5)f.scale=.42;
 }
 finish(reason=this.rules.outcome(this)){const caught=this.characters.filter(c=>c.state==='captured').length;this.result={survivors:5-caught,caught,duration:this.duration,playerSurvived:this.characters[0].state!=='captured',rescues:this.stats.rescues,released:this.stats.released,reason};this.state='ended';this.emit('end');}
 update(realDt){if(this.state!=='playing')return;realDt=Math.max(0,Math.min(realDt,.1));this.elapsed+=realDt;this.remaining=Math.max(0,this.remaining-realDt);
  // Optional rule hook for a future survival mode; no additional mode is exposed in this build.
  if(this.rules.lateOniAt&&this.remaining/this.duration<=this.rules.lateOniAt&&this.onis.length===2){this.onis.push(this.makeOni(2));this.emit('oni-added',2);}
  this.updateFocus(realDt);const dt=realDt*this.focus.scale;this.simTime+=dt;
  for(const c of this.characters){if(c.state==='captured')continue;c.grace=Math.max(0,c.grace-dt);
   if(c.state==='moving'&&c.noticeUntil<=this.elapsed&&dist(c,points[c.destination])<23&&!this.available(c.destination,c.id))this.rerouteOccupied(c);
   walk(c,c.state==='spotted'||c.noticeUntil>this.elapsed?0:WALK_SPEED,dt);
   if(c.state==='moving'&&!c.route.length){if(!this.available(c.destination,c.id))this.rerouteOccupied(c);else{c.point=c.destination;c.state='hidden';if(c.point===RESCUE_POINT)this.rescue(c);}}
   if(c.id!==this.controlledId&&c.state!=='spotted'){c.decision-=dt;if(c.decision<=0&&!c.route.length){c.decision=4+this.random()*8;
    const prisoners=this.rules.rescueTargets(this).length,help=prisoners>0&&this.elapsed>=this.rescueReadyAt&&this.onis.every(o=>dist(o,points[RESCUE_POINT])>90);
    if(help&&this.random()<(prisoners>=3?.8:.42)&&c.point!==RESCUE_POINT){this.move(c.id,RESCUE_POINT);continue;}
    if(this.onis.some(o=>dist(c,o)<118)||this.random()<.3){const options=points.map((p,i)=>({i,score:Math.min(...this.onis.map(o=>dist(p,o)))*.8+p.cover*100+this.random()*80})).filter(p=>p.i!==c.point&&p.i!==RESCUE_POINT).sort((a,b)=>b.score-a.score);this.move(c.id,options[Math.floor(this.random()*3)].i);}
   }}
  }
  for(const o of this.onis){
   if(o.target!==null){const c=this.characters[o.target];if(c.state!=='spotted')this.clearTarget(o);else{o.mode='chase';if(!o.route.length)o.route=pathfind(o,c);walk(o,105,dt);if(dist(o,c)<17)this.capture(c);}}
   else{walk(o,47,dt);if(!o.route.length){o.wait-=dt;if(o.wait<=0){if(o.inspect!==null){o.mode='search';const p=points[o.inspect];o.angle=Math.atan2(p.y-o.y,p.x-o.x);o.inspect=null;o.wait=1.1;}else{
    // Home-area preference, with regular cross-area visits and different destinations.
    let candidates=points.map((p,i)=>({p,i})).filter(v=>v.i!==o.lastPatrol);
    if(this.random()<.7)candidates=candidates.filter(v=>o.id%2?v.p.y>=390:v.p.y<390);
    const otherDest=this.onis.filter(other=>other!==o).map(other=>other.lastPatrol);
    const distinct=candidates.filter(v=>!otherDest.includes(v.i));if(distinct.length)candidates=distinct;
    const {p:target,i}=candidates[Math.floor(this.random()*candidates.length)];let approach={x:target.x+(this.random()-.5)*55,y:target.y+(this.random()-.5)*55};if(blocked(approach.x,approach.y))approach=target;
    o.route=pathfind(o,approach);o.inspect=i;o.lastPatrol=i;o.wait=1.5+this.random()*1.7;o.mode='patrol';this.stats.patrols++;
   }}}}
   // Each oni owns its notice accumulator, even while chasing. No shared or camera-space vision.
   for(const c of this.characters){if(['captured','spotted'].includes(c.state)||c.grace>0)continue;
    const seen=this.visible(c,VISION.range,VISION.halfAngle,o),cover=c.point===null?0:points[c.point].cover;
    const rate=c.state==='moving'?1.4:Math.max(.32,1.25-cover);
    c.exposures[o.id]=seen?(c.exposures[o.id]||0)+dt*rate:Math.max(0,(c.exposures[o.id]||0)-dt*.9);
    c.exposure=Math.max(0,...c.exposures);
    if(c.exposures[o.id]>=VISION.notice&&o.target===null){this.spot(c,o);break;}
   }
  }
  this.danger=this.risk(this.controlled);const outcome=this.rules.outcome(this);if(outcome&&this.state==='playing')this.finish(outcome);
 }
 spot(c,o=this.oni){if(c.grace>0||['captured','spotted'].includes(c.state)||o.target!==null)return false;c.state='spotted';c.noticeUntil=0;c.deniedUntil=0;c.route=[];o.target=c.id;o.route=pathfind(o,c);o.mode='chase';this.stats.discoveries++;this.emit('spotted',c.id,{oni:o.id});return true;}
}
