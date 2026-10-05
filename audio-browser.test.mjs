import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// /qa/ serves the unchanged game with a test-only reference to its instance.
// No test hooks or state controls exist on the public game route.
const server=http.createServer((req,res)=>{const url=req.url.split('?')[0],qa=url.startsWith('/qa/');let f=path.join(root,decodeURIComponent(url).replace(/^\/(qa|hide-and-seek)/,''));if(f.endsWith('/'))f+='index.html';try{let b=fs.readFileSync(f);if(qa&&f.endsWith('app.js'))b=Buffer.from(b.toString().replace('const camera=new Camera();','const camera=new Camera();globalThis.__testCamera=camera;globalThis.__testSound=sound;'));if(qa&&f.endsWith('engine.js'))b=Buffer.from(b.toString().replace('this.random=random;','globalThis.__testGame=this;this.random=random;'));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(f)]||'text/plain');res.end(b);}catch{res.statusCode=404;res.end('not found');}});
await new Promise(resolve=>server.listen(8767,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader'],env:process.env});
const errors=[];const output=path.join(root,'tests/screenshots');fs.mkdirSync(output,{recursive:true});
async function touchPoint(page,p){const offset=await page.evaluate(()=>window.__testCamera?{x:window.__testCamera.x,y:window.__testCamera.y}:{x:0,y:200});const r=await page.locator('canvas').boundingBox();await page.touchscreen.tap(r.x+r.width*(p.x-offset.x)/420,r.y+r.height*(p.y-offset.y)/600);}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8767/qa/');await page.getByRole('button',{name:'かくれんぼ スタート'}).tap();
 await page.waitForFunction(()=>Object.keys(window.__testSound.loops).length===2,null,{timeout:15000});
 const tracks=await page.evaluate(()=>Object.fromEntries(Object.entries(window.__testSound.buffers).map(([k,b])=>[k,{duration:b.duration,channels:b.numberOfChannels,sampleRate:b.sampleRate}])));assert(tracks.park.duration>119);assert(tracks.danger.duration>10);console.log('MP3 DECODED',tracks);
 await page.evaluate(()=>{const g=window.__testGame;g.onis.forEach(o=>Object.assign(o,{x:60,y:570,wait:999,route:[],inspect:null}));g.characters.forEach(c=>{c.decision=999;c.grace=999;});});
 await page.waitForFunction(()=>window.__testSound.mode==='park');assert.equal(await page.evaluate(()=>window.__testSound.ctx.state),'running');assert(await page.evaluate(()=>Object.values(window.__testSound.loops).every(v=>v.source.loop)));
 await page.evaluate(()=>{const g=window.__testGame;Object.assign(g.onis[1],{x:210,y:310,angle:0});Object.assign(g.controlled,{x:265,y:310,point:9,route:[],state:'hidden',grace:0});});
 await page.waitForFunction(()=>window.__testSound.mode==='danger');await page.screenshot({path:path.join(output,'two-oni-danger.png')});
 await page.waitForFunction(()=>window.__testSound.metrics.spotted===1);await page.waitForFunction(()=>window.__testSound.metrics.captured===1);assert.equal(await page.evaluate(()=>window.__testGame.controlledId),1);
 await page.evaluate(()=>{const g=window.__testGame;g.onis.forEach(o=>Object.assign(o,{x:60,y:570,angle:0,wait:999,route:[],target:null}));g.controlled.grace=999;});
 await page.waitForFunction(()=>window.__testSound.mode==='park');assert.equal(await page.evaluate(()=>window.__testSound.metrics.spotted),1);assert.equal(await page.evaluate(()=>window.__testSound.metrics.captured),1);
 await page.getByRole('button',{name:'音を切る'}).tap();assert.equal(await page.evaluate(()=>Object.keys(window.__testSound.loops).length),0);assert.equal(await page.evaluate(()=>window.__testSound.effects.size),0);await page.waitForFunction(()=>window.__testSound.ctx.state==='suspended');
 await page.getByRole('button',{name:'音を出す'}).tap();await page.waitForFunction(()=>Object.keys(window.__testSound.loops).length===2);assert.equal(await page.evaluate(()=>window.__testSound.mode),'park');
 await page.getByRole('button',{name:'一時停止',exact:true}).tap();assert.equal(await page.evaluate(()=>Object.keys(window.__testSound.loops).length),0);await page.getByRole('button',{name:'再開 ▶',exact:true}).tap();await page.waitForFunction(()=>Object.keys(window.__testSound.loops).length===2&&window.__testSound.ctx.state==='running');
 await page.evaluate(()=>{const g=window.__testGame;Object.assign(g.controlled,{x:53,y:303,point:9,origin:9,destination:9,state:'hidden',route:[],grace:999});Object.assign(g.characters[2],{x:53,y:275,point:3,state:'hidden',route:[],grace:999});window.__testCamera.center(53,303);});await touchPoint(page,{x:53,y:275});await page.waitForFunction(()=>window.__testGame.stats.occupied>0);assert.match(await page.locator('#hint').textContent(),/だれかいる/);assert.notEqual(await page.evaluate(()=>window.__testGame.controlled.destination),3);await page.screenshot({path:path.join(output,'occupied-reroute.png')});
 await page.evaluate(()=>window.__testGame.characters.forEach(c=>window.__testGame.capture(c)));await page.locator('#resultPanel').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>Object.keys(window.__testSound.loops).length),0);assert(await page.evaluate(()=>window.__testSound.effects.size>0));await page.getByRole('button',{name:'もういちど あそぶ'}).tap();await page.waitForFunction(()=>Object.keys(window.__testSound.loops).length===2);assert.equal(await page.evaluate(()=>window.__testSound.mode),'park');
 await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'かくれんぼ スタート'}).tap();await page.waitForFunction(()=>Object.keys(window.__testSound.buffers).length===4);assert.equal(await page.evaluate(()=>!!window.__testSound.failed),false);console.log('PASS: REAL MP3 normal/danger/SE once/control/return/mute/unmute/pause/restart/final SE/offline');assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();}
