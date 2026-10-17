import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const parse=async p=>JSON.parse(await readFile(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const baselinePaths=['docs/evidence/expansion-baseline-collection.json','docs/evidence/expansion-baseline-chronicles.json'];
const baselineHashes=['41ab8a43935829933ba6b0de54a1d03627eb0d94cf8f4fdc61bdf5d2632e7f8a','e2f4f4a8fce0dc0a4c0166c62f29fe538124d72098f1368a8fc9ad0ae64e2e34'];
const baseline=[];
for(const [i,path] of baselinePaths.entries()) {
 const bytes=await readFile(path);assert.equal(sha(bytes),baselineHashes[i],`Baseline changed: ${path}`);baseline.push(JSON.parse(bytes));
}
const [base,originalChronicles]=baseline;
const manifestPath=process.argv[2]||'docs/expansion/editorial-import-manifest.json';
const manifest=await parse(manifestPath),current=await parse('docs/collection.json'),currentChronicles=await parse('docs/chronicles.json');
for(const e of base.exhibits)assert.deepEqual(current.exhibits.find(x=>x.slug===e.slug),e,`Original exhibit changed: ${e.slug}`);
const originalNodes=originalChronicles.categories.flatMap(c=>c.nodes);
for(const n of originalNodes)assert.deepEqual(currentChronicles.categories.flatMap(c=>c.nodes).find(x=>x.id===n.id),n,`Original node changed: ${n.id}`);
const originalSlugs=new Set(base.exhibits.map(e=>e.slug)),originalSourceIds=new Set(base.sources.map(s=>s.id));
const sources=new Map(current.sources.map(s=>[s.id,s])),incoming=new Map();
function refs(value) {
 const ids=new Set();
 function walk(v){if(!v||typeof v!=='object')return;for(const [key,item]of Object.entries(v)){if(key==='sourceId'&&typeof item==='string')ids.add(item);else if(key==='sourceIds'&&Array.isArray(item))item.forEach(id=>ids.add(id));else if(key==='paragraphSources')Object.values(item).flat().forEach(id=>ids.add(id));else walk(item);}}
 walk(value);return [...ids];
}
for(const packet of manifest.packets) {
 const batch=await parse(packet.path);
 assert.equal(batch.exhibits.length,packet.count,packet.path);
 assert.deepEqual(batch.exhibits.map(e=>e.slug).sort(),[...packet.slugs].sort(),packet.path);
 for(const s of batch.sources) {
  assert.match(s.url,/^https:\/\//,s.id);
  const previous=sources.get(s.id);
  if(previous)assert.equal(previous.url,s.url,`Source ID collision: ${s.id}`);
  if(originalSourceIds.has(s.id))continue;
  const records=[...(previous?.verificationRecords||[]),...(s.verificationRecords||[])];
  sources.set(s.id,{...previous,...s,supports:s.supports||s.verifiedScope||previous?.supports,verification:s.verification||[s.verificationMethod,s.limits].filter(Boolean).join('；')||previous?.verification,verificationRecords:[...new Map(records.map(r=>[JSON.stringify(r),r])).values()]});
 }
 for(const e of batch.exhibits) {
  assert(!originalSlugs.has(e.slug),`Original40 cannot be overwritten: ${e.slug}`);
  assert(!incoming.has(e.slug),`Repeated incoming product: ${e.slug}`);
  assert.equal(String(e.id),packet.ids[e.slug],`Proposed ID changed: ${e.slug}`);
  const old=current.exhibits.find(x=>x.slug===e.slug);
  if(old)assert.equal(String(old.id),String(e.id),`Live ID changed: ${e.slug}`);
  const id=Number(e.id);assert(Number.isSafeInteger(id)&&id>40,e.slug);
  for(const key of ['context','design','significance','usage','limitations','readerTakeaway'])assert(typeof e[key]==='string'&&e[key].trim().length>0,`${e.slug}.${key}`);
  assert(['validate-and-import-new-products','review-already-imported-revisions-no-append'].includes(packet.action),packet.action);
  incoming.set(e.slug,{...e,id,idStatus:'assigned',contentStatus:'complete-text',sourceIds:[...new Set([...e.sourceIds,...refs(e)])]});
 }
}
assert.equal(incoming.size,136,'Expected 136 new-model complete texts, including14 live revisions');
const approved=new Set([...originalSlugs,...incoming.keys()]);
assert(current.exhibits.every(e=>approved.has(e.slug)),'Unknown live additions: stop instead of resetting later work');
const exhibits=[...base.exhibits,...[...incoming.values()].sort((a,b)=>a.id-b.id)];
assert.equal(exhibits.length,manifest.potentialCompleteCoverage);
assert(exhibits.length>=150,'Current phase requires at least150 actual products');
assert.equal(new Set(exhibits.map(e=>e.slug)).size,exhibits.length);
assert.equal(new Set(exhibits.map(e=>String(e.id))).size,exhibits.length);
const published=new Map(exhibits.map(e=>[e.slug,e]));
for(const e of incoming.values()) {
 e.relatedSlugs=[...new Set([...e.relatedSlugs,...(e.deferredRelatedSlugs||[]).filter(slug=>published.has(slug))])];
 e.deferredRelatedSlugs=(e.deferredRelatedSlugs||[]).filter(slug=>!published.has(slug));
}
for(const e of exhibits){for(const id of refs(e))assert(sources.has(id),`${e.slug}: unresolved source ${id}`);for(const slug of e.relatedSlugs)assert(published.has(slug)&&slug!==e.slug,`${e.slug}: related ${slug}`);}
const selection=await parse('docs/expansion/selection-150.json'),plan=await parse('docs/expansion/expanded-page-plan.json');
const selected=new Map(selection.records.filter(r=>r.status==='selected').map(r=>[r.slug,r]));
const categoryAssignments=Object.fromEntries(exhibits.map(e=>{assert(selected.has(e.slug),e.slug);return[e.slug,selected.get(e.slug).museumCategory]}));
const readingLineAssignments={},chronicleSources=new Map(originalChronicles.sources.map(s=>[s.id,s]));
const oldNodeIds=new Set(originalNodes.map(n=>n.id));
const categories=plan.readingLines.map(line=>{
 const original=originalChronicles.categories.find(c=>c.id===line.id);
 const live=currentChronicles.categories.find(c=>c.id===line.id);
 const nodes=[...(original?.nodes||[])];
 const stages=line.stages.map(stage=>{
  const slugs=stage.slugs.filter(slug=>published.has(slug));
  const nodeIds=slugs.map(slug=>{
   assert(!readingLineAssignments[slug],`Repeated reading-line placement: ${slug}`);readingLineAssignments[slug]=line.id;
   let n=nodes.find(n=>n.exhibitSlug===slug);const e=published.get(slug);
   if(!n){const id=live?.nodes.find(n=>n.exhibitSlug===slug)?.id||`${line.id}-${slug}`;assert(!oldNodeIds.has(id),id);n={id,year:e.year,kind:'exhibit',title:e.name,summary:e.summary,change:e.readerTakeaway||e.features?.[0]||e.summary,dateKind:e.dateKind||'observed',dateLabel:e.dateLabel||e.facts.find(f=>/日期|年份/.test(f.label))?.value||String(e.year),sourceIds:e.sourceIds,exhibitSlug:slug,isContemporary:e.year>=2026||e.significanceLabel==='当代观察'};nodes.push(n);}
   for(const id of n.sourceIds){const s=sources.get(id);assert(s,`Missing node source: ${id}`);if(chronicleSources.has(id))assert.equal(chronicleSources.get(id).url,s.url,id);else chronicleSources.set(id,s);}
   return n.id;
  });
  const years=slugs.map(slug=>published.get(slug).year);
  return{id:stage.id,title:stage.title,need:stage.need,turn:stage.turn,isCuratorialReading:true,nodeIds,yearRange:years.length?{start:Math.min(...years),end:Math.max(...years)}:null,sourceIds:[...new Set(nodeIds.flatMap(id=>nodes.find(n=>n.id===id).sourceIds))]};
 });
 const featuredSlug=published.has(line.featuredSlug)?line.featuredSlug:nodes.find(n=>n.kind==='exhibit')?.exhibitSlug||null;
 return{...original,id:line.id,label:line.label,title:original?.title||line.label,introduction:line.introduction,changes:original?.changes||[],featuredSlug,startYear:nodes.length?Math.min(...nodes.map(n=>n.year)):null,endYear:nodes.length?Math.max(...nodes.map(n=>n.year)):null,nodes,stages};
});
assert.equal(Object.keys(readingLineAssignments).length,exhibits.length);
assert.equal(categories.flatMap(c=>c.stages).length,45);
for(const n of originalNodes)assert.deepEqual(categories.flatMap(c=>c.nodes).find(x=>x.id===n.id),n,n.id);
const browseCategories=selection.matrix.filter(c=>Object.values(categoryAssignments).includes(c.id)).map(c=>({id:c.id,label:c.label}));
const catalog={...current,contentUpdatedOn:manifest.assembledOn,categoryAssignments,readingLineAssignments,browseCategories,exhibits,sources:[...sources.values()]};
const chronicles={...currentChronicles,contentUpdatedOn:manifest.assembledOn,categories,sources:[...chronicleSources.values()],homeRows:plan.homeRows.map(row=>({...row,featuredSlug:published.has(row.featuredSlug)?row.featuredSlug:categories.filter(c=>row.lineIds.includes(c.id)).find(c=>c.featuredSlug)?.featuredSlug||null}))};
const appended=exhibits.filter(e=>!current.exhibits.some(old=>old.slug===e.slug));
// Preserve an exact pre-import snapshot for rollback; never reset a newer catalog to an older milestone.
for(const [name,value]of [['collection',current],['chronicles',currentChronicles]]) {
 const destination=`docs/evidence/editorial-before-${name}.json`;
 try{await writeFile(destination,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
}
for(const [file,value]of [['docs/collection.json',catalog],['docs/chronicles.json',chronicles]]){await writeFile(`${file}.tmp`,JSON.stringify(value,null,2)+'\n');}
for(const file of ['docs/collection.json','docs/chronicles.json'])await rename(`${file}.tmp`,file);
const beforePhase=await parse('docs/evidence/editorial-before-collection.json');
await writeFile('docs/evidence/editorial-production-import.json',JSON.stringify({importedOn:manifest.assembledOn,manifest:manifestPath,actualProduction:exhibits.length,actualBeforePhase:beforePhase.exhibits.length,totalAddedThisPhase:exhibits.length-beforePhase.exhibits.length,revisedPreviouslyImportedNewModels:beforePhase.exhibits.length-base.exhibits.length,addedThisRun:appended.length,revisedExistingNewModels:incoming.size-appended.length,originalProductsPreserved:base.exhibits.length,originalNodesPreserved:originalNodes.length,completeNewModelTexts:incoming.size,readingLines:categories.length,stages:categories.flatMap(c=>c.stages).length,nonemptyStages:categories.flatMap(c=>c.stages).filter(s=>s.nodeIds.length).length,sourceRecords:sources.size,baselineHashes,sourceVerificationBoundary:'Individual source dates/scopes preserved; import checks structure, not full live re-reading or physical testing'},null,2)+'\n');
console.log(`Actual production ${exhibits.length}; appended ${appended.length}; existing new-model revisions ${incoming.size-appended.length}; originals40/29 preserved.`);
