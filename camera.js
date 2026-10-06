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

// The viewport camera stays unchanged. Only the HUD changes sides, with a hold time.
export function placeMini(screen,time){
 const near=screen.y<mini.y+mini.h+38&&screen.y>mini.y-45;
 const under=screen.x>mini.x-35&&screen.x<mini.x+mini.w+35;
 if(near&&under&&time>=(mini.holdUntil||0)){mini.x=mini.x>W/2?12:W-96;mini.holdUntil=time+2;}
 return mini;
}
