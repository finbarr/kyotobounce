import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {chromeGraphicsArgs} from './chrome-graphics.mjs';
const out=resolve(process.env.KYOTO_EVIDENCE||'.local/remote-prep/gpu');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:process.env.KYOTO_CHROME_HEADED!=='1',args:chromeGraphicsArgs()});
try {
 const page=await browser.newPage();
 await page.setContent('<canvas id="probe" width="256" height="256"></canvas>');
 const report=await page.evaluate(()=>{
  const gl=document.querySelector('#probe').getContext('webgl2');
  if(!gl)return {error:'WebGL 2 unavailable'};
  const ext=gl.getExtension('WEBGL_debug_renderer_info');
  gl.clearColor(.1,.5,.8,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.finish();
  const pixel=new Uint8Array(4);gl.readPixels(128,128,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
  return {vendor:ext&&gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),renderer:ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),pixel:Array.from(pixel)};
 });
 report.browser=browser.version();report.angle=process.env.KYOTO_CHROME_ANGLE;report.date=new Date().toISOString();
 await writeFile(resolve(out,'chrome-gpu.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
 assert.ok(report.renderer && /NVIDIA/i.test(report.renderer) && !/swiftshader|llvmpipe|softpipe/i.test(report.renderer),'NVIDIA hardware rendering required');
 assert.deepEqual(report.pixel,[26,128,204,255]);
 await page.screenshot({path:resolve(out,'chrome-gpu.png')});
} finally {await browser.close();}
