#!/usr/bin/env bash
set -euo pipefail

INPUT_SVG="${1:?Usage: export.sh <input.svg> <output-dir>}"
OUTPUT_DIR="${2:?Usage: export.sh <input.svg> <output-dir>}"
SIZES=(16 32 48 192 512 1024 2048)

if [[ ! -f "$INPUT_SVG" ]]; then
  echo "ERROR: SVG file not found: $INPUT_SVG" >&2
  exit 1
fi

case "${INPUT_SVG,,}" in
  *.svg) ;;
  *)
    echo "ERROR: Input must be an .svg file." >&2
    exit 1
    ;;
esac

mkdir -p "$OUTPUT_DIR"
cp "$INPUT_SVG" "$OUTPUT_DIR/logo.svg"

if command -v resvg >/dev/null 2>&1; then
  CONVERTER="resvg"
elif command -v rsvg-convert >/dev/null 2>&1; then
  CONVERTER="rsvg-convert"
elif command -v inkscape >/dev/null 2>&1; then
  CONVERTER="inkscape"
elif command -v magick >/dev/null 2>&1; then
  CONVERTER="magick"
else
  echo "ERROR: No supported SVG-to-PNG converter is installed." >&2
  echo "Install resvg, Inkscape, librsvg, or ImageMagick and run the export again." >&2
  exit 1
fi

echo "Using: $CONVERTER"

for SIZE in "${SIZES[@]}"; do
  OUTPUT="$OUTPUT_DIR/logo-${SIZE}.png"
  case "$CONVERTER" in
    resvg)
      resvg "$INPUT_SVG" "$OUTPUT" --width "$SIZE"
      ;;
    rsvg-convert)
      rsvg-convert --width "$SIZE" --height "$SIZE" --keep-aspect-ratio --output "$OUTPUT" "$INPUT_SVG"
      ;;
    inkscape)
      inkscape "$INPUT_SVG" --export-type=png --export-filename="$OUTPUT" --export-width="$SIZE" --export-height="$SIZE"
      ;;
    magick)
      magick -background none "$INPUT_SVG" -resize "${SIZE}x${SIZE}" "$OUTPUT"
      ;;
  esac
  echo "Exported: $OUTPUT (${SIZE}px)"
done

echo "Done. Files in: $OUTPUT_DIR"
