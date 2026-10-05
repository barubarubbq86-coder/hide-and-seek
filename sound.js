// All tracks are user-supplied originals. Mixing is non-destructive.
export const TRACKS={park:{url:'./audio/park.mp3',volume:.36},danger:{url:'./audio/danger.mp3',volume:.43},spotted:{url:'./audio/spotted.mp3',volume:.65},captured:{url:'./audio/captured.mp3',volume:.8}};
export class DangerMusic{
 constructor(){this.mode='park';this.clearFor=0;}
 update(risk,focus,dt){if(focus||risk>=.57){this.mode='danger';this.clearFor=0;}else if(this.mode==='danger'){if(risk<=.34)this.clearFor+=dt;else this.clearFor=0;if(this.clearFor>=1.8){this.mode='park';this.clearFor=0;}}return this.mode;}
}
export class Sound{
 constructor(){this.ctx=null;this.buffers={};this.loops={};this.effects=new Set();this.enabled=true;this.running=false;this.mode='park';this.lastSE={};this.loadPromise=null;this.generation=0;this.metrics={switches:0,spotted:0,captured:0};}
 unlock(){try{this.ctx??=new (globalThis.AudioContext||globalThis.webkitAudioContext)();if(this.enabled)this.ctx.resume().catch(()=>{});this.loadPromise??=Promise.all(Object.entries(TRACKS).map(async([key,t])=>{const res=await fetch(t.url);if(!res.ok)throw Error(`Audio ${res.status}: ${t.url}`);this.buffers[key]=await this.ctx.decodeAudioData(await res.arrayBuffer());})).catch(()=>{this.failed=true;});return this.loadPromise;}catch{this.failed=true;return Promise.resolve();}}
 start(){this.stop();this.lastSE={};this.mode='park';this.running=true;this.metrics={switches:0,spotted:0,captured:0};this.unlock();this.sync();}
 sync(){const generation=this.generation;if(!this.enabled||!this.running||!this.ctx)return;this.loadPromise?.then(()=>{if(generation!==this.generation||!this.running||!this.enabled||this.failed)return;for(const key of ['park','danger'])if(!this.loops[key]){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers[key];source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.ctx.destination);source.start();this.loops[key]={source,gain};}this.fade();});}
 fade(){if(!this.ctx)return;const now=this.ctx.currentTime;for(const [key,{gain}] of Object.entries(this.loops)){gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(key===this.mode?TRACKS[key].volume:0,now+.65);}}
 setMode(mode){if(this.mode===mode)return;this.mode=mode;this.metrics.switches++;this.fade();}
 setEnabled(on){this.enabled=on;if(!on){this.stopSources();this.ctx?.suspend?.().catch(()=>{});}else{this.unlock();this.sync();}}
 pause(){this.running=false;this.stopSources();this.ctx?.suspend?.().catch(()=>{});}
 resume(){this.running=true;this.unlock();this.sync();}
 stopSources(){this.generation++;for(const {source} of Object.values(this.loops)){try{source.stop();}catch{}}this.loops={};for(const source of this.effects){try{source.stop();}catch{}}this.effects.clear();}
 stop(){this.running=false;this.stopSources();}
 finish(){this.running=false;this.generation++;for(const {source} of Object.values(this.loops)){try{source.stop();}catch{}}this.loops={};} // Let the final capture SE finish.
 effect(key,seq){if(this.lastSE[key]===seq)return;this.lastSE[key]=seq;this.metrics[key]++;if(!this.enabled||!this.running)return;
  // Never replay stale effects after asynchronous load, pause, restart, or mute.
  if(!this.buffers[key]||!this.ctx)return;
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers[key];gain.gain.value=TRACKS[key].volume;source.connect(gain);gain.connect(this.ctx.destination);this.effects.add(source);source.onended=()=>this.effects.delete(source);source.start();
 }
}
