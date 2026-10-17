import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const parse=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const baselinePaths=['docs/evidence/expansion-baseline-collection.json','docs/evidence/expansion-baseline-chronicles.json'];
await mkdir('docs/evidence',{recursive:true});
const expected=['41ab8a43935829933ba6b0de54a1d03627eb0d94cf8f4fdc61bdf5d2632e7f8a','e2f4f4a8fce0dc0a4c0166c62f29fe538124d72098f1368a8fc9ad0ae64e2e34'];
for(let i=0;i<2;i++) {
 let bytes; try{bytes=await readFile(baselinePaths[i]);}catch(err){if(err.code!=='ENOENT')throw err; bytes=await readFile(i?'docs/chronicles.json':'docs/collection.json');assert.equal(hash(bytes),expected[i]);await writeFile(baselinePaths[i],bytes,{flag:'wx'});}
 assert.equal(hash(bytes),expected[i]);
}
const base=await parse(baselinePaths[0]), oldChronicles=await parse(baselinePaths[1]);
const batch=await parse(process.argv[2]||'docs/expansion/complete-batch-14.json');
assert.equal(batch.exhibits.length,14,'This entry point imports only the approved first 14');
const current=await parse('docs/collection.json');
const approvedSlugs=new Set([...base.exhibits,...batch.exhibits].map(e=>e.slug));
assert(current.exhibits.every(e=>approvedSlugs.has(e.slug)),'Current catalog contains later additions: use their approved importer instead of resetting to this milestone');
for(const e of base.exhibits)assert.deepEqual(current.exhibits.find(x=>x.slug===e.slug),e,`Original changed ${e.slug}`);
const selection=await parse('docs/expansion/selection-150.json'),plan=await parse('docs/expansion/expanded-page-plan.json');
const sources=new Map(base.sources.map(s=>[s.id,s]));
for(const s of batch.sources){assert.match(s.url,/^https?:\/\//);if(sources.has(s.id))assert.equal(sources.get(s.id).url,s.url,`Source collision ${s.id}`);else sources.set(s.id,{...s,supports:s.supports||s.verifiedScope,verification:s.verification||[s.verificationMethod,s.limits].filter(Boolean).join('；')});}
const refs=e=>[...new Set([...e.sourceIds,...Object.values(e.paragraphSources||{}).flat(),...(e.facts||[]).flatMap(f=>f.sourceIds||[]),...(e.identitySourceIds||[]),...(e.dateSourceIds||[]),...(e.mediaOpinions||[]).map(o=>o.sourceId)])];
const exhibits=[...base.exhibits,...batch.exhibits.map((e,i)=>({...e,id:Math.max(...base.exhibits.map(e=>e.id))+i+1,idStatus:'assigned',contentStatus:'complete-text',sourceIds:refs(e)}))];
assert.equal(new Set(exhibits.map(e=>e.slug)).size,54);assert.equal(new Set(exhibits.map(e=>e.id)).size,54);
const published=new Map(exhibits.map(e=>[e.slug,e]));
for(const e of exhibits){for(const id of refs(e))assert(sources.has(id),`Missing ${id}`);for(const slug of e.relatedSlugs)assert(published.has(slug),`Missing related ${slug}`);}
const records=new Map(selection.records.filter(r=>r.status==='selected').map(r=>[r.slug,r]));
const categoryAssignments=Object.fromEntries(exhibits.map(e=>[e.slug,records.get(e.slug).museumCategory]));
const readingLineAssignments={};
const chronicleSources=new Map(oldChronicles.sources.map(s=>[s.id,s]));
const categories=plan.readingLines.map(line=>{
 const original=oldChronicles.categories.find(c=>c.id===line.id);
 const nodes=[...(original?.nodes||[])];
 const stages=line.stages.map(stage=>{
  const full=stage.slugs.filter(slug=>published.has(slug));
  const nodeIds=full.map(slug=>{
   assert(!readingLineAssignments[slug],`Duplicate line assignment ${slug}`);readingLineAssignments[slug]=line.id;
   let n=nodes.find(n=>n.exhibitSlug===slug);const e=published.get(slug);
   if(!n){n={id:`${line.id}-${slug}`,year:e.year,kind:'exhibit',title:e.name,summary:e.summary,change:e.features?.[0]||e.summary,dateKind:e.dateKind||'observed',dateLabel:e.dateLabel||e.facts.find(f=>/日期|年份/.test(f.label))?.value||String(e.year),sourceIds:e.sourceIds,exhibitSlug:slug,isContemporary:e.significanceLabel==='当代观察'};nodes.push(n);}
   for(const id of n.sourceIds){const s=sources.get(id);if(chronicleSources.has(id))assert.equal(chronicleSources.get(id).url,s.url);else chronicleSources.set(id,s);}
   return n.id;
  });
  const years=full.map(slug=>published.get(slug).year);
  return {id:stage.id,title:stage.title,need:stage.need,turn:stage.turn,isCuratorialReading:true,nodeIds,yearRange:years.length?{start:Math.min(...years),end:Math.max(...years)}:null,sourceIds:[...new Set(nodeIds.flatMap(id=>nodes.find(n=>n.id===id).sourceIds))]};
 });
 const featuredSlug=published.has(line.featuredSlug)?line.featuredSlug:nodes.find(n=>n.kind==='exhibit')?.exhibitSlug||null;
 return {...original,id:line.id,label:line.label,title:original?.title||line.label,introduction:line.introduction,changes:original?.changes||[],featuredSlug,startYear:nodes.length?Math.min(...nodes.map(n=>n.year)):null,endYear:nodes.length?Math.max(...nodes.map(n=>n.year)):null,nodes,stages};
});
assert.equal(Object.keys(readingLineAssignments).length,54);
assert.equal(categories.flatMap(c=>c.stages).length,45);
for(const c of oldChronicles.categories)for(const n of c.nodes)assert.deepEqual(categories.flatMap(c=>c.nodes).find(x=>x.id===n.id),n);
const browseCategories=selection.matrix.filter(c=>Object.values(categoryAssignments).includes(c.id)).map(c=>({id:c.id,label:c.label}));
const catalog={...base,contentUpdatedOn:batch.checkedOn,categoryAssignments,readingLineAssignments,browseCategories,exhibits,sources:[...sources.values()]};
const chronicles={...oldChronicles,contentUpdatedOn:batch.checkedOn,categories,sources:[...chronicleSources.values()],homeRows:plan.homeRows.map(row=>({...row,featuredSlug:published.has(row.featuredSlug)?row.featuredSlug:categories.filter(c=>row.lineIds.includes(c.id)).find(c=>c.featuredSlug)?.featuredSlug||null}))};
for(const [file,value]of [['docs/collection.json',catalog],['docs/chronicles.json',chronicles]]){await writeFile(`${file}.tmp`,JSON.stringify(value,null,2)+'\n');await rename(`${file}.tmp`,file);}
await writeFile('docs/evidence/expansion-import.json',JSON.stringify({importedOn:batch.checkedOn,actualCompleteProducts:54,originalProductsPreserved:40,newCompleteProducts:14,researchSelection:selection.counts,readingLines:16,stages:45,nonemptyStages:categories.flatMap(c=>c.stages).filter(s=>s.nodeIds.length).length,baselineHashes:expected,packet:'docs/expansion/complete-batch-14.json'},null,2)+'\n');
console.log('Imported 14 complete texts; actual published count 54. Original 40 and 29 nodes preserved.');
