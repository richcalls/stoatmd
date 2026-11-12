#!/usr/bin/env python3
"""Package, sign, notarize and staple a macOS build for distribution outside the App Store.

Produces a notarized DMG (plus the zip that was submitted) under --out.
Signing uses a Developer ID Application identity from the login keychain;
notarization goes through `asc notarization`, which reuses the App Store
Connect API key configured for the asc CLI.
"""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess
import sys
import tempfile
import time

from ios import build_environment

ROOT = Path(__file__).resolve().parents[1]


def run(*args, **kwargs):
    return subprocess.run([str(arg) for arg in args], check=True, **kwargs)


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_sums(out, paths):
    sums = out / "SHA256SUMS.txt"
    sums.write_text(
        "".join(f"{sha256(path)}  {Path(path).name}\n" for path in paths),
        encoding="utf-8",
    )
    return sums


def sign(identity, target, runtime):
    command = ["codesign", "--force", "--timestamp", "--sign", identity]
    if runtime:
        command[2:2] = ["--options", "runtime"]
    run(*command, target)


def notarize(path, attempts=3):
    # asc talks to the Apple Notary API v2 directly; no notarytool profile needed.
    # Retry network interruptions during the upload; Apple-side validation errors
    # remain immediate failures so the original cause stays visible.
    command = ["asc", "notarization", "submit", "--file", path,
               "--wait", "--poll-interval", "30s", "--timeout", "45m", "--pretty"]
    transient_markers = (
        "connection reset by peer",
        "connection refused",
        "unexpected eof",
        "temporary failure",
        "tls handshake timeout",
        "i/o timeout",
    )
    for attempt in range(1, attempts + 1):
        result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.stdout:
            print(result.stdout, end="", flush=True)
        if result.returncode == 0:
            if result.stderr:
                print(result.stderr, end="", file=sys.stderr, flush=True)
            return
        if result.stderr:
            print(result.stderr, end="", file=sys.stderr, flush=True)
        diagnostic = (result.stdout + "\n" + result.stderr).lower()
        retryable = any(marker in diagnostic for marker in transient_markers)
        if retryable and attempt < attempts:
            delay = attempt * 15
            print(f"Notarization upload hit a temporary network error; retrying in {delay}s "
                  f"(attempt {attempt + 1}/{attempts}).", file=sys.stderr, flush=True)
            time.sleep(delay)
            continue
        raise subprocess.CalledProcessError(
            result.returncode, command, output=result.stdout, stderr=result.stderr
        )


def staple(target, attempts=3):
    # stapler fetches the notarization ticket from Apple's CloudKit CDN. The
    # connection occasionally drops (error 68) right after a successful
    # notarization, so retry before failing the release.
    command = ["xcrun", "stapler", "staple", str(target)]
    for attempt in range(1, attempts + 1):
        result = subprocess.run(
            command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
        )
        if result.stdout:
            print(result.stdout, end="", flush=True)
        if result.returncode == 0:
            return
        if attempt == attempts:
            raise subprocess.CalledProcessError(
                result.returncode, command, output=result.stdout
            )
        delay = attempt * 15
        print(f"stapler failed with exit {result.returncode}; retrying in {delay}s "
              f"(attempt {attempt + 1}/{attempts}).", file=sys.stderr, flush=True)
        time.sleep(delay)


def verify(app, identity):
    details = subprocess.run(
        ["codesign", "-dvvv", str(app)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, check=True,
    ).stdout
    if f"Authority={identity}" not in details:
        raise SystemExit("The app is not signed with the requested Developer ID identity:\n" + details)
    if "Runtime Version=" not in details:
        raise SystemExit("Hardened runtime is missing:\n" + details)
    if "Timestamp=" not in details:
        raise SystemExit("The signature has no secure timestamp:\n" + details)


def make_dmg(app, dmg):
    with tempfile.TemporaryDirectory(prefix="stoatmd-dmg-") as temp:
        staging = Path(temp) / "StoatMD"
        staging.mkdir()
        # 拖拽安装：卷里放应用和 Applications 快捷方式。ditto 保留 stapled 票据需要的元数据。
        run("ditto", app, staging / app.name)
        (staging / "Applications").symlink_to("/Applications")
        run("hdiutil", "create", "-volname", "StoatMD", "-srcfolder", staging,
            "-ov", "-format", "UDZO", dmg)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--identity", required=True,
                        help='Developer ID Application identity, e.g. "Developer ID Application: Name (TEAMID)"')
    parser.add_argument("--version", help="Override nsh.json version")
    parser.add_argument("--build", type=int, help="Override nsh.json build number")
    parser.add_argument("--out", type=Path, default=ROOT / ".nsh/release-macos")
    parser.add_argument("--skip-notarize", action="store_true",
                        help="Only package and sign (local smoke tests)")
    args = parser.parse_args()

    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    config = json.loads((ROOT / "nsh.json").read_text(encoding="utf-8"))
    name = config["name"]
    env = build_environment()
    # 公开安装包必须自带云盘凭据：下载者没有开发机的 sync.json。
    missing = [key for key in ("STOATMD_GOOGLE_CLIENT_ID", "STOATMD_GOOGLE_CLIENT_SECRET")
               if not env.get(key)]
    if missing:
        raise SystemExit("Configure these before packaging: " + ", ".join(missing)
                         + " (set them in the environment or the StoatMD sync.json)")
    # 桌面版云盘同步免费，不再生成付费墙所需的运行时开关。
    env.setdefault("STOATMD_PURCHASE_REQUIRED", "false")
    # 供应用内更新检查使用；CI 的 tag 版本可能不同于 Cargo.toml。
    env["STOATMD_APP_VERSION"] = args.version or config["version"]

    # 不带 --icon 时 nsh 不会生成 .icns，Finder / DMG 里就是空白默认图标；
    # 运行时 appLogo 只改 Dock 图标，改不了文件图标。
    icon = ROOT / "assets/app-logos/thread.png"
    command = ["nsh", "package", "--target", "macos", "--out", str(out), "--icon", str(icon)]
    if args.version:
        command.extend(["--app-version", args.version])
    if args.build is not None:
        command.extend(["--build", str(args.build)])
    run(*command, env=env, cwd=ROOT)

    app = out / f"{name}.app"
    if not app.is_dir():
        raise FileNotFoundError(app)

    # nsh 产出 ad-hoc 签名；换成 Developer ID +  hardened runtime 才能公证。
    sign(args.identity, app, runtime=True)
    verify(app, args.identity)

    version = plist_value(app / "Contents/Info.plist", "CFBundleShortVersionString")
    build = plist_value(app / "Contents/Info.plist", "CFBundleVersion")
    stem = f"{name}-{version}-{build}"

    zip_path = out / f"{stem}.zip"
    ditto = ["ditto", "-c", "-k", "--keepParent", app, zip_path]
    run(*ditto)

    if args.skip_notarize:
        sums = write_sums(out, [zip_path])
        print(f"Signed app: {app}")
        print(f"Notarization zip: {zip_path}")
        print(f"Checksums: {sums}")
        return

    notarize(zip_path)
    staple(app)
    run("xcrun", "stapler", "validate", app)
    # 公证并 staple 之后才代表 Gatekeeper 会放行。
    run("spctl", "--assess", "--type", "execute", "--verbose", app)

    dmg = out / f"{stem}.dmg"
    make_dmg(app, dmg)
    sign(args.identity, dmg, runtime=False)
    notarize(dmg)
    staple(dmg)
    run("xcrun", "stapler", "validate", dmg)
    # 模拟用户下载后的 Gatekeeper 判定。
    run("spctl", "--assess", "--type", "open", "--context",
        "context:primary-signature", "--verbose", dmg)

    # 先钉票再算校验和：staple 会改写 DMG，之前的哈希就失效了。
    sums = write_sums(out, [dmg, zip_path])

    print(f"App: {app}")
    print(f"Zip: {zip_path}")
    print(f"DMG: {dmg}")
    print(f"Checksums: {sums}")


def plist_value(path, key):
    return plistlib.loads(Path(path).read_bytes())[key]


if __name__ == "__main__":
    main()
