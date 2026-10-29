//! 本地笔记库：路径限制在 root 内的 `.md` CRUD。

use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

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

    /// 列出 `rel` 目录下的直接子项（目录 + `.md` 文件）；`rel` 空串表示根。
    pub fn list(&self, rel: &str) -> Result<Vec<VaultEntry>, VaultError> {
        let dir = self.resolve(rel, false)?;
        if !dir.is_dir() {
            return Err(VaultError::NotADirectory(rel.to_owned()));
        }
        let mut out = Vec::new();
        let rd = fs::read_dir(&dir).map_err(|e| VaultError::Io(e.to_string()))?;
        for entry in rd {
            let entry = entry.map_err(|e| VaultError::Io(e.to_string()))?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') {
                continue;
            }
            let meta = entry.metadata().map_err(|e| VaultError::Io(e.to_string()))?;
            let is_dir = meta.is_dir();
            if !is_dir && !is_markdown(&name) {
                continue;
            }
            let rel_path = self.rel_string(&path)?;
            out.push(VaultEntry {
                path: rel_path,
                name,
                is_dir,
                mtime_ms: mtime_ms(&meta),
            });
        }
        out.sort_by(|a, b| match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });
        Ok(out)
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
        let joined = if normalized.as_os_str().is_empty() {
            self.root.clone()
        } else {
            self.root.join(&normalized)
        };
        // 在存在的前缀上 canonicalize，再拼回后缀，防止 `..` 逃逸。
        let (existing, rest) = split_existing(&joined);
        let canon_existing =
            fs::canonicalize(&existing).map_err(|e| VaultError::Io(e.to_string()))?;
        if !canon_existing.starts_with(&self.root) {
            return Err(VaultError::InvalidPath(rel.to_owned()));
        }
        let full = if rest.as_os_str().is_empty() {
            canon_existing
        } else {
            canon_existing.join(rest)
        };
        // 最终路径仍须落在 root 下（字符串前缀 + 组件边界）。
        if !is_within(&full, &self.root) {
            return Err(VaultError::InvalidPath(rel.to_owned()));
        }
        Ok(full)
    }

    fn rel_string(&self, abs: &Path) -> Result<String, VaultError> {
        let rel = abs
            .strip_prefix(&self.root)
            .map_err(|_| VaultError::InvalidPath(abs.display().to_string()))?;
        Ok(rel
            .components()
            .map(|c| c.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/"))
    }
}

fn is_markdown(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown")
}

fn mtime_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// 规范化相对路径：去掉 `.`，拒绝 `..`、绝对路径、空段、反斜杠逃逸。
fn normalize_rel(rel: &str) -> Result<PathBuf, VaultError> {
    let rel = rel.trim().trim_start_matches('/');
    if rel.is_empty() {
        return Ok(PathBuf::new());
    }
    if rel.contains('\\') {
        return Err(VaultError::InvalidPath(rel.to_owned()));
    }
    let path = Path::new(rel);
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
                    return Err(VaultError::InvalidPath(rel.to_owned()));
                }
                out.push(s.as_ref());
            }
            Component::CurDir => {}
            Component::ParentDir => {
                return Err(VaultError::InvalidPath(rel.to_owned()));
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(VaultError::InvalidPath(rel.to_owned()));
            }
        }
    }
    Ok(out)
}

fn split_existing(path: &Path) -> (PathBuf, PathBuf) {
    let mut existing = path.to_path_buf();
    let mut parts: Vec<std::ffi::OsString> = Vec::new();
    while !existing.exists() {
        match (existing.file_name(), existing.parent()) {
            (Some(name), Some(parent)) => {
                parts.push(name.to_os_string());
                existing = parent.to_path_buf();
            }
            _ => break,
        }
    }
    parts.reverse();
    let mut rest = PathBuf::new();
    for part in parts {
        rest.push(part);
    }
    (existing, rest)
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
}
