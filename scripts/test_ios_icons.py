"""Run with: python3 -m unittest discover -s scripts -p 'test_ios_icons.py'."""
from pathlib import Path
import shutil
import tempfile
import unittest

from PIL import Image

from ios_icons import ROOT, compile_icons


class IOSIconsTest(unittest.TestCase):
    def test_thread_and_agile_have_one_full_bleed_background(self):
        for name in ("AppIcon", "agile"):
            for suffix in ("", "-dark"):
                with self.subTest(name=name, suffix=suffix):
                    with Image.open(ROOT / f"assets/ios/{name}{suffix}.png") as image:
                        self.assertEqual(image.size, (1024, 1024))
                        self.assertEqual(image.mode, "RGB")
                        # The corner, edge and inner plate used to have two colors.
                        background = image.getpixel((32, 512))
                        for pixel in ((0, 0), (512, 0), (1023, 512), (512, 1023), (0, 512)):
                            self.assertEqual(image.getpixel(pixel), background)

    @unittest.skipUnless(shutil.which("xcrun"), "Xcode asset compiler required")
    def test_installed_catalog_registers_alternates_on_iphone_and_ipad(self):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            app = work / "StoatMD.app"
            app.mkdir()
            info = compile_icons(app, work, platform="iphonesimulator")
            for device in ("CFBundleIcons", "CFBundleIcons~ipad"):
                self.assertEqual(info[device]["CFBundlePrimaryIcon"]["CFBundleIconName"], "AppIcon")
                self.assertEqual(set(info[device]["CFBundleAlternateIcons"]), {"agile", "head-a", "head-b", "head-d"})
            self.assertTrue((app / "Assets.car").is_file())


if __name__ == "__main__":
    unittest.main()
