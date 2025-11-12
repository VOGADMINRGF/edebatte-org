#!/usr/bin/env bash
set -euo pipefail

# Merge: apps/web/src/features  →  ./features
SRC_DEFAULT="apps/web/src/features"
DST_DEFAULT="features"

SRC="$SRC_DEFAULT"
DST="$DST_DEFAULT"
DRY=1   # 1 = Dry-Run, 0 = write
BACKUP_BASE=".merge_backups"
TS_ONLY=0   # 1 = nur *.ts,*.tsx,*.d.ts; 0 = alle Dateien

for arg in "$@"; do
  case "$arg" in
    --write) DRY=0;;
    --src=*) SRC="${arg#*=}";;
    --dst=*) DST="${arg#*=}";;
    --ts-only) TS_ONLY=1;;
    --help|-h)
      echo "Usage: $0 [--write] [--src=apps/web/src/features] [--dst=features] [--ts-only]"
      exit 0;;
  esac
done

if [[ ! -d "$SRC" ]]; then
  echo "✓ Quelle nicht gefunden ($SRC). Nichts zu tun."
  exit 0
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$BACKUP_BASE/${STAMP}_features_merge"
mkdir -p "$DST" "$BACKUP"

# portable file size
if stat -f%z / >/dev/null 2>&1; then
  fsize() { stat -f%z "$1"; }           # macOS/BSD
else
  fsize() { stat -c%s "$1"; }           # Linux
fi

# Sammler
moved=0; replaced=0; kept=0; same=0; backups=0; total=0

# find-Filter
if [[ "$TS_ONLY" -eq 1 ]]; then
  FIND_EXPR=( -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.d.ts" \) )
else
  FIND_EXPR=( -type f )
fi

echo "▶ Zusammenführen: $SRC  →  $DST"
[[ "$DRY" -eq 1 ]] && echo "   (Dry-Run; mit --write anwenden)"
echo "   Backups nach:  $BACKUP"
echo

while IFS= read -r -d '' f; do
  rel="${f#"$SRC/"}"
  tgt="$DST/$rel"
  ((total++)) || true

  # Zielordner sicherstellen
  tgt_dir="$(dirname "$tgt")"
  if [[ ! -d "$tgt_dir" && "$DRY" -eq 0 ]]; then
    mkdir -p "$tgt_dir"
  fi

  if [[ ! -f "$tgt" ]]; then
    echo " + NEW    $rel"
    if [[ "$DRY" -eq 0 ]]; then cp -p "$f" "$tgt"; fi
    ((moved++))
  else
    s_src=$(fsize "$f")
    s_dst=$(fsize "$tgt")
    if [[ "$s_src" -eq "$s_dst" ]]; then
      echo " = SAME   $rel"
      ((same++))
    else
      if (( s_src > s_dst )); then
        echo " > REPL   $rel   (src $s_src B > dst $s_dst B)"
        if [[ "$DRY" -eq 0 ]]; then
          mkdir -p "$BACKUP/keep_dst/$(dirname "$rel")"
          cp -p "$tgt" "$BACKUP/keep_dst/$rel"
          cp -p "$f" "$tgt"
        fi
        ((replaced++)); ((backups++))
      else
        echo " ! KEEP   $rel   (dst $s_dst B ≥ src $s_src B)"
        if [[ "$DRY" -eq 0 ]]; then
          mkdir -p "$BACKUP/keep_src/$(dirname "$rel")"
          cp -p "$f" "$BACKUP/keep_src/$rel"
        fi
        ((kept++)); ((backups++))
      fi
    fi
  fi
done < <(find "$SRC" "${FIND_EXPR[@]}" -print0)

echo
echo "──────── Summary"
printf "  Gefundene Dateien:  %d\n" "$total"
printf "  Neu kopiert:        %d\n" "$moved"
printf "  Ersetzt (src>dst):  %d\n" "$replaced"
printf "  Behalten (dst>src): %d\n" "$kept"
printf "  Gleich (skip):      %d\n" "$same"
printf "  Backups:            %d  →  %s\n" "$backups" "$BACKUP"

if [[ "$DRY" -eq 0 ]]; then
  # Leere Ordner säubern; Quelle ggf. entfernen, wenn leer
  find "$SRC" -type d -empty -delete || true
  rmdir "$SRC" 2>/dev/null || true
fi

[[ "$DRY" -eq 1 ]] && echo "Hinweis: Es wurde nichts verändert. Mit --write anwenden."
