"""
Subsets the design system's fonts for the web (CLAUDE.md section 3: self-hosted WOFF2, subset to Persian + Latin + digits).

  python scripts/subset-fonts.py            writes public/fonts/*.woff2 from design/fonts/*.woff2
  python scripts/subset-fonts.py --check    also scans our source for characters the subset does not cover

Needs fonttools and brotli (`pip install fonttools brotli`). design/ stays the untouched source; public/fonts is what the
site serves and is committed, so a normal build does not need Python. Re-run it only when design/fonts changes.
Layout features (Arabic joining, mark positioning, kerning) are kept; hinting is dropped (WOFF2 for screens).
"""
import re
import subprocess
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "fonts"
OUT = ROOT / "public" / "fonts"

# What the site can print. Anything else falls back to the next family in the font stack (Tahoma, system-ui).
RANGES = [
    (0x0020, 0x007E),  # Basic Latin: letters, ASCII digits, punctuation
    (0x00A0, 0x00A0),  # no-break space
    (0x00A9, 0x00A9),  # ©
    (0x00AB, 0x00AB), (0x00BB, 0x00BB),  # « »
    (0x00B7, 0x00B7),  # · (separator in meta lines)
    (0x00D7, 0x00D7),  # ×
    (0x0600, 0x06FF),  # Arabic block: Persian letters, Persian digits U+06F0-06F9, ٪ ، ؛ ؟ and marks
    (0x200B, 0x200F),  # zero-width space/joiners, LRM, RLM
    (0x2010, 0x2015), (0x2018, 0x201D), (0x2022, 0x2022), (0x2026, 0x2026),  # dashes, quotes, bullet, ellipsis
    (0x202A, 0x202E), (0x2066, 0x2069),  # bidi embedding / isolate controls
    (0x2212, 0x2212),  # minus
]
FONTS = ["Estedad-ExtraBold.woff2", "Vazirmatn-UI-FD-Regular.woff2", "Vazirmatn-UI-FD-SemiBold.woff2"]


def unicodes() -> str:
    return ",".join(f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}" for a, b in RANGES)


def subset() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in FONTS:
        src, dst = SRC / name, OUT / name
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(src),
                f"--unicodes={unicodes()}", "--flavor=woff2", "--layout-features=*",
                "--no-hinting", "--notdef-outline", "--name-IDs=*", f"--output-file={dst}",
            ],
            check=True,
        )
        print(f"{name}: {src.stat().st_size:>7} -> {dst.stat().st_size:>7} bytes")


def covered(font: Path) -> set[int]:
    return set(TTFont(font).getBestCmap().keys())


def check() -> int:
    """Characters used in our source (letters, digits, punctuation the fonts are expected to draw) that the subset lacks."""
    wanted = set()
    for d in ("app", "components", "lib", "docs"):
        for f in (ROOT / d).rglob("*"):
            if f.suffix in {".ts", ".tsx", ".css", ".md"} and "node_modules" not in f.parts:
                wanted |= {ord(c) for c in f.read_text(encoding="utf-8", errors="ignore") if re.match(r"[؀-ۿ​-‏]", c)}
    missing = 0
    for name in FONTS:
        gone = sorted(wanted - covered(OUT / name))
        # the .notdef-less joiners are legitimately absent from some cmaps; only report real letters and digits
        gone = [c for c in gone if not 0x200B <= c <= 0x200F]
        if gone:
            missing += len(gone)
            print(f"{name}: no glyph for {' '.join(f'U+{c:04X}({chr(c)})' for c in gone)}")
    print("coverage check:", "OK, every Arabic-block character used in the source has a glyph" if not missing else f"{missing} missing")
    return 1 if missing else 0


if __name__ == "__main__":
    subset()
    sys.exit(check() if "--check" in sys.argv else 0)
