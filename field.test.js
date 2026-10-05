import assert from 'node:assert/strict';
import {Game,points,pathfind,W,H,WORLD_W,WORLD_H} from '../engine.js';
import {Camera} from '../camera.js';
assert.equal(W,420);assert.equal(H,600);assert.equal(WORLD_W,560);assert.equal(WORLD_H,800);assert(WORLD_W>W&&WORLD_H>H);assert.equal(points.length,16);
const camera=new Camera();camera.center(107,747);assert.equal(camera.y,200);assert(camera.world(10,10).y===210);camera.pan(999,999);assert.equal(camera.x,140);assert.equal(camera.y,200);camera.pan(-999,-999);assert.equal(camera.x,0);assert.equal(camera.y,0);
const game=new Game();game.characters.forEach(c=>c.decision=999);game.controlled.grace=999;Object.assign(game.oni,{wait:999,route:[],inspect:null});assert(game.move(0,11));const start=game.controlled.y;for(let t=0;t<1200;t++)game.update(.016);assert(game.controlled.y<start-400);assert.equal(game.controlled.state,'hidden');
const chase=new Game();Object.assign(chase.oni,{wait:999});chase.spot(chase.characters[0]);const initial={x:chase.characters[0].x,y:chase.characters[0].y};chase.capture(chase.characters[2]);Object.assign(chase.characters[1],{...points[10],state:'hidden',point:10,route:[]});assert(chase.rescue(chase.characters[1]));assert.equal(chase.characters[0].state,'spotted');assert.equal(chase.oni.target,0);assert.equal(chase.characters[0].x,initial.x);assert.equal(chase.characters[0].y,initial.y);
console.log('PASS: real larger world, fixed viewport, camera clamps/conversion, traversing new areas, spotted target cannot become rescued or warp');
