#!/usr/bin/env python3
"""Read-only, sandboxed inspection of a publicly licensed character animation ZIP.

This tool DOES NOT extract ZIP paths or commit unreviewed assets. It inventories
the original 3D-baked sprite sheet pack and produces a limited contact sheet for
visual consistency, foot pivot and action coverage review.
"""
import argparse
import io
import json
from pathlib import Path
import zipfile
from PIL import Image, ImageDraw

SOURCE = "https://opengameart.org/content/dark-knight-2d-character-sprites"
DIRECT = "https://opengameart.org/sites/default/files/Knight%202D.zip"
LICENSE = "CC0 1.0 according to the author's OpenGameArt listing (2018-03-23)"
Image.MAX_IMAGE_PIXELS = 16000000
FRAME_ACTIONS = ["Idle", "Run", "Jump", "Slash", "Attack", "Block", "Crouch",
                 "Impact", "Walk", "DrawSword", "Death", "Turn", "Casting"]

def inventory(src, folder):
    folder.mkdir(parents=True, exist_ok=True)
    if src.stat().st_size > 100_000_000:
        raise ValueError("Archive exceeds 100MB import-audit safety limit")
    rows, pictures = [], []
    with zipfile.ZipFile(src) as archive:
        names = archive.infolist()
        if len(names) > 3000:
            raise ValueError("Too many archive entries")
        if sum(entry.file_size for entry in names) > 750_000_000:
            raise ValueError("Archive inflates above 750MB safety bound")
        for entry in names:
            name = entry.filename
            if name.startswith("/") or ".." in Path(name).parts or chr(0) in name:
                raise ValueError("Unsafe archive path")
            if entry.is_dir():
                continue
            row = {"name": name[:250], "uncompressed": entry.file_size}
            suffix = Path(name).suffix.lower()
            if suffix in (".png", ".webp") and entry.file_size < 55_000_000:
                try:
                    with archive.open(entry) as file:
                        raw = file.read(55_000_001)
                    with Image.open(io.BytesIO(raw)) as im:
                        row.update(width=im.width, height=im.height, mode=im.mode)
                        if im.width * im.height <= 16_000_000:
                            preview = im.convert("RGBA")
                            preview.thumbnail((208, 176), Image.Resampling.LANCZOS)
                            pictures.append((name, preview))
                except Exception as ex:
                    row["inspect_error"] = str(ex)[:100]
            rows.append(row)
    rows.sort(key=lambda r:r["name"].lower())
    pictures.sort(key=lambda e:(not any(a.lower() in e[0].lower() for a in FRAME_ACTIONS),e[0].lower()))
    sheet = Image.new("RGB", (4*248, 5*224), "#15171d")
    draw = ImageDraw.Draw(sheet)
    for n, (filename, art) in enumerate(pictures[:20]):
        col,row = n%4,n//4
        x,y = col*248,row*224
        checker = Image.new("RGBA", (208,176), "#2d3036")
        checker.alpha_composite(art, ((208-art.width)//2,(176-art.height)//2))
        sheet.paste(checker.convert("RGB"), (x+20,y+10))
        draw.text((x+8,y+188),Path(filename).name[:32],fill="#e6d5b6")
    sheet.save(folder/"character-contact-sheet.webp", "WEBP", quality=82, method=6)
    results = {
        "source": SOURCE, "download_url": DIRECT, "license_claim": LICENSE,
        "archive_bytes": src.stat().st_size, "entry_count": len(rows),
        "pictures": len(pictures), "files": rows,
        "warning": "No asset is imported, validated as animation-ready or deployed by this audit. Frame slicing/pivots and provenance require human review."
    }
    (folder/"source-audit.json").write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"archive_bytes":results["archive_bytes"],"entries":len(rows),"pictures":len(pictures),
                      "preview":str(folder/"character-contact-sheet.webp")},indent=2))

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("archive",type=Path)
    parser.add_argument("output",type=Path)
    args=parser.parse_args()
    inventory(args.archive,args.output)
