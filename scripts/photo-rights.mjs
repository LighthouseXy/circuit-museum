import assert from 'node:assert/strict';

export const samsungOriginalLicense='Samsung Newsroom Korea 原图转载许可（禁止改动）';
export function isPermittedSamsungOriginal(c) {
  const proof=c.primaryLicenseVerification;
  return c.provider==='samsung-newsroom-kr' && c.license===samsungOriginalLicense
    && new URL(c.sourcePage).hostname==='news.samsung.com'
    && new URL(c.sourcePage).pathname.startsWith('/kr/')
    && new URL(c.original).hostname==='img.kr.news.samsung.com'
    && new URL(c.licenseUrl).hostname==='news.samsung.com'
    && decodeURI(new URL(c.licenseUrl).pathname)==='/kr/삼성전자-뉴스룸-콘텐츠-이용에-대한-안내'
    && proof?.directProductionVerified===true && proof?.noRestrictedWatermarkVerified===true
    && proof?.noExternalBylineVerified===true && proof?.preserveOriginal===true
    && /^[a-f0-9]{64}$/.test(c.originalSha256);
}

export function verifyOriginalBytes(c, sha256) {
  if(c.provider==='samsung-newsroom-kr') {
    assert(isPermittedSamsungOriginal(c),'Samsung original requires image-specific permission evidence');
    assert.equal(sha256,c.originalSha256,'Do not alter the restricted original photograph');
  }
}
