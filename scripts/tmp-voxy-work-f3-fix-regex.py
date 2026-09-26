from pathlib import Path

path = Path('apps/web/src/features/voxyVideo/editorialTranslationSemanticGuard.ts')
lines = path.read_text().splitlines()
hits = [i for i, line in enumerate(lines) if '.map((separator) => separator.replace(' in line]
if len(hits) != 1:
    raise SystemExit(f'expected one generated regex escape line, got {len(hits)}')
lines[hits[0]] = '    .map((separator) => (separator === "." ? "\\\\." : separator))'
path.write_text('\n'.join(lines) + '\n')
