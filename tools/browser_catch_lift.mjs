import{chromium}from'playwright';import{mkdir,writeFile}from'node:fs/promises';
const out=process.env.KYOTO_TEST_OUTPUT||'artifacts/k016/browser-before';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:640}}),trace=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',ws=>ws.on('framereceived',f=>{try{const m=JSON.parse(f.payload);if(['state','impact','result'].includes(m.type))trace.push(m);}catch{}}));
try{
 await page.goto('http://127.0.0.1:4273');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:180000});
 await page.getByRole('button').filter({hasText:'Catch the Lift'}).click();await page.waitForFunction(()=>window.kyotoState?.briefing);await page.locator('#briefing-play').click();await page.waitForFunction(()=>!window.kyotoState.briefing&&!window.kyotoState.briefingTransition,null,{timeout:180000});await page.locator('canvas').focus();await page.keyboard.press('h');await page.waitForFunction(()=>window.kyotoState.yaw===90&&window.kyotoState.pitch===-30&&window.kyotoState.top===-100,null,{timeout:60000});
 await page.keyboard.press('Escape');await page.locator('#top').focus();for(let i=0;i<6;i++)await page.keyboard.press('ArrowLeft');await page.locator('canvas').focus();await page.waitForFunction(()=>window.kyotoState.top===-130,null,{timeout:60000});
 await page.screenshot({timeout:90000,path:out+'/start.png'});const s=await page.evaluate(()=>window.kyotoState),h=s.challenge.hint;
 const target=h.releasePhase+Math.ceil((s.stationTime+h.holdMs/1000+.5-h.releasePhase)/h.period)*h.period;
 await page.waitForTimeout(Math.max(0,(target-.12-h.holdMs/1000-s.stationTime)*1000));await page.keyboard.down('Space');await page.waitForTimeout(h.holdMs);await page.keyboard.up('Space');
 await page.waitForFunction(()=>['Flight','Result'].includes(window.kyotoState.phase),null,{timeout:60000});
 let upper=false;for(let i=0;i<180;i++){await page.waitForTimeout(500);const state=await page.evaluate(()=>window.kyotoState);if(!upper&&state.ball?.y>5.1){await page.screenshot({timeout:90000,path:out+'/upper-transition.png'});upper=true;}if(state.phase==='Result'||state.ball?.y< -2)break;}
 await writeFile(out+'/evidence.json',JSON.stringify({errors,upper,final:await page.evaluate(()=>window.kyotoState),trace},null,2));await page.screenshot({timeout:90000,path:out+'/final.png'});console.log(out,{errors,upper});
}catch(e){await page.screenshot({timeout:90000,path:out+'/failure.png'}).catch(()=>{});await writeFile(out+'/failure.json',JSON.stringify({error:String(e),errors,state:await page.evaluate(()=>window.kyotoState).catch(()=>null),trace},null,2));throw e;}finally{await browser.close();}
