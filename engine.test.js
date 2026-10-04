import assert from 'node:assert/strict';
import {Game,points,obstacles,pathfind,lineClear} from '../engine.js';
function rng(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
function run(g,t){for(let i=0;i<Math.ceil(t*60)&&g.state==='playing';i++)g.update(1/60);}
for(const a of points)for(const b of points){const p=pathfind(a,b);assert(p.length);for(const n of p)assert(!obstacles.some(o=>n.x>o.x&&n.x<o.x+o.w&&n.y>o.y&&n.y<o.y+o.h));}
assert.equal(lineClear({x:25,y:380},{x:140,y:380}),false);
const moving=new Game(60,rng(1));assert(moving.move(0,8));assert(!moving.move(0,1));run(moving,.5);assert.notEqual(moving.characters[0].x,points[7].x);assert(moving.stats.comMoves>0||moving.characters.some(c=>c.decision<3));
const seen=new Game(60,rng(2));Object.assign(seen.oni,{x:210,y:310,angle:0,wait:99});Object.assign(seen.characters[0],{x:270,y:310,point:null,state:'moving',destination:9,route:[{x:275,y:310}]});run(seen,2);assert(seen.stats.discoveries>0);run(seen,3);assert.equal(seen.characters[0].state,'captured');
const lost=new Game(60,rng(3));lost.characters.forEach(c=>c.state='captured');lost.update(.02);assert.equal(lost.result.survivors,0);assert.equal(lost.state,'ended');
const timeout=new Game(60,rng(4));timeout.remaining=.01;timeout.update(.02);assert.equal(timeout.state,'ended');assert.equal(timeout.result.survivors,5);assert.equal(timeout.result.duration,60);
const fresh=new Game(180,rng(5));assert.equal(fresh.remaining,180);assert(fresh.characters.every(c=>c.state==='hidden'));
const searched=new Game(60,rng(9));Object.assign(searched.characters[0],{...points[3],point:3,state:'hidden'});Object.assign(searched.oni,{x:85,y:275,wait:0,inspect:3,route:[]});searched.update(.02);assert.equal(searched.characters[0].state,'spotted');
assert(pathfind(points[7],points[8]).length>pathfind(points[7],points[6]).length);
const results=[];for(let seed=1;seed<=20;seed++){const g=new Game(60,rng(seed));run(g,61);assert.equal(g.state,'ended');assert(g.stats.patrols>0);assert(g.stats.comMoves>0);assert(g.stats.discoveries>0);assert(g.stats.captures>0);results.push({seed,...g.result,...g.stats});}
console.log('PASS: all 100 navigation pairs, occlusion, movement lock, discovery/capture, defeat, timeout, reset, 20 seeded full rounds');console.log(JSON.stringify(results));
