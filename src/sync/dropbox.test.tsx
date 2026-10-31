import { expect, test } from "nsh/test";
import { DropboxProvider } from "./dropbox";
import { RemoteConflictError, type FetchLike, type RemoteDir } from "./provider";
import type { TokenSession } from "./tokens";

const root: RemoteDir = { id: "/StoatMD", path: "", name: "StoatMD" };
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

test("Dropbox：递归列出 Markdown 并跟随 cursor 翻页", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.url.endsWith("/files/list_folder")) {
      return json({
        entries: [
          {
            ".tag": "folder",
            name: "Clippings",
            path_display: "/StoatMD/Clippings",
          },
          {
            ".tag": "file",
            name: "root.md",
            id: "id:root",
            rev: "00a",
            size: 12,
            path_display: "/StoatMD/root.md",
            server_modified: "2026-10-01T00:00:00Z",
          },
        ],
        cursor: "c1",
        has_more: true,
      });
    }
    if (call.url.endsWith("/files/list_folder/continue")) {
      return json({
        entries: [
          {
            ".tag": "file",
            name: "万字教程.md",
            id: "id:clip",
            rev: "00b",
            size: 2048,
            path_display: "/StoatMD/Clippings/万字教程.md",
            server_modified: "2026-10-02T00:00:00Z",
          },
          {
            ".tag": "file",
            name: "other.txt",
            id: "id:txt",
            path_display: "/StoatMD/other.txt",
          },
        ],
        cursor: "c2",
        has_more: false,
      });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new DropboxProvider(tokens, fetchImpl, "me@example.com");
  const files = await provider.listFiles(root);
  expect(files.map((f) => f.path).sort()).toEqual(["Clippings/万字教程.md", "root.md"]);
  const clip = files.find((f) => f.path === "Clippings/万字教程.md");
  expect(clip?.id).toBe("id:clip");
  expect(clip?.rev).toBe("00b");
  expect(clip?.size).toBe(2048);
  const first = calls.find((c) => c.url.endsWith("/files/list_folder"));
  expect(JSON.parse(first!.body).recursive).toBe(true);
  const cont = calls.find((c) => c.url.endsWith("/files/list_folder/continue"));
  expect(JSON.parse(cont!.body).cursor).toBe("c1");
});

test("Dropbox：listFolders 取非递归目录，createFolder 复用已存在目录", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.url.endsWith("/files/list_folder")) {
      return json({
        entries: [
          { ".tag": "folder", name: "写作", path_display: "/StoatMD/写作" },
          { ".tag": "folder", name: "Clippings", path_display: "/StoatMD/Clippings" },
          { ".tag": "file", name: "a.md", path_display: "/StoatMD/a.md" },
        ],
        has_more: false,
      });
    }
    if (call.url.endsWith("/files/create_folder_v2")) {
      return json({ error: { ".tag": "path" } }, 409);
    }
    if (call.url.endsWith("/files/get_metadata")) {
      return json({ ".tag": "folder", name: "写作", path_display: "/StoatMD/写作" });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new DropboxProvider(tokens, fetchImpl, null);
  const folders = await provider.listFolders(root, root);
  expect(folders.map((f) => f.name)).toEqual(["Clippings", "写作"]);
  const created = await provider.createFolder(root, root, "写作");
  expect(created.id).toBe("/StoatMD/写作");
  const list = calls.find((c) => c.url.endsWith("/files/list_folder"));
  expect(JSON.parse(list!.body).recursive).toBe(false);
});

test("Dropbox：download 用 Dropbox-API-Arg 指定路径", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.url.endsWith("/files/download")) return new Response("# Hi");
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new DropboxProvider(tokens, fetchImpl, null);
  const text = await provider.download({
    path: "Clippings/a.md",
    id: "/StoatMD/Clippings/a.md",
    rev: "00a",
    mtimeMs: 0,
    size: 4,
  });
  expect(text).toBe("# Hi");
  expect(JSON.parse(calls[0]!.headers["Dropbox-API-Arg"]).path).toBe(
    "/StoatMD/Clippings/a.md",
  );
});

test("Dropbox：上传新文件用 add；已有文件用 update+rev；409 转冲突", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.url.endsWith("/files/create_folder_v2")) {
      return json({ metadata: { ".tag": "folder", path_display: "/StoatMD/Notes" } });
    }
    if (call.url.endsWith("/files/upload")) {
      const arg = JSON.parse(call.headers["Dropbox-API-Arg"]);
      if (arg.mode[".tag"] === "update" && arg.mode.update === "stale") {
        return json({ error: { ".tag": "conflict" } }, 409);
      }
      return json({
        ".tag": "file",
        name: "a.md",
        id: "id:a",
        rev: "00c",
        size: call.body.length,
        path_display: arg.path,
        server_modified: "2026-10-05T00:00:00Z",
      });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new DropboxProvider(tokens, fetchImpl, null);

  const fresh = await provider.upload(root, "Notes/a.md", "hello", { existing: null });
  expect(fresh.rev).toBe("00c");
  const uploads = calls.filter((c) => c.url.endsWith("/files/upload"));
  expect(JSON.parse(uploads[0]!.headers["Dropbox-API-Arg"]).mode).toEqual({ ".tag": "add" });
  expect(JSON.parse(uploads[0]!.headers["Dropbox-API-Arg"]).autorename).toBe(false);

  const updated = await provider.upload(root, "Notes/a.md", "hello2", {
    existing: { path: "Notes/a.md", id: "/StoatMD/Notes/a.md", rev: "00c", mtimeMs: 0, size: 5 },
  });
  expect(updated.rev).toBe("00c");
  const afterUpdate = calls.filter((c) => c.url.endsWith("/files/upload"));
  expect(JSON.parse(afterUpdate[1]!.headers["Dropbox-API-Arg"]).mode).toEqual({
    ".tag": "update",
    update: "00c",
  });

  let conflict: unknown = null;
  try {
    await provider.upload(root, "Notes/a.md", "x", {
      existing: { path: "Notes/a.md", id: "/StoatMD/Notes/a.md", rev: "stale", mtimeMs: 0, size: 5 },
    });
  } catch (err) {
    conflict = err;
  }
  expect(conflict instanceof RemoteConflictError).toBe(true);
});

test("Dropbox：中文文件名在 Dropbox-API-Arg 头中转为 ASCII", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.url.endsWith("/files/create_folder_v2")) {
      return json({ metadata: { ".tag": "folder", path_display: "/StoatMD/Archive" } });
    }
    if (call.url.endsWith("/files/upload")) {
      const arg = JSON.parse(call.headers["Dropbox-API-Arg"]);
      return json({
        ".tag": "file",
        name: "笔记.md",
        id: "id:cn",
        rev: "00d",
        size: call.body.length,
        path_display: arg.path,
        server_modified: "2026-10-30T00:00:00Z",
      });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new DropboxProvider(tokens, fetchImpl, null);
  const path = "Archive/笔记 (云端冲突 2026-10-30).md";
  const uploaded = await provider.upload(root, path, "hi", { existing: null });
  expect(uploaded.path).toBe(path);

  const upload = calls.find((c) => c.url.endsWith("/files/upload"))!;
  const header = upload.headers["Dropbox-API-Arg"];
  expect(/^[\x20-\x7e]*$/.test(header)).toBe(true);
  expect(JSON.parse(header).path).toBe(`/StoatMD/${path}`);
});

test("Dropbox：删除把 not_found 视为成功", async () => {
  const { fetchImpl, calls } = makeFetch((call) => {
    if (call.url.endsWith("/files/delete_v2")) {
      if (call.body.includes("gone.md")) {
        return json({ error: { path: { ".tag": "path_lookup/not_found" } } }, 409);
      }
      return json({ metadata: { ".tag": "file" } });
    }
    throw new Error(`unexpected url: ${call.url}`);
  });
  const provider = new DropboxProvider(tokens, fetchImpl, null);
  await provider.remove({ path: "a.md", id: "/StoatMD/a.md", rev: "1", mtimeMs: 0, size: 0 });
  await provider.remove({ path: "gone.md", id: "/StoatMD/gone.md", rev: "1", mtimeMs: 0, size: 0 });
  expect(calls.length).toBe(2);
  expect(JSON.parse(calls[0]!.body).parent_rev).toBe("1");
});


test("Dropbox：二进制上传与下载保留全部字节", async () => {
  const content = new Uint8Array([0, 255, 128, 13, 10]);
  const provider = new DropboxProvider(tokens, async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/files/download")) return new Response(content);
    if (url.endsWith("/files/upload")) {
      expect([...init.body as Uint8Array]).toEqual([...content]);
      return json({ ".tag": "file", id: "id:binary", name: "image.png", rev: "1", size: 5, path_display: "/StoatMD/image.png" });
    }
    throw new Error(`unexpected ${url}`);
  }, null);
  const file = await provider.uploadBytes(root, "image.png", content, { existing: null });
  expect([...await provider.downloadBytes(file)]).toEqual([...content]);
});
