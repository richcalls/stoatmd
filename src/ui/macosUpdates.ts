const RELEASE_API = "https://api.github.com/repos/richcalls/stoatmd-community/releases/latest";

/** Compares stable or prerelease SemVer versions, ignoring an optional `v` prefix. */
export function compareAppVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
    if (!match) throw new Error(`Invalid app version: ${value}`);
    return { numbers: match.slice(1, 4).map(Number), prerelease: match[4]?.split(".") ?? null };
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index++) {
    if (a.numbers[index] !== b.numbers[index]) return a.numbers[index] < b.numbers[index] ? -1 : 1;
  }
  if (a.prerelease === null || b.prerelease === null) {
    return a.prerelease === b.prerelease ? 0 : a.prerelease === null ? 1 : -1;
  }
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index++) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) {
      return leftPart === rightPart ? 0 : leftPart === undefined ? -1 : 1;
    }
    if (leftPart === rightPart) continue;
    const leftNumber = /^(0|[1-9]\d*)$/.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^(0|[1-9]\d*)$/.test(rightPart) ? Number(rightPart) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber < rightNumber ? -1 : 1;
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

/** Returns the latest stable version, or `current` when this build is current. */
export async function checkLatestVersion(
  current: string,
  request: typeof fetch = fetch,
): Promise<string | "current"> {
  const response = await request(RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`Release check failed (${response.status})`);
  const release = await response.json() as { tag_name?: unknown; draft?: unknown; prerelease?: unknown };
  if (release.draft === true || release.prerelease === true || typeof release.tag_name !== "string") {
    throw new Error("The latest release has no stable version tag");
  }
  const latest = release.tag_name.replace(/^v/, "");
  return compareAppVersions(latest, current) > 0 ? latest : "current";
}
