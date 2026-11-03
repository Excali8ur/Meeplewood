"""Download missing game icons into img/games based on a GameShelf CSV export.

Compares the "Game ID" (BGG id) column with the files in img/games and downloads
the missing ones from the "Image" column, resized to 150px high.
Without --csv, the newest data/games_gameshelf_*.csv is used.

Requires Pillow: pip install pillow
"""
# Pillow is Python's standard image library. The script uses it for three things:
# Decoding: it opens the downloaded bytes as an image (Image.open).
# Resizing: it scales each image to 150px high, keeping the aspect ratio, using Image.LANCZOS for quality.
# Saving: it writes the result as PNG or JPEG. JPEG has no transparency, so images are converted to RGB first.
# Python's standard library can't resize or re-encode images, so you need Pillow for this.

import argparse
import csv
import io
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "img" / "games"

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--csv", type=Path, help="GameShelf CSV (default: newest in data/)")
    parser.add_argument("--height", type=int, default=150)
    parser.add_argument("--force", action="store_true", help="re-download existing images")
    args = parser.parse_args()

    csv_path = args.csv
    if not csv_path:
        found = sorted((ROOT / "data").glob("games_gameshelf_*.csv"))
        if not found:
            sys.exit("No games_gameshelf_*.csv found in data/")
        csv_path = found[-1]
    print(f"Using {csv_path}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    have = {p.stem for p in OUT_DIR.iterdir()}

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        f.readline()  # the export starts with a "sep=," line
        reader = csv.DictReader(f, skipinitialspace=True)
        rows = list(reader)

    done = skipped = 0
    failed = []
    for row in rows:
        game_id = (row.get("Game ID") or "").strip()
        url = (row.get("Image") or "").strip()
        if not game_id or not url:
            continue
        if not args.force and game_id in have:
            skipped += 1
            continue

        is_png = re.search(r"format\(png\)", url) is not None
        ext, fmt = ("png", "PNG") if is_png else ("jpg", "JPEG")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Meeplewood-image-updater"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                img = Image.open(io.BytesIO(resp.read()))
            img.load()
            width = round(img.width * args.height / img.height)
            img = img.resize((width, args.height), Image.LANCZOS)
            if fmt == "JPEG":
                img = img.convert("RGB")
            # Remove any old file with the same id (possibly other extension)
            for old in OUT_DIR.glob(f"{game_id}.*"):
                old.unlink()
            img.save(OUT_DIR / f"{game_id}.{ext}", fmt)
            done += 1
            print(f"Downloaded {game_id}.{ext}")
        except Exception as e:
            failed.append(f"{game_id}: {e}")

    print(f"Downloaded: {done}, already present: {skipped}, failed: {len(failed)}")
    for msg in failed:
        print(f"WARNING: {msg}", file=sys.stderr)
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
