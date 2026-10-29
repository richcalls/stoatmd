//! StoatMD 原生桥：TSX 从 `stoatmd/native` 导入。
//! Vault 重活在 `crates/stoatmd-core`；选文件夹与监视在本模块接通。

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use nsh_core::prelude::*;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use stoatmd_core::{Vault as CoreVault, VaultError};

/// 混合工程 UI 集（`nsh.json` `"rust": "."`）。
#[native_module("stoatmd/native")]
fn native(registry: &mut Registry) {
    registry
        .module::<StoatMeta>()
        .module::<VaultDialog>()
        .module::<SystemFonts>()
        .class::<Vault>();
}

/// 构建期元信息。
#[module]
pub struct StoatMeta;

#[module]
impl StoatMeta {
    /// 产品名。
    pub fn product_name() -> String {
        "StoatMD".to_owned()
    }

    /// 当前阶段说明。
    pub fn phase() -> String {
        "mac-phase-3-polish".to_owned()
    }
}

/// 系统可用字体族（macOS 由 Core Text 枚举；其他平台为空）。
#[module]
pub struct SystemFonts;

#[module]
impl SystemFonts {
    /// 字体族名称，按字母序。
    pub fn list() -> Vec<String> {
        #[cfg(target_os = "macos")]
        {
            use objc2_core_foundation::{CFArray, CFRetained, CFString};
            use objc2_core_text::CTFontManagerCopyAvailableFontFamilyNames;

            // Core Text 的字体管理器可从任意线程查询，无需主线程。
            let families = unsafe { CTFontManagerCopyAvailableFontFamilyNames() };
            // SAFETY: 该 API 文档承诺数组元素为 CFString。
            let families = unsafe { CFRetained::cast_unchecked::<CFArray<CFString>>(families) };
            let mut names: Vec<String> = families.iter().map(|name| name.to_string()).collect();
            names.sort();
            names.dedup();
            names
        }
        #[cfg(not(target_os = "macos"))]
        {
            Vec::new()
        }
    }
}

/// 系统选文件夹（桌面；nsh 0.3.0 尚无 `file_dialog`，用 rfd 等价能力）。
#[module]
pub struct VaultDialog;

#[module]
impl VaultDialog {
    /// 弹出系统文件夹对话框；取消返回 `null`。
    pub async fn pick_folder() -> Result<Option<String>, String> {
        blocking(|| {
            rfd::FileDialog::new()
                .set_title("Open Vault")
                .pick_folder()
                .map(|p| p.to_string_lossy().into_owned())
        })
        .await
        .map_err(|e| e.to_string())
    }
}

/// 列表项（给 TSX）。
#[derive(Debug, Clone, PartialEq, JsObject)]
pub struct VaultEntryDto {
    /// 相对库根路径。
    pub path: String,
    /// 显示名。
    pub name: String,
    /// 是否目录。
    pub is_dir: bool,
    /// 修改时间（毫秒）。
    pub mtime_ms: u64,
}

/// 读文件结果。
#[derive(Debug, Clone, PartialEq, JsObject)]
pub struct VaultFileDto {
    /// UTF-8 正文。
    pub content: String,
    /// 修改时间（毫秒）。
    pub mtime_ms: u64,
}

/// 写盘结果。
#[derive(Debug, Clone, PartialEq, JsObject)]
pub struct VaultWriteDto {
    /// 是否成功（冲突时为 false）。
    pub ok: bool,
    /// 成功时的新 mtime；冲突时为磁盘上的 mtime。
    pub mtime_ms: u64,
    /// 是否因外部改写冲突。
    pub conflict: bool,
}

/// 监视到的变更。
#[derive(Debug, Clone, PartialEq, JsObject)]
pub struct VaultChangeDto {
    /// 相对路径（能解析时）；否则空串。
    pub path: String,
    /// 粗分类：`modify` / `create` / `remove` / `other`。
    pub kind: String,
}

/// 已打开的本地库会话。
#[class]
pub struct Vault {
    core: CoreVault,
    pending: Arc<Mutex<Vec<VaultChangeDto>>>,
    /// 保持监视器存活。
    _watcher: Option<RecommendedWatcher>,
}

#[class]
impl Vault {
    /// 打开绝对路径上的库根。
    pub fn open(root: String) -> Result<Vault, String> {
        let core = CoreVault::open(&root).map_err(map_err)?;
        let pending: Arc<Mutex<Vec<VaultChangeDto>>> = Arc::new(Mutex::new(Vec::new()));
        let pending_w = Arc::clone(&pending);
        let root_path = core.root().to_path_buf();
        let watcher = start_watcher(root_path, pending_w);
        Ok(Vault {
            core,
            pending,
            _watcher: watcher,
        })
    }

    /// 库根绝对路径。
    #[getter]
    pub fn root(&self) -> String {
        self.core.root().display().to_string()
    }

    /// 列出相对目录下的直接子目录与 `.md`（非递归）。
    pub fn list(&self, dir: String) -> Result<Vec<VaultEntryDto>, String> {
        self.core
            .list(&dir)
            .map(map_entries)
            .map_err(map_err)
    }

    /// 递归列出相对目录下的子目录与 `.md`（跳过隐藏目录与 node_modules）。
    pub fn list_recursive(&self, dir: String) -> Result<Vec<VaultEntryDto>, String> {
        self.core
            .list_recursive(&dir)
            .map(map_entries)
            .map_err(map_err)
    }

    /// 读取 `.md`。
    pub fn read(&self, path: String) -> Result<VaultFileDto, String> {
        self.core
            .read(&path)
            .map(|f| VaultFileDto {
                content: f.content,
                mtime_ms: f.mtime_ms,
            })
            .map_err(map_err)
    }

    /// 写入；`expectedMtimeMs` 不匹配时 `conflict: true` 且不覆盖。
    pub fn write(
        &self,
        path: String,
        content: String,
        expected_mtime_ms: Option<u64>,
    ) -> Result<VaultWriteDto, String> {
        match self.core.write(&path, &content, expected_mtime_ms) {
            Ok(mtime_ms) => Ok(VaultWriteDto {
                ok: true,
                mtime_ms,
                conflict: false,
            }),
            Err(VaultError::Conflict {
                disk_mtime_ms, ..
            }) => Ok(VaultWriteDto {
                ok: false,
                mtime_ms: disk_mtime_ms,
                conflict: true,
            }),
            Err(other) => Err(map_err(other)),
        }
    }

    /// 新建 `.md`。
    pub fn create(&self, path: String, content: String) -> Result<VaultWriteDto, String> {
        self.core
            .create(&path, &content)
            .map(|mtime_ms| VaultWriteDto {
                ok: true,
                mtime_ms,
                conflict: false,
            })
            .map_err(map_err)
    }

    /// 重命名 / 移动。
    pub fn rename(&self, from: String, to: String) -> Result<(), String> {
        self.core.rename(&from, &to).map_err(map_err)
    }

    /// 删除文件或空目录。
    pub fn delete(&self, path: String) -> Result<(), String> {
        self.core.delete(&path).map_err(map_err)
    }

    /// 查询 mtime。
    pub fn mtime(&self, path: String) -> Result<u64, String> {
        self.core.mtime(&path).map_err(map_err)
    }

    /// 取出并清空自上次以来的监视事件。
    pub fn poll_changes(&self) -> Vec<VaultChangeDto> {
        let mut guard = self.pending.lock().unwrap_or_else(|e| e.into_inner());
        std::mem::take(&mut *guard)
    }
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::SystemFonts;

    #[test]
    fn system_fonts_are_sorted_and_installed() {
        let fonts = SystemFonts::list();
        assert!(!fonts.is_empty(), "macOS 应能枚举到系统字体");
        assert!(fonts.windows(2).all(|pair| pair[0] <= pair[1]));
        assert!(fonts.iter().any(|name| name == "Menlo"));
    }
}

fn map_err(err: VaultError) -> String {
    err.to_string()
}

fn map_entries(rows: Vec<stoatmd_core::VaultEntry>) -> Vec<VaultEntryDto> {
    rows.into_iter()
        .map(|e| VaultEntryDto {
            path: e.path,
            name: e.name,
            is_dir: e.is_dir,
            mtime_ms: e.mtime_ms,
        })
        .collect()
}

/// 监视回调里忽略的相对路径（隐藏段或 node_modules）。
fn ignored_watch_path(rel: &str) -> bool {
    if rel.is_empty() {
        return false;
    }
    rel.split('/').any(|seg| seg.starts_with('.') || seg.eq_ignore_ascii_case("node_modules"))
}

fn start_watcher(
    root: PathBuf,
    pending: Arc<Mutex<Vec<VaultChangeDto>>>,
) -> Option<RecommendedWatcher> {
    let root_for_rel = root.clone();
    let mut watcher = match RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            let Ok(event) = res else {
                return;
            };
            let kind = match event.kind {
                notify::EventKind::Create(_) => "create",
                notify::EventKind::Modify(_) => "modify",
                notify::EventKind::Remove(_) => "remove",
                _ => "other",
            }
            .to_owned();
            let mut guard = pending.lock().unwrap_or_else(|e| e.into_inner());
            for path in event.paths {
                let rel = path
                    .strip_prefix(&root_for_rel)
                    .ok()
                    .map(|p| {
                        p.components()
                            .map(|c| c.as_os_str().to_string_lossy())
                            .collect::<Vec<_>>()
                            .join("/")
                    })
                    .unwrap_or_default();
                // 递归监视根目录；丢弃 .git / .obsidian / node_modules 等噪声
                if ignored_watch_path(&rel) {
                    continue;
                }
                guard.push(VaultChangeDto {
                    path: rel,
                    kind: kind.clone(),
                });
                // 防止无界增长
                if guard.len() > 256 {
                    let drain = guard.len() - 256;
                    guard.drain(0..drain);
                }
            }
        },
        notify::Config::default(),
    ) {
        Ok(w) => w,
        Err(_) => return None,
    };
    let _ = watcher.watch(&root, RecursiveMode::Recursive);
    Some(watcher)
}
