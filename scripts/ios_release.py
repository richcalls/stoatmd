#!/usr/bin/env python3
"""Package, prepare and sign an App Store IPA using an installed identity/profile."""
import argparse
import json
from pathlib import Path
import plistlib
import shutil
import subprocess
import tempfile

from ios import build_environment

ROOT = Path(__file__).resolve().parents[1]


def run(*args, **kwargs):
    return subprocess.run([str(arg) for arg in args], check=True, **kwargs)


def prepare(app, env, work):
    plist_path = app / "Info.plist"
    info = plistlib.loads(plist_path.read_bytes())
    schemes = []
    google = env.get("STOATMD_GOOGLE_IOS_CLIENT_ID", "")
    if google:
        suffix = ".apps.googleusercontent.com"
        if not google.endswith(suffix):
            raise ValueError("Invalid Google iOS client ID")
        schemes.append("com.googleusercontent.apps." + google.removesuffix(suffix))
    dropbox = env.get("STOATMD_DROPBOX_APP_KEY", "")
    if dropbox:
        schemes.append("db-" + dropbox)
    if not schemes:
        raise ValueError("Configure at least one public iOS OAuth client before packaging")
    info["CFBundleURLTypes"] = [{"CFBundleTypeRole": "Editor", "CFBundleURLSchemes": schemes}]
    # HTTPS/OAuth use standard encryption; the app has no proprietary cryptography.
    info["ITSAppUsesNonExemptEncryption"] = False
    info["LSRequiresIPhoneOS"] = True
    info["MinimumOSVersion"] = env.get("IPHONEOS_DEPLOYMENT_TARGET", "16.0")
    info["UIRequiredDeviceCapabilities"] = ["arm64"]
    developer = Path(env.get("DEVELOPER_DIR") or run("xcode-select", "-p", capture_output=True, text=True).stdout.strip())
    if developer.suffix == ".app":
        developer = developer / "Contents/Developer"
    xcode = plistlib.loads((developer.parent / "version.plist").read_bytes())
    platform = plistlib.loads((developer / "Platforms/iPhoneOS.platform/version.plist").read_bytes())
    sdk_version = run("xcrun", "--sdk", "iphoneos", "--show-sdk-version", capture_output=True, text=True).stdout.strip()
    sdk_build = run("xcrun", "--sdk", "iphoneos", "--show-sdk-build-version", capture_output=True, text=True).stdout.strip()
    xcode_parts = (xcode["CFBundleShortVersionString"].split(".") + ["0", "0"])[:3]
    xcode_number = f"{int(xcode_parts[0]):02d}{int(xcode_parts[1])}{int(xcode_parts[2])}"
    info.update({
        "DTPlatformName": "iphoneos",
        "DTPlatformVersion": platform["CFBundleShortVersionString"],
        "DTPlatformBuild": platform["ProductBuildVersion"],
        "DTSDKName": "iphoneos" + sdk_version,
        "DTSDKBuild": sdk_build,
        "DTXcode": xcode_number,
        "DTXcodeBuild": xcode["ProductBuildVersion"],
        "DTCompiler": "com.apple.compilers.llvm.clang.1_0",
        "BuildMachineOSBuild": run("sw_vers", "-buildVersion", capture_output=True, text=True).stdout.strip(),
    })
    info["UIDeviceFamily"] = [1]
    info["UISupportedInterfaceOrientations"] = ["UIInterfaceOrientationPortrait"]
    info.setdefault("UILaunchScreen", {})
    catalog = work / "Assets.xcassets"
    iconset = catalog / "AppIcon.appiconset"
    iconset.mkdir(parents=True)
    shutil.copy2(ROOT / "assets/ios/AppIcon.png", iconset / "AppIcon.png")
    (iconset / "Contents.json").write_text(json.dumps({
        "images": [{"filename": "AppIcon.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}],
        "info": {"author": "xcode", "version": 1},
    }))
    partial = work / "asset-info.plist"
    run("xcrun", "actool", catalog, "--compile", app, "--platform", "iphoneos",
        "--minimum-deployment-target", info.get("MinimumOSVersion", "16.0"),
        "--target-device", "iphone", "--app-icon", "AppIcon",
        "--output-partial-info-plist", partial)
    info.update(plistlib.loads(partial.read_bytes()))
    plist_path.write_bytes(plistlib.dumps(info))
    shutil.copy2(ROOT / "assets/ios/PrivacyInfo.xcprivacy", app / "PrivacyInfo.xcprivacy")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--identity", required=True, help="Installed Apple Distribution identity or SHA-1")
    parser.add_argument("--profile", required=True, type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / ".nsh/testflight")
    parser.add_argument("--build", type=int, help="Override nsh.json build number")
    args = parser.parse_args()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    profile_path = args.profile.resolve()
    profile = plistlib.loads(run("security", "cms", "-D", "-i", profile_path, capture_output=True).stdout)
    config = json.loads((ROOT / "nsh.json").read_text())
    entitlements = profile["Entitlements"]
    if entitlements.get("application-identifier") != profile["TeamIdentifier"][0] + "." + config["id"]:
        raise ValueError("Provisioning profile does not match the app bundle ID")
    if entitlements.get("get-task-allow") or profile.get("ProvisionedDevices") or profile.get("ProvisionsAllDevices"):
        raise ValueError("An App Store distribution profile is required")
    env = build_environment()
    # Rust and C build scripts must target the same iOS version.
    env.setdefault("IPHONEOS_DEPLOYMENT_TARGET", "16.0")
    command = ["nsh", "package", "--target", "ios", "--out", str(out), "--icon", str(ROOT / "assets/ios/AppIcon.png")]
    if args.build is not None:
        command.extend(["--build", str(args.build)])
    run(*command, env=env, cwd=ROOT)
    app = out / (config["name"] + ".app")
    if not app.is_dir():
        raise FileNotFoundError(app)
    with tempfile.TemporaryDirectory(prefix="stoatmd-ios-") as temp:
        work = Path(temp)
        prepare(app, env, work)
        shutil.copy2(profile_path, app / "embedded.mobileprovision")
        entitlement_path = work / "entitlements.plist"
        entitlement_path.write_bytes(plistlib.dumps(entitlements))
        for framework in sorted((app / "Frameworks").glob("*.framework")):
            run("codesign", "--force", "--sign", args.identity, framework)
        for dylib in sorted((app / "Frameworks").glob("*.dylib")):
            run("codesign", "--force", "--sign", args.identity, dylib)
        run("codesign", "--force", "--sign", args.identity, "--entitlements", entitlement_path, app)
        run("codesign", "--verify", "--deep", "--strict", app)
        payload = work / "Payload"
        payload.mkdir()
        shutil.copytree(app, payload / app.name, symlinks=True)
        ipa = out / (config["name"] + ".ipa")
        run("ditto", "-c", "-k", "--keepParent", payload, ipa)
        print(f"App Store IPA: {ipa}")


if __name__ == "__main__":
    main()
