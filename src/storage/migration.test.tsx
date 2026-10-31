import { expect, test } from "nsh/test";
import { cleanupVerified, copyVerified, type Endpoint, type Entry } from "./migration";
import { transferLibrary } from "./transfer";
import { sha256Bytes } from "../sync/hash";

const bytes = (value: string | number[]) => typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
function memory(initial: Record<string, string | number[] | null> = {}) {
  let revision = 0;
  const files = new Map<string, { content: Uint8Array | null; revision: string }>();
  const put = (path: string, content: string | number[] | null) => {
    files.set(path, { content: content === null ? null : bytes(content), revision: String(++revision) });
  };
  Object.entries(initial).forEach(([path, content]) => put(path, content));
  const endpoint: Endpoint = {
    async list() { return [...files].map(([path, file]) => ({ path, directory: file.content === null,
      size: file.content?.length ?? 0, revision: file.revision })); },
    async read(path) {
      const value = files.get(path)?.content;
      if (!value) throw new Error(`Missing: ${path}`);
      return new Uint8Array(value);
    },
    async create(path, content) {
      if (files.has(path)) throw new Error("exists");
      files.set(path, { content: new Uint8Array(content), revision: String(++revision) });
    },
    async mkdir(path) {
      if (files.has(path) && files.get(path)!.content !== null) throw new Error("file at folder path");
      if (!files.has(path)) put(path, null);
    },
    async remove(entry, hash) {
      if (files.get(entry.path)?.revision !== entry.revision || sha256Bytes(await endpoint.read(entry.path)) !== hash) throw new Error("changed");
      files.delete(entry.path);
    },
  };
  return { endpoint, files, put };
}
async function errorOf(work: () => Promise<unknown>): Promise<string> {
  try { await work(); return ""; } catch (err) { return String(err); }
}

test("迁移：保留二进制字节、嵌套目录和空目录，相同内容合并", async () => {
  const source = memory({ empty: null, assets: null, "assets/photo.png": [0, 255, 128, 10], "note.md": "![photo](assets/photo.png)" });
  const target = memory({ "note.md": "![photo](assets/photo.png)", "unrelated.txt": "keep" });
  const receipts = await copyVerified(source.endpoint, target.endpoint);
  expect(receipts.length).toBe(2);
  expect([...await target.endpoint.read("assets/photo.png")]).toEqual([0, 255, 128, 10]);
  expect(target.files.get("empty")?.content).toBe(null);
  expect(target.files.has("unrelated.txt")).toBe(true);
  expect(source.files.size).toBe(4);
});

test("迁移：差异同名文件隔离整套迁入资料，附件相对路径保持，重试复用副本", async () => {
  const source = memory({ assets: null, "assets/photo.png": [0, 255], "note.md": "![photo](assets/photo.png)" });
  const target = memory({ assets: null, "assets/photo.png": [7], "note.md": "target note" });
  const first = await copyVerified(source.endpoint, target.endpoint);
  const prefix = first[0]!.target.split("/")[0]!;
  expect(prefix.startsWith("Imported library ")).toBe(true);
  expect(new TextDecoder().decode(await target.endpoint.read(`${prefix}/note.md`))).toBe("![photo](assets/photo.png)");
  expect([...await target.endpoint.read(`${prefix}/assets/photo.png`)]).toEqual([0, 255]);
  const count = target.files.size;
  expect(await copyVerified(source.endpoint, target.endpoint)).toEqual(first);
  expect(target.files.size).toBe(count);
  expect(new TextDecoder().decode(await target.endpoint.read("note.md"))).toBe("target note");
});

test("迁移：文件夹与文件碰撞保留两套结构，目录大小写冲突采用独立目录", async () => {
  const fixtures: Record<string, string | number[] | null>[] = [{ dir: "existing file" }, { DIR: null }];
  for (const initial of fixtures) {
    const source = memory({ dir: null, "dir/note.md": "source" });
    const target = memory(initial);
    const receipt = await copyVerified(source.endpoint, target.endpoint);
    expect(receipt[0]!.target.startsWith("Imported library ")).toBe(true);
    expect([...target.files.keys()].includes(Object.keys(initial)[0]!)).toBe(true);
  }
});

test("迁移：中断后重试复用已复制文件", async () => {
  const source = memory({ "a.md": "one", "b.md": "two" });
  const target = memory();
  const create = target.endpoint.create;
  let failed = false;
  target.endpoint.create = async (path, content) => {
    if (path === "b.md" && !failed) { failed = true; throw new Error("offline"); }
    await create(path, content);
  };
  expect(await errorOf(() => copyVerified(source.endpoint, target.endpoint))).toContain("offline");
  expect(target.files.size).toBe(1);
  await copyVerified(source.endpoint, target.endpoint);
  expect([...target.files.keys()].sort()).toEqual(["a.md", "b.md"]);
});

test("迁移：拒绝穿越、重复大小写路径和校验失败", async () => {
  const bad = memory({ "../outside": "x" });
  expect(await errorOf(() => copyVerified(bad.endpoint, memory().endpoint))).toContain("Unsupported");
  const duplicate = memory({ "A.md": "a", "a.md": "b" });
  expect(await errorOf(() => copyVerified(duplicate.endpoint, memory().endpoint))).toContain("duplicate");
  const target = memory();
  const create = target.endpoint.create;
  target.endpoint.create = async (path, content) => { await create(path, content); target.put(path, "corrupt"); };
  expect(await errorOf(() => copyVerified(memory({ "a.md": "source" }).endpoint, target.endpoint))).toContain("Verification failed");
});

test("清理：只删除已核验原文件，保留变化、额外文件和文件夹，失败可重试", async () => {
  const source = memory({ empty: null, "a.md": "a", "b.md": "b", "c.md": "c" });
  const target = memory();
  const receipts = await copyVerified(source.endpoint, target.endpoint);
  source.put("extra.md", "extra");
  source.put("b.md", "edited");
  target.put("c.md", "destination edited");
  const remove = source.endpoint.remove;
  let fail = true;
  source.endpoint.remove = async (entry, hash) => { if (fail && entry.path === "a.md") throw new Error("locked"); await remove(entry, hash); };
  const remaining = await cleanupVerified(source.endpoint, target.endpoint, receipts);
  expect(remaining.length).toBe(3);
  fail = false;
  const retry = await cleanupVerified(source.endpoint, target.endpoint, remaining);
  expect(retry.map(r => r.source.path).sort()).toEqual(["b.md", "c.md"]);
  expect(source.files.has("a.md")).toBe(false);
  expect(source.files.has("extra.md")).toBe(true);
  expect(source.files.has("empty")).toBe(true);
});

for (const route of ["local-local", "local-cloud", "cloud-local", "cloud-cloud"]) {
  test(`迁移事务 ${route}：校验、离线缓存完成后提交一次`, async () => {
    const original = memory({ "offline.md": "offline edit", "same.md": "offline version" });
    const cloud = route.startsWith("cloud") ? memory({ "remote.md": "remote only", "same.md": "remote version" }) : null;
    const target = memory({ "existing.md": "existing target" });
    const cache = route.endsWith("cloud") ? memory() : null;
    let commits = 0;
    await transferLibrary({ original: original.endpoint, cloud: cloud?.endpoint, staging: memory().endpoint,
      destination: target.endpoint, offlineCache: cache?.endpoint,
      async commit(receipts) {
        commits++;
        expect(target.files.has("offline.md")).toBe(true);
        if (cache) expect(cache.files.size).toBe(target.files.size);
        if (cloud) {
          expect(receipts.length).toBe(2);
          expect(receipts.every(r => target.files.has(r.target))).toBe(true);
          expect([...target.files.keys()].some(p => p.endsWith("/remote.md"))).toBe(true);
        }
      } });
    expect(commits).toBe(1);
    expect(original.files.size).toBe(2);
    if (cloud) expect(cloud.files.size).toBe(2);
  });
}

test("迁移事务：构建离线缓存期间原文件变化，阻止提交", async () => {
  const original = memory({ "a.md": "source" });
  const cache = memory();
  const create = cache.endpoint.create;
  cache.endpoint.create = async (path, content) => { await create(path, content); original.put("a.md", "edited during cache copy"); };
  let committed = false;
  const error = await errorOf(() => transferLibrary({ original: original.endpoint, destination: memory().endpoint,
    offlineCache: cache.endpoint, async commit() { committed = true; } }));
  expect(error).toContain("sourceChanged");
  expect(committed).toBe(false);
});

test("迁移事务：传输或离线缓存失败，原存储位置继续使用", async () => {
  for (const stage of ["destination", "cache"]) {
    const original = memory({ "a.md": "source" });
    const destination = memory(), cache = memory();
    (stage === "destination" ? destination : cache).endpoint.create = async () => { throw new Error("disk full"); };
    let committed = false;
    expect(await errorOf(() => transferLibrary({ original: original.endpoint, destination: destination.endpoint,
      offlineCache: cache.endpoint, async commit() { committed = true; } }))).toContain("disk full");
    expect(committed).toBe(false);
    expect(new TextDecoder().decode(await original.endpoint.read("a.md"))).toBe("source");
  }
});

test("迁移事务：完成复制后目标被外部改写，阻止切换", async () => {
  const original = memory({ "a.md": "source" });
  const destination = memory(), cache = memory();
  const list = original.endpoint.list;
  let scans = 0;
  original.endpoint.list = async () => {
    // The final source verification occurs after destination and offline cache copies.
    if (++scans === 4) destination.put("a.md", "external edit");
    return list();
  };
  let committed = false;
  const error = await errorOf(() => transferLibrary({ original: original.endpoint, destination: destination.endpoint,
    offlineCache: cache.endpoint, async commit() { committed = true; } }));
  expect(error).toContain("destinationChanged");
  expect(committed).toBe(false);
});
