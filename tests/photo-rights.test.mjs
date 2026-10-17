import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isPermittedSamsungOriginal,verifyOriginalBytes} from '../scripts/photo-rights.mjs';

test('restricted originals require image-specific evidence and unchanged bytes',async()=>{
  const file=new URL('../docs/evidence/photo-expansion/round3/normalized-research/samsung-the-freestyle-2022.json',import.meta.url);
  const c=JSON.parse(await readFile(file)).candidates[0];
  assert(isPermittedSamsungOriginal(c));
  const bytes=await readFile(new URL(`../${c.localFile}`,import.meta.url));
  const sha=createHash('sha256').update(bytes).digest('hex');verifyOriginalBytes(c,sha);
  assert(!isPermittedSamsungOriginal({...c,primaryLicenseVerification:{...c.primaryLicenseVerification,noRestrictedWatermarkVerified:false}}));
  assert(!isPermittedSamsungOriginal({...c,original:'https://example.com/third-party.jpg'}));
  assert.throws(()=>verifyOriginalBytes(c,createHash('sha256').update(Buffer.concat([bytes,Buffer.from('changed')])).digest('hex')));
});
