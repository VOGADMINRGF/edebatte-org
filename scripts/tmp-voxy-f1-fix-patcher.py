from pathlib import Path
import re

p = Path("scripts/tmp-voxy-f1-apply.py")
text = p.read_text()

needle = '''def replace_once(text: str, old: str, new: str, label: str) -> str:\n    count = text.count(old)\n    if count != 1:\n        raise SystemExit(f"{label}: expected one anchor, found {count}")\n    return text.replace(old, new, 1)\n'''
replacement = needle + '''\n\ndef indent_block(value: str, spaces: int) -> str:\n    prefix = " " * spaces\n    return "\\n".join(prefix + line if line else "" for line in value.splitlines())\n'''
if text.count(needle) != 1:
    raise SystemExit("replace_once helper anchor mismatch")
text = text.replace(needle, replacement, 1)

for name, spaces in [
    ("worker_anchor", 8),
    ("worker_replacement", 8),
    ("get_anchor", 2),
    ("get_replacement", 2),
    ("post_anchor", 4),
    ("post_replacement", 4),
]:
    pattern = rf"({name}\s*=\s*)dedent\((?P<body>'''\\\n.*?\n''')\)"
    updated, count = re.subn(
        pattern,
        lambda match: f"{match.group(1)}indent_block(dedent({match.group('body')}), {spaces})",
        text,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise SystemExit(f"{name} patch anchor mismatch: {count}")
    text = updated

p.write_text(text)
