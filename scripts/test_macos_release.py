"""Run with: python3 -m unittest discover -s scripts -p 'test_macos_release.py'."""
import sys
from pathlib import Path
import subprocess
import unittest
from unittest.mock import call, patch

sys.path.insert(0, str(Path(__file__).parent))
from macos_release import notarize


class NotarizationRetryTests(unittest.TestCase):
    @patch("macos_release.time.sleep")
    @patch("macos_release.subprocess.run")
    def test_retries_transient_upload_connection_reset(self, run, sleep):
        run.side_effect = [
            subprocess.CompletedProcess([], 1, "", "S3 upload failed: connection reset by peer"),
            subprocess.CompletedProcess([], 0, "Accepted", ""),
        ]

        notarize("release.zip")

        self.assertEqual(run.call_count, 2)
        sleep.assert_called_once_with(15)

    @patch("macos_release.time.sleep")
    @patch("macos_release.subprocess.run")
    def test_does_not_retry_apple_validation_errors(self, run, sleep):
        run.return_value = subprocess.CompletedProcess([], 1, "", "The binary is invalid")

        with self.assertRaises(subprocess.CalledProcessError):
            notarize("release.zip")

        run.assert_called_once()
        sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
