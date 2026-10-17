import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.argv[2]);
const base='http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
try {
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto(`${base}/exhibits/`);
  const products=await page.locator('#catalog-data').evaluate(e=>JSON.parse(e.textContent));
  assert.equal(products.length,400);
  for(const program of ['red-dot','australian-good-design','g-mark']){
   await page.getByLabel('设计奖项',{exact:true}).selectOption(program);
   const expected=products.filter(e=>e.awards.some(a=>a.programId===program)).length;
   assert(expected>0);assert.equal(await page.locator('.exhibit-card:visible').count(),expected);
  }
  await page.getByLabel('设计奖项',{exact:true}).selectOption('red-dot');
  await page.getByLabel('产品类型',{exact:true}).selectOption('input-printing');
  await page.getByLabel('搜索展品',{exact:true}).fill('MX');
  await page.getByLabel('排列方式',{exact:true}).selectOption('newest');
  assert.equal(await page.locator('.exhibit-card:visible').count(),1);
  const query=new URL(page.url()).search;assert(new URLSearchParams(query).get('award')==='red-dot');
  await page.reload();assert.equal(await page.getByLabel('设计奖项',{exact:true}).inputValue(),'red-dot');
  const card=page.locator('.exhibit-card:visible');assert.equal(await card.getAttribute('data-slug'),'logitech-mx-mechanical');
  await card.locator('a.exhibit-link').click();
  assert(await page.locator('#awards').isVisible());assert((await page.locator('.date-basis').innerText()).includes('非上市'));
  await page.locator('[data-return]').click();assert.equal(new URL(page.url()).search,query);
  await page.locator('#clear-filters').click();assert.equal(await page.locator('.exhibit-card:visible').count(),400);
  assert.equal(await page.getByLabel('设计奖项',{exact:true}).inputValue(),'');
  await page.getByRole('link',{name:'设计奖项选品依据 ↗',exact:true}).click();
  assert.equal(await page.locator('.award-programs > section').count(),7);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`docs/evidence/expansion-400/awards-${width}.png`});
  await page.goto(`${base}/exhibits/logitech-mx-mechanical/`);await page.locator('#design').scrollIntoViewIfNeeded();
  assert(await page.locator('.product-detail-points').first().isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`docs/evidence/expansion-400/design-${width}.png`});
  checks.push(`${width}px: 400 products; three award filters, combined search, reload, return, clearing, seven programme guides, design points and reflow`);
  console.log('PASS',checks.at(-1));
 }
 assert.deepEqual(errors,[]);
 await writeFile('docs/evidence/expansion-400/awards-browser-results.json',JSON.stringify({testedAt:new Date().toISOString(),checks,errors,browserVersion:browser.version()},null,2)+'\n');
}finally{await browser.close();}
