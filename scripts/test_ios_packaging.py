"""Run with: python3 -m unittest discover -s scripts -p 'test_ios_packaging.py'."""
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).parent))
from ios_release import validate_profile


def profile(*, task_allow, devices=None, universal=False):
    return {
        "TeamIdentifier": ["ABCDE12345"],
        "Entitlements": {
            "application-identifier": "ABCDE12345.com.example.stoatmd",
            "get-task-allow": task_allow,
        },
        "ProvisionedDevices": devices,
        "ProvisionsAllDevices": universal,
    }


class ProfileValidationTests(unittest.TestCase):
    def test_accepts_development_profile_for_personal_install(self):
        validate_profile(profile(task_allow=True, devices=["device-id"]), "com.example.stoatmd", personal=True)

    def test_rejects_app_store_profile_for_personal_install(self):
        with self.assertRaisesRegex(ValueError, "Apple Development"):
            validate_profile(profile(task_allow=False), "com.example.stoatmd", personal=True)

    def test_rejects_development_profile_for_app_store_distribution(self):
        with self.assertRaisesRegex(ValueError, "App Store"):
            validate_profile(profile(task_allow=True, devices=["device-id"]), "com.example.stoatmd")

    def test_requires_matching_bundle_identifier(self):
        with self.assertRaisesRegex(ValueError, "bundle ID"):
            validate_profile(profile(task_allow=True, devices=["device-id"]), "com.example.other", personal=True)

    def test_rejects_adhoc_distribution_profile_for_personal_install(self):
        with self.assertRaisesRegex(ValueError, "Apple Development"):
            validate_profile(profile(task_allow=False, universal=True), "com.example.stoatmd", personal=True)


if __name__ == "__main__":
    unittest.main()
