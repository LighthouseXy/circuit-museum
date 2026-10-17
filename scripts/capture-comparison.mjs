import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2]);
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
const pages=[];
try {
  const page=await browser.newPage();
  for(const [name,url] of [['ai-device-evolution','https://ai-device-evolution.vercel.app/'],['circuit-before-redesign','http://127.0.0.1:4173/']]) {
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:width===1440?1000:844});
      const response=await page.goto(url,{waitUntil:'networkidle',timeout:45000});
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(async img=>{img.loading='eager';try{await img.decode()}catch{}}))});
      await page.screenshot({path:`docs/evidence/${name}-${width}.png`,fullPage:true});
      pages.push({url,status:response.status(),width,title:await page.title()});
    }
  }
  await writeFile('docs/evidence/design-comparison.json',JSON.stringify({capturedAt:new Date().toISOString(),pages},null,2));
  console.log(JSON.stringify(pages));
}finally{await browser.close()}
