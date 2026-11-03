#!/usr/bin/env python3
"""Generate full-bleed iOS artwork and compile primary/alternate app icons.

Run `python3 scripts/ios_icons.py` after editing the brand SVGs (requires
librsvg's rsvg-convert and Pillow). iOS supplies the rounded mask itself.
"""
import json
from pathlib import Path
import plistlib
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ICONS = {"AppIcon": "AppIcon", "agile": "agile", "head-a": "head-a", "head-b": "head-b", "head-d": "head-d"}


def generate():
    from PIL import Image

    assets = ROOT / "assets/ios"
    for design, filename in (("thread", "AppIcon"), ("agile", "agile")):
        for mode in ("light", "dark"):
            source = ET.parse(ROOT / f"docs/brand/stoatmd-logo/app-icons/{design}-{mode}.svg").getroot()
            artwork = source.find(".//{*}g[@clip-path]")
            if artwork is None:
                raise ValueError(f"Missing artwork: {design}-{mode}")
            # Extract the artwork before the macOS inset/shadow and rounded mask.
            background = artwork.find("{*}rect")
            background.attrib.pop("rx", None)
            background.attrib.pop("ry", None)
            svg = ET.Element("{http://www.w3.org/2000/svg}svg", width="1024", height="1024", viewBox="0 0 1024 1024")
            svg.extend(list(artwork))
            with tempfile.TemporaryDirectory() as temp:
                raster = Path(temp) / "icon.png"
                subprocess.run(["rsvg-convert", "--output", str(raster)], input=ET.tostring(svg), check=True)
                with Image.open(raster) as image:
                    image.convert("RGB").save(assets / f"{filename}{'-dark' if mode == 'dark' else ''}.png")
    for key, source in (("head-a", "04-head-A-winter"), ("head-b", "04-head-B-side"), ("head-d", "04-head-D-threequarter")):
        shutil.copy2(ROOT / f"docs/brand/stoatmd-logo/04-head/{source}-1024.png", assets / f"{key}.png")


def compile_icons(app, work, platform="iphoneos", minimum="16.0"):
    """Compile the same icon catalog for release and simulator packages."""
    catalog = work / "Assets.xcassets"
    for name, filename in ICONS.items():
        iconset = catalog / f"{name}.appiconset"
        iconset.mkdir(parents=True, exist_ok=True)
        images = []
        for dark in (False, True):
            source = ROOT / f"assets/ios/{filename}{'-dark' if dark else ''}.png"
            if not source.exists():
                continue
            shutil.copy2(source, iconset / source.name)
            entry = {"filename": source.name, "idiom": "universal", "platform": "ios", "size": "1024x1024"}
            if dark:
                entry["appearances"] = [{"appearance": "luminosity", "value": "dark"}]
            images.append(entry)
        (iconset / "Contents.json").write_text(json.dumps({"images": images, "info": {"author": "xcode", "version": 1}}))
    partial = work / "asset-info.plist"
    command = ["xcrun", "actool", str(catalog), "--compile", str(app), "--platform", platform,
               "--minimum-deployment-target", minimum, "--target-device", "iphone", "--target-device", "ipad",
               "--app-icon", "AppIcon", "--output-partial-info-plist", str(partial)]
    for name in ICONS:
        if name != "AppIcon":
            command.extend(["--alternate-app-icon", name])
    subprocess.run(command, check=True)
    return plistlib.loads(partial.read_bytes())


if __name__ == "__main__":
    generate()
