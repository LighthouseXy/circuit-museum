import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || process.env.MUSEUM_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.MUSEUM_URL || 'http://127.0.0.1:4173';
const { exhibits, chronicles, videos } = JSON.parse(await readFile('src/collection.json','utf8'));
const { removedSlugs } = JSON.parse(await readFile('docs/chronicles-manifest.json','utf8'));
assert.equal(chronicles?.status,'ready','Run final browser acceptance only after sourced chronicles are ready');
const bySlug=new Map(exhibits.map(e=>[e.slug,e]));
const expectedNavigation=[{href:'/',text:'首页'},{href:'/exhibits/',text:'馆藏'},{href:'/chronicles/',text:'产品编年史'},{href:'/about/',text:'关于'}];
await mkdir('docs/evidence',{recursive:true});
const browser = await chromium.launch({headless:true,executablePath:process.argv[3] || process.env.MUSEUM_BROWSER_PATH});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const checks=[];
const check=(name)=>{checks.push(name);console.log('PASS',name);};
async function loadAllImages() {
  await page.locator('img[data-exhibit-image]:visible').evaluateAll(async images=>{
    await Promise.all(images.map(async img=>{img.loading='eager';try{await img.decode();}catch{}}));
  });
}
async function decodeImage(image) {
  await image.evaluate(async img=>{
    img.loading='eager';
    await img.decode();
    if(!img.naturalWidth) throw new Error(`Image failed: ${img.getAttribute('src')}`);
  });
}
async function selectedChronicle(id) {
  await page.waitForFunction(type=>{
    const section=document.querySelector(`[data-chronicle="${type}"]`);
    return document.documentElement.dataset.chronicleReady==='true'&&section&&!section.hidden&&getComputedStyle(section).display!=='none';
  },id);
  const section=page.locator(`[data-chronicle="${id}"]`);
  assert(await section.isVisible(),id);
  assert.equal(await page.locator('[data-chronicle]:visible').count(),1);
  return section;
}
async function assertMobileChronicle(id) {
  const c=chronicles.categories.find(c=>c.id===id);
  const section=await selectedChronicle(id);
  for(const type of chronicles.categories) {
    const tab=page.locator(`[data-chronicle-tab="${type.id}"]`).first();
    assert(await tab.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}),`Mobile type entry ${type.id} must be in initial viewport`);
  }
  const feature=section.locator('[data-chronicle-feature]');
  const featured=bySlug.get(c.featuredSlug);
  const name=feature.getByRole('heading',{name:featured.name,exact:true});
  assert(await name.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),`${id}: featured name must be in initial viewport`);
  const imageOrRecord=feature.locator('img[data-exhibit-image], .archive-stage').first();
  assert(await imageOrRecord.evaluate(e=>{const r=e.getBoundingClientRect();return Math.min(r.bottom,innerHeight)-Math.max(r.top,0)>=32}),`${id}: featured photo or record must enter the initial viewport`);
  if(featured.image) await decodeImage(feature.locator('img[data-exhibit-image]').first());
  else assert(await feature.locator('.archive-stage').isVisible(),`${id}: missing featured photo must be explicit`);
}
try {
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:width>1000?1000:844});
    for (const route of ['/','/exhibits/','/exhibits/sony-tps-l2/','/about/',...chronicles.categories.map(c=>`/chronicles/?type=${c.id}`)]) {
      await page.goto(base+route);
      await page.locator('h1').waitFor();
      assert.deepEqual(await page.locator('.site-header nav a').evaluateAll(links=>links.map(a=>({href:a.getAttribute('href'),text:a.textContent.trim()}))),expectedNavigation,`Main navigation order: ${route}`);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${route} @ ${width}`);
      if(width===390 && route==='/exhibits/') {
        assert(await page.locator('.exhibit-card h3').first().evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'First product name must enter the initial mobile viewport');
        assert(await page.locator('.exhibit-card .image-stage').first().evaluate(e=>{const r=e.getBoundingClientRect();return Math.min(r.bottom,innerHeight)-Math.max(r.top,0)>=32}),'First product photo or record must enter the initial mobile viewport');
      }
      if(route==='/') {
        assert.equal(await page.locator('h1').textContent(),'电子产品设计与生活史');
        assert.equal(await page.locator('[data-chronicle]').count(),0,'Homepage must be independent of product chronicles');
        assert.deepEqual(await page.locator('.home-selected .exhibit-card').evaluateAll(cards=>cards.map(card=>card.dataset.slug)),['sony-tps-l2','macbook-2006','iphone-4']);
        const collectionEntry=page.locator('[data-home-collection]');
        assert.equal(await collectionEntry.getAttribute('href'),'/exhibits/');
        assert(await collectionEntry.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}),`Homepage collection entry must be in initial viewport at ${width}px`);
        assert.equal(await page.locator('.home-chronicle-links a').count(),chronicles.categories.length);
      }
      if(route.startsWith('/chronicles/')) {
        assert.equal(await page.locator('h1').textContent(),'产品编年史');
        assert.equal(await page.locator('.home-introduction').count(),0,'Product chronicles must retain their independent page');
        const type=new URL(base+route).searchParams.get('type');
        await selectedChronicle(type);
        if(width===390) await assertMobileChronicle(type);
      }
      const firstImage=page.locator('img[data-exhibit-image]:visible').first();
      if (await firstImage.count()) await decodeImage(firstImage);
      if ((width===1440||width===390) && ['/','/exhibits/','/exhibits/sony-tps-l2/'].includes(route)) {
        await loadAllImages();
        await page.screenshot({path:`docs/evidence/${width}-${route==='/'?'home':route==='/exhibits/'?'collection':'detail'}.png`,fullPage:route!=='/exhibits/'});
      }
    }
    check(`No horizontal overflow and primary images render at ${width}px on all page types`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/');
  await page.locator('[data-home-collection]').click();
  await page.waitForURL(url=>url.pathname==='/exhibits/');
  assert(await page.locator('#catalog-grid').isVisible());
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'首页',exact:true}).click();
  assert.equal(await page.locator('h1').textContent(),'电子产品设计与生活史');
  await page.locator('.home-entry-links a[href="/chronicles/"]').click();
  await page.waitForURL(url=>url.pathname==='/chronicles/');
  await selectedChronicle('phones');
  assert.equal(await page.locator('h1').textContent(),'产品编年史');
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'首页',exact:true}).click();
  assert.equal(await page.locator('[data-chronicle]').count(),0);
  assert(await page.locator('.home-introduction').isVisible());
  check('Homepage has the ordered four-item navigation and a usable collection entry; homepage and chronicles remain independent destinations');
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    for(const c of chronicles.categories) {
      await page.goto(base+`/chronicles/?type=${c.id}`);
      const section=await selectedChronicle(c.id);
      assert.equal(await page.locator('h1').textContent(),'产品编年史');
      assert.equal(await page.locator(`[data-chronicle-tab="${c.id}"]`).first().getAttribute('aria-current'),'true');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${c.id} overflow at ${width}`);
      if(width===390) await assertMobileChronicle(c.id);
      const nodes=section.locator('[data-node-id]');
      assert.deepEqual(await nodes.evaluateAll(items=>items.map(e=>e.dataset.nodeId)),c.nodes.map(n=>n.id));
      assert.deepEqual(await nodes.evaluateAll(items=>items.map(e=>Number(e.dataset.year))),c.nodes.map(n=>n.year).sort((a,b)=>a-b));
      for(const n of c.nodes) {
        const node=section.locator(`[data-node-id="${n.id}"]`);
        assert.equal(await node.getAttribute('id'),n.id);
        const text=await node.innerText();
        for(const field of ['title','summary','change','dateLabel']) assert(text.includes(n[field]),`${n.id}: visible ${field}`);
        assert((await node.locator('.date-basis').innerText()).includes(n.dateLabel),`${n.id}: explicit date basis`);
        for(const s of n.sources) {
          const source=node.locator('.node-sources a');
          const links=await source.evaluateAll(items=>items.map(e=>({href:e.getAttribute('href'),text:e.innerText.trim()})));
          assert(links.some(link=>link.href===s.url&&link.text),`${n.id}: visible source ${s.url}`);
        }
        if(n.kind==='exhibit') {
          const e=bySlug.get(n.exhibitSlug);
          const link=node.locator('[data-chronicle-detail]').first();
          const target=new URL(await link.getAttribute('href'),base);
          assert.equal(target.pathname,`/exhibits/${e.slug}/`);
          assert.equal(target.searchParams.get('from'),'chronicles');
          assert.equal(target.searchParams.get('type'),c.id);
          assert.equal(target.searchParams.get('node'),n.id);
          if(e.image) await decodeImage(node.locator('img[data-exhibit-image]').first());
          else assert(await node.locator('.archive-stage').isVisible(),`${n.id}: explicit missing photo`);
        }
      }
      assert((await section.innerText()).includes(chronicles.checkedThrough),`${c.id}: checking cutoff must be visible`);
      await loadAllImages();
      await page.screenshot({path:`docs/evidence/${width}-chronicles-${c.id}.png`,fullPage:false});
    }
    check(`All five chronicles: ordered sourced nodes, dates, media and usable first screens at ${width}px`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/chronicles/?type=phones');
  await page.locator('[data-chronicle-tab="computers"]').first().click();
  await selectedChronicle('computers');
  assert.equal(new URL(page.url()).searchParams.get('type'),'computers');
  await page.reload();
  await selectedChronicle('computers');
  await page.locator('[data-chronicle-tab="headphones"]').first().click();
  await selectedChronicle('headphones');
  await page.goBack();
  await selectedChronicle('computers');
  await page.goForward();
  await selectedChronicle('headphones');
  await page.locator('[data-chronicle-tab="phones"]').first().focus();
  await page.keyboard.press('Enter');
  await selectedChronicle('phones');
  check('Type links, keyboard, share URL, reload and browser history retain the selected chronicle');
  for(const c of chronicles.categories) {
    const n=c.nodes.find(n=>n.kind==='exhibit');
    await page.goto(base+`/chronicles/?type=${c.id}`);
    const section=await selectedChronicle(c.id);
    await section.locator(`[data-node-id="${n.id}"] [data-chronicle-detail]`).first().click();
    await page.locator('[data-return]').waitFor();
    const expected=`/chronicles/?type=${c.id}#${n.id}`;
    await page.waitForFunction(url=>document.querySelector('[data-return]')?.getAttribute('href')===url,expected);
    await page.locator('[data-return]').click();
    assert.equal(new URL(page.url()).pathname+new URL(page.url()).search+new URL(page.url()).hash,expected);
    await selectedChronicle(c.id);
    await page.waitForFunction(id=>{const r=document.getElementById(id)?.getBoundingClientRect();return r&&r.top<innerHeight&&r.bottom>0},n.id);
  }
  await page.goto(base+'/exhibits/sony-tps-l2/');
  await page.waitForFunction(()=>document.querySelector('[data-return]')?.getAttribute('href')==='/exhibits/');
  check('Each chronicle detail returns to its type and node; direct detail does not inherit stale chronicle context');
  const directContext=await browser.newContext({viewport:{width:390,height:844}});
  const directPage=await directContext.newPage();
  directPage.on('pageerror',error=>errors.push(error.message));
  try {
    const c=chronicles.categories.find(c=>c.id==='phones'),n=c.nodes.find(n=>n.kind==='exhibit');
    await directPage.goto(base+`/exhibits/${n.exhibitSlug}/?from=chronicles&type=${c.id}&node=${n.id}`);
    await directPage.waitForFunction(url=>document.querySelector('[data-return]')?.getAttribute('href')===url,`/chronicles/?type=${c.id}#${n.id}`);
    await directPage.locator('[data-return]').click();
    await directPage.waitForFunction(id=>{const section=document.querySelector('[data-chronicle="phones"]');const r=document.getElementById(id)?.getBoundingClientRect();return section&&!section.hidden&&r&&r.top<innerHeight&&r.bottom>0},n.id);
    await directPage.goto(base+`/exhibits/${n.exhibitSlug}/`);
    await directPage.waitForFunction(()=>document.querySelector('[data-return]')?.getAttribute('href')==='/exhibits/');
    await directPage.goto(base+`/exhibits/${n.exhibitSlug}/?from=chronicles&type=unknown&node=missing`);
    await directPage.waitForFunction(()=>document.querySelector('[data-return]')?.getAttribute('href')==='/exhibits/');
  } finally {await directContext.close();}
  check('A shared chronicle-detail URL restores context in a fresh browser session; plain detail has a safe default');
  await page.goto(base+'/chronicles/?type=unknown');
  await page.locator('#chronicle-empty').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-chronicle]:visible').count(),0);
  await page.screenshot({path:'docs/evidence/chronicle-empty.png',fullPage:false});
  await page.locator('[data-chronicle-tab="phones"]').first().click();
  await selectedChronicle('phones');
  assert(!await page.locator('#chronicle-empty').isVisible());
  await page.goto(base+'/timeline/');
  await page.waitForURL(url=>url.pathname==='/chronicles/');
  assert.equal(await page.locator('h1').textContent(),'产品编年史');
  check('Unknown type has a recoverable empty state; legacy timeline opens product chronicles');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/exhibits/');
  await page.getByLabel('搜索展品',{exact:true}).fill('  TPS L2  ');
  await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='1 件展品');
  assert.equal(await page.locator('.exhibit-card:visible').count(),1);
  assert.match(page.url(),/q=/);
  await page.getByLabel('产品类型',{exact:true}).selectOption('gaming');
  await page.locator('#empty-state').waitFor({state:'visible'});
  assert(await page.locator('#empty-state').isVisible());
  await page.locator('#empty-state [data-clear]').click();
  await page.waitForFunction(count=>document.querySelector('#result-count').textContent===`${count} 件展品`,exhibits.length);
  assert.equal(await page.locator('.exhibit-card:visible').count(),exhibits.length);
  check('Search model normalization, combined empty state and reset');
  await page.getByLabel('产品类型',{exact:true}).selectOption('gaming');
  await page.getByLabel('年代',{exact:true}).selectOption('1980');
  await page.getByLabel('搜索展品',{exact:true}).fill('Game Boy');
  await page.waitForFunction(()=>new URLSearchParams(location.search).get('q')==='Game Boy');
  const listUrl=page.url();
  assert.equal(await page.locator('.exhibit-card:visible').count(),1);
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#decade').value==='1980'&&document.querySelector('#result-count').textContent==='1 件展品');
  assert.equal(await page.getByLabel('年代',{exact:true}).inputValue(),'1980');
  await page.locator('.exhibit-card:visible .exhibit-link').click();
  await page.waitForFunction(url=>document.querySelector('[data-return]')?.href===url,listUrl);
  await page.locator('[data-return]').click();
  await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='1 件展品');
  assert.equal(page.url(),listUrl);
  assert.equal(await page.locator('.exhibit-card:visible').count(),1);
  check('Filter share URL, reload, detail and return retain combined filters');
  await page.goto(base+'/exhibits/?sort=newest');
  const descending=[...exhibits].sort((a,b)=>b.year-a.year||a.name.localeCompare(b.name,'zh-CN'));
  await page.waitForFunction(slug=>document.querySelector('#catalog-grid .exhibit-card:not([hidden])')?.dataset.slug===slug,descending[0].slug);
  assert.equal(await page.locator('.exhibit-card:visible').first().getAttribute('data-slug'),descending[0].slug);
  await page.getByLabel('搜索展品',{exact:true}).fill('苹果');
  const appleCount=exhibits.filter(e=>e.brand==='Apple').length;
  await page.waitForFunction(count=>document.querySelector('#result-count').textContent===`${count} 件展品`,appleCount);
  assert.equal(await page.locator('.exhibit-card:visible').count(),appleCount);
  check('Descending sort and Chinese brand aliases');
  for (const e of exhibits) {
    const response=await page.goto(base+`/exhibits/${e.slug}/`);
    assert.equal(response.status(),200,e.slug);
    assert.equal(await page.locator('h1').textContent(),e.name);
    if(e.image) await decodeImage(page.locator('.detail-image img'));
    else assert(await page.locator('.detail-image .archive-stage').isVisible(),e.slug);
    assert(await page.locator('#significance h2').isVisible());
    const narrativeKeys=['significance','context','design','usage','limitations'];
    assert.deepEqual(await page.locator('.detail-body > section[id]').evaluateAll(sections=>sections.map(s=>s.id).filter(id=>['significance','context','design','usage','limitations'].includes(id))),narrativeKeys);
    for(const key of narrativeKeys) {
      const section=page.locator(`#${key}`);
      assert((await section.innerText()).includes(e[key].split(/\n\s*\n/)[0]),`${e.slug}: ${key} content`);
      const sourceHrefs=await section.locator('.paragraph-sources a').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
      for(const id of e.paragraphSources[key]) assert(sourceHrefs.includes(`#source-${e.sources.findIndex(s=>s.id===id)+1}`),`${e.slug}: ${key} citation ${id}`);
    }
    assert(await page.locator('#sources a').count()>0);
    assert.equal(await page.locator('#teardown').count(),e.teardown ? 1 : 0);
    if(e.teardown?.image) await decodeImage(page.locator('#teardown img'));
    const appearances=chronicles.categories.flatMap(c=>c.nodes.filter(n=>n.exhibitSlug===e.slug).map(n=>({type:c.id,node:n.id})));
    for(const a of appearances) assert(await page.locator(`.chronicle-detail-links a[href="/chronicles/?type=${a.type}#${a.node}"]`).count()>0,`${e.slug}: return-to-chronicle entry`);
  }
  check(`All ${exhibits.length} direct detail URLs, content and citations; ${exhibits.filter(e=>e.image).length} photographs decode; absent photographs explicitly labeled`);
  await page.goto(base+'/exhibits/sony-tps-l2/');
  await page.getByRole('navigation',{name:'展品阅读目录'}).getByRole('link',{name:'使用方式',exact:true}).click();
  assert.equal(new URL(page.url()).hash,'#usage');
  assert(await page.locator('#usage h2').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));
  await page.setViewportSize({width:1440,height:1300});
  await page.goto(base+'/exhibits/sony-tps-l2/');
  await decodeImage(page.locator('.detail-image img'));
  await page.screenshot({path:'docs/evidence/description-walkman-overview.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/exhibits/sony-tps-l2/#significance');
  assert(await page.locator('#significance h2').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));
  await page.screenshot({path:'docs/evidence/description-walkman-mobile.png',fullPage:false});
  check('All 40 exhibits have sourced substantive narratives; the reading navigation reaches the usage section');
  const teardowns=exhibits.filter(e=>e.teardown);
  for(const e of teardowns) {
    await page.goto(base+`/exhibits/${e.slug}/`);
    await loadAllImages();
    await page.screenshot({path:`docs/evidence/${e.slug}-teardown.png`,fullPage:true});
  }
  check(`${teardowns.length} optional internal-observation sections render only for their matched exhibits`);
  await page.route('**/images/**',route=>route.abort());
  await page.goto(base+'/exhibits/sony-tps-l2/');
  await page.waitForFunction(()=>!document.querySelector('.detail-image .image-fallback').hidden);
  assert(await page.locator('#significance h2').isVisible());
  assert(await page.locator('.detail-image .credit a').count()>0);
  await page.screenshot({path:'docs/evidence/media-failure.png',fullPage:true});
  await page.goto(base+'/chronicles/?type=phones');
  const failedSection=await selectedChronicle('phones');
  await page.waitForFunction(()=>!document.querySelector('[data-chronicle="phones"] [data-chronicle-feature] .image-fallback').hidden);
  assert(await failedSection.locator('[data-chronicle-feature] .credit a').count()>0);
  assert(await failedSection.locator('.date-basis').count()>0);
  await page.screenshot({path:'docs/evidence/chronicle-media-failure.png',fullPage:false});
  await page.unroute('**/images/**');
  check('Failed media shows named fallback and source in both detail and chronicle; text and dates remain usable');
  const missing=await page.goto(base+'/exhibits/does-not-exist/');
  assert.equal(missing.status(),404);
  assert(await page.getByRole('link',{name:'返回馆藏 ↗',exact:true}).isVisible());
  for(const slug of removedSlugs) {
    assert(!bySlug.has(slug),`Withdrawn slug ${slug} cannot remain in current data`);
    const response=await page.goto(base+`/exhibits/${slug}/`);
    assert.equal(response.status(),404,`Withdrawn detail ${slug}`);
    assert(await page.getByRole('link',{name:'返回馆藏 ↗',exact:true}).isVisible());
  }
  check(`Unknown exhibit and ${removedSlugs.length} withdrawn detail URLs respond with useful 404`);
  await page.goto(base+'/');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'跳到主要内容');
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash,'#main');
  assert.equal(await page.locator('iframe,video[autoplay]').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});
  const active=page.locator('.home-selected');
  const motion=await active.locator('img[data-exhibit-image], .archive-stage').first().evaluate(e=>{
    const style=getComputedStyle(e);
    return [style.transitionDuration,style.animationDuration].flatMap(value=>value.split(',').map(duration=>parseFloat(duration)*(duration.trim().endsWith('ms')?0.001:1)));
  });
  assert(motion.every(duration=>duration<=0.01),'Reduced-motion preference must avoid substantial transitions or animations');
  await page.setViewportSize({width:640,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check('Skip link, no automatic video requests, reduced motion and 640px reflow');
  assert.deepEqual(errors,[]);
  await writeFile('docs/evidence/browser-results.json',JSON.stringify({testedAt:new Date().toISOString(),base,checks,errors,exhibitCount:exhibits.length,photographCount:exhibits.filter(e=>e.image).length,missingPhotographSlugs:exhibits.filter(e=>!e.image).map(e=>e.slug),videoCount:videos.length,teardownCount:teardowns.length,chronicles:chronicles.categories.map(c=>({id:c.id,nodeCount:c.nodes.length,exhibitNodeCount:c.nodes.filter(n=>n.kind==='exhibit').length}))},null,2));
} finally { await browser.close(); }
