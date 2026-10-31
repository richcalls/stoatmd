import { expect, test } from "nsh/test";
import { GoogleDriveProvider } from "./google";
import { RemoteConflictError, type FetchLike, type RemoteDir } from "./provider";
import type { TokenSession } from "./tokens";

const FOLDER = "application/vnd.google-apps.folder";
const root: RemoteDir = { id: "root", path: "", name: "StoatMD" };
const tokens = { accessToken: async () => "token-123" } as unknown as TokenSession;

type Call = { url: string; method: string; headers: Record<string, string>; body: string };

function makeFetch(handler: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (input, init = {}) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const call = {
      url,
      method: (init.method ?? "GET").toUpperCase(),
      headers: { ...((init.headers as Record<string, string> | undefined) ?? {}) },
      body: typeof init.body === "string" ? init.body : "",
    };
    calls.push(call);
    return handler(call);
  };
  return { fetchImpl, calls };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function listOf(folderId: string): string {
  return new URLSearchParams({ q: `'${folderId}' in parents and trashed=false` }).toString();
}

test("Google Drive：递归列出 Markdown 并翻页，跳过 Google 原生文档", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.url.includes("drive/v3/files?") && call.url.includes(listOf("root"))) {
      if (!call.url.includes("pageToken=")) {
        return json({
          files: [
            { id: "clip", name: "Clippings", mimeType: FOLDER },
            { id: "doc", name: "随手记", mimeType: "application/vnd.google-apps.document" },
          ],
          nextPageToken: "p2",
        });
      }
      return json({
        files: [
          { id: "r1", name: "root.md", mimeType: "text/markdown", version: "3", size: "12" },
          { id: "t1", name: "notes.txt", mimeType: "text/plain" },
        ],
      });
    }
    if (call.url.includes(listOf("clip"))) {
      return json({
        files: [
          {
            id: "c1",
            name: "万字教程.md",
            mimeType: "text/markdown",
            version: "7",
            modifiedTime: "2026-10-01T00:00:00Z",
            size: "1024",
          },
        ],
      });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });

  const provider = new GoogleDriveProvider(tokens, fetchImpl, "me@example.com");
  const files = await provider.listFiles(root);
  const paths = files.map((f) => f.path).sort();
  expect(paths).toEqual(["Clippings/万字教程.md", "root.md"]);
  const clip = files.find((f) => f.path === "Clippings/万字教程.md");
  expect(clip?.id).toBe("c1");
  expect(clip?.rev).toBe("7");
  expect(clip?.size).toBe(1024);
  expect(calls.every((c) => c.headers.Authorization === "Bearer token-123")).toBe(true);
});

test("Google Drive：listFolders 过滤文件夹并排序，createFolder 复用同名", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.url.includes(listOf("root"))) {
      return json({
        files: [
          { id: "b", name: "写作", mimeType: FOLDER },
          { id: "a", name: "Clippings", mimeType: FOLDER },
          { id: "x", name: "a/b", mimeType: FOLDER },
          { id: "f", name: "a.md", mimeType: "text/markdown" },
        ],
      });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new GoogleDriveProvider(tokens, fetchImpl, null);
  const folders = await provider.listFolders(root, root);
  expect(folders.map((f) => f.name)).toEqual(["Clippings", "写作"]);

  const reused = await provider.createFolder(root, root, "写作");
  expect(reused.id).toBe("b");
  expect(calls.every((c) => c.method === "GET")).toBe(true);
});

test("Google Drive：createFolder 新建并带 parent id", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.method === "GET" && call.url.includes(listOf("root"))) return json({ files: [] });
    if (call.method === "POST" && call.url.includes("/drive/v3/files?")) {
      return json({ id: "new-folder", name: "新目录", mimeType: FOLDER });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new GoogleDriveProvider(tokens, fetchImpl, null);
  const created = await provider.createFolder(root, root, "新目录");
  expect(created.id).toBe("new-folder");
  const post = calls.find((c) => c.method === "POST");
  expect(JSON.parse(post!.body).parents).toEqual(["root"]);
});

test("Google Drive：download 用 alt=media 拿正文", async () => {
  const { fetchImpl } = makeFetch((call) => {
    if (call.url.includes("/files/f1?alt=media")) return new Response("# Hello");
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new GoogleDriveProvider(tokens, fetchImpl, null);
  const text = await provider.download({ path: "a.md", id: "f1", rev: "1", mtimeMs: 0, size: 0 });
  expect(text).toBe("# Hello");
});

test("Google Drive：更新已有文件前校验 version，不一致即冲突", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.method === "GET" && call.url.includes("/files/f1?")) {
      return json({ id: "f1", version: "9", modifiedTime: "2026-10-02T00:00:00Z", size: "3" });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new GoogleDriveProvider(tokens, fetchImpl, null);
  const stale = { path: "a.md", id: "f1", rev: "1", mtimeMs: 0, size: 3 };
  let conflict: unknown = null;
  try {
    await provider.upload(root, "a.md", "new", { existing: stale });
  } catch (err) {
    conflict = err;
  }
  expect(conflict instanceof RemoteConflictError).toBe(true);
  expect(calls.some((c) => c.method === "PATCH")).toBe(false);
});

test("Google Drive：version 一致时 PATCH 媒体并返回新 rev", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.method === "GET" && call.url.includes("/files/f1?")) {
      return json({ id: "f1", version: "9", modifiedTime: "2026-10-02T00:00:00Z", size: "3" });
    }
    if (call.method === "PATCH" && call.url.includes("upload/drive/v3/files/f1")) {
      return json({
        id: "f1",
        name: "a.md",
        mimeType: "text/markdown",
        version: "10",
        modifiedTime: "2026-10-03T00:00:00Z",
        size: "3",
      });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new GoogleDriveProvider(tokens, fetchImpl, null);
  const existing = { path: "a.md", id: "f1", rev: "9", mtimeMs: 0, size: 3 };
  const result = await provider.upload(root, "a.md", "new", { existing });
  expect(result.rev).toBe("10");
  const patch = calls.find((c) => c.method === "PATCH");
  expect(patch?.body).toBe("new");
  expect(patch?.headers["Content-Type"]).toContain("text/markdown");
});

test("Google Drive：新文件先建父目录再 multipart 创建；同名已存在则冲突", async () => {
  const created: Call[] = [];
  const { fetchImpl } = makeFetch((call) => {
    if (call.url.includes(listOf("root"))) return json({ files: [] });
    if (call.url.includes(listOf("new-folder"))) return json({ files: [] });
    if (call.method === "POST" && call.url.includes("uploadType=multipart")) {
      created.push(call);
      return json({
        id: "f2",
        name: "a.md",
        mimeType: "text/markdown",
        version: "1",
        modifiedTime: "2026-10-04T00:00:00Z",
        size: "5",
      });
    }
    if (call.method === "POST" && call.url.includes("/drive/v3/files?")) {
      return json({ id: "new-folder", name: "写作", mimeType: FOLDER });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new GoogleDriveProvider(tokens, fetchImpl, null);
  const result = await provider.upload(root, "写作/a.md", "hello", { existing: null });
  expect(result.id).toBe("f2");
  expect(created.length).toBe(1);
  expect(created[0]!.body).toContain('"parents":["new-folder"]');
  expect(created[0]!.body).toContain("hello");
  expect(created[0]!.headers["Content-Type"]).toContain("multipart/related");

  const conflicting = makeFetch((call) => {
    if (call.url.includes(listOf("root"))) {
      return json({ files: [{ id: "f3", name: "a.md", mimeType: "text/markdown" }] });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const other = new GoogleDriveProvider(tokens, conflicting.fetchImpl, null);
  let conflict: unknown = null;
  try {
    await other.upload(root, "a.md", "x", { existing: null });
  } catch (err) {
    conflict = err;
  }
  expect(conflict instanceof RemoteConflictError).toBe(true);
});

test("Google Drive：删除走回收站，404 视为已删除", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.method === "GET" && call.url.includes("/files/f1?")) {
      return new Response(JSON.stringify({ id: "f1", version: "1" }), { headers: { ETag: '"version-1"' } });
    }
    if (call.method === "GET" && call.url.includes("/files/gone?")) return json({}, 404);
    if (call.method === "PATCH" && call.url.includes("/files/f1?")) {
      return json({ id: "f1" });
    }
    if (call.method === "PATCH" && call.url.includes("/files/gone?")) {
      return json({ error: { code: 404 } }, 404);
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new GoogleDriveProvider(tokens, fetchImpl, null);
  await provider.remove({ path: "a.md", id: "f1", rev: "1", mtimeMs: 0, size: 0 });
  await provider.remove({ path: "b.md", id: "gone", rev: "1", mtimeMs: 0, size: 0 });
  const patch = calls.find(c => c.method === "PATCH")!;
  expect(JSON.parse(patch.body).trashed).toBe(true);
  expect(patch.headers["If-Match"]).toBe('"version-1"');
});


test("Google Drive：清理校验版本和 ETag，变化或缺少条件令牌时保留原文件", async () => {
  for (const version of ["1", "2"]) {
    const { fetchImpl, calls } = makeFetch(() => json({ id: "f1", version }));
    const provider = new GoogleDriveProvider(tokens, fetchImpl, null);
    let conflict = false;
    try { await provider.remove({ path: "a.md", id: "f1", rev: "1", mtimeMs: 0, size: 1 }); }
    catch (err) { conflict = err instanceof RemoteConflictError; }
    expect(conflict).toBe(true);
    expect(calls.some(c => c.method === "PATCH")).toBe(false);
  }
});

test("Google Drive：二进制 multipart 上传和下载保留全部字节", async () => {
  const content = new Uint8Array([0, 255, 128, 13, 10]);
  let uploaded = false;
  const provider = new GoogleDriveProvider(tokens, async (input, init = {}) => {
    const url = String(input);
    if (url.includes("alt=media")) return new Response(content);
    if (url.includes("uploadType=multipart")) {
      const body = init.body as Uint8Array;
      const marker = new TextEncoder().encode("Content-Type: application/octet-stream\r\n\r\n");
      const text = new TextDecoder().decode(body);
      const start = text.indexOf("Content-Type: application/octet-stream");
      expect(start >= 0).toBe(true);
      expect([...body.slice(start + marker.length, start + marker.length + content.length)]).toEqual([...content]);
      uploaded = true;
      return json({ id: "binary", name: "image.png", mimeType: "image/png", version: "1", size: "5" });
    }
    return json({ files: [] });
  }, null);
  const file = await provider.uploadBytes(root, "image.png", content, { existing: null });
  expect(uploaded).toBe(true);
  expect([...await provider.downloadBytes(file)]).toEqual([...content]);
});
