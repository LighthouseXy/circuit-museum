import { readFile, writeFile, access } from 'node:fs/promises';
const catalog=JSON.parse(await readFile('docs/collection.json','utf8'));
const images=JSON.parse(await readFile('src/image-overrides.json','utf8'));
const extras=JSON.parse(await readFile('src/editorial-extras.json','utf8'));
const presentation=JSON.parse(await readFile('src/presentation-overrides.json','utf8'));
const media=JSON.parse(await readFile('docs/media-register.json','utf8'));
const chronicleData=JSON.parse(await readFile('docs/chronicles.json','utf8'));
if(chronicleData.status!=='ready') throw new Error('Product chronicles content is not ready');
const sources=new Map(catalog.sources.map(s=>[s.id,s]));
const exhibits=[];
for(const e of catalog.exhibits) {
  const image=images[e.slug] || null;
  if(image) await access(`public${image.path}`);
  const teardown=e.teardown ? {...e.teardown, sources:e.teardown.sourceIds.map(id=>{
    if(!sources.has(id)) throw new Error(`Unknown teardown source ${id}`);
    return sources.get(id);
  }), image:e.teardown.mediaIds.includes('M25') ? images['hp-35-internal'] : null} : null;
  if(teardown?.image) await access(`public${teardown.image.path}`);
  exhibits.push({...e,presentation:presentation[e.slug] || null,legacyCategory:e.category,category:catalog.categoryAssignments?.[e.slug]||e.category,readingLine:catalog.readingLineAssignments?.[e.slug],image,sources:e.sourceIds.map(id=>{
    if(!sources.has(id)) throw new Error(`Unknown source ${id} in ${e.slug}`);
    return sources.get(id);
  }),teardown});
}
const slugs=new Set(exhibits.map(e=>e.slug));
const chronicleSources=new Map(chronicleData.sources.map(s=>[s.id,s]));
const nodeIds=new Set();
const chronicles={...chronicleData,categories:chronicleData.categories.map(c=>{
  if(!/^[a-z0-9-]+$/.test(c.id)) throw new Error(`Unknown chronicle type ${c.id}`);
  if(c.featuredSlug && !slugs.has(c.featuredSlug)) throw new Error(`Missing featured product ${c.featuredSlug}`);
  if(c.featuredSlug && !c.nodes.some(n=>n.exhibitSlug===c.featuredSlug)) throw new Error(`Featured product outside sequence ${c.id}`);
  return {...c,nodes:c.nodes.map(n=>{
    if(!/^[a-z0-9-]+$/.test(n.id) || !Number.isInteger(n.year)) throw new Error(`Invalid node identity or year ${n.id}`);
    if(nodeIds.has(n.id)) throw new Error(`Duplicate node ${n.id}`);
    nodeIds.add(n.id);
    if(n.kind==='exhibit'&&!slugs.has(n.exhibitSlug)) throw new Error(`Unknown product ${n.exhibitSlug}`);
    return {...n,sources:n.sourceIds.map(id=>{
      if(!chronicleSources.has(id)) throw new Error(`Unknown chronicle source ${id}`);
      return chronicleSources.get(id);
    })};
  }).sort((a,b)=>a.year-b.year)};
})};
await writeFile('src/collection.json',JSON.stringify({
  exhibits,chronicles,categories:(catalog.browseCategories||catalog.categories).map(c=>({id:c.id,name:c.label})),legacyCategories:catalog.categories,
  backgrounds:extras.backgrounds,videos:media.videos.filter(v=>slugs.has(v.exhibitSlug)).map(v=>({...v,url:v.landingUrl}))
},null,2));
console.log(`Imported ${exhibits.length} exhibits, ${exhibits.filter(e=>e.image).length} photographs.`);
