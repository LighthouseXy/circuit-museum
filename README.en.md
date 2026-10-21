# Circuit Museum

[简体中文](README.md) | [English](README.en.md)

Circuit Museum is a static digital museum about real consumer-electronics products and how their design, technology, and everyday use have changed over time. It combines an editorial catalog with sourced product histories. The website interface and exhibit articles are primarily in Chinese; this English README does not add an English-language website interface.

## Current collection

The current source-data snapshot, checked on 2026-10-21 UTC, contains:

- 400 product exhibits and 744 collection source records.
- 16 thematic chronicle reading lines, 409 nodes, and 729 chronicle source records.
- 139 exhibits with a primary photograph and 261 without one. The 140 image records also include one internal-detail image.
- Five video links to their original publisher pages; videos are not downloaded or embedded.

Source counts describe records, not unique websites. Citations support the claims and scope recorded for each source; they do not imply that every statement has been independently re-verified. Earlier references to 40 exhibits and October 3–4 test runs describe historical snapshots.

## What it does

- Presents a homepage, searchable collection, individual exhibit articles, product chronicles, and supporting curatorial pages.
- Combines keyword, category, and decade filters with chronological sorting and shareable URL state.
- Connects dated chronicle nodes to catalog exhibits and nearby source references.
- Keeps product context, design, use, significance, and limitations alongside paragraph-level references.
- Preserves image attribution and usage notes, and marks missing photographs instead of substituting an unverified model.

## Development preview and screenshots

[Open the protected development preview](https://circuit-museum-a5e6r7np6-lighthousexy-6060s-projects.vercel.app). Vercel sign-in is required. This separate development candidate is for review and browser checks, not a public production release or the default-branch build. Its media scope is limited to the existing CC0 photographs for `nest-protect-1` and `oculus-quest-2019`; it does not display all 139 catalog photographs.

These unedited screenshots were captured in Cloud Chrome on 2026-10-21 from the protected two-photo development preview. They do not imply a public production launch, full-catalog photo restoration, or site-wide media-rights clearance. See [screenshot provenance and photo credits](docs/screenshots/circuit-museum/ATTRIBUTION.md) for the original authors, files, CC0 terms, and conversion notes.

### Collection filter: Oculus Quest

![Circuit Museum collection filtered to the first-generation Oculus Quest, showing its exhibit card, product photo, description, and source-credit line.](docs/screenshots/circuit-museum/circuit-museum-catalog-oculus-filter-2026-10-21-1172x751.jpg)

### Exhibit detail: Oculus Quest

![First-generation Oculus Quest detail page with the curation rationale, original 2019 photo, archive facts, and references.](docs/screenshots/circuit-museum/circuit-museum-quest-detail-2026-10-21-1172x751.jpg)

### Exhibit detail: Nest Protect

![First-generation Nest Protect detail page with the curation rationale, CC0 photo, year, category, and evidence links.](docs/screenshots/circuit-museum/circuit-museum-nest-detail-photo-credits-2026-10-21-1172x751.jpg)

## Run locally

Use Node.js 22 or later. The ordinary static build has no third-party runtime or build dependencies and does not require external services or secrets. This branch has no dependency lockfile, so `npm ci` is not a setup step.

```sh
npm run build
npm run dev
```

Open <http://127.0.0.1:4173/>. Set `PORT` to use another local port. Output is written to `dist/`; rebuild after editing data or styles.

```sh
npm run lint
npm test
```

Build before testing because several tests inspect `dist/`. `lint` performs Node.js syntax checks. Some tests also inspect historical media evidence. In a clean tracked snapshot, `tests/photo-rights.test.mjs` currently references an ignored original-download cache and may fail with `ENOENT`; its candidate fix is separate from this documentation-only update. No new passing runtime-test result is claimed by this README change. Historical test scope and limits are recorded in [docs/test-results.md](docs/test-results.md).

The protected preview's restricted-media commands and release-candidate tooling are not included in this default-branch documentation update. Do not assume commands from that separate candidate are available here. Optional image-maintenance scripts require separately supplied Sharp; historical browser scripts use separately supplied Playwright and Chrome. They are not ordinary site dependencies.

## Data and maintenance

- [docs/collection.json](docs/collection.json): editable exhibit catalog, editorial sections, source IDs, paragraph references, and related exhibits.
- [src/collection.json](src/collection.json): generated catalog used by the site; rebuild it through [scripts/import-collection.mjs](scripts/import-collection.mjs) rather than editing it directly.
- [docs/chronicles.json](docs/chronicles.json): thematic reading lines, dated nodes, exhibit links, and a separate source registry.
- [src/image-overrides.json](src/image-overrides.json): actual image-file mappings, creators, source pages, licenses, and conversion notes.
- [docs/media-register.json](docs/media-register.json): older media candidates and video links; it is not the actual image library or proof of permission to redistribute a file.
- [docs/implementation.md](docs/implementation.md): implementation history.

For corrections, identify the stable exhibit slug, exact model, original source, supported claim, checked date, and any limitations. Keep editorial interpretation separate from manufacturer claims and individual observations. Preserve stable IDs and the site's existing numbering rules.

Only add an image after checking its exact source file, model, terms, attribution, and permitted modifications. Do not replace a missing photograph with a similar model, treat a source URL as redistribution permission, or download and redistribute the linked videos. Keep credentials and private collaboration records out of contributions. After code or data changes, run a build, lint, and then tests, and report the actual environment and results.

## License and release status

The project-owned original software and original technical documentation are licensed under the [MIT License](LICENSE), allowing commercial use, modification and redistribution with the required copyright and permission notices. See [LICENSE-SCOPE.md](LICENSE-SCOPE.md) and the [path inventory](docs/licensing/PATH-SCOPE.json) for the exact scope.

This is not a blanket license for the whole website or museum collection. The original 400-exhibit curatorial/source databases, third-party code and dependencies, images, audiovisual material, screenshots, fonts and hardware remain outside that grant. Their existing CC BY, CC BY-SA, CC0, public-domain, Unsplash or vendor-specific terms remain applicable where recorded. See [third-party rights](docs/licensing/THIRD-PARTY-NOTICES.md). Attribution records do not constitute new legal clearance. Package metadata points to the scope document because this repository contains mixed-license content.

This README update does not change repository visibility, production deployment, media permissions, or website functionality. It does not claim external community adoption or a completed public release.
