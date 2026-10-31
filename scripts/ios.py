#!/usr/bin/env python3
"""Run, test or package iOS with public OAuth identifiers from the Mac config."""
import json
import os
from pathlib import Path
import sys


def main():
    args = sys.argv[1:] or ["run"]
    if args[0] not in ("run", "test", "package"):
        raise SystemExit("Usage: python3 scripts/ios.py [run|test|package] [nsh arguments]")
    env = os.environ.copy()
    support = Path(env.get("STOATMD_SUPPORT_DIR", Path.home() / "Library/Application Support/StoatMD"))
    config_path = Path(env.get("STOATMD_CONFIG_PATH", support / "sync.json"))
    if config_path.exists():
        config = json.loads(config_path.read_text(encoding="utf-8"))
        for target, keys in (
            ("STOATMD_GOOGLE_IOS_CLIENT_ID", ("googleIosClientId",)),
            ("STOATMD_DROPBOX_APP_KEY", ("dropboxAppKey", "dropbox_app_key")),
        ):
            if not env.get(target):
                value = next((config[key] for key in keys if isinstance(config.get(key), str) and config[key]), "")
                if value:
                    env[target] = value
    toolchain = Path(__file__).resolve().parents[1] / ".nsh/toolchain"
    if (toolchain / "cargo/bin/cargo").exists() and (toolchain / "rustup").is_dir():
        env["PATH"] = str(toolchain / "cargo/bin") + os.pathsep + env.get("PATH", "")
        env["RUSTUP_HOME"] = str(toolchain / "rustup")
    os.execvpe("nsh", ["nsh", args[0], "--target", "ios", *args[1:]], env)


if __name__ == "__main__":
    main()
