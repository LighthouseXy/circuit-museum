import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {selectExhibits} from '../src/catalog.js';
import {separateResearchNotes} from '../src/story.js';
const read=async p=>JSON.parse(await readFile(new URL(`../${p}`,import.meta.url)));
const catalog=await read('docs/collection.json');
const built=await read('src/collection.json');

test('award filters compose with category, text and chronological sorting',()=>{
  const fixtures=[{name:'Keyboard',brand:'Brand',slug:'a',year:2023,category:'input',awards:[{programId:'red-dot'}]},
    {name:'Speaker',brand:'Brand',slug:'b',year:2024,category:'audio',awards:[{programId:'red-dot'},{programId:'if'}]},
    {name:'Keyboard',brand:'Other',slug:'c',year:2022,category:'input',awards:[]}];
  assert.deepEqual(selectExhibits(fixtures,{award:'red-dot',category:'input'}).map(e=>e.slug),['a']);
  assert.deepEqual(selectExhibits(fixtures,{award:'red-dot',sort:'newest'}).map(e=>e.slug),['b','a']);
  assert.deepEqual(selectExhibits(fixtures,{award:'if',q:'Keyboard'}),[]);
});

test('all product reading retains design points, complete summaries, captions and substantive body text',async()=>{
  const presentation=await read('src/presentation-overrides.json');
  assert.equal(Object.values(presentation).filter(p=>p.summary).length,30);
  for(const e of built.exhibits){
    const html=await readFile(new URL(`../dist/exhibits/${e.slug}/index.html`,import.meta.url),'utf8');
    assert(e.features?.length || e.designDetails?.length || e.presentation?.designDetails?.length,`${e.slug}: design details`);
    assert(html.includes('先看这些设计细节'),`${e.slug}: readable design points`);
    const summary=e.presentation?.summary || e.summary;
    assert(!/…|\.\.\./.test(summary),`${e.slug}: no truncated summary`);
    for(const key of ['context','design','usage','significance','limitations'])assert(separateResearchNotes(e[key]).body.length>=60,`${e.slug}.${key}`);
    if(e.image){assert(e.image.caption || e.image.alt,e.slug);assert(html.includes('对照实物照片查看外形与布局'),e.slug);}
  }
  const html=await readFile(new URL('../dist/awards/index.html',import.meta.url),'utf8');
  for(const p of (await read('docs/award-programs.json')).programs)assert(html.includes(p.criteriaUrl),p.id);
});

test('award expansion preserves the 176 prior records and distinguishes award dates from release dates',async t=>{
  let manifest;try{manifest=await read('docs/expansion/awards-400-approved.json');}catch(e){if(e.code==='ENOENT'){t.skip('Award research not imported yet');return;}throw e;}
  assert.equal(catalog.exhibits.length,400);assert.equal(manifest.exhibits.length,224);
  const before=await read('docs/evidence/expansion-400/before-collection.json');
  for(const e of before.exhibits)assert.deepEqual(catalog.exhibits.find(x=>x.slug===e.slug),e,e.slug);
  for(const e of manifest.exhibits){
    const live=catalog.exhibits.find(x=>x.slug===e.slug);assert.deepEqual(live,e,e.slug);
    assert.equal(e.dateKind,'award');assert(e.dateLabel.includes('非上市'),e.slug);
    assert(e.awards.length&&e.designDetails.length>=2&&e.functionDetails.length>=2,e.slug);
    const html=await readFile(new URL(`../dist/exhibits/${e.slug}/index.html`,import.meta.url),'utf8');
    assert(html.includes('获奖记录年份 · 非上市日期')&&html.includes('id="awards"'),e.slug);
    for(const a of e.awards)assert(html.includes(a.url),`${e.slug}: exact award source`);
  }
});

test('new award product photographs retain prior image metadata and primary license evidence',async t=>{
  let manifest;try{manifest=await read('docs/evidence/photo-expansion/round3/imported-photos.json');}catch(e){if(e.code==='ENOENT'){t.skip('New award photos not imported yet');return;}throw e;}
  const images=await read('src/image-overrides.json');
  for(const [slug,m]of Object.entries(await read('docs/evidence/expansion-400/before-images.json')))assert.deepEqual(images[slug],m,slug);
  for(const r of manifest.records){
    assert(built.exhibits.find(e=>e.slug===r.slug)?.image,r.slug);
    const c=(await read(r.evidenceFile)).candidates.find(c=>c.title===r.sourceTitle);
    assert(c&&c.sourcePage===r.sourcePage&&c.license===r.license,r.slug);
    assert(r.caption&&r.modelVerification&&r.visualReview,r.slug);
    if(r.sourceProvider==='unsplash'){assert.equal(r.license,'Unsplash License');assert.equal(r.licenseUrl,'https://unsplash.com/license');assert(c.primaryLicenseVerification);}
    assert.equal(createHash('sha256').update(await readFile(new URL(`../public${r.path}`,import.meta.url))).digest('hex'),r.outputSha256);
  }
});
