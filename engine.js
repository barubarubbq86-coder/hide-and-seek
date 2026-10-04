export const W=420,H=600;
export const obstacles=[
 {x:30,y:100,w:98,h:75,type:'slide'}, {x:269,y:97,w:108,h:57,type:'swing'},
 {x:30,y:340,w:87,h:100,type:'toilet'}, {x:277,y:327,w:79,h:22,type:'bench'},
 {x:157,y:205,w:48,h:44,type:'tree'}, {x:296,y:448,w:50,h:48,type:'tree'},
 {x:54,y:495,w:42,h:42,type:'tree'}, {x:342,y:223,w:40,h:40,type:'tree'}
];
export const points=[
 {x:77,y:193,name:'滑り台の裏',cover:.6}, {x:322,y:177,name:'ブランコ',cover:.18},
 {x:134,y:391,name:'トイレの横',cover:.78}, {x:53,y:275,name:'茂み',cover:.88,bush:true},
 {x:322,y:369,name:'ベンチ',cover:.28}, {x:182,y:272,name:'木の裏',cover:.7},
 {x:278,y:477,name:'大きな木',cover:.72}, {x:107,y:527,name:'入口の木',cover:.65},
 {x:229,y:111,name:'花だんの茂み',cover:.86,bush:true}, {x:215,y:431,name:'広場',cover:.05}
];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const blocked=(x,y,pad=6)=>x<15||x>405||y<57||y>577||obstacles.some(o=>x>o.x-pad&&x<o.x+o.w+pad&&y>o.y-pad&&y<o.y+o.h+pad);
function intersects(a,b,o){let t0=0,t1=1;for(const [s,d,min,max] of [[a.x,b.x-a.x,o.x,o.x+o.w],[a.y,b.y-a.y,o.y,o.y+o.h]]){if(Math.abs(d)<.0001){if(s<min||s>max)return false;}else{let lo=(min-s)/d,hi=(max-s)/d;if(lo>hi)[lo,hi]=[hi,lo];t0=Math.max(t0,lo);t1=Math.min(t1,hi);if(t0>t1)return false;}}return true;}
export function lineClear(a,b){return !obstacles.some(o=>intersects(a,b,o));}
// Small navigation grid: all characters walk around park equipment, never through it.
const step=10,cols=42,rows=60;
export function pathfind(a,b){
 const key=(x,y)=>y*cols+x;const cell=p=>({x:Math.max(0,Math.min(cols-1,Math.floor(p.x/step))),y:Math.max(0,Math.min(rows-1,Math.floor(p.y/step)))});
 const start=cell(a),end=cell(b),queue=[start],seen=new Set([key(start.x,start.y)]),parent=new Map();let found=false;
 for(let i=0;i<queue.length;i++){const n=queue[i];if(n.x===end.x&&n.y===end.y){found=true;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=n.x+dx,y=n.y+dy,k=key(x,y);if(x<0||x>=cols||y<0||y>=rows||seen.has(k)||blocked(x*step+5,y*step+5))continue;seen.add(k);parent.set(k,n);queue.push({x,y});}}
 if(!found)return [];
 let n=end,route=[];while(n.x!==start.x||n.y!==start.y){route.push({x:n.x*step+5,y:n.y*step+5});n=parent.get(key(n.x,n.y));}route.reverse();route.push({x:b.x,y:b.y});return route;
}
function walk(c,speed,dt){let travel=speed*dt;while(c.route.length&&travel>0){const p=c.route[0],d=dist(c,p);if(d>0)c.angle=Math.atan2(p.y-c.y,p.x-c.x);if(d<=travel){c.x=p.x;c.y=p.y;c.route.shift();travel-=d;}else{c.x+=(p.x-c.x)*travel/d;c.y+=(p.y-c.y)*travel/d;travel=0;}}}
export class Game{
 constructor(seconds=60,random=Math.random){this.random=random;this.duration=seconds;this.remaining=seconds;this.elapsed=0;this.state='playing';this.events=[];this.characters=[7,0,2,6,8].map((p,i)=>({id:i,x:points[p].x,y:points[p].y,point:p,destination:p,route:[],angle:0,state:'hidden',exposure:0,decision:2+i*1.4}));this.oni={x:215,y:320,angle:-Math.PI/2,route:[],target:null,mode:'patrol',wait:2,inspect:null};this.danger=0;this.result=null;this.stats={moves:0,comMoves:0,discoveries:0,captures:0,patrols:0};}
 move(id,p){const c=this.characters[id];if(this.state!=='playing'||!c||c.state==='captured'||c.state==='spotted'||c.route.length||p===c.point)return false;const route=pathfind(c,points[p]);if(!route.length)return false;c.route=route;c.destination=p;c.state='moving';c.point=null;this.stats[id===0?'moves':'comMoves']++;return true;}
 emit(type,id){this.events.push({type,id,time:this.elapsed});if(this.events.length>40)this.events.shift();}
 visible(c){const o=this.oni,d=dist(c,o),angle=Math.atan2(c.y-o.y,c.x-o.x);const delta=Math.atan2(Math.sin(angle-o.angle),Math.cos(angle-o.angle));return d<145&&Math.abs(delta)<.62&&lineClear(o,c);}
 finish(){const caught=this.characters.filter(c=>c.state==='captured').length;this.result={survivors:5-caught,caught,duration:this.duration,playerSurvived:this.characters[0].state!=='captured'};this.state='ended';this.emit('end');}
 update(dt){if(this.state!=='playing')return;dt=Math.min(dt,.1);this.elapsed+=dt;this.remaining=Math.max(0,this.remaining-dt);const o=this.oni;
 for(const c of this.characters){if(c.state==='captured')continue;walk(c,c.state==='spotted'?0:61,dt);if(c.state==='moving'&&!c.route.length){c.point=c.destination;c.state='hidden';c.exposure=0;}
 if(c.id>0&&c.state!=='spotted'){c.decision-=dt;if(c.decision<=0&&!c.route.length){c.decision=4+this.random()*8;const near=dist(c,o)<118; if(near||this.random()<.3){const candidates=points.map((p,i)=>({i,score:dist(p,o)*.8+p.cover*100+this.random()*80})).filter(p=>p.i!==c.point).sort((a,b)=>b.score-a.score);this.move(c.id,candidates[Math.floor(this.random()*3)].i);}}}}
 if(o.target!==null){const c=this.characters[o.target];o.mode='chase';if(!o.route.length)o.route=pathfind(o,c);walk(o,105,dt);if(dist(o,c)<17){c.state='captured';c.route=[];this.stats.captures++;this.emit('capture',c.id);o.target=null;o.route=[];o.wait=.7;o.mode='patrol';}}
 else{walk(o,47,dt);if(!o.route.length){o.wait-=dt;if(o.wait<=0){if(o.inspect!==null){o.mode='search';const p=points[o.inspect];o.angle=Math.atan2(p.y-o.y,p.x-o.x);for(const c of this.characters){if(c.state!=='captured'&&dist(c,p)<37&&dist(o,c)<58&&lineClear(o,c)){this.spot(c);break;}}o.inspect=null;o.wait=1.1;}else{const p=Math.floor(this.random()*points.length),target=points[p];let approach={x:target.x+(this.random()-.5)*55,y:target.y+(this.random()-.5)*55};if(blocked(approach.x,approach.y))approach=target;o.route=pathfind(o,approach);o.inspect=p;o.wait=1.5+this.random()*1.7;o.mode='patrol';this.stats.patrols++;}}}
 if(o.target===null){for(const c of this.characters){if(c.state==='captured'||c.state==='spotted')continue;const seen=this.visible(c);const cover=c.point===null?0:points[c.point].cover;const distance=dist(c,o);if(seen){c.exposure+=dt*(c.state==='moving'?1.8:(1-cover)*.8)*(distance<48?2.3:1);}else c.exposure=Math.max(0,c.exposure-dt*.85);if(c.exposure>1.15||seen&&distance<24){this.spot(c);break;}}}}
 const player=this.characters[0];this.danger=player.state==='captured'?0:Math.max(0,1-dist(player,o)/200);if(this.visible(player))this.danger=Math.min(1,this.danger+.17);
 if(this.characters.every(c=>c.state==='captured')||this.remaining<=0)this.finish();}
 spot(c){c.state='spotted';c.route=[];this.oni.target=c.id;this.oni.route=pathfind(this.oni,c);this.oni.mode='chase';this.stats.discoveries++;this.emit('spotted',c.id);}
}
