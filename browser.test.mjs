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
await new Promise(resolve=>server.listen(8766,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader'],env:process.env});
const errors=[];const output=path.join(root,'tests/screenshots');fs.mkdirSync(output,{recursive:true});
async function touchPoint(page,p){const offset=await page.evaluate(()=>window.__testCamera?{x:window.__testCamera.x,y:window.__testCamera.y}:{x:0,y:200});const r=await page.locator('canvas').boundingBox();await page.touchscreen.tap(r.x+r.width*(p.x-offset.x)/420,r.y+r.height*(p.y-offset.y)/600);}
try{
 for(const viewport of [{width:390,height:844},{width:360,height:640},{width:320,height:568},{width:1280,height:900}]){
  const page=await browser.newPage({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8766/hide-and-seek/');await page.screenshot({path:path.join(output,`start-${viewport.width}.png`)});
  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,start:document.querySelector('#start').getBoundingClientRect().bottom,bottom:document.querySelector('.field').getBoundingClientRect().bottom,ratio:document.querySelector('canvas').clientWidth/document.querySelector('canvas').clientHeight}));assert(layout.scroll<=layout.width);assert(layout.start<layout.bottom);assert(Math.abs(layout.ratio-.7)<.01);
  await page.getByRole('button',{name:'5分',exact:true}).click();await page.getByRole('button',{name:'かくれんぼ スタート'}).click();assert.equal(await page.locator('#clock').textContent(),'5:00');await page.locator('summary').click();await page.getByRole('button',{name:'花だんの茂み',exact:true}).click();assert.match(await page.locator('#hint').textContent(),/移動中/);await page.screenshot({path:path.join(output,`play-${viewport.width}.png`)});await page.close();console.log('LAYOUT/INPUT PASS',viewport);
 }
 const qa=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});qa.on('pageerror',e=>errors.push(String(e)));await qa.goto('http://127.0.0.1:8766/qa/');await qa.getByRole('button',{name:'かくれんぼ スタート'}).tap();
 const canvasBox=await qa.locator('canvas').boundingBox();const touchSession=await qa.context().newCDPSession(qa);const movesBefore=await qa.evaluate(()=>window.__testGame.stats.moves);
 await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:canvasBox.x+120,y:canvasBox.y+180}]});
 await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:canvasBox.x+80,y:canvasBox.y+300}]});
 await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await qa.waitForTimeout(200);assert(await qa.locator('#follow').isVisible());assert.equal(await qa.evaluate(()=>window.__testGame.stats.moves),movesBefore);
 await qa.screenshot({path:path.join(output,'pan-camera.png')});await qa.locator('#follow').tap();await qa.waitForFunction(()=>window.__testCamera.follow,null,{timeout:2000});
 await qa.touchscreen.tap(canvasBox.x+canvasBox.width*366/420,canvasBox.y+canvasBox.height*65/600);assert.equal(await qa.evaluate(()=>window.__testCamera.follow),false);assert.equal(await qa.evaluate(()=>window.__testGame.stats.moves),movesBefore);
 await qa.locator('#follow').tap();
 await qa.evaluate(()=>{const g=window.__testGame;g.onis.forEach(o=>Object.assign(o,{x:60,y:565,route:[],wait:999,inspect:null}));g.characters.forEach(c=>{c.decision=999;c.grace=999;});g.capture(g.characters[0]);g.capture(g.characters[2]);});
 await qa.waitForFunction(()=>document.querySelector('#hint').textContent.includes('交代'));assert.equal(await qa.evaluate(()=>window.__testGame.controlledId),1);await qa.screenshot({path:path.join(output,'control-transfer.png')});
 await touchPoint(qa,{x:275,y:292});await qa.waitForFunction(()=>window.__testGame.stats.rescues===1,null,{timeout:10000});
 assert.equal(await qa.evaluate(()=>window.__testGame.controlledId),1);assert.equal(await qa.evaluate(()=>window.__testGame.stats.released),2);
 await qa.waitForTimeout(150);await qa.screenshot({path:path.join(output,'rescue.png')});assert.match(await qa.locator('#hint').textContent(),/たすけた/);
 await qa.evaluate(()=>{const g=window.__testGame;Object.assign(g.oni,{x:210,y:310,angle:0,route:[],wait:999,inspect:null,target:null});Object.assign(g.controlled,{x:265,y:310,point:9,destination:9,state:'hidden',route:[],exposure:.4,grace:0});g.focus.remaining=0;g.focus.cooldown=0;g.focus.armed=true;});
 await qa.locator('#focusLabel').waitFor({state:'visible'});await qa.screenshot({path:path.join(output,'focus.png')});assert(await qa.evaluate(()=>window.__testGame.focus.scale<1));
 await touchPoint(qa,{x:77,y:193});await touchPoint(qa,{x:452,y:177});assert.equal(await qa.evaluate(()=>window.__testGame.controlled.destination),1);assert.equal(await qa.evaluate(()=>window.__testGame.focus.redirect),false);
 await qa.evaluate(()=>{const g=window.__testGame;g.focus.remaining=0;g.characters.forEach(c=>g.capture(c));});await qa.locator('#resultPanel').waitFor({state:'visible'});assert.match(await qa.locator('#resultTitle').textContent(),/みんな捕まった/);await qa.getByRole('button',{name:'もういちど あそぶ'}).tap();assert.equal(await qa.evaluate(()=>window.__testGame.controlledId),0);assert.equal(await qa.evaluate(()=>window.__testGame.stats.rescues),0);await qa.close();console.log('CAPTURE/CONTROL/GROUP RESCUE/FOCUS/REDIRECT/DEFEAT/RESET PASS');
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const live=await context.newPage();live.on('pageerror',e=>errors.push(String(e)));live.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await live.goto('http://127.0.0.1:8766/hide-and-seek/');await live.getByRole('button',{name:'3分',exact:true}).tap();await live.getByRole('button',{name:'かくれんぼ スタート'}).tap();assert.equal(await live.locator('#clock').textContent(),'3:00');
 await live.getByRole('button',{name:'一時停止',exact:true}).tap();const clock=await live.locator('#clock').textContent();await live.waitForTimeout(1100);assert.equal(await live.locator('#clock').textContent(),clock);await live.reload();await live.getByRole('button',{name:'かくれんぼ スタート'}).tap();
 await live.waitForTimeout(30000);console.log('REAL ONE-MINUTE halfway',await live.locator('#clock').textContent());await live.waitForTimeout(32000);assert(await live.locator('#resultPanel').isVisible());console.log('REAL ONE-MINUTE result',await live.locator('#resultStats').innerText());await live.screenshot({path:path.join(output,'result.png')});
 await live.getByRole('button',{name:'もういちど あそぶ'}).tap();assert.equal(await live.locator('#clock').textContent(),'1:00');
 await live.evaluate(async()=>navigator.serviceWorker.ready);await live.reload();await live.waitForTimeout(300);assert(await live.evaluate(()=>!!navigator.serviceWorker.controller));await context.setOffline(true);await live.reload();await live.getByRole('button',{name:'かくれんぼ スタート'}).tap();await touchPoint(live,{x:134,y:511});assert.match(await live.locator('#hint').textContent(),/移動中/);console.log('PWA/OFFLINE/SUBDIRECTORY PASS');assert.deepEqual(errors,[]);console.log('ALL BROWSER TESTS PASS');
}finally{await browser.close();server.close();}
