#!/usr/bin/env python3
"""Package the Windows or Linux build on its own operating system.

nsh 0.3.0 does not cross-compile desktop runners: packaging for Windows on
macOS produces a macOS Mach-O file with a Windows name, and vice versa. Run
this script on Windows for the Windows zip, or on Linux for the Linux tar.gz.
Both builds embed the same OAuth credentials as the macOS release (read from
sync.json by build_environment, never printed).

Windows icons are embedded only when packaging on Windows, so run the script
there for a branded .exe. The Linux bundle ships its PNG icon.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

from ios import build_environment

ROOT = Path(__file__).resolve().parents[1]

HOST_TARGETS = {"win32": "windows", "linux": "linux"}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    host = HOST_TARGETS.get(sys.platform)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", help="Override nsh.json version")
    parser.add_argument("--build", type=int, help="Override nsh.json build number")
    parser.add_argument("--out", type=Path, default=ROOT / ".nsh/release-desktop")
    args = parser.parse_args()

    if host is None:
        raise SystemExit(
            "nsh 0.3.0 must package Windows on Windows and Linux on Linux. "
            "Run this script on the target operating system; cross-built "
            "runners are host binaries and will not start."
        )

    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    config = json.loads((ROOT / "nsh.json").read_text(encoding="utf-8"))
    name = config["name"]
    version = args.version or config["version"]
    build = args.build if args.build is not None else config["build"]

    env = build_environment()
    # 公开安装包必须自带云盘凭据：下载者没有开发机的 sync.json。
    missing = [key for key in ("STOATMD_GOOGLE_CLIENT_ID", "STOATMD_GOOGLE_CLIENT_SECRET")
               if not env.get(key)]
    if missing:
        raise SystemExit("Configure these before packaging: " + ", ".join(missing)
                         + " (set them in the environment or the StoatMD sync.json)")
    env.setdefault("STOATMD_PURCHASE_REQUIRED", "false")

    icon = ROOT / "assets/app-logos/thread.png"
    extension = "zip" if host == "windows" else "tar.gz"
    command = ["nsh", "package", "--target", host, "--out", str(out),
               "--icon", str(icon), "--app-version", version, "--build", str(build)]
    subprocess.run(command, check=True, env=env, cwd=ROOT)

    source = out / f"{name}.{extension}"
    if not source.is_file():
        raise FileNotFoundError(source)
    artifact = out / f"{name}-{version}-{build}-{host}.{extension}"
    source.replace(artifact)

    # 每个平台单独出校验文件，避免把另一台机器的产物混进来。
    sums = out / "SHA256SUMS.txt"
    sums.write_text(f"{sha256(artifact)}  {artifact.name}\n", encoding="utf-8")
    print(artifact)
    print(sums)


if __name__ == "__main__":
    main()
