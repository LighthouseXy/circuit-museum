import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {isPermittedSamsungOriginal,verifyOriginalBytes} from './photo-rights.mjs';
const require=createRequire(import.meta.url);
const sharp=require(process.argv[2]||'sharp');
const root=process.argv[3]||'docs/evidence/photo-expansion';
await mkdir(`${root}/staged`,{recursive:true});
const choices=JSON.parse(await readFile(`${root}/review-choices.json`,'utf8'));
const clean=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
let previous=[];try{previous=JSON.parse(await readFile(`${root}/staged-records.json`,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const accepted=[];
for(const choice of choices) {
 const record=JSON.parse(await readFile(choice.researchFile,'utf8'));
 const c=record.candidates.find(c=>c.title===choice.title);assert(c,choice.slug);
 assert(/^(CC BY(?:-SA)? [\d.]+(?: [a-z]+)?|CC0|Public domain)$/.test(c.license)||(c.provider==='unsplash'&&c.license==='Unsplash License'&&c.primaryLicenseVerification)||isPermittedSamsungOriginal(c),`${choice.slug}: unaccepted license ${c.license}`);
 assert(!/counterfeit|replica|logo|representation|diagram|screenshot|render/i.test(c.title+' '+c.description),`${choice.slug}: not a verified physical photograph`);
 const href=c.thumbnail||c.original;assert(['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(href).hostname)||(c.provider==='wordpress'&&new URL(c.sourcePage).hostname==='wordpress.org'&&new URL(href).hostname==='pd.w.org'&&c.primaryLicenseVerification)||(c.provider==='flickr'&&new URL(c.sourcePage).hostname==='www.flickr.com'&&new URL(href).hostname==='live.staticflickr.com'&&c.primaryLicenseVerification)||(c.provider==='unsplash'&&new URL(c.sourcePage).hostname==='unsplash.com'&&new URL(href).hostname==='images.unsplash.com'&&c.primaryLicenseVerification&&c.licenseUrl==='https://unsplash.com/license')||isPermittedSamsungOriginal(c));
 const file=`${root}/staged/${choice.slug}.${isPermittedSamsungOriginal(c)?'jpg':'webp'}`;
 try{await access(file);assert(previous.some(r=>r.slug===choice.slug&&r.title===choice.title&&r.original===c.original),'Source changed; restage photograph');}catch{
  const buffer=execFileSync('python3',['-c',`import sys,urllib.request,time
url=sys.argv[1]
for attempt in range(3):
 try:
  response=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'CircuitMuseum/1.0 photo attribution research'}),timeout=45)
  sys.stdout.buffer.write(response.read(50*1024*1024));break
 except Exception as error:
  if attempt==2:raise
  time.sleep(max(int(getattr(error,'headers',{}).get('Retry-After','9')),9))`,href],{maxBuffer:50*1024*1024});
  const metadata=await sharp(buffer).metadata();assert(metadata.width>100&&metadata.height>100,choice.slug);
  if(isPermittedSamsungOriginal(c)){assert.equal(metadata.format,'jpeg');verifyOriginalBytes(c,createHash('sha256').update(buffer).digest('hex'));await writeFile(file,buffer);}
  else await sharp(buffer).rotate().resize({width:1100,height:1100,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toFile(file);
 }
 const bytes=await readFile(file);verifyOriginalBytes(c,createHash('sha256').update(bytes).digest('hex'));const m=await sharp(bytes).metadata();
 accepted.push({...choice,...c,creator:clean(c.metadata.Artist?.value||c.artist),licenseUrl:c.licenseUrl||`${c.sourcePage}#Licensing`,checkedOn:choice.checkedOn||record.checkedOn||'2026-10-13',stagedFile:file,path:`/images/${choice.slug}.webp`,width:m.width,height:m.height,outputSha256:createHash('sha256').update(bytes).digest('hex'),status:'pending-visual-review'});
 console.log('STAGED',choice.slug);
}
await writeFile(`${root}/staged-records.json`,JSON.stringify(accepted,null,2)+'\n');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(let start=0;start<accepted.length;start+=16) {
 const batch=accepted.slice(start,start+16),tiles=[];
 for(const [i,r]of batch.entries()) {
  const photo=await sharp(r.stagedFile).resize(280,205,{fit:'contain',background:'#fff'}).png().toBuffer();
  const label=Buffer.from(`<svg width="300" height="40"><rect width="300" height="40" fill="white"/><text x="10" y="17" font-family="Arial" font-size="12">${start+i+1}. ${esc(r.slug)}</text><text x="10" y="34" font-family="Arial" font-size="11">${esc(r.license)} · ${r.width}x${r.height}</text></svg>`);
  tiles.push({input:photo,left:(i%4)*300+10,top:Math.floor(i/4)*250+4},{input:label,left:(i%4)*300,top:Math.floor(i/4)*250+209});
 }
 await sharp({create:{width:1200,height:Math.ceil(batch.length/4)*250,channels:3,background:'#ddd'}}).composite(tiles).png().toFile(`${root}/contact-${Math.floor(start/16)+1}.png`);
}
