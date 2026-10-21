<!-- SPDX-License-Identifier: MIT -->
# Development and maintenance history

[简体中文](DEVELOPMENT_HISTORY.md) | [English](DEVELOPMENT_HISTORY.en.md)

This record is based on remote-reachable Git commits and their actual file diffs, reviewed through [`17b8b08`](https://github.com/LighthouseXy/circuit-museum/commit/17b8b084651b9a8ed766011807ae3f752a8f72a2). All times below are **UTC**, converted from Git author/committer timestamps. No dates have been backfilled and no history has been rewritten. Repository access settings are unchanged; commit links require the relevant access.

## Verified time span

At review, the remote had one branch, `main`, four reachable commits and no remote tags. The evidence spans **2026-10-17 03:03:28 to 2026-10-21 11:23:53 UTC**, over four days, with commits on two UTC dates. It shows a project snapshot followed by documentation, presentation and licensing maintenance. It does not establish daily development, a complete earlier engineering history, or that every feature was implemented on the import date.

## Imported functionality and content snapshot

### 2026-10-17 03:03:28 UTC — Import of an existing project

Commit: [`87a9fa5`](https://github.com/LighthouseXy/circuit-museum/commit/87a9fa5a1a5ca709624249226f87d373b33f3deb)

This single commit added 1,296 files containing the static generator, native JS/CSS client, collection/source data, image register, test scripts and existing research records.

The snapshot includes homepage, catalog, detail and chronology generation in `scripts/build.mjs` and `scripts/render-chronicles.mjs`; composed filtering and sorting in `src/catalog.js`; and URL/return-state handling in `src/app.js`. Its data tables contain 400 exhibits, 744 collection source records, 16 reading lines, 409 chronology nodes and 729 chronology source records.

These are features and records already present at import, not 1,296 separate improvements or evidence of individual completion dates. No earlier remote Git commits are available for this record. File timestamps and dates written inside older documents are not used to invent an earlier development timeline.

## Published documentation, presentation and licensing maintenance

| Time (UTC) | Category | Substantive diff evidence |
| --- | --- | --- |
| 2026-10-21 10:41:21 | Bilingual project documentation | [`913486f`](https://github.com/LighthouseXy/circuit-museum/commit/913486fee148ed455d3efec50e199a1da2d05758) added an English README and language links at the top of the Chinese README. Only those two files changed. The English text distinguishes the current 400-exhibit snapshot, historical checks and the media-evidence cache limitation in a clean checkout. It did not add website language switching. |
| 2026-10-21 10:49:50 | Presentation and source traceability | [`41b0e18`](https://github.com/LighthouseXy/circuit-museum/commit/41b0e182bcb82a2d7a6d30b8eda5ec2894a1fad5) added three cloud-browser development-preview captures, attribution and a capture manifest, and embedded the images in both READMEs. Seven files changed. The captures use only the existing Nest Protect and Oculus Quest CC0 photographs; they do not establish collection-wide photo restoration. Website source code was unchanged. |
| 2026-10-21 11:23:53 | Software licensing and scope | [`17b8b08`](https://github.com/LighthouseXy/circuit-museum/commit/17b8b084651b9a8ed766011807ae3f752a8f72a2) added the standard MIT text, an inventory of 28 existing software paths and retained third-party rights, with matching README, screenshot-scope and package metadata updates. Eight files changed. Package metadata points to the scope document rather than calling all databases and assets MIT. No source-code or media changes were included. |

## Quality fixes, testing and unpublished work

Through the reviewed baseline, post-import remote diffs did not change the generator, search interaction, original collection data or runtime test code. This record therefore does not describe those documentation changes as published feature development or bug fixes.

Existing scripts and dated historical reports describe what was stored in the snapshot; the presence of a test script is not a new passing test result. This page makes no new test-pass, formal release, production deployment, user-adoption or community-contribution claim. Historical checks retain their original scope and dates.

The standalone synthetic Demo, restricted-media build modes and related fixes remain separate candidates outside this record's default-branch baseline. Locally prepared or verified work is not counted as published functionality. Record it as such only after an actual reachable commit is merged, with its corresponding diff.

## Keeping this record current

For each later entry, record the actual UTC date, category, behavior change and commit link. Separate feature development, quality fixes, content maintenance and documentation/licensing changes. Mark unpublished work explicitly. This page contains commit-backed technical facts rather than private coordination records or personal contact details.

The original technical prose on this page is [MIT](LICENSE) licensed; linked software, databases and assets retain the boundaries in [LICENSE-SCOPE.md](LICENSE-SCOPE.md).
