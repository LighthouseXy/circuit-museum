import {readFile, writeFile, rename} from 'node:fs/promises';
import assert from 'node:assert/strict';

const read=async p=>JSON.parse(await readFile(p,'utf8'));
const manifest=await read('docs/expansion/awards-400-approved.json');
const baseline=await read('docs/evidence/expansion-400/before-collection.json');
const catalog=await read('docs/collection.json');
const history=await read('docs/chronicles.json');
const originalHistory=await read('docs/evidence/expansion-400/before-chronicles.json');
assert.equal(baseline.exhibits.length,176);
assert.equal(manifest.target,400);
assert.equal(manifest.exhibits.length,224,'Require all 224 reviewed additions before this import');
for(const e of baseline.exhibits)assert.deepEqual(catalog.exhibits.find(x=>x.slug===e.slug),e,`Preserve existing product: ${e.slug}`);
for(const c of originalHistory.categories)for(const n of c.nodes)assert.deepEqual(history.categories.flatMap(x=>x.nodes).find(x=>x.id===n.id),n,`Preserve history: ${n.id}`);
const allowed=new Set([...baseline.exhibits,...manifest.exhibits].map(e=>e.slug));
assert(catalog.exhibits.every(e=>allowed.has(e.slug)),'Do not reset unknown newer catalog additions');
const sources=new Map(catalog.sources.map(s=>[s.id,s]));
const products=new Map(baseline.exhibits.map(e=>[e.slug,e]));
const ids=new Set(baseline.exhibits.map(e=>Number(e.id)));
const categories=new Set(catalog.browseCategories.map(c=>c.id));
for(const s of manifest.sources){assert.equal(new URL(s.url).protocol,'https:');assert(s.supports&&s.checkedOn&&s.publisher,s.id);assert(!sources.has(s.id)||sources.get(s.id).url===s.url,s.id);sources.set(s.id,s);}
const categoryAssignments={...baseline.categoryAssignments},readingLineAssignments={...baseline.readingLineAssignments};
for(const e of manifest.exhibits){
  assert(/^[a-z0-9-]+$/.test(e.slug)&&!products.has(e.slug),e.slug);
  assert(Number.isInteger(e.id)&&e.id>176&&!ids.has(e.id),e.slug);ids.add(e.id);
  assert(categories.has(e.category),`${e.slug}: category`);
  assert(e.awards?.length&&e.designDetails?.length>=2&&e.functionDetails?.length>=2,`${e.slug}: concrete design and function details`);
  assert.equal(e.dateKind,'award',`${e.slug}: distinguish award dates from launch dates`);
  assert(e.dateLabel.includes('获奖')&&e.dateLabel.includes('非上市'),e.slug);
  for(const key of ['context','design','usage','significance','limitations']){
    assert(e[key]?.trim().length>=60,`${e.slug}.${key}: complete, model-specific prose`);
    assert(e.paragraphSources?.[key]?.length&&e.paragraphSources[key].every(id=>e.sourceIds.includes(id)),`${e.slug}.${key}: paragraph citations`);
  }
  for(const id of e.sourceIds)assert(sources.has(id),`${e.slug}: ${id}`);
  const line=history.categories.find(c=>c.id===e.chroniclePlacement?.lineId);
  const stage=line?.stages.find(s=>s.id===e.chroniclePlacement.stageId);
  assert(stage,`${e.slug}: existing reading line/stage`);
  const n={id:`${line.id}-award-${e.slug}`,year:e.year,kind:'exhibit',exhibitSlug:e.slug,title:e.name,summary:e.summary,change:e.readerTakeaway,dateKind:e.dateKind,dateLabel:e.dateLabel,sourceIds:e.sourceIds,isContemporary:e.year>=2026};
  const existing=line.nodes.find(x=>x.id===n.id);if(existing)assert.deepEqual(existing,n);else line.nodes.push(n);
  if(!stage.nodeIds.includes(n.id))stage.nodeIds.push(n.id);
  products.set(e.slug,e);categoryAssignments[e.slug]=e.category;readingLineAssignments[e.slug]=line.id;
}
assert.equal(products.size,400);
for(const e of products.values())for(const slug of e.relatedSlugs)assert(products.has(slug)&&slug!==e.slug,`${e.slug}: related ${slug}`);
const historySources=new Map(history.sources.map(s=>[s.id,s]));
for(const s of manifest.sources)historySources.set(s.id,s);
for(const line of history.categories){
  line.nodes.sort((a,b)=>a.year-b.year);
  line.startYear=Math.min(...line.nodes.map(n=>n.year));line.endYear=Math.max(...line.nodes.map(n=>n.year));
  const byId=new Map(line.nodes.map(n=>[n.id,n]));
  for(const stage of line.stages){
    stage.nodeIds.sort((a,b)=>byId.get(a).year-byId.get(b).year);
    const nodes=stage.nodeIds.map(id=>byId.get(id));
    stage.yearRange=nodes.length?{start:Math.min(...nodes.map(n=>n.year)),end:Math.max(...nodes.map(n=>n.year))}:null;
    stage.sourceIds=[...new Set(nodes.flatMap(n=>n.sourceIds))];
  }
}
const next={...catalog,contentUpdatedOn:manifest.checkedOn,exhibits:[...products.values()],sources:[...sources.values()],categoryAssignments,readingLineAssignments};
const nextHistory={...history,contentUpdatedOn:manifest.checkedOn,sources:[...historySources.values()]};
// Write validated data to temporary files before replacing either public input.
for(const [file,value]of [['docs/collection.json',next],['docs/chronicles.json',nextHistory]])await writeFile(`${file}.tmp`,JSON.stringify(value,null,2)+'\n');
for(const file of ['docs/collection.json','docs/chronicles.json'])await rename(`${file}.tmp`,file);
console.log('Imported 224 reviewed award-led products; existing 176 records and history nodes preserved.');
