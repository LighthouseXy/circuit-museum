import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2]||'playwright');
const evidenceRoot=process.argv[4] || 'docs/evidence/photo-expansion';
const manifest=JSON.parse(await readFile(`${evidenceRoot}/imported-photos.json`,'utf8'));
const base=process.env.MUSEUM_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const checks=[];const normalize=s=>s.replace(/\s+/g,' ').trim();
try{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  for(const r of manifest.records){
   const response=await page.goto(`${base}/exhibits/${r.slug}/`);assert.equal(response.status(),200,r.slug);
   const img=page.locator('.detail-image img[data-exhibit-image]');
   await img.evaluate(async e=>{e.loading='eager';await e.decode();if(!e.naturalWidth)throw new Error('undecoded');});
   assert.equal(await img.getAttribute('src'),r.path);
   const credit=page.locator('.detail-image .credit');const text=await credit.innerText();
   for(const value of [r.creator,r.license,r.caption,r.changes,r.workTitle])assert(normalize(text).includes(normalize(value)),`${width} ${r.slug} missing attribution: ${value}`);
   const links=await credit.locator('a').evaluateAll(es=>es.map(e=>e.href));
   for(const href of [r.sourcePage,r.licenseUrl,r.originalPublicationUrl].filter(Boolean))assert(links.includes(new URL(href).href),`${r.slug}: ${href}`);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${r.slug}: overflow`);
   if(['canon-xl1','ricoh-gr-iii','sony-playstation-5-pro','hp-laserjet-1984','nest-learning-thermostat-1','motorola-pageboy-i','samsung-the-freestyle-2022','samsung-galaxy-xr','logitech-mx-mechanical','instax-mini12'].includes(r.slug)){
    await credit.scrollIntoViewIfNeeded();await page.screenshot({path:`${evidenceRoot}/${r.slug}-${width}.png`,fullPage:false});
   }
  }
  checks.push(`${manifest.records.length} new images decode, matching captions, authors, work titles, source/license links and reflow at ${width}px`);
  console.log('PASS',checks.at(-1));
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${evidenceRoot}/browser-results.json`,JSON.stringify({testedAt:new Date().toISOString(),base,newImages:manifest.records.length,checks,errors,browserVersion:browser.version()},null,2)+'\n');
}finally{await browser.close();}
