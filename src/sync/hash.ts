/** 内容指纹：SHA-256 十六进制；跨端稳定，用于判断两侧是否同一版本。 */
export function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/** RFC 7636 code verifier：32 字节随机数的 base64url（无填充）。 */
export function createCodeVerifier(): string {
  return base64Url(crypto.randomBytes(32));
}

/** S256 challenge。 */
export function codeChallenge(verifier: string): string {
  return base64Url(crypto.createHash("sha256").update(verifier, "utf8").digest());
}

export function randomState(): string {
  return base64Url(crypto.randomBytes(16));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
