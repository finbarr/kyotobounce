import {chromium,firefox,webkit} from 'playwright';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

export const browserEngines=['chrome','firefox','webkit'];
export const testBrowserName=process.env.KYOTO_TEST_BROWSER||'chrome';
if(!browserEngines.includes(testBrowserName))throw new Error(`Unsupported KYOTO_TEST_BROWSER: ${testBrowserName}`);
export async function launchTestBrowser(){
 if(testBrowserName==='chrome')return chromium.launch({channel:'chrome',headless:true});
 if(testBrowserName==='webkit')return webkit.launch({headless:true});
 if(process.platform!=='darwin')return firefox.launch({headless:true});
 // Firefox still looks up app data outside its temporary profile. On macOS 27
 // that touches the user's protected Firefox folder. Give this test process
 // its own disposable app-data home, without changing the real user profile.
 // https://github.com/microsoft/playwright/issues/42768
 const appHome=await mkdtemp(join(tmpdir(),'kyoto-firefox-app-'));
 const dispose=async()=>{
  // macOS creates Documents/Downloads with deny-delete ACLs in this scratch
  // home. Remove ACLs only inside the exact directory created above.
  await promisify(execFile)('/bin/chmod',['-RN',appHome]);
  await rm(appHome,{recursive:true,force:true});
 };
 try{
  const browser=await firefox.launch({headless:true,env:{...process.env,CFFIXED_USER_HOME:appHome}}),close=browser.close.bind(browser);
  browser.close=async(...args)=>{try{await close(...args);}finally{await dispose();}};
  return browser;
 }catch(error){await dispose();throw error;}
}
