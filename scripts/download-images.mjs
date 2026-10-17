import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.argv[2] || 'sharp');
const images=JSON.parse(await readFile('src/image-overrides.json','utf8'));
await mkdir('docs/evidence/image-metadata',{recursive:true});
for (const [slug,m] of Object.entries(images)) {
  try { await access(`public${m.path}`); console.log('EXISTS',slug); continue; } catch {}
  const html=execFileSync('curl',['-f','-sS','-L',m.sourcePage],{encoding:'utf8',maxBuffer:8*1024*1024});
  const match=html.match(/class="fullImageLink"[\s\S]*?href="([^"]+)"/);
  if(!match) throw new Error(`No original image at ${m.sourcePage}`);
  const original=match[1].replaceAll('&amp;','&').split('?')[0];
  if(new URL(original).hostname!=='upload.wikimedia.org') throw new Error('Unexpected image host');
  const buffer=execFileSync('curl',['-f','-sS','-L',original],{maxBuffer:50*1024*1024});
  const metadata=await sharp(buffer).metadata();
  const result=await sharp(buffer).rotate().resize({width:1100,height:1100,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(`public${m.path}`);
  await writeFile(`docs/evidence/image-metadata/${slug}.json`,JSON.stringify({...m,original,checkedOn:'2026-10-03',originalWidth:metadata.width,originalHeight:metadata.height,output:result},null,2));
  console.log('DOWNLOADED',slug,result.size);
}
