#!/usr/bin/env python3
"""Build a signed iOS IPA for personal devices using an Apple Development profile."""
import sys

from ios_release import main


if __name__ == "__main__":
    sys.argv.append("--personal")
    main()
