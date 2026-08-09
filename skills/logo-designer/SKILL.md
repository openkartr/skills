---
name: logo-designer
description: Design and iterate original, scalable SVG logos, brand marks, wordmarks, app icons, and favicons. Use when a user asks to create a logo, explore distinct logo concepts, refine an existing mark, test small-size legibility, prepare light and dark variants, export SVG artwork to standard PNG sizes, or integrate approved logo assets into a project.
---

# Logo Designer

Create original SVG logo concepts, compare them visually, refine a selected direction, and export the approved mark for practical use.

## Build the brief

Inspect any project, URL, design system, or existing brand assets supplied by the user before asking questions. Extract the product name, purpose, audience, personality, colors, typography, visual language, and intended placements.

Ask only for missing decisions that materially affect the design:

- Format: icon, wordmark, lettermark, or combination mark
- Style: minimal, geometric, expressive, playful, editorial, or corporate
- Color requirements and light/dark background needs
- Primary uses and required sizes
- Symbols, clichés, competitors, or visual directions to avoid

If the user says to use judgment, default to a minimal combination mark, a compact icon variant, project colors when available, and strong monochrome behavior.

## Protect originality

- Design from the user's brand brief and concepts, not by tracing or closely imitating an existing logo.
- Do not reproduce third-party marks, mascots, icons, or distinctive trade dress.
- Treat competitor references as differentiation constraints, not visual templates.
- Explain that a design review does not replace a trademark clearance search.

## Follow SVG conventions

- Use `viewBox="0 0 W H"` and omit fixed `width` and `height` attributes.
- Use 512×512 for icons and 1024×512 for wordmarks or combination marks.
- Keep the SVG self-contained: no remote images, scripts, external stylesheets, or external fonts.
- Prefer flat fills. Use gradients only when they meaningfully support the brief.
- Use descriptive groups such as `icon`, `wordmark`, and `tagline`.
- Use readable markup without empty groups or unnecessary transforms.
- Use system-font fallbacks for live text, or convert final lettering to paths when reliable portability is required.
- Avoid thin strokes and details that disappear at 16–32 px.
- Add a concise `<title>` and `<desc>` for accessible standalone SVGs.

## Explore distinct concepts

Create three to five concepts with genuinely different visual logic. Vary the metaphor, geometry, composition, typography, or emotional tone rather than making cosmetic variations of one mark.

Write concepts to:

```text
logos/
├── concepts/
│   ├── concept-1.svg
│   ├── concept-2.svg
│   └── concept-3.svg
└── preview.html
```

When parallel workers are available, generate independent concepts concurrently. Give each worker the complete brief, SVG constraints, a distinct creative direction, and a unique output path. Do not grant broader permissions than the task requires.

Create `logos/preview.html` as a self-contained comparison page that:

- Shows every concept in a responsive card grid
- Provides light and dark canvas controls
- Labels concepts by filename and one-line rationale
- Loads SVGs through relative paths
- Does not load remote scripts, fonts, or analytics

Present the concepts with a short explanation of each direction and ask the user to choose one or combine specific attributes.

## Refine the selected direction

Store refinements in `logos/iterations/iteration-N.svg`. Preserve the prior iterations so the user can compare or return to an earlier version.

- Apply a precise request directly when the change is narrow.
- Create a small batch when the user wants to compare palettes, proportions, symbols, or typography.
- Keep group IDs stable across iterations where practical.
- Regenerate the preview after each batch.
- Show the latest iteration first while retaining earlier versions.

Add a small-size strip displaying each candidate at 64 px, 32 px, and 16 px. Simplify shapes, increase spacing, or thicken strokes when details fail at favicon sizes.

Before approval, test:

- Full color, one color, reversed, and grayscale
- Light and dark backgrounds
- Square icon and horizontal lockup, when applicable
- Legibility at 16, 32, 64, 192, and 512 px
- Clear space and visual balance
- Basic contrast and accessible SVG metadata

## Export approved artwork

Confirm the selected iteration if the user's choice is ambiguous. Copy it to `logos/export/logo.svg`, then run the bundled exporter:

```bash
bash <skill-directory>/scripts/export.sh logos/export/logo.svg logos/export/
```

The script generates PNG files at 16, 32, 48, 192, 512, 1024, and 2048 px using an already-installed SVG converter. It never installs software automatically.

If no converter is present, retain the SVG and tell the user which supported converter to install: `resvg`, Inkscape, librsvg, or ImageMagick.

Report every exported file and its dimensions. Keep the source SVG as the canonical editable asset.

## Integrate into a repository

Only modify a project when the user asks for integration.

1. Locate existing logo, favicon, manifest, social-card, PWA, and app-icon references.
2. Replace only approved targets; do not create unrelated platform assets.
3. Preserve original aspect ratios and transparency.
4. Update references and manifests that point to changed filenames.
5. Build or run the relevant visual checks.
6. Summarize changed assets and any remaining manual trademark or print-production checks.
