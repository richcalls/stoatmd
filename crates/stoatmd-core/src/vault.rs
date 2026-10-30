//! 本地笔记库：路径限制在 root 内的 `.md` CRUD。

use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use unicode_normalization::UnicodeNormalization;

/// 库内一条目录项（相对路径，POSIX `/`）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VaultEntry {
    /// 相对库根的路径（目录无尾斜杠；文件含扩展名）。
    pub path: String,
    /// 显示名（最后一段）。
    pub name: String,
    /// 是否为目录。
    pub is_dir: bool,
    /// 修改时间（毫秒，Unix epoch）。
    pub mtime_ms: u64,
    /// 文件字节数（目录为 0）。
    pub size: u64,
}

/// 读文件结果。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VaultFile {
    pub content: String,
    pub mtime_ms: u64,
}

/// Vault 错误。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VaultError {
    /// 路径非法或试图逃出库根。
    InvalidPath(String),
    /// 库根不是目录 / 无法打开。
    NotADirectory(String),
    /// 目标不存在。
    NotFound(String),
    /// 目标已存在（新建冲突）。
    AlreadyExists(String),
    /// 磁盘内容与预期 mtime 不一致（外部改写）。
    Conflict {
        path: String,
        disk_mtime_ms: u64,
    },
    /// 其它 IO。
    Io(String),
}

impl std::fmt::Display for VaultError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidPath(p) => write!(f, "invalid path: {p}"),
            Self::NotADirectory(p) => write!(f, "not a directory: {p}"),
            Self::NotFound(p) => write!(f, "not found: {p}"),
            Self::AlreadyExists(p) => write!(f, "already exists: {p}"),
            Self::Conflict {
                path,
                disk_mtime_ms,
            } => write!(f, "conflict:{path}:{disk_mtime_ms}"),
            Self::Io(msg) => write!(f, "io: {msg}"),
        }
    }
}

impl std::error::Error for VaultError {}

/// 本地笔记库根。
#[derive(Debug, Clone)]
pub struct Vault {
    root: PathBuf,
}

impl Vault {
    /// 打开库根；要求路径存在且为目录。会 canonicalize。
    pub fn open(root: impl AsRef<Path>) -> Result<Self, VaultError> {
        let root = root.as_ref();
        let meta = fs::metadata(root).map_err(|e| VaultError::Io(e.to_string()))?;
        if !meta.is_dir() {
            return Err(VaultError::NotADirectory(root.display().to_string()));
        }
        let root = fs::canonicalize(root).map_err(|e| VaultError::Io(e.to_string()))?;
        Ok(Self { root })
    }

    /// 库根绝对路径。
    pub fn root(&self) -> &Path {
        &self.root
    }

    /// 库内相对路径的绝对路径（Finder 定位、复制路径用）。
    pub fn absolute(&self, rel: &str) -> Result<PathBuf, VaultError> {
        self.resolve(rel, false)
    }

    /// 列出 `rel` 目录下的直接子项（目录 + `.md` 文件）；`rel` 空串表示根。
    /// 跳过隐藏名（`.` 开头）与 `node_modules`。
    pub fn list(&self, rel: &str) -> Result<Vec<VaultEntry>, VaultError> {
        let dir = self.resolve(rel, false)?;
        if !dir.is_dir() {
            return Err(VaultError::NotADirectory(rel.to_owned()));
        }
        let mut out = Vec::new();
        self.collect_dir(&dir, false, &mut out)?;
        sort_entries(&mut out);
        Ok(out)
    }

    /// 递归列出 `rel` 下的目录与 `.md`（含嵌套子目录）；`rel` 空串表示库根。
    /// 跳过隐藏目录（如 `.git` / `.obsidian`）与 `node_modules`。
    pub fn list_recursive(&self, rel: &str) -> Result<Vec<VaultEntry>, VaultError> {
        let dir = self.resolve(rel, false)?;
        if !dir.is_dir() {
            return Err(VaultError::NotADirectory(rel.to_owned()));
        }
        let mut out = Vec::new();
        self.collect_dir(&dir, true, &mut out)?;
        sort_entries(&mut out);
        Ok(out)
    }

    fn collect_dir(
        &self,
        dir: &Path,
        recursive: bool,
        out: &mut Vec<VaultEntry>,
    ) -> Result<(), VaultError> {
        let rd = fs::read_dir(dir).map_err(|e| VaultError::Io(e.to_string()))?;
        let mut children: Vec<(PathBuf, String, fs::Metadata)> = Vec::new();
        for entry in rd {
            let entry = entry.map_err(|e| VaultError::Io(e.to_string()))?;
            let path = entry.path();
            // 显示名与相对路径一律 NFC（macOS 目录项常为 NFD）
            let name = nfc(&entry.file_name().to_string_lossy());
            let meta = entry.metadata().map_err(|e| VaultError::Io(e.to_string()))?;
            children.push((path, name, meta));
        }
        children.sort_by(|a, b| a.1.to_lowercase().cmp(&b.1.to_lowercase()));

        for (path, name, meta) in children {
            let is_dir = meta.is_dir();
            if is_dir {
                if should_skip_dir(&name) {
                    continue;
                }
                let rel_path = self.rel_string(&path)?;
                out.push(VaultEntry {
                    path: rel_path,
                    name: name.clone(),
                    is_dir: true,
                    mtime_ms: mtime_ms(&meta),
                    size: 0,
                });
                if recursive {
                    self.collect_dir(&path, true, out)?;
                }
            } else if is_markdown(&name) && !name.starts_with('.') {
                let rel_path = self.rel_string(&path)?;
                out.push(VaultEntry {
                    path: rel_path,
                    name,
                    is_dir: false,
                    mtime_ms: mtime_ms(&meta),
                    size: meta.len(),
                });
            }
        }
        Ok(())
    }

    /// 读取相对路径文件（UTF-8）。
    pub fn read(&self, rel: &str) -> Result<VaultFile, VaultError> {
        let path = self.resolve(rel, true)?;
        if !path.is_file() {
            return Err(VaultError::NotFound(rel.to_owned()));
        }
        let content = fs::read_to_string(&path).map_err(|e| VaultError::Io(e.to_string()))?;
        let meta = fs::metadata(&path).map_err(|e| VaultError::Io(e.to_string()))?;
        Ok(VaultFile {
            content,
            mtime_ms: mtime_ms(&meta),
        })
    }

    /// 写入已有文件；`expected_mtime_ms` 有值且与磁盘不一致时返回 [`VaultError::Conflict`]。
    pub fn write(
        &self,
        rel: &str,
        content: &str,
        expected_mtime_ms: Option<u64>,
    ) -> Result<u64, VaultError> {
        let path = self.resolve(rel, true)?;
        if !path.is_file() {
            return Err(VaultError::NotFound(rel.to_owned()));
        }
        let meta = fs::metadata(&path).map_err(|e| VaultError::Io(e.to_string()))?;
        let disk_mtime = mtime_ms(&meta);
        if let Some(expected) = expected_mtime_ms {
            if disk_mtime != expected {
                return Err(VaultError::Conflict {
                    path: rel.to_owned(),
                    disk_mtime_ms: disk_mtime,
                });
            }
        }
        fs::write(&path, content).map_err(|e| VaultError::Io(e.to_string()))?;
        let meta = fs::metadata(&path).map_err(|e| VaultError::Io(e.to_string()))?;
        Ok(mtime_ms(&meta))
    }

    /// 新建文件（父目录须已存在）；已存在则失败。
    pub fn create(&self, rel: &str, content: &str) -> Result<u64, VaultError> {
        let path = self.resolve(rel, true)?;
        if path.exists() {
            return Err(VaultError::AlreadyExists(rel.to_owned()));
        }
        if let Some(parent) = path.parent() {
            if parent != self.root.as_path() && !parent.exists() {
                return Err(VaultError::NotFound(
                    parent
                        .strip_prefix(&self.root)
                        .unwrap_or(parent)
                        .display()
                        .to_string(),
                ));
            }
        }
        fs::write(&path, content).map_err(|e| VaultError::Io(e.to_string()))?;
        let meta = fs::metadata(&path).map_err(|e| VaultError::Io(e.to_string()))?;
        Ok(mtime_ms(&meta))
    }

    /// 确保相对目录存在（同步下载嵌套笔记时补建父目录）。
    pub fn ensure_dir(&self, rel: &str) -> Result<(), VaultError> {
        let path = self.resolve(rel, false)?;
        if path.exists() {
            return if path.is_dir() {
                Ok(())
            } else {
                Err(VaultError::NotADirectory(rel.to_owned()))
            };
        }
        fs::create_dir_all(&path).map_err(|e| VaultError::Io(e.to_string()))
    }

    /// 重命名 / 移动（均须在库内）。
    pub fn rename(&self, from: &str, to: &str) -> Result<(), VaultError> {
        let src = self.resolve(from, true)?;
        let dst = self.resolve(to, true)?;
        if !src.exists() {
            return Err(VaultError::NotFound(from.to_owned()));
        }
        if dst.exists() {
            return Err(VaultError::AlreadyExists(to.to_owned()));
        }
        fs::rename(&src, &dst).map_err(|e| VaultError::Io(e.to_string()))
    }

    /// 删除文件或空目录。
    pub fn delete(&self, rel: &str) -> Result<(), VaultError> {
        let path = self.resolve(rel, false)?;
        if !path.exists() {
            return Err(VaultError::NotFound(rel.to_owned()));
        }
        if path.is_dir() {
            fs::remove_dir(&path).map_err(|e| VaultError::Io(e.to_string()))
        } else {
            fs::remove_file(&path).map_err(|e| VaultError::Io(e.to_string()))
        }
    }

    /// 查询相对路径的 mtime；不存在则 `NotFound`。
    pub fn mtime(&self, rel: &str) -> Result<u64, VaultError> {
        let path = self.resolve(rel, false)?;
        let meta = fs::metadata(&path).map_err(|_| VaultError::NotFound(rel.to_owned()))?;
        Ok(mtime_ms(&meta))
    }

    /// 将相对路径解析为绝对路径；禁止逃出 root。
    ///
    /// `require_md`：叶子须为 `.md`（或尚不存在的 `.md` 目标）。
    /// 路径组件按 NFC 匹配目录项（兼容 macOS NFD 文件名）。
    fn resolve(&self, rel: &str, require_md: bool) -> Result<PathBuf, VaultError> {
        let normalized = normalize_rel(rel)?;
        if require_md && !normalized.as_os_str().is_empty() {
            let name = normalized
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            if !is_markdown(name) {
                return Err(VaultError::InvalidPath(rel.to_owned()));
            }
        }
        if normalized.as_os_str().is_empty() {
            return Ok(self.root.clone());
        }

        // 逐段解析：先试直接拼接，再按 NFC 扫目录项（NFD 磁盘名）
        let mut current = self.root.clone();
        let mut missing: Vec<std::ffi::OsString> = Vec::new();
        for comp in normalized.components() {
            let Component::Normal(seg) = comp else {
                return Err(VaultError::InvalidPath(rel.to_owned()));
            };
            if !missing.is_empty() {
                missing.push(seg.to_os_string());
                continue;
            }
            let direct = current.join(seg);
            if direct.exists() {
                current = direct;
                continue;
            }
            match find_child_nfc(&current, &seg.to_string_lossy()) {
                Some(found) => current = found,
                None => missing.push(seg.to_os_string()),
            }
        }

        let full = if missing.is_empty() {
            fs::canonicalize(&current).map_err(|e| VaultError::Io(e.to_string()))?
        } else {
            // 尚不存在的后缀（create 目标）：canonicalize 已存在前缀
            let canon = fs::canonicalize(&current).map_err(|e| VaultError::Io(e.to_string()))?;
            let mut full = canon;
            for seg in missing {
                full.push(seg);
            }
            full
        };

        if !is_within(&full, &self.root) {
            return Err(VaultError::InvalidPath(rel.to_owned()));
        }
        Ok(full)
    }

    fn rel_string(&self, abs: &Path) -> Result<String, VaultError> {
        let rel = abs
            .strip_prefix(&self.root)
            .map_err(|_| VaultError::InvalidPath(abs.display().to_string()))?;
        // macOS 文件名多为 NFD；统一成 NFC，避免与 UI/JS 字符串对不上
        Ok(nfc(
            &rel.components()
                .map(|c| c.as_os_str().to_string_lossy())
                .collect::<Vec<_>>()
                .join("/"),
        ))
    }
}

fn is_markdown(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown")
}

/// 跳过隐藏目录（`.` 开头，含 `.git` / `.obsidian`）与依赖目录。
fn should_skip_dir(name: &str) -> bool {
    if name.starts_with('.') {
        return true;
    }
    name.eq_ignore_ascii_case("node_modules")
}

fn sort_entries(out: &mut [VaultEntry]) {
    out.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a
            .path
            .to_lowercase()
            .cmp(&b.path.to_lowercase())
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase())),
    });
}

fn mtime_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn nfc(s: &str) -> String {
    s.nfc().collect()
}

/// 在 `parent` 下找 NFC 名等于 `name` 的子项（兼容磁盘上的 NFD 名）。
fn find_child_nfc(parent: &Path, name: &str) -> Option<PathBuf> {
    let want = nfc(name);
    let rd = fs::read_dir(parent).ok()?;
    for entry in rd.flatten() {
        let n = entry.file_name();
        let s = n.to_string_lossy();
        if nfc(&s) == want {
            return Some(entry.path());
        }
    }
    None
}

/// 规范化相对路径：NFC、去掉 `.`，拒绝 `..`、绝对路径、空段、反斜杠逃逸。
fn normalize_rel(rel: &str) -> Result<PathBuf, VaultError> {
    let rel = nfc(rel.trim().trim_start_matches('/'));
    if rel.is_empty() {
        return Ok(PathBuf::new());
    }
    if rel.contains('\\') {
        return Err(VaultError::InvalidPath(rel.to_owned()));
    }
    let path = Path::new(&rel);
    if path.is_absolute() {
        return Err(VaultError::InvalidPath(rel.to_owned()));
    }
    let mut out = PathBuf::new();
    for comp in path.components() {
        match comp {
            Component::Normal(s) => {
                let s = s.to_string_lossy();
                if s.is_empty() || s == "." {
                    continue;
                }
                if s == ".." || s.contains('\0') {
                    return Err(VaultError::InvalidPath(rel.clone()));
                }
                out.push(nfc(&s));
            }
            Component::CurDir => {}
            Component::ParentDir => {
                return Err(VaultError::InvalidPath(rel.clone()));
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(VaultError::InvalidPath(rel.clone()));
            }
        }
    }
    Ok(out)
}

fn is_within(path: &Path, root: &Path) -> bool {
    if path == root {
        return true;
    }
    path.starts_with(root)
}

/// 便于测试：构造临时毫秒时间戳。
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_vault() -> (tempfile::TempDir, Vault) {
        let dir = tempfile::tempdir().unwrap();
        let vault = Vault::open(dir.path()).unwrap();
        (dir, vault)
    }

    #[test]
    fn open_requires_directory() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("x.md");
        fs::write(&file, "hi").unwrap();
        assert!(matches!(
            Vault::open(&file),
            Err(VaultError::NotADirectory(_))
        ));
    }

    #[test]
    fn rejects_path_escape() {
        let (_dir, vault) = temp_vault();
        assert!(matches!(
            vault.read("../outside.md"),
            Err(VaultError::InvalidPath(_))
        ));
        assert!(matches!(
            vault.list("foo/../../etc"),
            Err(VaultError::InvalidPath(_))
        ));
        assert!(matches!(
            vault.read("/etc/passwd"),
            Err(VaultError::InvalidPath(_))
        ));
    }

    #[test]
    fn create_read_write_list_rename_delete() {
        let (_dir, vault) = temp_vault();
        fs::create_dir(vault.root().join("writing")).unwrap();

        let mtime = vault
            .create("writing/hello.md", "# Hello\n")
            .expect("create");
        assert!(mtime > 0);

        let file = vault.read("writing/hello.md").unwrap();
        assert_eq!(file.content, "# Hello\n");
        assert_eq!(file.mtime_ms, mtime);

        let entries = vault.list("writing").unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "hello.md");
        assert!(!entries[0].is_dir);

        let folders = vault.list("").unwrap();
        assert!(folders.iter().any(|e| e.is_dir && e.name == "writing"));

        let new_mtime = vault
            .write("writing/hello.md", "# Hi\n", Some(file.mtime_ms))
            .unwrap();
        assert!(new_mtime >= file.mtime_ms);
        assert_eq!(vault.read("writing/hello.md").unwrap().content, "# Hi\n");

        vault.rename("writing/hello.md", "writing/hi.md").unwrap();
        assert!(matches!(
            vault.read("writing/hello.md"),
            Err(VaultError::NotFound(_))
        ));
        assert_eq!(vault.read("writing/hi.md").unwrap().content, "# Hi\n");

        vault.delete("writing/hi.md").unwrap();
        assert!(matches!(
            vault.read("writing/hi.md"),
            Err(VaultError::NotFound(_))
        ));
    }

    #[test]
    fn absolute_resolves_inside_root_and_rejects_escape() {
        let (_dir, vault) = temp_vault();
        fs::create_dir(vault.root().join("writing")).unwrap();
        vault.create("writing/hello.md", "x").unwrap();
        let abs = vault.absolute("writing/hello.md").unwrap();
        assert_eq!(abs, vault.root().join("writing/hello.md"));
        assert!(matches!(
            vault.absolute("../outside.md"),
            Err(VaultError::InvalidPath(_))
        ));
    }

    #[test]
    fn write_detects_external_conflict() {
        let (_dir, vault) = temp_vault();
        let _ = vault.create("note.md", "a").unwrap();
        fs::write(vault.root().join("note.md"), "external").unwrap();
        let disk = vault.mtime("note.md").unwrap();
        // 故意传入与磁盘不符的 mtime（不依赖 FS 时钟精度）
        let stale = if disk == 0 { 1 } else { disk - 1 };
        let err = vault
            .write("note.md", "from-app", Some(stale))
            .unwrap_err();
        assert!(matches!(err, VaultError::Conflict { .. }));
    }

    #[test]
    fn ensure_dir_creates_nested_parents_inside_root() {
        let (_dir, vault) = temp_vault();
        vault.ensure_dir("a/b/c").unwrap();
        assert!(vault.root().join("a/b/c").is_dir());
        vault.ensure_dir("a/b/c").unwrap();
        let err = vault.ensure_dir("../outside").unwrap_err();
        assert!(matches!(err, VaultError::InvalidPath(_)));
    }

    #[test]
    fn entries_carry_file_size() {
        let (_dir, vault) = temp_vault();
        vault.create("note.md", "hello").unwrap();
        let entry = vault.list("").unwrap().into_iter().find(|e| !e.is_dir).unwrap();
        assert_eq!(entry.size, 5);
    }

    #[test]
    fn create_refuses_duplicate() {
        let (_dir, vault) = temp_vault();
        vault.create("a.md", "1").unwrap();
        assert!(matches!(
            vault.create("a.md", "2"),
            Err(VaultError::AlreadyExists(_))
        ));
    }

    #[test]
    fn list_skips_non_markdown() {
        let (_dir, vault) = temp_vault();
        fs::write(vault.root().join("a.md"), "x").unwrap();
        fs::write(vault.root().join("b.txt"), "y").unwrap();
        fs::write(vault.root().join(".hidden.md"), "z").unwrap();
        let list = vault.list("").unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "a.md");
    }

    #[test]
    fn list_recursive_finds_nested_markdown_and_skips_ignored_dirs() {
        let (_dir, vault) = temp_vault();
        let root = vault.root();
        fs::create_dir_all(root.join("writing/drafts")).unwrap();
        fs::create_dir_all(root.join(".obsidian")).unwrap();
        fs::create_dir_all(root.join(".git/objects")).unwrap();
        fs::create_dir_all(root.join("node_modules/pkg")).unwrap();
        fs::create_dir_all(root.join("Clippings")).unwrap();
        fs::write(root.join("root.md"), "root").unwrap();
        fs::write(root.join("writing/hello.md"), "hello").unwrap();
        fs::write(root.join("writing/drafts/nested.md"), "nested").unwrap();
        fs::write(root.join("Clippings/万字教程.md"), "clip").unwrap();
        fs::write(root.join(".obsidian/app.json"), "{}").unwrap();
        fs::write(root.join(".git/HEAD"), "ref").unwrap();
        fs::write(root.join("node_modules/pkg/readme.md"), "skip").unwrap();

        // 浅层 list：根下只有文件 + 顶层目录
        let shallow = vault.list("").unwrap();
        assert!(shallow.iter().any(|e| e.name == "root.md" && !e.is_dir));
        assert!(shallow.iter().any(|e| e.name == "writing" && e.is_dir));
        assert!(shallow.iter().any(|e| e.name == "Clippings" && e.is_dir));
        assert!(!shallow.iter().any(|e| e.path.contains("nested")));

        // 递归：含嵌套笔记与子目录，不含忽略目录内容
        let deep = vault.list_recursive("").unwrap();
        let paths: Vec<&str> = deep.iter().map(|e| e.path.as_str()).collect();
        assert!(paths.contains(&"root.md"));
        assert!(paths.contains(&"writing"));
        assert!(paths.contains(&"writing/hello.md"));
        assert!(paths.contains(&"writing/drafts"));
        assert!(paths.contains(&"writing/drafts/nested.md"));
        assert!(paths.contains(&"Clippings"));
        assert!(paths.contains(&"Clippings/万字教程.md"));
        assert!(!paths.iter().any(|p| p.starts_with(".obsidian")));
        assert!(!paths.iter().any(|p| p.starts_with(".git")));
        assert!(!paths.iter().any(|p| p.starts_with("node_modules")));

        // 相对某子目录递归：复现「点 Clippings 中栏应有笔记」
        let under_clip = vault.list_recursive("Clippings").unwrap();
        let cpaths: Vec<&str> = under_clip.iter().map(|e| e.path.as_str()).collect();
        assert!(
            cpaths.contains(&"Clippings/万字教程.md"),
            "Clippings 下应列出笔记，实际: {cpaths:?}"
        );
        assert!(!cpaths.iter().any(|p| *p == "root.md"));

        let under_writing = vault.list_recursive("writing").unwrap();
        let wpaths: Vec<&str> = under_writing.iter().map(|e| e.path.as_str()).collect();
        assert!(wpaths.contains(&"writing/drafts/nested.md"));
        assert!(wpaths.contains(&"writing/hello.md"));
        assert!(!wpaths.iter().any(|p| *p == "root.md"));
    }

    #[test]
    fn nfc_query_finds_nfd_directory_on_disk() {
        use unicode_normalization::UnicodeNormalization;
        let (_dir, vault) = temp_vault();
        // CJK 无分解；用 é 的 NFD（e + 组合音符）模拟 macOS 文件名
        let nfd_name: String = "Cafe\u{0301}".nfd().collect(); // Café NFD
        let nfc_name: String = "Café".nfc().collect();
        assert_ne!(nfd_name.as_bytes(), nfc_name.as_bytes(), "NFD/NFC 字节应不同");
        fs::create_dir(vault.root().join(&nfd_name)).unwrap();
        fs::write(vault.root().join(&nfd_name).join("note.md"), "x").unwrap();

        // 用 NFC 查询（模拟 UI 侧 NFC 字符串）应能列出
        let listed = vault.list_recursive(&nfc_name).unwrap();
        assert!(
            listed.iter().any(|e| e.path.ends_with("note.md") && !e.is_dir),
            "NFC 文件夹 id 应解析到 NFD 磁盘目录: {listed:?}"
        );
        // 对外路径统一 NFC
        assert!(listed.iter().all(|e| e.path == nfc(&e.path)));
        assert!(listed.iter().any(|e| e.path.starts_with(&nfc_name)));
    }
}
