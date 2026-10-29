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
    registry.module::<StoatMeta>().module::<VaultDialog>().class::<Vault>();
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
        "mac-phase-2-vault".to_owned()
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

    /// 列出相对目录下的子目录与 `.md`。
    pub fn list(&self, dir: String) -> Result<Vec<VaultEntryDto>, String> {
        self.core
            .list(&dir)
            .map(|rows| {
                rows.into_iter()
                    .map(|e| VaultEntryDto {
                        path: e.path,
                        name: e.name,
                        is_dir: e.is_dir,
                        mtime_ms: e.mtime_ms,
                    })
                    .collect()
            })
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

fn map_err(err: VaultError) -> String {
    err.to_string()
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
