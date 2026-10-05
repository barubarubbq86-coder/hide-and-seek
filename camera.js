import {W,H,WORLD_W,WORLD_H} from './engine.js';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export class Camera{
 constructor(){this.x=0;this.y=0;this.follow=true;this.targetId=null;}
 center(x,y){this.x=clamp(x-W/2,0,WORLD_W-W);this.y=clamp(y-H/2,0,WORLD_H-H);}
 track(character,dt=1){if(!this.follow)return;
  const tx=clamp(character.x-W/2,0,WORLD_W-W),ty=clamp(character.y-H/2,0,WORLD_H-H);
  // Changing control uses a smooth camera move, rather than moving the actor.
  const alpha=1-Math.exp(-dt*7);this.x+=(tx-this.x)*alpha;this.y+=(ty-this.y)*alpha;this.targetId=character.id;
 }
 pan(dx,dy){this.follow=false;this.x=clamp(this.x+dx,0,WORLD_W-W);this.y=clamp(this.y+dy,0,WORLD_H-H);}
 world(x,y){return {x:x+this.x,y:y+this.y};}
 screen(x,y){return {x:x-this.x,y:y-this.y};}
}
export const mini={x:W-96,y:45,w:84,h:120};
