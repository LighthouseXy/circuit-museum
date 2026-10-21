# Retained third-party rights / 第三方权利保留

No third-party dependency is declared in this snapshot's package.json, and no vendored dependency, font file or hardware design file was identified in the tracked file inventory. This is an inventory finding, not a promise that unidentified material is absent.

| Component or path | Existing rights and handling |
| --- | --- |
| Node.js and Python standard libraries | Externally supplied runtimes/libraries, not bundled or relicensed here; their own notices apply. |
| Sharp, used by optional image-maintenance scripts | Upstream Apache-2.0; libvips and binary/transitive components may have additional terms. No version is installed, pinned, vendored or newly redistributed by this licensing change. Preserve the actual installed distribution's notices if it is later shipped. [Upstream license](https://github.com/lovell/sharp/blob/main/LICENSE). |
| Playwright, supplied to historical browser scripts | Upstream Apache-2.0; browser downloads have separate notices. No browser or library is bundled by this licensing change. [Upstream license](https://github.com/microsoft/playwright/blob/main/LICENSE). |
| Chrome / Chromium used externally for testing | Separate browser terms; not granted any license by this repository's MIT file. |
| System font names in src/style.css | Font names only; no font binaries were found. Operating-system/font licenses remain separate. |
| public/images/** | Keep creator, exact source page, original terms and conversion notes in src/image-overrides.json. CC BY, CC BY-SA, CC0, public-domain, Unsplash and vendor-specific entries do not become MIT. Unknown or unmatched entries remain unresolved. |
| docs/screenshots/circuit-museum/** | Retain ATTRIBUTION.md and manifest.json. The two embedded product photos have CC0 records; the full page captures include other material and are not blanket CC0/MIT assets. |
| docs/media-register.json and external video links | Historical candidates are not the actual image library. Videos remain links to publishers; no downloading, embedding or redistribution authorization is added. |
| Collection/source JSON, CSV/TSV, curatorial prose, downloaded HTML, manuals and evidence | Outside this licensing change's software/documentation grant; source citations are not a sublicense. Preserve each work's terms. |
| Hardware designs, schematics, PCB/Gerber/CAD or manufacturing files | Not found in the tracked snapshot; any later files remain excluded until separately licensed. |

MIT-covered original software and technical prose are identified in [LICENSE-SCOPE.md](../../LICENSE-SCOPE.md). These exclusions do not impose a non-commercial restriction on that MIT-covered prose or any future properly authorized MIT software. No existing third-party notice was removed or replaced.
