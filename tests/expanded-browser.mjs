import {separateResearchNotes} from '../src/story.js';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || process.env.MUSEUM_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.MUSEUM_URL || 'http://127.0.0.1:4173';
const collection = JSON.parse(await readFile('src/collection.json','utf8'));
const { chronicles, videos } = collection;
const exhibits = collection.exhibits.map(e=>({...e,legacyCategory:e.legacyCategory||e.category,category:collection.categoryAssignments?.[e.slug]||e.category,readingLine:collection.readingLineAssignments?.[e.slug]||e.readingLine}));
const editorialManifest=JSON.parse(await readFile('docs/expansion/editorial-import-manifest.json','utf8'));
const approvedSlugs=new Set(editorialManifest.packets.flatMap(packet=>packet.slugs));
const { removedSlugs: historicalRemovedSlugs } = JSON.parse(await readFile('docs/chronicles-manifest.json','utf8'));
const removedSlugs=historicalRemovedSlugs.filter(slug=>!approvedSlugs.has(slug));
const registeredImages=JSON.parse(await readFile('src/image-overrides.json','utf8'));
assert.equal(exhibits.length,400,'Run final browser acceptance against all 400 public products');
assert.deepEqual(exhibits.filter(e=>e.image).map(e=>e.slug).sort(),exhibits.filter(e=>registeredImages[e.slug]).map(e=>e.slug).sort(),'All registered public photographs remain');
const previousImages=JSON.parse(await readFile('docs/evidence/photo-expansion/before-image-overrides.json','utf8'));
for(const [slug,image] of Object.entries(previousImages)) if(byPublicSlug(slug)) assert.deepEqual(registeredImages[slug],image,`${slug}: preserve existing attribution`);
function byPublicSlug(slug){return exhibits.some(e=>e.slug===slug)}
assert.equal(chronicles?.status,'ready','Run final browser acceptance only after sourced chronicles are ready');
const bySlug=new Map(exhibits.map(e=>[e.slug,e]));
const teardowns=exhibits.filter(e=>e.teardown);
const expectedNavigation=[{href:'/',text:'首页'},{href:'/exhibits/',text:'馆藏'},{href:'/chronicles/',text:'产品编年史'},{href:'/about/',text:'关于'}];
await mkdir('docs/evidence',{recursive:true});
const browser = await chromium.launch({headless:true,executablePath:process.argv[3] || process.env.MUSEUM_BROWSER_PATH});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const resumePhase=process.env.MUSEUM_BROWSER_RESUME;
const resumed=['stages','filters'].includes(resumePhase) ? JSON.parse(await readFile('docs/evidence/expanded-browser-failure.json','utf8')) : null;
if(resumed) assert.equal(resumed.exhibitCount,exhibits.length,'Resume only checks captured against the same current exhibit count');
const checks=resumed ? [...resumed.checks] : [];
const resumeOrigin=resumed?.resumedFrom||resumed;
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
  const feature=section.locator('[data-chronicle-feature]');
  const featured=bySlug.get(c.featuredSlug);
  if(!featured) { assert(await section.getByRole('heading').first().isVisible()); return; }
  const name=feature.getByRole('heading',{name:featured.name,exact:true});
  assert(await name.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),`${id}: featured name must be in initial viewport`);
  const imageOrRecord=feature.locator('img[data-exhibit-image], .archive-stage').first();
  assert(await imageOrRecord.evaluate(e=>{const r=e.getBoundingClientRect();return Math.min(r.bottom,innerHeight)-Math.max(r.top,0)>=32}),`${id}: featured photo or record must enter the initial viewport`);
  if(featured.image) await decodeImage(feature.locator('img[data-exhibit-image]').first());
  else assert(await feature.locator('.archive-stage').isVisible(),`${id}: missing featured photo must be explicit`);
}
try {
  if(!resumed) {
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
        assert((await page.locator('h1').textContent()).trim().length>0);
        assert.equal(await page.locator('[data-chronicle]').count(),0,'Homepage must be independent of product chronicles');
        assert.equal(await page.locator('.home-development[data-home-row]').count(),12);
        if(width===320||width===390) assert(await page.locator('.home-development .image-stage').first().evaluate(e=>{const r=e.getBoundingClientRect();return Math.min(r.bottom,innerHeight)-Math.max(r.top,0)>=32}),`Homepage first photograph or record enters viewport at ${width}px`);
        const collectionEntry=page.locator('[data-home-collection]');
        assert.equal(await collectionEntry.getAttribute('href'),'/exhibits/');
        assert(await collectionEntry.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}),`Homepage collection entry must be in initial viewport at ${width}px`);
        assert.equal(await page.locator('.home-development[data-home-row]').count(),12);
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
        await page.screenshot({path:`docs/evidence/expanded-${width}-${route==='/'?'home':route==='/exhibits/'?'collection':'detail'}.png`,fullPage:route!=='/exhibits/'});
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
  assert((await page.locator('h1').textContent()).trim().length>0);
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
      const renderedIds=[...c.stages.flatMap(stage=>stage.nodeIds),...c.nodes.filter(n=>n.kind==='background').map(n=>n.id)];
      assert.deepEqual(await nodes.evaluateAll(items=>items.map(e=>e.dataset.nodeId)),renderedIds);
      assert.deepEqual(await nodes.evaluateAll(items=>items.map(e=>Number(e.dataset.year))),renderedIds.map(id=>c.nodes.find(n=>n.id===id).year));
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
      assert((await section.innerText()).includes(chronicles.contentUpdatedOn||chronicles.checkedThrough),`${c.id}: content update date must be visible`);
      await loadAllImages();
      await page.screenshot({path:`docs/evidence/expanded-${width}-chronicles-${c.id}.png`,fullPage:false});
    }
    check(`All current chronicles: ordered sourced nodes, dates, media and usable first screens at ${width}px`);
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
    if(!n) continue;
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
  await page.screenshot({path:'docs/evidence/expanded-chronicle-empty.png',fullPage:false});
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
  await page.getByLabel('产品类型',{exact:true}).selectOption(bySlug.get('game-boy').category);
  await page.locator('#empty-state').waitFor({state:'visible'});
  assert(await page.locator('#empty-state').isVisible());
  await page.locator('#empty-state [data-clear]').click();
  await page.waitForFunction(count=>document.querySelector('#result-count').textContent===`${count} 件展品`,exhibits.length);
  assert.equal(await page.locator('.exhibit-card:visible').count(),exhibits.length);
  check('Search model normalization, combined empty state and reset');
  await page.getByLabel('产品类型',{exact:true}).selectOption(bySlug.get('game-boy').category);
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
      const copy=separateResearchNotes(e[key]);
      const visible=(await section.locator(':scope > p').allTextContents()).join('').replace(/\s+/g,'');
      assert(visible.includes(copy.body.replace(/\s+/g,'')),`${e.slug}: ${key} body content`);
      if(copy.notes.length){const notes=section.locator('details.source-scope');await notes.evaluate(el=>el.open=true);const noteText=await notes.innerText();for(const note of copy.notes)assert(noteText.includes(note),`${e.slug}: preserved research note`);}
      const sourceHrefs=await section.locator('.paragraph-sources a').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
      for(const id of e.paragraphSources[key]) assert(sourceHrefs.includes(`#source-${e.sources.findIndex(s=>s.id===id)+1}`),`${e.slug}: ${key} citation ${id}`);
    }
    assert(await page.locator('#sources a').count()>0);
    if(e.readerTakeaway) assert((await page.locator('.significance-preview').innerText()).includes(e.readerTakeaway),`${e.slug}: approved reader takeaway is visible`);
    if(e.mediaOpinions?.length) {
      const opinions=page.locator('#media-opinions'); assert(await opinions.isVisible(),e.slug);
      const text=await opinions.innerText();
      for(const opinion of e.mediaOpinions) {
        for(const field of ['media','author','articleDate','praise','shortcomings','evaluationConditions','commercialDisclosure','verificationDepth']) assert(text.includes(opinion[field]),`${e.slug}: opinion ${field}`);
        assert(text.includes(opinion.exactModelVersion||opinion.modelVersion),`${e.slug}: exact opinion version`);
        assert(await opinions.locator(`a[href="${opinion.originalURL||opinion.url}"]`).count()>0);
      }
    }
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
  await page.screenshot({path:'docs/evidence/expanded-description-walkman-overview.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/exhibits/sony-tps-l2/#significance');
  assert(await page.locator('#significance h2').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));
  await page.screenshot({path:'docs/evidence/expanded-description-walkman-mobile.png',fullPage:false});
  check('All public exhibits have sourced substantive narratives; the reading navigation reaches the usage section');
  for(const e of teardowns) {
    await page.goto(base+`/exhibits/${e.slug}/`);
    await loadAllImages();
    await page.screenshot({path:`docs/evidence/expanded-${e.slug}-teardown.png`,fullPage:true});
  }
  check(`${teardowns.length} optional internal-observation sections render only for their matched exhibits`);
  await page.route('**/images/**',route=>route.abort());
  await page.goto(base+'/exhibits/sony-tps-l2/');
  await page.waitForFunction(()=>!document.querySelector('.detail-image .image-fallback').hidden);
  assert(await page.locator('#significance h2').isVisible());
  assert(await page.locator('.detail-image .credit a').count()>0);
  await page.screenshot({path:'docs/evidence/expanded-media-failure.png',fullPage:true});
  await page.goto(base+'/chronicles/?type=phones');
  const failedSection=await selectedChronicle('phones');
  await page.waitForFunction(()=>!document.querySelector('[data-chronicle="phones"] [data-chronicle-feature] .image-fallback').hidden);
  assert(await failedSection.locator('[data-chronicle-feature] .credit a').count()>0);
  assert(await failedSection.locator('.date-basis').count()>0);
  await page.screenshot({path:'docs/evidence/expanded-chronicle-media-failure.png',fullPage:false});
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
  const active=page.locator('.home-development').first();
  const motion=await active.locator('img[data-exhibit-image], .archive-stage').first().evaluate(e=>{
    const style=getComputedStyle(e);
    return [style.transitionDuration,style.animationDuration].flatMap(value=>value.split(',').map(duration=>parseFloat(duration)*(duration.trim().endsWith('ms')?0.001:1)));
  });
  assert(motion.every(duration=>duration<=0.01),'Reduced-motion preference must avoid substantial transitions or animations');
  await page.setViewportSize({width:640,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check('Skip link, no automatic video requests, reduced motion and 640px reflow');
  }
  if(resumed&&resumePhase==='stages') {
    for(const id of ['imaging-expanded-3','imaging-expanded-4']) {
      await page.goto(base+`/chronicles/?type=imaging#${id}`);
      for(let attempt=0;attempt<3;attempt++) {
        await selectedChronicle('imaging');
        await page.waitForFunction(id=>{const r=document.getElementById(id)?.getBoundingClientRect();return r&&r.top>=0&&r.top<innerHeight},id,{timeout:5000});
        await page.reload();
      }
      await page.waitForFunction(id=>{const r=document.getElementById(id)?.getBoundingClientRect();return r&&r.top>=0&&r.top<innerHeight},id,{timeout:5000});
    }
    check('Imaging stage 3 and 4 retain viewport positioning through three consecutive reloads');
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
    if(!n) continue;
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
  await page.screenshot({path:'docs/evidence/expanded-chronicle-empty.png',fullPage:false});
  await page.locator('[data-chronicle-tab="phones"]').first().click();
  await selectedChronicle('phones');
  assert(!await page.locator('#chronicle-empty').isVisible());
  await page.goto(base+'/timeline/');
  await page.waitForURL(url=>url.pathname==='/chronicles/');
  assert.equal(await page.locator('h1').textContent(),'产品编年史');
  check('Unknown type has a recoverable empty state; legacy timeline opens product chronicles');
  }
  if(resumePhase!=='filters') {
  for(const c of chronicles.categories) {
    await page.goto(base+`/chronicles/?type=${c.id}`);
    const section=await selectedChronicle(c.id);
    assert.equal(await section.locator('.chronicle-stage[id][data-stage-id]').count(),c.stages.length);
    for(const stage of c.stages) {
      const locator=section.locator(`.stage-locator a[href="#${stage.id}"]`);
      assert.equal(await locator.count(),1,stage.id);
      await locator.click();
      await page.waitForFunction(id=>location.hash===`#${id}`,stage.id);
      const shared=page.url();
      const historyLength=await page.evaluate(()=>history.length);
      await page.locator(`[data-chronicle-tab="${c.id}"]`).first().click();
      assert.equal(await page.evaluate(()=>history.length),historyLength,`${c.id}: repeated type selection does not add history`);
      assert.equal(page.url(),shared,`${c.id}: repeated type retains stage URL`);
      await page.reload(); await selectedChronicle(c.id);
      assert.equal(page.url(),shared,stage.id);
      await page.waitForFunction(id=>{const r=document.querySelector(`[data-stage-id="${id}"]`)?.getBoundingClientRect();return r&&r.top>=0&&r.top<innerHeight},stage.id,{timeout:5000});
    }
    for(const n of c.nodes) assert.equal(await section.locator(`.chronicle-node[data-node-id="${n.id}"]`).count(),1,n.id);
  }
  check('Every reading line and all 45 stage anchors survive direct sharing and reload');
  }
  for(const c of chronicles.categories) {
    await page.goto(base+`/exhibits/?line=${c.id}`);
    const expected=exhibits.filter(e=>e.readingLine===c.id).map(e=>e.slug).sort();
    await page.waitForFunction(count=>document.querySelectorAll('.exhibit-card:not([hidden])').length===count,expected.length);
    assert.deepEqual(await page.locator('.exhibit-card:visible').evaluateAll(cards=>cards.map(e=>e.dataset.slug).sort()),expected,c.id);
    const lineInput=page.locator('[name="line"]');
    assert.equal(await lineInput.inputValue(),c.id);
    const url=page.url(); await page.reload(); assert.equal(page.url(),url);
  }
  for(const category of new Set(exhibits.map(e=>e.legacyCategory))) {
    await page.goto(base+`/exhibits/?category=${category}`);
    const expected=exhibits.filter(e=>e.category===category||e.legacyCategory===category).map(e=>e.slug).sort();
    await page.waitForFunction(count=>document.querySelectorAll('.exhibit-card:not([hidden])').length===count,expected.length);
    assert.deepEqual(await page.locator('.exhibit-card:visible').evaluateAll(cards=>cards.map(e=>e.dataset.slug).sort()),expected,category);
  }
  check('Every reading-line URL and legacy category URL filters the current public collection');
  const noScript=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  try {
    const staticPage=await noScript.newPage();
    await staticPage.goto(base+'/chronicles/');
    assert.equal(await staticPage.locator('[data-chronicle]:visible').count(),chronicles.categories.length);
    assert.equal(await staticPage.locator('.chronicle-stage:visible').count(),45);
    assert.equal(await staticPage.locator('.chronicle-node:visible').count(),chronicles.categories.flatMap(c=>c.nodes).length);
    assert(await staticPage.locator('.chronicle-node a[href^="https://"]').count()>0);
    await staticPage.screenshot({path:'docs/evidence/expanded-no-js-chronicles.png',fullPage:true});
    await staticPage.goto(base+'/exhibits/sony-tps-l2/');
    assert(await staticPage.locator('#usage').isVisible()); assert(await staticPage.locator('#sources').isVisible());
  } finally { await noScript.close(); }
  check('JavaScript disabled retains every reading line, stage, node, detail narrative and sources');
  const blocked=await browser.newContext({viewport:{width:390,height:844}});
  try {
    await blocked.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Storage denied','SecurityError')}}));
    const blockedPage=await blocked.newPage();
    blockedPage.on('pageerror',error=>errors.push(error.message));
    const c=chronicles.categories.find(c=>c.nodes.some(n=>n.kind==='exhibit')),n=c.nodes.find(n=>n.kind==='exhibit');
    await blockedPage.goto(base+`/exhibits/${n.exhibitSlug}/?from=chronicles&type=${c.id}&node=${n.id}`);
    await blockedPage.waitForFunction(url=>document.querySelector('[data-return]')?.getAttribute('href')===url,`/chronicles/?type=${c.id}#${n.id}`);
    await blockedPage.locator('[data-return]').click();
    await blockedPage.waitForFunction(id=>!document.querySelector(`[data-chronicle="${id}"]`).hidden,c.id);
    await blockedPage.goto(base+'/exhibits/?q=TPS%20L2');
    await blockedPage.waitForFunction(()=>document.querySelectorAll('.exhibit-card:not([hidden])').length===1&&document.querySelector('.exhibit-card:not([hidden])')?.dataset.slug==='sony-tps-l2');
    await blockedPage.screenshot({path:'docs/evidence/expanded-storage-blocked.png',fullPage:false});
  } finally {await blocked.close();}
  check('Unavailable sessionStorage preserves URL context, chronicle selection and catalog search');
  await page.goto(base+'/');
  const homeStageLinks=await page.locator('.home-development a[href^="/chronicles/?type="][href*="#"]').evaluateAll(links=>[...new Set(links.map(a=>a.getAttribute('href')))]);
  assert(homeStageLinks.length>=12,'Homepage reading rows expose usable stage entries');
  for(const href of homeStageLinks) {
    await page.goto(base+'/');
    await page.locator(`.home-development a[href="${href}"]`).first().click();
    const target=new URL(href,base);
    await selectedChronicle(target.searchParams.get('type'));
    assert.equal(new URL(page.url()).hash,target.hash);
    await page.waitForFunction(id=>{const r=document.getElementById(id)?.getBoundingClientRect();return r&&r.top>=0&&r.top<innerHeight},target.hash.slice(1),{timeout:5000});
  }
  check('Every homepage stage entry reaches the selected reading line and visible stage');
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:width>1000?1000:844});
    for(const slug of ['sony-tps-l2','epson-ep101','toshiba-er4','switchbot-s10','valve-steam-controller-2026']) {
      await page.goto(base+`/exhibits/${slug}/`);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${slug}: new summary overflows ${width}`);
      const preview=page.locator('.significance-preview');
      assert(await preview.isVisible(),`${slug}: significance preview ${width}`);
      assert((await preview.innerText()).includes(bySlug.get(slug).readerTakeaway||bySlug.get(slug).significance.split(/[。！？]/)[0]),`${slug}: preview uses existing narrative`);
      await preview.locator('a[href="#significance"]').click();
      await page.waitForFunction(()=>location.hash==='#significance');
      assert(await page.locator('#significance').isVisible());
    }
  }
  check('New significance preview and full narrative anchors work for old and new details at all four viewports');
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/'); await loadAllImages();
  await page.screenshot({path:'docs/evidence/expanded-home-390-viewport.png',fullPage:false});
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    await page.goto(base+'/exhibits/roland-tr808/');
    await page.screenshot({path:`docs/evidence/expanded-tr808-${width}-viewport.png`,fullPage:false});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/exhibits/epson-ep101/');
  await page.screenshot({path:'docs/evidence/expanded-ep101-preview-viewport.png',fullPage:false});
  await page.goto(base+'/'); await loadAllImages();
  await page.screenshot({path:'docs/evidence/expanded-home-viewport.png',fullPage:false});
  await page.goto(base+'/exhibits/epson-ep101/#significance');
  assert(await page.locator('#significance').isVisible());
  await page.screenshot({path:'docs/evidence/expanded-ep101-narrative-viewport.png',fullPage:false});
  assert.deepEqual(errors,[]);
  await writeFile('docs/evidence/expanded-browser-results.json',JSON.stringify({testedAt:new Date().toISOString(),base,resumedFrom:resumed ? {testedAt:resumeOrigin.testedAt,completedChecks:resumeOrigin.completedChecks||resumeOrigin.checks,failure:resumeOrigin.failure} : null,checks,errors,exhibitCount:exhibits.length,photographCount:exhibits.filter(e=>e.image).length,missingPhotographSlugs:exhibits.filter(e=>!e.image).map(e=>e.slug),videoCount:videos.length,teardownCount:teardowns.length,milestone:'All 400 public products, including 224 reviewed award-led additions',editorialProductCount:exhibits.filter(e=>e.readerTakeaway).length,stageCount:chronicles.categories.reduce((sum,c)=>sum+c.stages.length,0),viewports:[320,390,768,1440],browserVersion:browser.version(),chronicles:chronicles.categories.map(c=>({id:c.id,nodeCount:c.nodes.length,exhibitNodeCount:c.nodes.filter(n=>n.kind==='exhibit').length}))},null,2));
} catch(error) {
  await page.screenshot({path:'docs/evidence/expanded-browser-failure.png',fullPage:false}).catch(()=>{});
  await writeFile('docs/evidence/expanded-browser-failure.json',JSON.stringify({testedAt:new Date().toISOString(),base,resumedFrom:resumed ? {testedAt:resumeOrigin.testedAt,completedChecks:resumeOrigin.completedChecks||resumeOrigin.checks,failure:resumeOrigin.failure} : null,checks,errors,exhibitCount:exhibits.length,failure:error.stack,url:page.url()},null,2));
  throw error;
} finally { await browser.close(); }
