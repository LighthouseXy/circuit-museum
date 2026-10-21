# Selected media source verification

Checked 2026-10-21 against repository base `6ff655f954afe6485fa16d3aa7255d8523937b09`. This is a selected-source review, not clearance of the entire collection. No image bytes or production checkout content was changed; the isolated candidate corrects only the Atari license URL metadata. Public photographer names, profile links and licensing contact information remain attribution facts, not credentials.

## Orphan files and Atari source pointer

| Existing path | Byte/source evidence | Rights and minimum action |
| --- | --- | --- |
| `public/images/atari-vcs.webp` | 52,838 bytes; SHA-256 `70d77552ade859c05d0dedd41dc2f8d19f1e56b0c4591520d20e4d4e938e88f9`. Exact byte match after converting the official [Console-02 original](https://commons.wikimedia.org/wiki/File:Atari-2600-Six-Switch-Console-02.jpg) with the existing download pipeline. | Evan-Amos, PD-self. Currently unmapped; document the actual source if distributing this file. Do not treat the old media-register candidate as an actual-use register. No deletion proposed here. |
| `public/images/atari-vcs-exterior.webp` | 74,614 bytes; SHA-256 `8c3f30ca352eac19a49b127000fbcb40083dd97ce247d8857442553def7cce48`. Exact conversion match to [Console-01 original](https://commons.wikimedia.org/wiki/File:Atari-2600-Six-Switch-Console-01.jpg). | Evan-Amos, PD-self. At the remote baseline, source/original correctly name `-01.jpg`, but `licenseUrl` in `src/image-overrides.json` and `docs/evidence/image-metadata/atari-vcs.json` names `-02.jpg`. Both pages carry PD-self; this is a provenance-link mismatch. This isolated candidate corrects both license URLs to the verified `-01.jpg` description page, whose Summary contains the PD-self declaration. No unverified section anchor is added; image bytes remain unchanged. |
| `public/images/sony-tps-l2.jpg` | 1,189,459 bytes; SHA-256 `06bd9af1c501c0f8984994308f719c78889fbdb80317840e1839f407bace3852`; SHA-1 matches the current [Commons original](https://commons.wikimedia.org/wiki/File:Original_Sony_Walkman_TPS-L2.JPG), `857dd9a9a7b9911006ab77f3d92cc37fc7c96a0a`. | Binarysequence; Ubcule color-balance revision; CC BY-SA 4.0. JPEG is unmapped; current site mapping serves the WebP. If shipping the JPEG, attach the same original-page/license/credit information. Preserve change notices and applicable share-alike obligations for derivatives; do not label it MIT. |

Atari reference downloads were checked against Commons API original SHA-1: `-01` = `f22986790bfd4a1952c1d4abed072284dc3dd610`; `-02` = `a79da17610f262e26809bbe07c4e431a22852f0d`. Reproduction: Sharp `rotate()`, `resize({width:1100,height:1100,fit:'inside',withoutEnlargement:true})`, `webp({quality:85})`. These checks reproduce the existing bytes with the available Sharp runtime; other versions may encode different bytes. Reference originals are not added to this candidate.

## Samsung Newsroom Korea

Files `public/images/photo-samsung-the-freestyle-2022.jpg` and `public/images/photo-samsung-galaxy-xr.jpg` match the recorded original SHA-256 values in the corresponding `docs/evidence/photo-expansion/round3/normalized-research/*.json`:

- Freestyle: `ff8066ae02360471bff6ba6dd7018c7d31bd11d768faa236636aca8cca7fdcea` (152,146 bytes), [source article](https://news.samsung.com/kr/삼성전자-포터블-스크린-더-프리스타일-국내-출).
- Galaxy XR: `1272583677b73bc02ca7a98d49a437c7b7e0465c0aee6a8c4a3f73abea17b503` (154,799 bytes), [source article](https://news.samsung.com/kr/무한으로-확장하는-가능성···-삼성의-첫-안드로이).

The [Korean Newsroom policy](https://news.samsung.com/kr/삼성전자-뉴스룸-콘텐츠-이용에-대한-안내) permits reuse of its own articles/images, except restricted outside contributions. Bottom Newsroom watermarks indicate restricted images; externally bylined articles require permission. Arbitrary editing/processing and redistribution is prohibited. Video downloading/reuse is prohibited; player sharing is conditional. This is a conditional publisher permission, not CC or MIT. Both existing JPEGs were inspected as image files: no bottom Newsroom watermark was visible. Source articles and existing research support the Newsroom attribution; the hash check establishes unchanged bytes relative to the recorded originals, not independently cleared publicity or depicted-work rights. Minimum action: preserve exact JPEG bytes, source/credit and publisher conditions; keep external video links only. Confirm any intended modification or broader reuse with the publisher rather than assuming permission.

## Two Unsplash photographs

| Existing exhibit mapping | Actual source / author | Current evidence |
| --- | --- | --- |
| `samsung-t7-2020` | [Samsung external SSD connected to a laptop](https://unsplash.com/photos/samsung-external-ssd-connected-to-a-laptop-qqJXQd7EJV4), Subhra Jyoti Paul | Page names Samsung T7 and the free Unsplash License; published 2025-09-02. |
| `logitech-mx-mechanical` | [A keyboard on a desk](https://unsplash.com/photos/a-keyboard-on-a-desk-O_uKaE9lqq4), Tobias Röder | Page names MX Mechanical and the free Unsplash License; published 2022-11-27. |

The [Unsplash License](https://unsplash.com/license) permits downloading, copying, modifying, distributing and commercial use without mandatory credit, but excludes selling images without significant modification and compiling a competing image service. Preserve the existing public author/source credits. These photographs remain under Unsplash terms, not MIT or CC. [Terms sections 5 and 8](https://unsplash.com/terms) distinguish image copyright permission from depicted trademarks, recognizable people and artwork; additional permission can depend on use. Service restrictions include automated scraping outside approved tools/API, competing services, and ML/AI uses. No new Unsplash image download or automated import was performed. If future imports use the API, follow the API's separate attribution/hotlink/download-tracking rules. Minimum action: retain the distinct license and purpose limits; do not offer these files as a generic photo library or imply model/property releases are verified.

## Candidate verification and limits

- The importer now resolves `sharp` normally, retaining the existing explicit module argument. It remains an optional research/import tool; the default zero-dependency site build is unchanged.
- `node --check scripts/stage-product-photos.mjs` and `git diff --check` passed. Normal Sharp resolution in this candidate returns `MODULE_NOT_FOUND`; the existing explicit override resolves. No dependency was installed and the importer was not executed. Users of the optional importer must provide Sharp through normal local dependency installation or the existing explicit argument.
- Targeted documents omit unnecessary local absolute paths, internal execution identifiers and private deployment identifiers. Screenshot filenames, hashes, capture times and third-party credit records are retained; page references are relative.
- This does not remove identifiers from existing Git history. Other historical research records and `README.en.md` still need their previously identified public-scope review; no repository-wide sanitization or rights clearance is claimed. No whole-site matrix or local browser testing was run.
