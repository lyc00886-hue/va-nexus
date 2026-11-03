# sba-series-outline — blank SBA series outline (VA-Nexus)

**Purpose:** Teacher / student **fill-in** outline for one HKDSE VA SBA portfolio: research workbook + **four** pieces (Artwork / Critical studies; at least one Artwork).

**Locales:** `sba-series-outline.zh-Hant.json` · `.en.json` · `.zh-Hans.json` (struct-parity).

## How teachers use it

1. Open or print the blank outline (or wire into the app later).
2. Student fills **portfolio** theme fields, then four **pieces** (type, working title, media, size, link to theme, status).
3. Use **rwbOutline** prompts as section headings for the research workbook — not a full rewrite of `sba-guide` fields.
4. Use **perPieceChecklist** while making each piece; detailed fields stay in `sba-guide`.
5. From piece 2 onward, fill **progressionFromPrev** / **progressionNote** so the series improves piece by piece.

Aligns with `sba-artwork-slots` short labels (作品 1–4 / Piece 1–4) and SBA guide Steps 1–6 keys: `theme`, `research`, `sketch`, `media`, `making`, `reflection`.

## Exemplars forbidden (CL lock)

- **Do not** copy, paste, or paraphrase high-score student SBA work or exemplar PDFs (including anything under `cl-refs/`).
- This package is **blank structure + prompt lines only**.
- v1 may use original guiding templates elsewhere; this outline is not an exemplar bank.

## School-safe

- No SEN / diagnosis labels.
- Clear, classroom-ready wording.

## Status enums (shared)

- Piece `type`: `artwork` | `criticalStudy` | `unset`
- Piece `status`: `notStarted` | `inProgress` | `draftDone` | `final`
