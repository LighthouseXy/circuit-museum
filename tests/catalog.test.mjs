import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { selectExhibits, normalize } from '../src/catalog.js';

const collection = JSON.parse(await readFile(new URL('../src/collection.json', import.meta.url)));
const { categories, videos, chronicles } = collection;
const exhibits = collection.exhibits.map(e => ({ ...e, legacyCategory: e.legacyCategory || e.category, category: collection.categoryAssignments?.[e.slug] || e.category, readingLine: collection.readingLineAssignments?.[e.slug] || e.readingLine }));
const manifest = JSON.parse(await readFile(new URL('../docs/chronicles-manifest.json', import.meta.url)));
const editorialManifest=JSON.parse(await readFile(new URL('../docs/expansion/editorial-import-manifest.json',import.meta.url)));
const approvedSlugs=new Set(editorialManifest.packets.flatMap(packet=>packet.slugs));
let awardExpansion=null;
try { awardExpansion=JSON.parse(await readFile(new URL('../docs/expansion/awards-400-approved.json',import.meta.url))); } catch(error) { if(error.code!=='ENOENT') throw error; }
const registeredImages=JSON.parse(await readFile(new URL('../src/image-overrides.json',import.meta.url)));
const media = JSON.parse(await readFile(new URL('../docs/media-register.json', import.meta.url)));
const chronicleTypes = chronicles.categories.map(c => c.id);
test('Current unique, substantive exhibits use valid categories, related links, images and references', async () => {
  assert.equal(exhibits.length,awardExpansion?400:176,'Publish preserved products plus exactly the reviewed award expansion');
  assert.equal(new Set(exhibits.map(e=>Number(e.id))).size,exhibits.length,'Stable numeric exhibit IDs must be unique');
  const built = await readdir(new URL('../dist/exhibits/',import.meta.url),{withFileTypes:true});
  assert.deepEqual(built.filter(e=>e.isDirectory()).map(e=>e.name).sort(),exhibits.map(e=>e.slug).sort(),'Generated details must exactly match the current catalog');
  const slugs = new Set(exhibits.map(e=>e.slug));
  assert.equal(slugs.size,exhibits.length);
  assert.equal(new Set(exhibits.map(e=>e.name)).size,exhibits.length);
  for (const e of exhibits) {
    assert(categories.some(c=>c.id===e.category),e.slug);
    for (const field of ['summary','context','design','significance']) assert(e[field]?.length>8,`${e.slug}.${field}`);
    assert(e.sources.length>0,e.slug);
    assert(e.facts.length>=1,e.slug);
    assert(Array.isArray(e.relatedSlugs),e.slug);
    assert.equal(new Set(e.relatedSlugs).size,e.relatedSlugs.length,e.slug);
    for (const slug of e.relatedSlugs) assert(slugs.has(slug)&&slug!==e.slug,`${e.slug} related ${slug}`);
    for (const s of e.sources) assert.equal(new URL(s.url).protocol,'https:');
    if(e.image) {
      assert(e.image.creator&&e.image.license&&e.image.licenseUrl&&e.image.sourcePage,e.slug);
      assert(e.image.path.startsWith('/images/'),e.slug);
      assert((await readFile(new URL(`../public${e.image.path}`,import.meta.url))).length>1000,e.slug);
    }
  }
  for(const slug of ['sony-tps-l2','macbook-2006','iphone-4']) assert(slugs.has(slug),`Required exhibit ${slug}`);
  const macbook=exhibits.find(e=>e.slug==='macbook-2006');
  assert.equal(macbook.year,2006);
  assert(!/Pro/i.test(macbook.name),'The required MacBook is the first MacBook, not MacBook Pro');
  for(const slug of manifest.removedSlugs.filter(slug=>!approvedSlugs.has(slug))) assert(!slugs.has(slug),`Withdrawn exhibit ${slug} must not remain in the current catalog`);
  assert.deepEqual(videos.map(v=>v.id).sort(),media.videos.filter(v=>slugs.has(v.exhibitSlug)).map(v=>v.id).sort(),'Retain registered videos for current exhibits');
  for(const v of videos) {
    assert(slugs.has(v.exhibitSlug),v.title);
    assert.equal(new URL(v.url).protocol,'https:');
  }
  assert.deepEqual(exhibits.filter(e=>e.image).map(e=>e.slug).sort(),exhibits.filter(e=>registeredImages[e.slug]).map(e=>e.slug).sort(),'Deliver all available registered photographs');
  const prior=JSON.parse(await readFile(new URL('../docs/evidence/photo-expansion/before-image-overrides.json',import.meta.url)));
  const original=JSON.parse(await readFile(new URL('../docs/evidence/expansion-baseline-collection.json',import.meta.url))).exhibits.filter(e=>prior[e.slug]);
  assert.equal(original.length,33);
  for(const e of original) assert.deepEqual(exhibits.find(x=>x.slug===e.slug).image,prior[e.slug],`${e.slug}: original photograph preserved`);
  for(const e of exhibits.filter(e=>e.image)) assert.deepEqual(e.image,registeredImages[e.slug],`${e.slug}: registered photo identity and licensing`);
});
test('every exhibit explains representativeness, use and limitations with matching paragraph references',async()=>{
  const sections=['significance','context','design','usage','limitations'];
  for(const e of exhibits) {
    const ids=new Set(e.sources.map(s=>s.id));
    assert.equal(new Set(sections.map(key=>e[key])).size,sections.length,`${e.slug}: narrative sections must not repeat one another`);
    for(const key of sections) {
      assert(typeof e[key]==='string'&&e[key].trim().length>=60,`${e.slug}.${key}: substantive explanation`);
      assert(e.paragraphSources?.[key]?.length,`${e.slug}.${key}: paragraph sources`);
      assert(e.paragraphSources[key].every(id=>ids.has(id)),`${e.slug}.${key}: references belong to this exhibit`);
    }
    const html=await readFile(new URL(`../dist/exhibits/${e.slug}/index.html`,import.meta.url),'utf8');
    const positions=sections.map(key=>html.indexOf(`id="${key}"`));
    assert(positions.every(p=>p>=0)&&positions.every((p,i)=>!i||p>positions[i-1]),`${e.slug}: representativeness comes first, followed by context, design, use and limitations`);
    assert(html.includes('aria-label="展品阅读目录"'),`${e.slug}: reading navigation`);
    for(const key of sections) assert(html.includes(`href="#${key}"`),`${e.slug}: section ${key} is reachable`);
    if(e.year===2026) assert(html.includes('当代观察'),`${e.slug}: contemporary observation must not be described as settled history`);
  }
});
test('Sourced product chronicles reference the same catalog without adding duplicate exhibits',()=>{
  assert(chronicles,'Product chronicles must be imported');
  assert.equal(chronicles.status,'ready','Research must be ready before final acceptance');
  assert.equal(chronicles.title,'产品编年史');
  assert.match(chronicles.checkedThrough,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(chronicleTypes.length,16);
  assert.equal(new Set(chronicleTypes).size,16);
  for(const id of ['phones','computers','watches','bands','headphones']) assert(chronicleTypes.includes(id));
  const slugs=new Set(exhibits.map(e=>e.slug)), ids=new Set();
  for(const c of chronicles.categories) {
    assert(c.label&&c.title&&c.introduction.trim().length,c.id);
    assert(c.stages.length>0,c.id);
    assert(Array.isArray(c.nodes),c.id);
    if(c.featuredSlug!==null) assert(c.nodes.some(n=>n.kind==='exhibit'&&n.exhibitSlug===c.featuredSlug),`${c.id}: featured object must reference an existing node`);
    const years=c.nodes.map(n=>n.year);
    assert.deepEqual(years,[...years].sort((a,b)=>a-b),`${c.id}: chronological node order`);
    if(years.length) { assert.equal(c.startYear,Math.min(...years),c.id); assert.equal(c.endYear,Math.max(...years),c.id); }
    for(const n of c.nodes) {
      assert(typeof n.id==='string'&&n.id.length>0&&!ids.has(n.id),`Unique node ${n.id}`);
      ids.add(n.id);
      assert(Number.isInteger(n.year),n.id);
      assert(typeof n.dateKind==='string'&&n.dateKind.trim().length,n.id);
      assert(['exhibit','background'].includes(n.kind),n.id);
      for(const field of ['title','summary','change','dateLabel']) assert(typeof n[field]==='string'&&n[field].length>0,`${n.id}.${field}`);
      assert(n.sources?.length>0,`${n.id}: sources`);
      for(const s of n.sources) {
        assert(s.id&&s.title&&s.publisher&&s.supports&&s.checkedOn,`${n.id}: complete source`);
        assert.equal(new URL(s.url).protocol,'https:');
      }
      if(n.kind==='exhibit') assert(slugs.has(n.exhibitSlug),`${n.id}: real detail ${n.exhibitSlug}`);
      else assert(!n.exhibitSlug,`${n.id}: background must not invent a product detail`);
      for(const slug of n.relatedExhibitSlugs||[]) assert(slugs.has(slug),`${n.id}: related product ${slug}`);
    }
  }
});
test('independent homepage introduces the museum and links to collection and product chronicles',async()=>{
  const routes=['index.html','exhibits/index.html','chronicles/index.html','about/index.html'];
  const pages=await Promise.all(routes.map(route=>readFile(new URL(`../dist/${route}`,import.meta.url),'utf8')));
  const expected=[['/','首页'],['/exhibits/','馆藏'],['/chronicles/','产品编年史'],['/about/','关于']];
  for(const html of pages) {
    const nav=html.match(/<nav aria-label="主导航">([\s\S]*?)<\/nav>/)?.[1];
    assert(nav,'Main navigation must exist');
    assert.deepEqual([...nav.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(([,href,label])=>[href,label]),expected);
  }
  const [home,,chronicle]=pages;
  assert.match(home,/<h1>[\s\S]+?<\/h1>/);
  assert(home.includes('真实电子产品的线上博物馆'));
  assert.match(home,/<a[^>]*data-home-collection[^>]*href="\/exhibits\/"/);
  assert(home.includes('href="/chronicles/">阅读产品编年史'));
  assert.equal([...home.matchAll(/data-home-row=/g)].length,12);
  assert(!home.includes('data-chronicle="'),'Homepage must not duplicate the chronicle module');
  assert.match(chronicle,/<h1>产品编年史<\/h1>/);
  assert(!chronicle.includes('home-introduction'),'Chronicles must retain their own destination');
  assert.equal([...home.matchAll(/data-home-row=/g)].length,12);
  for(const c of chronicles.categories) assert(home.includes(`/exhibits/?line=${c.id}`),c.id);
  for(const c of chronicles.categories) assert(home.includes(`href="/chronicles/?type=${c.id}"`),c.id);
});
test('search normalizes model punctuation, whitespace, case and Chinese aliases',()=>{
  assert.equal(normalize(' TPS–L2 '),'tpsl2');
  assert(selectExhibits(exhibits,{q:' TPS L2 '}).some(e=>e.slug==='sony-tps-l2'));
  assert(selectExhibits(exhibits,{q:'随身听'}).some(e=>e.slug==='sony-tps-l2'));
  assert.equal(selectExhibits(exhibits,{q:'苹果'}).length,exhibits.filter(e=>e.brand==='Apple').length);
});
test('shared brand aliases apply to new products without replacing model aliases or filters',()=>{
  const brands=[['APPLE','苹果'],['Sony','索尼'],['Sony Computer Entertainment','索尼'],['Nintendo','任天堂'],['Motorola','摩托罗拉'],['Xiaomi','小米'],['Fitbit',' F i t B i t '],['Hewlett-Packard','惠普'],['Casio','卡西欧'],['Amazon','亚马逊'],['Raspberry Pi Foundation','树莓派']];
  const fixtures=brands.map(([brand],i)=>({slug:`brand-${i}`,name:'Example device',brand,aliases:[`Model-${i}`],tags:[],summary:'An example',category:'example',year:2026}));
  for(const [brand,q] of brands) assert(selectExhibits(fixtures,{q}).some(e=>e.brand===brand),`${brand}: ${q}`);
  assert.deepEqual(selectExhibits(fixtures,{q:'Model 0'}).map(e=>e.slug),['brand-0']);
  assert.deepEqual(selectExhibits(exhibits,{q:'苹果',category:exhibits.find(e=>e.slug==='macbook-2006').category}).map(e=>e.slug).sort(),exhibits.filter(e=>e.brand==='Apple'&&e.category===exhibits.find(e=>e.slug==='macbook-2006').category).map(e=>e.slug).sort());
});
test('type, decade and search compose with AND; sort and impossible query work',()=>{
  const got=selectExhibits(exhibits,{category:exhibits.find(e=>e.slug==='game-boy').category,decade:'1980',q:'Game Boy'});
  assert.deepEqual(got.map(e=>e.slug),['game-boy']);
  assert.equal(selectExhibits(exhibits,{category:exhibits.find(e=>e.slug==='game-boy').category,q:'Walkman'}).length,0);
  const asc=selectExhibits(exhibits,{}),desc=selectExhibits(exhibits,{sort:'newest'});
  assert.equal(asc.length,exhibits.length);
  assert.equal(asc[0].year,Math.min(...exhibits.map(e=>e.year)));
  assert.equal(desc[0].year,Math.max(...exhibits.map(e=>e.year)));
});

test('built pages have resolving internal links, anchors and local assets', async()=>{
  const root=new URL('../dist/',import.meta.url);
  let checked=0;
  async function walk(dir) {
    for(const item of await readdir(dir,{withFileTypes:true})) {
      const file=new URL(item.name+(item.isDirectory()?'/':''),dir);
      if(item.isDirectory()) {await walk(file);continue;}
      if(!item.name.endsWith('.html')) continue;
      const html=await readFile(file,'utf8');
      for(const [,raw] of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
        const url=raw.replaceAll('&amp;','&');
        if(!url.startsWith('/')&&!url.startsWith('#')) continue;
        const parsed=new URL(url,'http://museum.test');
        const target=url.startsWith('#')?file:new URL(parsed.pathname.slice(1)+(parsed.pathname.endsWith('/')?'index.html':''),root);
        assert((await stat(target)).isFile(),url);
        if(parsed.hash) {
          const targetHtml=await readFile(target,'utf8');
          assert(targetHtml.includes(`id="${parsed.hash.slice(1)}"`),`${file.pathname} -> ${url}`);
        }
        checked++;
      }
    }
  }
  await walk(root);
  assert(checked>500);
});


test('Original exhibits and original chronicle nodes retain their exact archived data',async()=>{
  const baseCollection=JSON.parse(await readFile(new URL('../docs/evidence/expansion-baseline-collection.json',import.meta.url)));
  const baseChronicles=JSON.parse(await readFile(new URL('../docs/evidence/expansion-baseline-chronicles.json',import.meta.url)));
  const originalExhibits=Array.isArray(baseCollection)?baseCollection:baseCollection.exhibits;
  const originalCategories=(baseChronicles.chronicles||baseChronicles).categories;
  assert.equal(originalExhibits.length,40);
  const officialExhibits=JSON.parse(await readFile(new URL('../docs/collection.json',import.meta.url))).exhibits;
  for(const original of originalExhibits) assert.deepEqual(officialExhibits.find(e=>e.slug===original.slug),original,original.slug);
  const officialChronicles=JSON.parse(await readFile(new URL('../docs/chronicles.json',import.meta.url)));
  const originalNodes=originalCategories.flatMap(c=>c.nodes);
  assert.equal(originalNodes.length,29);
  for(const original of originalNodes) assert.deepEqual((officialChronicles.chronicles||officialChronicles).categories.flatMap(c=>c.nodes).find(n=>n.id===original.id),original,original.id);
});

test('Stages have a closed public graph and every public product has exactly one stage and reading line',async()=>{
  const assigned=[],stageIds=new Set();
  const html=await readFile(new URL('../dist/chronicles/index.html',import.meta.url),'utf8');
  for(const c of chronicles.categories) {
    const nodes=new Map(c.nodes.map(n=>[n.id,n]));
    const staged=[];
    for(const stage of c.stages) {
      assert(!stageIds.has(stage.id),stage.id); stageIds.add(stage.id);
      for(const field of ['title','need','turn']) assert(typeof stage[field]==='string'&&stage[field].trim().length,`${stage.id}.${field}`);
      assert(Array.isArray(stage.nodeIds),stage.id);
      assert(stage.yearRange===null||(Number.isInteger(stage.yearRange?.start)&&Number.isInteger(stage.yearRange?.end)&&stage.yearRange.start<=stage.yearRange.end),stage.id);
      assert(html.includes(`id="${stage.id}"`)&&html.includes(`data-stage-id="${stage.id}"`),stage.id);
      assert(html.includes(`href="#${stage.id}"`),`${stage.id}: locator link`);
      for(const id of stage.nodeIds) {
        assert(nodes.has(id),`${stage.id}: public node ${id}`); staged.push(id);
        const n=nodes.get(id);
        if(n.kind==='exhibit') { assigned.push(n.exhibitSlug); assert.equal(exhibits.find(e=>e.slug===n.exhibitSlug)?.readingLine,c.id,n.exhibitSlug); }
      }
    }
    assert.deepEqual(staged.sort(),c.nodes.filter(n=>n.kind==='exhibit').map(n=>n.id).sort(),`${c.id}: every product node belongs to exactly one stage`);
  }
  assert.equal(stageIds.size,45);
  assert.deepEqual(assigned.sort(),exhibits.map(e=>e.slug).sort());
  assert.equal(chronicles.categories.flatMap(c=>c.nodes).filter(n=>n.kind==='background').length,9);
});

test('Reading-line and legacy category filters compose with the existing catalog filters',()=>{
  for(const c of chronicles.categories) assert.deepEqual(selectExhibits(exhibits,{line:c.id}).map(e=>e.slug).sort(),exhibits.filter(e=>e.readingLine===c.id).map(e=>e.slug).sort(),c.id);
  const line=exhibits.find(e=>e.slug==='game-boy').readingLine;
  assert.deepEqual(selectExhibits(exhibits,{line,decade:'1980',q:'Game Boy'}).map(e=>e.slug),['game-boy']);
  for(const legacyCategory of new Set(exhibits.map(e=>e.legacyCategory))) assert.deepEqual(selectExhibits(exhibits,{category:legacyCategory}).map(e=>e.slug).sort(),exhibits.filter(e=>e.category===legacyCategory||e.legacyCategory===legacyCategory).map(e=>e.slug).sort());
});


test('Registered media opinions render attribution, scope, disclosure and original links',async()=>{
  const reviewed=collection.exhibits.filter(e=>e.mediaOpinions?.length);
  assert(reviewed.some(e=>e.slug==='nintendo-switch-2'));
  for(const e of reviewed) {
    const html=await readFile(new URL(`../dist/exhibits/${e.slug}/index.html`,import.meta.url),'utf8');
    assert(html.includes('id="media-opinions"'),e.slug);
    for(const opinion of e.mediaOpinions) {
      for(const field of ['media','author','articleDate','praise','shortcomings','evaluationConditions','commercialDisclosure','verificationDepth']) {
        assert(opinion[field],`${e.slug}.${field}`);
        assert(html.includes(opinion[field].replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')),`${e.slug}: opinion ${field}`);
      }
      const version=opinion.exactModelVersion||opinion.modelVersion;
      assert(version&&html.includes(version.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;')),`${e.slug}: exact opinion version`);
      assert(html.includes(opinion.originalURL||opinion.url),e.slug);
    }
  }
});


test('All 136 editorial manifest products retain approved prose, reader takeaways, IDs and source identities',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../docs/expansion/editorial-import-manifest.json',import.meta.url)));
  const official=JSON.parse(await readFile(new URL('../docs/collection.json',import.meta.url)));
  const bySlug=new Map(official.exhibits.map(e=>[e.slug,e]));
  const sources=new Map(official.sources.map(source=>[source.id,source]));
  const imported=new Set();
  const fields=['summary','context','design','significance','usage','limitations','readerTakeaway','paragraphSources'];
  for(const packet of manifest.packets) {
    const content=JSON.parse(await readFile(new URL(`../${packet.path}`,import.meta.url)));
    assert.equal(content.exhibits.length,packet.count,packet.path);
    assert.deepEqual(content.exhibits.map(e=>e.slug).sort(),[...packet.slugs].sort(),packet.path);
    for(const approved of content.exhibits) {
      assert(!imported.has(approved.slug),`Duplicate manifest product ${approved.slug}`); imported.add(approved.slug);
      const actual=bySlug.get(approved.slug); assert(actual,approved.slug);
      assert.equal(String(actual.id),String(packet.ids[approved.slug]),`${approved.slug}: stable manifest ID`);
      for(const field of fields) assert.deepEqual(actual[field],approved[field],`${approved.slug}: approved ${field}`);
      assert.deepEqual(actual.sourceIds.slice(0,approved.sourceIds.length),approved.sourceIds,`${approved.slug}: approved reference order preserved before nested references`);
      assert.equal(new Set(actual.sourceIds).size,actual.sourceIds.length,`${approved.slug}: no duplicate source references`);
      assert(actual.readerTakeaway.trim().length>20,`${approved.slug}: reader takeaway`);
      const html=await readFile(new URL(`../dist/exhibits/${approved.slug}/index.html`,import.meta.url),'utf8');
      const escaped=actual.readerTakeaway.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
      assert(html.includes(escaped),`${approved.slug}: reader takeaway is public`);
      function references(value,key='') {
        if(key==='sourceId') { assert(sources.has(value),`${approved.slug}: nested reference ${value}`); return; }
        if(key==='sourceIds') { for(const id of value) assert(sources.has(id),`${approved.slug}: nested reference ${id}`); return; }
        if(value&&typeof value==='object') for(const [child,item] of Object.entries(value)) references(item,child);
      }
      references(actual);
      for(const ids of Object.values(actual.paragraphSources)) for(const id of ids) assert(sources.has(id),`${approved.slug}: paragraph reference ${id}`);
    }
    for(const approved of content.sources) {
      const actual=sources.get(approved.id); assert(actual,`${packet.path}: source ${approved.id}`);
      assert.equal(actual.url,approved.url,`${approved.id}: preserve original source URL`);
    }
  }
  assert.equal(imported.size,136);
  const original=JSON.parse(await readFile(new URL('../docs/evidence/expansion-baseline-collection.json',import.meta.url)));
  assert.deepEqual([...bySlug.keys()].sort(),[...original.exhibits.map(e=>e.slug),...imported,...(awardExpansion?.exhibits.map(e=>e.slug)||[])].sort());
});

test('Photo expansion preserves previous attribution and publishes only reviewed, evidenced licensed photographs',async()=>{
  const before=JSON.parse(await readFile(new URL('../docs/evidence/photo-expansion/before-image-overrides.json',import.meta.url)));
  for(const [slug,image]of Object.entries(before))assert.deepEqual(registeredImages[slug],image,`${slug}: original photo/credit unchanged`);
  const manifest=JSON.parse(await readFile(new URL('../docs/evidence/photo-expansion/imported-photos.json',import.meta.url)));
  const choices=JSON.parse(await readFile(new URL('../docs/evidence/photo-expansion/review-choices.json',import.meta.url)));
  const approved=choices.filter(c=>c.status==='visually-reviewed');
  assert.equal(manifest.requestedProducts,142);
  assert.equal(manifest.records.length,approved.length);
  assert.equal(new Set(manifest.records.map(r=>r.slug)).size,manifest.records.length);
  for(const record of manifest.records) {
    assert(!before[record.slug],`${record.slug}: new target only`);
    const choice=approved.find(c=>c.slug===record.slug);
    assert(choice&&choice.title===record.commonsTitle,`${record.slug}: reviewed file identity`);
    const source=JSON.parse(await readFile(new URL(`../${record.evidenceFile}`,import.meta.url))).candidates.find(c=>c.title===choice.title);
    assert(source&&source.sourcePage===record.sourcePage,`${record.slug}: primary original file`);
    if(record.sourceProvider==='flickr'){assert.equal(new URL(record.sourcePage).hostname,'www.flickr.com');assert.equal(new URL(source.original).hostname,'live.staticflickr.com');assert(source.primaryLicenseVerification,`${record.slug}: original Flickr license checked`);}
    if(record.sourceProvider==='wordpress'){assert.equal(new URL(record.sourcePage).hostname,'wordpress.org');assert.equal(new URL(source.original).hostname,'pd.w.org');assert.equal(record.license,'CC0');assert(source.primaryLicenseVerification,`${record.slug}: verify original license beyond discovery index`);}
    const license=source.license==='Public domain'?'公有领域（原文件页声明）':source.license;
    assert.equal(record.license,license,`${record.slug}: do not invent a license`);
    assert.equal(record.creator,choice.creatorFromDescription||source.artist,`${record.slug}: evidenced author`);
    if(choice.creatorFromDescription)assert(source.description.includes(choice.creatorFromDescription),`${record.slug}: author name is present in original description`);
    assert(record.caption&&record.modelVerification&&record.visualReview,`${record.slug}: model/visual review`);
    assert(exhibits.find(e=>e.slug===record.slug)?.image,`${record.slug}: actually published`);
    const html=await readFile(new URL(`../dist/exhibits/${record.slug}/index.html`,import.meta.url),'utf8');
    const escaped=record.caption.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
    assert(html.includes(escaped)&&html.includes(record.sourcePage)&&html.includes(record.licenseUrl),`${record.slug}: visible scope, source and copyright`);
  }
});
