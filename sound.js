// User-provided, byte-identical MP3s. Resolve relative to this module, including Pages subdirectories.
export const TRACKS={park:{url:new URL('./audio/park.mp3',import.meta.url).href,volume:.36},danger:{url:new URL('./audio/danger.mp3',import.meta.url).href,volume:.43},spotted:{url:new URL('./audio/spotted.mp3',import.meta.url).href,volume:.65},captured:{url:new URL('./audio/captured.mp3',import.meta.url).href,volume:.8}};
export class DangerMusic{
 constructor(){this.mode='park';this.clearFor=0;}
 update(risk,focus,dt){if(focus||risk>=.57){this.mode='danger';this.clearFor=0;}else if(this.mode==='danger'){if(risk<=.34)this.clearFor+=dt;else this.clearFor=0;if(this.clearFor>=1.8){this.mode='park';this.clearFor=0;}}return this.mode;}
}
export class Sound{
 constructor(options={}){this.createAudio=options.createAudio||(()=>new Audio());this.now=options.now||(()=>performance.now());this.ctx=null;this.players={};this.loops={};this.effects=new Set();this.enabled=true;this.running=false;this.mode='park';this.lastSE={};this.generation=0;this.fadeFrame=null;this.status={};this.errors=[];this.audibleMode=null;this.metrics={switches:0,spotted:0,captured:0};}
 get failed(){return Object.values(this.status).some(s=>s.load==='error'||s.play==='error');}
 recordError(key,error,kind='play'){const s=this.status[key]??={load:'pending',play:'idle'};s[kind]='error';s.message=String(error?.message||error);this.errors.push({key,kind,message:s.message});if(this.errors.length>20)this.errors.shift();if(['park','danger'].includes(key))this.fade();}
 unlock(){
  // Called synchronously inside START/ON/retry. BGM itself uses native streaming playback,
  // so a Web Audio decode failure or unsupported gain method cannot silence all music.
  try{this.ctx??=new (globalThis.AudioContext||globalThis.webkitAudioContext)();if(this.enabled){this.ctx.resume().then(()=>{this.contextError=null;}).catch(e=>this.contextError=String(e));}}catch(e){this.contextError=String(e);}
 }
 ensurePlayer(key){if(this.players[key])return this.players[key];const a=this.createAudio(),t=TRACKS[key];this.status[key]={load:'pending',play:'idle'};a.preload='auto';a.loop=['park','danger'].includes(key);a.setAttribute?.('playsinline','');a.volume=0;a.src=t.url;
  a.addEventListener('loadeddata',()=>{if(this.players[key]===a)this.status[key].load='ready';});a.addEventListener('error',()=>this.players[key]===a&&this.recordError(key,`MediaError ${a.error?.code||0}: ${a.error?.message||'load failed'}`,'load'));
  this.players[key]=a;return a;
 }
 playLoop(key){const a=this.ensurePlayer(key),generation=this.generation;if(!this.loops[key])this.loops[key]={source:a};this.status[key].play='pending';
  // play() is invoked here, before any await or network completion, in the user gesture.
  try{Promise.resolve(a.play()).then(()=>{if(generation!==this.generation||this.players[key]!==a)return;this.status[key].play='playing';this.fade();}).catch(e=>{if(generation===this.generation&&this.players[key]===a)this.recordError(key,e);});}catch(e){this.recordError(key,e);}
 }
 start(){this.stop();this.lastSE={};this.mode='park';this.audibleMode=null;this.running=true;this.metrics={switches:0,spotted:0,captured:0};this.unlock();this.sync();}
 sync(){if(!this.enabled||!this.running)return;for(const key of ['park','danger'])this.playLoop(key);for(const key of ['spotted','captured'])this.ensurePlayer(key);this.fade();}
 fade(){if(!this.enabled||!this.running)return;const desired=this.status[this.mode],other=this.mode==='park'?'danger':'park',ready=key=>this.status[key]?.play==='playing'&&this.status[key]?.load!=='error';this.audibleMode=ready(this.mode)?this.mode:desired?.load==='error'||desired?.play==='error'?other:this.audibleMode&&ready(this.audibleMode)?this.audibleMode:this.mode;const now=this.now();this.transition={at:now,from:Object.fromEntries(Object.entries(this.loops).map(([key,{source}])=>[key,source.volume]))};this.advanceFade(now);}
 advanceFade(time=this.now()){if(this.fadeFrame!==null){globalThis.cancelAnimationFrame?.(this.fadeFrame);this.fadeFrame=null;}if(!this.transition)return;const amount=Math.min(1,Math.max(0,(time-this.transition.at)/650));for(const [key,{source}] of Object.entries(this.loops)){const target=key===this.audibleMode?TRACKS[key].volume:0;source.volume=this.transition.from[key]+(target-this.transition.from[key])*amount;}if(amount<1&&globalThis.requestAnimationFrame)this.fadeFrame=requestAnimationFrame(t=>this.advanceFade(t));else if(amount===1)this.transition=null;}
 setMode(mode){if(this.mode===mode)return;this.mode=mode;this.metrics.switches++;this.fade();}
 setEnabled(on){this.enabled=on;if(!on){this.stopSources();this.ctx?.suspend?.().catch(()=>{});}else if(this.running){this.unlock();this.sync();}}
 pause(){this.running=false;this.stopSources();this.ctx?.suspend?.().catch(()=>{});}
 resume(){this.running=true;this.unlock();this.sync();}
 stopLoops(){if(this.fadeFrame!==null)globalThis.cancelAnimationFrame?.(this.fadeFrame);this.fadeFrame=null;this.transition=null;for(const [key,{source}] of Object.entries(this.loops)){source.pause();source.volume=0;try{source.currentTime=0;}catch{}this.status[key].play='idle';}this.loops={};}
 stopSources(){this.generation++;this.stopLoops();for(const a of this.effects){a.pause();a.removeAttribute?.('src');a.load?.();}this.effects.clear();}
 stop(){this.running=false;this.stopSources();}
 finish(){this.running=false;this.generation++;this.stopLoops();} // Final capture SE can finish.
 retry(){this.unlock();for(const [key,s] of Object.entries(this.status)){if(s.load!=='error'&&s.play!=='error')continue;const a=this.players[key];a?.pause();a?.removeAttribute?.('src');a?.load?.();delete this.players[key];delete this.loops[key];delete this.status[key];}this.sync();}
 effect(key,seq){if(this.lastSE[key]===seq)return;this.lastSE[key]=seq;this.metrics[key]++;if(!this.enabled||!this.running)return;const a=this.ensurePlayer(key).cloneNode(true);a.loop=false;a.volume=TRACKS[key].volume;this.effects.add(a);a.addEventListener('ended',()=>this.effects.delete(a),{once:true});a.addEventListener('error',()=>{if(this.effects.has(a))this.recordError(key,`MediaError ${a.error?.code||0}`,'load');this.effects.delete(a);},{once:true});
  try{Promise.resolve(a.play()).then(()=>{if(this.effects.has(a))this.status[key].play='playing';this.fade();}).catch(e=>{if(this.effects.has(a))this.recordError(key,e);this.effects.delete(a);});}catch(e){this.recordError(key,e);this.effects.delete(a);}
 }
}
