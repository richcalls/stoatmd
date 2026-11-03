//! StoatMD 原生桥：TSX 从 `stoatmd/native` 导入。
//! Vault 重活在 `crates/stoatmd-core`；选文件夹与监视在本模块接通。

#[cfg(not(target_os = "ios"))]
use std::io::{Read, Write};
#[cfg(not(target_os = "ios"))]
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
#[cfg(not(target_os = "ios"))]
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
#[cfg(not(target_os = "ios"))]
use std::time::{Duration, Instant};

use nsh_core::prelude::*;
mod mobile_files;
#[cfg(target_os = "ios")]
mod mobile_auth;
use mobile_files::MobileFiles;
mod settings_window;
use settings_window::SettingsWindow;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use stoatmd_core::{Vault as CoreVault, VaultError};

/// 混合工程 UI 集（`nsh.json` `"rust": "."`）。
#[native_module("stoatmd/native")]
fn native(registry: &mut Registry) {
    registry
        .module::<StoatMeta>()
        .module::<MobileFiles>()
        .module::<VaultDialog>()
        .module::<SystemFonts>()
        .module::<AppIcon>()
        .module::<SettingsWindow>()
        .module::<SyncConfig>()
        .module::<OAuth>()
        .module::<TokenVault>()
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

    /// 当前安装包的版本；发布构建通过 `STOATMD_APP_VERSION` 注入 tag 版本。
    pub fn version() -> String {
        option_env!("STOATMD_APP_VERSION")
            .unwrap_or(env!("CARGO_PKG_VERSION"))
            .to_owned()
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
        #[cfg(not(any(target_os = "ios", target_os = "android")))]
        {
            blocking(|| {
                rfd::FileDialog::new()
                    .set_title("Open Vault")
                    .pick_folder()
                    .map(|p| p.to_string_lossy().into_owned())
            })
            .await
            .map_err(|e| e.to_string())
        }
        #[cfg(any(target_os = "ios", target_os = "android"))]
        {
            Err("Connect a cloud library on this platform".to_owned())
        }
    }
}

/// 应用图标（Dock / 窗口切换器）。Logo PNG 打进二进制，切换不需要文件。
#[module]
pub struct AppIcon;

#[module]
impl AppIcon {
    /// iOS 的备用图标由系统持久保存，回调成功后界面再更新选择。
    pub async fn select_ios(id: String) -> Result<(), String> {
        if !matches!(id.as_str(), "thread" | "agile" | "head-a" | "head-b" | "head-d") {
            return Err(format!("unknown app icon: {id}"));
        }
        #[cfg(target_os = "ios")]
        {
            use objc2_foundation::{NSError, NSString};
            use objc2_ui_kit::UIApplication;
            use std::sync::Mutex;

            let (sender, receiver) = futures_channel::oneshot::channel();
            dispatch2::DispatchQueue::main().exec_async(move || {
                let mtm = objc2::MainThreadMarker::new().expect("main queue");
                let app = UIApplication::sharedApplication(mtm);
                let name = (id != "thread").then(|| NSString::from_str(&id));
                if app.alternateIconName().as_deref() == name.as_deref() {
                    let _ = sender.send(Ok(()));
                    return;
                }
                if !app.supportsAlternateIcons() {
                    let _ = sender.send(Err("Alternate icons are unavailable in this build".to_owned()));
                    return;
                }
                let sender = Mutex::new(Some(sender));
                let completion = block2::RcBlock::new(move |error: *mut NSError| {
                    // UIKit keeps NSError alive for the duration of this callback.
                    let result = unsafe { error.as_ref() }
                        .map(|error| Err(error.localizedDescription().to_string()))
                        .unwrap_or(Ok(()));
                    if let Some(sender) = sender.lock().unwrap().take() {
                        let _ = sender.send(result);
                    }
                });
                app.setAlternateIconName_completionHandler(name.as_deref(), Some(&completion));
            });
            receiver.await.map_err(|_| "Icon selection was interrupted".to_owned())?
        }
        #[cfg(not(target_os = "ios"))]
        Ok(())
    }

    /// 切换应用图标：`thread`（织线白鼬，默认）、`agile`（敏捷剪影），
    /// 或头像草案 `head-a` / `head-b` / `head-d`；`dark` 用炭底版本。
    pub fn set(id: String, dark: bool) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            let bytes: &'static [u8] = match (id.as_str(), dark) {
                ("thread", false) => include_bytes!("../assets/app-logos/thread.png"),
                ("thread", true) => include_bytes!("../assets/app-logos/thread-dark.png"),
                ("agile", false) => include_bytes!("../assets/app-logos/agile.png"),
                ("agile", true) => include_bytes!("../assets/app-logos/agile-dark.png"),
                ("head-a", false) => include_bytes!("../assets/app-logos/head-a.png"),
                ("head-a", true) => include_bytes!("../assets/app-logos/head-a-dark.png"),
                ("head-b", false) => include_bytes!("../assets/app-logos/head-b.png"),
                ("head-b", true) => include_bytes!("../assets/app-logos/head-b-dark.png"),
                ("head-d", false) => include_bytes!("../assets/app-logos/head-d.png"),
                ("head-d", true) => include_bytes!("../assets/app-logos/head-d-dark.png"),
                (other, _) => return Err(format!("unknown app icon: {other}")),
            };
            // 引擎在独立线程运行，AppKit 的图标只能在主线程设置。
            dispatch2::DispatchQueue::main().exec_async(move || {
                if let Some(mtm) = objc2::MainThreadMarker::new() {
                    set_macos_app_icon(mtm, bytes);
                }
            });
            Ok(())
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = (id, dark);
            Ok(())
        }
    }
}

#[cfg(target_os = "macos")]
fn set_macos_app_icon(mtm: objc2::MainThreadMarker, bytes: &'static [u8]) {
    use objc2::AnyThread;
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::NSData;

    let data = NSData::with_bytes(bytes);
    let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) else {
        return;
    };
    let app = NSApplication::sharedApplication(mtm);
    // SAFETY: AppKit runs on the main thread; `image` decoded from the bundled PNG.
    unsafe { app.setApplicationIconImage(Some(&image)) };
}

/// 同步连接配置（iOS 包含公共客户端 ID；桌面端读取开发者配置）。
#[derive(Debug, Clone, PartialEq, JsObject)]
pub struct SyncConfigDto {
    /// Google OAuth 桌面客户端 ID。
    pub google_client_id: String,
    /// Google 桌面客户端 secret（Google 仍要求；非用户机密）。
    pub google_client_secret: String,
    /// Dropbox 应用 key。
    pub dropbox_app_key: String,
    /// Dropbox 应用 secret（可选，PKCE 公共客户端）。
    pub dropbox_app_secret: String,
    /// Dropbox 要求回调端口固定并在应用后台登记；0 表示随机端口。
    pub dropbox_redirect_port: u32,
    /// 付费墙开关；商业化接入前默认开启。
    pub purchase_required: bool,
    /// 配置文件路径（UI 在缺凭据时提示）。
    pub config_path: String,
}

/// 读取同步的开发者配置：环境变量优先，其次 `sync.json`。
#[module]
pub struct SyncConfig;

#[module]
impl SyncConfig {
    /// 当前配置；缺项为空串，由界面提示如何补齐。
    pub fn load() -> SyncConfigDto {
        let path = config_file_path();
        let doc = std::fs::read_to_string(&path)
            .ok()
            .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
            .unwrap_or(serde_json::Value::Null);
        let mut config = config_from_json(&doc, &path);
        apply_env(&mut config);
        #[cfg(target_os = "ios")]
        {
            // iOS is sold as a paid app. Its cloud connection is included.
            config.purchase_required = false;
            config.google_client_id = std::env::var("STOATMD_GOOGLE_IOS_CLIENT_ID").ok()
                .or_else(|| option_env!("STOATMD_GOOGLE_IOS_CLIENT_ID").map(str::to_owned))
                .unwrap_or_else(|| json_str(&doc, &["googleIosClientId"]));
            config.google_client_secret.clear();
            if config.dropbox_app_key.is_empty() {
                config.dropbox_app_key = option_env!("STOATMD_DROPBOX_APP_KEY").unwrap_or("").to_owned();
            }
            config.dropbox_app_secret.clear();
        }
        #[cfg(not(target_os = "ios"))]
        {
            // 公开的 macOS 安装包没有开发机的环境变量与 sync.json。
            // 打包时把 OAuth 凭据编进二进制，下载者才能直接连云盘；
            // 用户自己的 sync.json / 环境变量仍然优先。
            if config.google_client_id.is_empty() {
                config.google_client_id = option_env!("STOATMD_GOOGLE_CLIENT_ID").unwrap_or("").to_owned();
            }
            if config.google_client_secret.is_empty() {
                config.google_client_secret = option_env!("STOATMD_GOOGLE_CLIENT_SECRET").unwrap_or("").to_owned();
            }
            if config.dropbox_app_key.is_empty() {
                config.dropbox_app_key = option_env!("STOATMD_DROPBOX_APP_KEY").unwrap_or("").to_owned();
            }
            // Dropbox 用 PKCE，公开包里只带 app key（公开标识），不带 app secret。
            // 文件与运行时环境都没说要不要付费时，才用打包时的默认值。
            if doc.get("purchaseRequired").and_then(|value| value.as_bool()).is_none()
                && std::env::var_os("STOATMD_PURCHASE_REQUIRED").is_none()
                && let Some(value) = option_env!("STOATMD_PURCHASE_REQUIRED")
            {
                config.purchase_required = matches!(value.trim(), "1" | "true" | "TRUE" | "yes");
            }
        }
        config
    }
}

/// OAuth 回调结果；`redirect_uri` 必须与授权时登记的一致。
#[derive(Debug, Clone, PartialEq, JsObject)]
pub struct OAuthResultDto {
    /// 授权码。
    pub code: String,
    /// 回传的 state（已校验）。
    pub state: String,
    /// 实际使用的回调地址（桌面 loopback / iOS URL scheme）。
    pub redirect_uri: String,
}

#[cfg(not(target_os = "ios"))]
static OAUTH_CANCELLED: AtomicBool = AtomicBool::new(false);
#[cfg(not(target_os = "ios"))]
static OAUTH_RUNNING: AtomicBool = AtomicBool::new(false);
/// 浏览器授权最多等 5 分钟。
#[cfg(not(target_os = "ios"))]
const OAUTH_TIMEOUT: Duration = Duration::from_secs(300);
#[cfg(not(target_os = "ios"))]
const OAUTH_PATH: &str = "/callback";

/// 系统 OAuth 授权（桌面 loopback / iOS ASWebAuthenticationSession，TS 生成 PKCE）。
#[module]
pub struct OAuth;

#[module]
impl OAuth {
    /// 打开浏览器并等待回调；`url_template` 里的 `__REDIRECT__` 换成实际回调地址。
    /// `port` 为 0 / 缺省时用随机端口（Google 可接受）；Dropbox 需固定端口。
    pub async fn authorize(
        url_template: String,
        state: String,
        port: Option<u32>,
    ) -> Result<OAuthResultDto, String> {
        #[cfg(target_os = "ios")]
        {
            let _ = port;
            return mobile_auth::authorize(url_template, state).await;
        }
        #[cfg(not(target_os = "ios"))]
        match blocking(move || run_oauth(&url_template, &state, port)).await {
            Ok(result) => result,
            Err(err) => Err(err.to_string()),
        }
    }

    /// 取消进行中的授权（用户点「取消」时调用）。
    pub fn cancel() {
        #[cfg(not(target_os = "ios"))]
        OAUTH_CANCELLED.store(true, Ordering::SeqCst);
        #[cfg(target_os = "ios")]
        mobile_auth::cancel();
    }
}

/// OAuth tokens use the system keychain on macOS and iOS.
#[module]
pub struct TokenVault;

#[module]
impl TokenVault {
    /// 写入或更新。
    pub fn set(provider: String, secret: String) -> Result<(), String> {
        token_set(&provider, &secret)
    }

    /// 读取；没有时返回 `null`。
    pub fn get(provider: String) -> Result<Option<String>, String> {
        token_get(&provider)
    }

    /// 删除；不存在也算成功。
    pub fn delete(provider: String) -> Result<(), String> {
        token_delete(&provider)
    }

    /// 当前是否运行在真正的 iOS 目标上。
    ///
    /// headless 测试在 macOS 宿主进程里模拟 iOS，`platform.os` 也会报 "ios"，
    /// 但原生钥匙串调用会落到开发机的登录钥匙串；跨设备状态要据此挡住。
    pub fn is_ios() -> bool {
        cfg!(target_os = "ios")
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
    /// 文件字节数（目录为 0）。
    pub size: u64,
}

/// 读文件结果。
#[derive(Debug, Clone, PartialEq, JsObject)]
pub struct VaultFileDto {
    /// UTF-8 正文。
    pub content: String,
    /// 修改时间（毫秒）。
    pub mtime_ms: u64,
    /// 创建时间（毫秒）；文件系统不提供时回退为修改时间。
    pub created_ms: u64,
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
    /// Reopen an app-owned cloud cache after iOS relocates its container.
    pub fn reopen_cache(previous_root: String) -> Result<Vault, String> {
        let previous = Path::new(&previous_root);
        let name = previous.file_name().and_then(|n| n.to_str()).ok_or("Invalid cache path")?;
        if previous.parent().and_then(Path::file_name).and_then(|n| n.to_str()) != Some("libraries")
            || !name.chars().all(|c| c.is_ascii_digit() || c == '-') || !name.contains('-') {
            return Err("Invalid cache path".into());
        }
        Self::open(cache_base()?.join(name).display().to_string())
    }

    /// Durable mobile recovery journal, separate from the Markdown document.
    pub fn save_draft(&self, json: String) -> Result<(), String> {
        self.core.ensure_dir(".stoatmd").map_err(map_err)?;
        self.core.write_bytes(".stoatmd/draft.json", json.as_bytes()).map_err(map_err)
    }

    /// Read the last interrupted mobile editing session.
    pub fn read_draft(&self) -> Result<Option<String>, String> {
        match self.core.read_bytes(".stoatmd/draft.json") {
            Ok(bytes) => String::from_utf8(bytes).map(Some).map_err(|e| e.to_string()),
            Err(VaultError::NotFound(_)) => Ok(None),
            Err(err) => Err(map_err(err)),
        }
    }

    /// Remove the recovery journal after saving or explicitly discarding edits.
    pub fn clear_draft(&self) -> Result<(), String> {
        match self.core.delete(".stoatmd/draft.json") {
            Ok(()) | Err(VaultError::NotFound(_)) => Ok(()),
            Err(err) => Err(map_err(err)),
        }
    }

    /// Fresh, app-owned offline cache; never reuses a user-selected folder.
    pub fn create_cache() -> Result<Vault, String> {
        let base = cache_base()?;
        std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;
        let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?.as_nanos();
        let root = base.join(format!("{stamp}-{}", std::process::id()));
        std::fs::create_dir(&root).map_err(|e| e.to_string())?;
        Self::open(root.display().to_string())
    }

    /// Files, binary attachments and empty folders in this library.
    pub fn inventory(&self) -> Result<Vec<VaultEntryDto>, String> {
        self.core.inventory().map(map_entries).map_err(map_err)
    }

    /// Read exact file bytes inside this library.
    pub fn read_bytes(&self, path: String) -> Result<Vec<u8>, String> {
        self.core.read_bytes(&path).map_err(map_err)
    }

    /// Create a file exclusively without replacing an existing path.
    pub fn create_bytes(&self, path: String, bytes: Vec<u8>) -> Result<(), String> {
        self.core.create_bytes(&path, &bytes).map_err(map_err)
    }

    /// Replace file bytes inside this library.
    pub fn write_bytes(&self, path: String, bytes: Vec<u8>) -> Result<(), String> {
        self.core.write_bytes(&path, &bytes).map_err(map_err)
    }

    /// Remove a temporary app-owned cache after migration; user folders are rejected.
    pub fn discard_cache(&self) -> Result<(), String> {
        let base = dirs::data_local_dir().ok_or("application data directory unavailable")?
            .join("com.stoatmd.app").join("libraries").canonicalize().map_err(|e| e.to_string())?;
        let root = self.core.root();
        if root.parent() != Some(base.as_path()) { return Err("not an app-owned cache".to_owned()); }
        std::fs::remove_dir_all(root).map_err(|e| e.to_string())
    }

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

    /// 在后台线程搜索全库正文，返回匹配的库内路径。
    pub async fn search_content(this: Instance<Self>, query: String) -> Result<Vec<String>, String> {
        let core = this.with(|vault| vault.core.clone());
        blocking(move || core.search_content(&query).map_err(map_err))
            .await
            .map_err(|err| err.to_string())?
    }

    /// 读取 `.md`。
    pub fn read(&self, path: String) -> Result<VaultFileDto, String> {
        self.core
            .read(&path)
            .map(|f| VaultFileDto {
                content: f.content,
                mtime_ms: f.mtime_ms,
                created_ms: f.created_ms,
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

    /// 确保相对目录存在（同步下载补父目录）。
    pub fn ensure_dir(&self, path: String) -> Result<(), String> {
        self.core.ensure_dir(&path).map_err(map_err)
    }

    /// 重命名 / 移动。
    pub fn rename(&self, from: String, to: String) -> Result<(), String> {
        self.core.rename(&from, &to).map_err(map_err)
    }

    /// 删除文件或空目录。
    pub fn delete(&self, path: String) -> Result<(), String> {
        self.core.delete(&path).map_err(map_err)
    }

    /// 库内相对路径的绝对路径（Finder 定位、复制路径用）。
    pub fn absolute(&self, path: String) -> Result<String, String> {
        self.core
            .absolute(&path)
            .map(|abs| abs.display().to_string())
            .map_err(map_err)
    }

    /// 在系统文件管理器中选中该文件。
    pub fn reveal(&self, path: String) -> Result<(), String> {
        let abs = self.core.absolute(&path).map_err(map_err)?;
        reveal_path(&abs)
    }

    /// 移到系统废纸篓（可从废纸篓恢复）。
    pub fn trash(&self, path: String) -> Result<(), String> {
        let abs = self.core.absolute(&path).map_err(map_err)?;
        trash_path(&abs)
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

#[cfg(test)]
mod sync_tests {
    use super::{config_from_json, parse_query, percent_decode, percent_encode, valid_provider};
    use std::path::Path;

    #[test]
    fn packaged_app_allows_cloud_oauth_and_file_requests() {
        use nsh_core::access::{Access, Capabilities};
        let manifest: serde_json::Value = serde_json::from_str(include_str!("../nsh.json")).unwrap();
        let access = Access {
            declared: Capabilities::from_json(&manifest["capabilities"]).unwrap(),
            granted: None,
        };
        for (method, url) in [
            ("POST", "https://oauth2.googleapis.com/token"),
            ("GET", "https://www.googleapis.com/drive/v3/about?fields=user"),
            ("GET", "https://www.googleapis.com/drive/v3/files"),
            ("POST", "https://www.googleapis.com/drive/v3/files"),
            ("PATCH", "https://www.googleapis.com/drive/v3/files/file-id"),
            ("DELETE", "https://www.googleapis.com/drive/v3/files/file-id"),
            ("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"),
            ("PATCH", "https://www.googleapis.com/upload/drive/v3/files/file-id?uploadType=media"),
            ("POST", "https://api.dropboxapi.com/oauth2/token"),
            ("POST", "https://api.dropboxapi.com/2/users/get_current_account"),
            ("POST", "https://api.dropboxapi.com/2/files/list_folder"),
            ("POST", "https://api.dropboxapi.com/2/files/list_folder/continue"),
            ("POST", "https://api.dropboxapi.com/2/files/create_folder_v2"),
            ("POST", "https://api.dropboxapi.com/2/files/get_metadata"),
            ("POST", "https://api.dropboxapi.com/2/files/delete_v2"),
            ("POST", "https://content.dropboxapi.com/2/files/download"),
            ("POST", "https://content.dropboxapi.com/2/files/upload"),
        ] {
            assert!(access.allows_http(method, url), "blocked cloud request: {method} {url}");
        }
        assert!(!access.allows_http("POST", "https://example.com/token"));
        assert!(!access.allows_http("POST", "http://oauth2.googleapis.com/token"));
    }

    #[test]
    fn oauth_redirect_is_percent_encoded_into_template() {
        let redirect = "http://127.0.0.1:53682/callback";
        let encoded = percent_encode(redirect);
        assert_eq!(encoded, "http%3A%2F%2F127.0.0.1%3A53682%2Fcallback");
        let template = format!(
            "https://example.com/auth?redirect_uri={encoded}&state=__STATE__"
        );
        assert!(template.contains("redirect_uri=http%3A%2F%2F"));
    }

    #[test]
    fn oauth_query_decodes_plus_and_percent() {
        let params = parse_query("code=4%2F0Ab&state=a%20b&error_description=no+access");
        assert_eq!(params.get("code").unwrap(), "4/0Ab");
        assert_eq!(params.get("state").unwrap(), "a b");
        assert_eq!(params.get("error_description").unwrap(), "no access");
        assert_eq!(percent_decode("%E4%B8%AD"), "中");
    }

    #[test]
    fn config_reads_json_and_defaults() {
        let doc = serde_json::json!({
            "googleClientId": "gid",
            "googleClientSecret": "gsecret",
            "dropboxAppKey": "dkey",
            "dropboxRedirectPort": 51234,
            "purchaseRequired": true
        });
        let config = config_from_json(&doc, Path::new("/tmp/sync.json"));
        assert_eq!(config.google_client_id, "gid");
        assert_eq!(config.google_client_secret, "gsecret");
        assert_eq!(config.dropbox_app_key, "dkey");
        assert_eq!(config.dropbox_app_secret, "");
        assert_eq!(config.dropbox_redirect_port, 51234);
        assert!(config.purchase_required);
        assert_eq!(config.config_path, "/tmp/sync.json");

        let empty = config_from_json(&serde_json::Value::Null, Path::new("x"));
        assert_eq!(empty.google_client_id, "");
        assert_eq!(empty.dropbox_redirect_port, 53682);
        assert!(empty.purchase_required);
    }

    #[test]
    fn token_provider_names_are_restricted() {
        assert!(valid_provider("google").is_ok());
        assert!(valid_provider("dropbox.dev-1").is_ok());
        assert!(valid_provider("../evil").is_err());
        assert!(valid_provider("").is_err());
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
            size: e.size,
        })
        .collect()
}

fn support_dir() -> PathBuf {
    if let Some(dir) = std::env::var_os("STOATMD_SUPPORT_DIR") {
        return PathBuf::from(dir);
    }
    dirs::data_local_dir().unwrap_or_else(|| PathBuf::from(".")).join("StoatMD")
}

fn cache_base() -> Result<PathBuf, String> {
    dirs::data_local_dir().map(|dir| dir.join("com.stoatmd.app").join("libraries"))
        .ok_or_else(|| "Application data directory unavailable".to_owned())
}

fn config_file_path() -> PathBuf {
    std::env::var_os("STOATMD_CONFIG_PATH")
        .map(PathBuf::from)
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| support_dir().join("sync.json"))
}

fn config_from_json(doc: &serde_json::Value, path: &Path) -> SyncConfigDto {
    SyncConfigDto {
        google_client_id: json_str(doc, &["googleClientId", "google_client_id"]),
        google_client_secret: json_str(doc, &["googleClientSecret", "google_client_secret"]),
        dropbox_app_key: json_str(doc, &["dropboxAppKey", "dropbox_app_key"]),
        dropbox_app_secret: json_str(doc, &["dropboxAppSecret", "dropbox_app_secret"]),
        dropbox_redirect_port: json_u32(doc, &["dropboxRedirectPort", "dropbox_redirect_port"])
            .filter(|port| *port > 0 && *port <= u16::MAX as u32)
            .unwrap_or(53682),
        purchase_required: doc
            .get("purchaseRequired")
            .and_then(|value| value.as_bool())
            .unwrap_or(true),
        config_path: path.display().to_string(),
    }
}

fn json_str(doc: &serde_json::Value, keys: &[&str]) -> String {
    keys.iter()
        .find_map(|key| doc.get(*key).and_then(|value| value.as_str()))
        .unwrap_or("")
        .trim()
        .to_owned()
}

fn json_u32(doc: &serde_json::Value, keys: &[&str]) -> Option<u32> {
    keys.iter().find_map(|key| {
        doc.get(*key).and_then(|value| {
            value
                .as_u64()
                .map(|n| n as u32)
                .or_else(|| value.as_str().and_then(|s| s.parse().ok()))
        })
    })
}

fn apply_env(config: &mut SyncConfigDto) {
    if let Ok(value) = std::env::var("STOATMD_GOOGLE_CLIENT_ID") {
        if !value.trim().is_empty() {
            config.google_client_id = value.trim().to_owned();
        }
    }
    if let Ok(value) = std::env::var("STOATMD_GOOGLE_CLIENT_SECRET") {
        if !value.trim().is_empty() {
            config.google_client_secret = value.trim().to_owned();
        }
    }
    if let Ok(value) = std::env::var("STOATMD_DROPBOX_APP_KEY") {
        if !value.trim().is_empty() {
            config.dropbox_app_key = value.trim().to_owned();
        }
    }
    if let Ok(value) = std::env::var("STOATMD_DROPBOX_APP_SECRET") {
        if !value.trim().is_empty() {
            config.dropbox_app_secret = value.trim().to_owned();
        }
    }
    if let Ok(value) = std::env::var("STOATMD_DROPBOX_REDIRECT_PORT") {
        if let Ok(port) = value.trim().parse::<u32>() {
            if port > 0 && port <= u16::MAX as u32 {
                config.dropbox_redirect_port = port;
            }
        }
    }
    if let Ok(value) = std::env::var("STOATMD_PURCHASE_REQUIRED") {
        config.purchase_required = matches!(value.trim(), "1" | "true" | "TRUE" | "yes");
    }
}

#[cfg(not(target_os = "ios"))]
struct OAuthRunGuard;

#[cfg(not(target_os = "ios"))]
impl Drop for OAuthRunGuard {
    fn drop(&mut self) {
        OAUTH_RUNNING.store(false, Ordering::SeqCst);
    }
}

#[cfg(not(target_os = "ios"))]
fn run_oauth(
    url_template: &str,
    expected_state: &str,
    port: Option<u32>,
) -> Result<OAuthResultDto, String> {
    if OAUTH_RUNNING.swap(true, Ordering::SeqCst) {
        return Err("oauth_already_running".to_owned());
    }
    let _guard = OAuthRunGuard;
    OAUTH_CANCELLED.store(false, Ordering::SeqCst);

    let listener = match port.filter(|port| *port > 0) {
        Some(port) if port <= u16::MAX as u32 => TcpListener::bind(("127.0.0.1", port as u16))
            .map_err(|err| format!("oauth_bind:{port}:{err}"))?,
        _ => TcpListener::bind(("127.0.0.1", 0)).map_err(|err| format!("oauth_bind:{err}"))?,
    };
    listener
        .set_nonblocking(true)
        .map_err(|err| format!("oauth_listen:{err}"))?;
    let actual_port = listener
        .local_addr()
        .map_err(|err| format!("oauth_listen:{err}"))?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{actual_port}{OAUTH_PATH}");
    let url = url_template.replace("__REDIRECT__", &percent_encode(&redirect_uri));
    open_external(&url).map_err(|err| format!("oauth_open:{err}"))?;

    let deadline = Instant::now() + OAUTH_TIMEOUT;
    while Instant::now() < deadline {
        if OAUTH_CANCELLED.load(Ordering::SeqCst) {
            return Err("oauth_cancelled".to_owned());
        }
        match listener.accept() {
            Ok((stream, _)) => {
                if let Some(result) = handle_oauth_callback(stream, expected_state) {
                    return result.map(|code| OAuthResultDto {
                        code,
                        state: expected_state.to_owned(),
                        redirect_uri,
                    });
                }
            }
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(err) => return Err(format!("oauth_accept:{err}")),
        }
    }
    Err("oauth_timeout".to_owned())
}

#[cfg(not(target_os = "ios"))]
fn handle_oauth_callback(
    mut stream: TcpStream,
    expected_state: &str,
) -> Option<Result<String, String>> {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let mut buf = [0u8; 8192];
    let mut len = 0;
    while len < buf.len() {
        match stream.read(&mut buf[len..]) {
            Ok(0) => break,
            Ok(n) => {
                len += n;
                if buf[..len].windows(4).any(|window| window == b"\r\n\r\n") {
                    break;
                }
            }
            Err(_) => break,
        }
    }
    if len == 0 {
        return None;
    }
    let request = String::from_utf8_lossy(&buf[..len]);
    let target = request.lines().next()?.split_whitespace().nth(1)?.to_owned();
    let is_callback = target == OAUTH_PATH || target.starts_with(&format!("{OAUTH_PATH}?"));
    if !is_callback {
        let _ = respond(stream, 404, "Not found");
        return None;
    }
    let query = target.split_once('?').map(|(_, query)| query).unwrap_or("");
    let params = parse_query(query);
    if let Some(error) = params.get("error") {
        let description = params.get("error_description").cloned().unwrap_or_default();
        let _ = respond(stream, 200, callback_page(false));
        return Some(Err(format!("oauth_error:{error}:{description}")));
    }
    let Some(code) = params.get("code").cloned() else {
        let _ = respond(stream, 200, callback_page(false));
        return Some(Err("oauth_no_code".to_owned()));
    };
    if params.get("state").map(String::as_str) != Some(expected_state) {
        let _ = respond(stream, 400, callback_page(false));
        return Some(Err("oauth_state_mismatch".to_owned()));
    }
    let _ = respond(stream, 200, callback_page(true));
    Some(Ok(code))
}

#[cfg(not(target_os = "ios"))]
fn respond(mut stream: TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "Error",
    };
    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.as_bytes().len()
    );
    stream.write_all(response.as_bytes())?;
    stream.flush()
}

#[cfg(not(target_os = "ios"))]
fn callback_page(ok: bool) -> &'static str {
    if ok {
        "<!doctype html><meta charset=\"utf-8\"><title>StoatMD</title><body style=\"font-family:-apple-system,system-ui,sans-serif;padding:48px;line-height:1.6\"><h2>授权完成</h2><p>请返回 StoatMD。</p><p>Authorization complete — you can close this tab and return to StoatMD.</p></body>"
    } else {
        "<!doctype html><meta charset=\"utf-8\"><title>StoatMD</title><body style=\"font-family:-apple-system,system-ui,sans-serif;padding:48px;line-height:1.6\"><h2>授权未完成</h2><p>请回到 StoatMD 重试。</p><p>Authorization did not complete — return to StoatMD and try again.</p></body>"
    }
}

fn percent_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 3);
    for byte in input.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            b'%' if i + 2 < bytes.len() => {
                let hex = std::str::from_utf8(&bytes[i + 1..i + 3])
                    .ok()
                    .and_then(|hex| u8::from_str_radix(hex, 16).ok());
                match hex {
                    Some(byte) => {
                        out.push(byte);
                        i += 3;
                    }
                    None => {
                        out.push(bytes[i]);
                        i += 1;
                    }
                }
            }
            byte => {
                out.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn parse_query(query: &str) -> std::collections::HashMap<String, String> {
    let mut out = std::collections::HashMap::new();
    for pair in query.split('&') {
        if pair.is_empty() {
            continue;
        }
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        out.insert(percent_decode(key), percent_decode(value));
    }
    out
}

#[cfg(not(target_os = "ios"))]
fn open_external(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = std::process::Command::new("open");
        command.arg(url);
        command
    };
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = std::process::Command::new("cmd");
        command.args(["/C", "start", "", url]);
        command
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = std::process::Command::new("xdg-open");
        command.arg(url);
        command
    };
    let status = command.status().map_err(|err| err.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("browser exited with {status}"))
    }
}

fn reveal_path(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = std::process::Command::new("open");
        command.arg("-R").arg(path);
        command
    };
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = std::process::Command::new("explorer");
        command.arg(format!("/select,{}", path.display()));
        command
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = std::process::Command::new("xdg-open");
        command.arg(path.parent().unwrap_or(path));
        command
    };
    let status = command.status().map_err(|err| err.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("file manager exited with {status}"))
    }
}

#[cfg(target_os = "macos")]
fn trash_path(path: &Path) -> Result<(), String> {
    use objc2_foundation::{NSFileManager, NSString, NSURL};

    let manager = NSFileManager::defaultManager();
    let ns_path = NSString::from_str(&path.to_string_lossy());
    let url = NSURL::fileURLWithPath(&ns_path);
    manager
        .trashItemAtURL_resultingItemURL_error(&url, None)
        .map_err(|err| err.localizedDescription().to_string())
}

#[cfg(not(target_os = "macos"))]
fn trash_path(_path: &Path) -> Result<(), String> {
    Err("move to trash is only supported on macOS".to_owned())
}

fn valid_provider(provider: &str) -> Result<(), String> {
    if provider.is_empty()
        || !provider
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
    {
        return Err(format!("invalid provider: {provider}"));
    }
    Ok(())
}

#[cfg(any(target_os = "macos", target_os = "ios"))]
const KEYCHAIN_SERVICE: &str = "com.stoatmd.app.sync";

#[cfg(target_os = "macos")]
fn token_set(provider: &str, secret: &str) -> Result<(), String> {
    valid_provider(provider)?;
    let output = std::process::Command::new("/usr/bin/security")
        .args([
            "add-generic-password",
            "-U",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            provider,
            "-w",
            secret,
        ])
        .output()
        .map_err(|err| err.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_owned())
    }
}

#[cfg(target_os = "macos")]
fn token_get(provider: &str) -> Result<Option<String>, String> {
    valid_provider(provider)?;
    let output = std::process::Command::new("/usr/bin/security")
        .args([
            "find-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            provider,
            "-w",
        ])
        .output()
        .map_err(|err| err.to_string())?;
    if output.status.success() {
        return Ok(Some(
            String::from_utf8_lossy(&output.stdout)
                .trim_end_matches('\n')
                .to_owned(),
        ));
    }
    if output.status.code() == Some(44) {
        return Ok(None);
    }
    Err(String::from_utf8_lossy(&output.stderr).trim().to_owned())
}

#[cfg(target_os = "macos")]
fn token_delete(provider: &str) -> Result<(), String> {
    valid_provider(provider)?;
    let output = std::process::Command::new("/usr/bin/security")
        .args([
            "delete-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            provider,
        ])
        .output()
        .map_err(|err| err.to_string())?;
    if output.status.success() || output.status.code() == Some(44) {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_owned())
    }
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
fn token_path(provider: &str) -> Result<PathBuf, String> {
    valid_provider(provider)?;
    Ok(support_dir().join("tokens").join(format!("{provider}.secret")))
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
fn token_set(provider: &str, secret: &str) -> Result<(), String> {
    let path = token_path(provider)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    std::fs::write(&path, secret).map_err(|err| err.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))
            .map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
fn token_get(provider: &str) -> Result<Option<String>, String> {
    let path = token_path(provider)?;
    match std::fs::read_to_string(&path) {
        Ok(secret) => Ok(Some(secret)),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

#[cfg(not(any(target_os = "macos", target_os = "ios")))]
fn token_delete(provider: &str) -> Result<(), String> {
    let path = token_path(provider)?;
    match std::fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err.to_string()),
    }
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

/// iOS 的授权 token 存进 iCloud 钥匙串（kSecAttrSynchronizable）：
/// 同一 Apple ID 下的 iPhone / iPad 只授权一次，其余设备直接读到同一份 token。
#[cfg(target_os = "ios")]
fn ios_token_options(
    provider: &str,
    synchronized: bool,
) -> security_framework::passwords::PasswordOptions {
    let mut options = security_framework::passwords::PasswordOptions::new_generic_password(
        KEYCHAIN_SERVICE,
        provider,
    );
    options.set_access_synchronized(Some(synchronized));
    options
}

#[cfg(target_os = "ios")]
fn token_set(provider: &str, secret: &str) -> Result<(), String> {
    valid_provider(provider)?;
    // 优先写 iCloud 同步条目；模拟器或关闭了 iCloud 钥匙串时退回设备本地，
    // 应用照常可用，只是不跨设备。
    if security_framework::passwords::set_generic_password_options(
        secret.as_bytes(),
        ios_token_options(provider, true),
    )
    .is_ok()
    {
        // 旧版本把 token 写在设备本地；迁移后删掉，避免同一个 token 存两份。
        let _ = security_framework::passwords::delete_generic_password_options(
            ios_token_options(provider, false),
        );
        return Ok(());
    }
    security_framework::passwords::set_generic_password_options(
        secret.as_bytes(),
        ios_token_options(provider, false),
    )
    .map_err(|err| err.to_string())
}

#[cfg(target_os = "ios")]
fn token_get(provider: &str) -> Result<Option<String>, String> {
    valid_provider(provider)?;
    // 先读 iCloud 同步条目：另一台设备的授权会同步到这里。
    let mut sync_error: Option<String> = None;
    match security_framework::passwords::generic_password(ios_token_options(provider, true)) {
        Ok(bytes) => {
            let secret = String::from_utf8(bytes).map_err(|err| err.to_string())?;
            // 同步条目可用时清掉旧版本遗留的本地副本，免得同步中断后读到旧 token。
            let _ = security_framework::passwords::delete_generic_password_options(
                ios_token_options(provider, false),
            );
            return Ok(Some(secret));
        }
        Err(err) if err.code() == -25300 => {}
        Err(err) => sync_error = Some(err.to_string()),
    }
    // 退回设备本地：升级前写的条目，或同步不可用时刚写入的条目。
    // 读到后迁移到同步条目，之后就跨设备可用。
    match security_framework::passwords::generic_password(ios_token_options(provider, false)) {
        Ok(bytes) => {
            let secret = String::from_utf8(bytes).map_err(|err| err.to_string())?;
            // 只有同步条目写成功才删本地副本，否则会把这台设备上唯一的 token 弄丢。
            if security_framework::passwords::set_generic_password_options(
                secret.as_bytes(),
                ios_token_options(provider, true),
            )
            .is_ok()
            {
                let _ = security_framework::passwords::delete_generic_password_options(
                    ios_token_options(provider, false),
                );
            }
            Ok(Some(secret))
        }
        Err(err) if err.code() == -25300 => match sync_error {
            Some(message) => Err(message),
            None => Ok(None),
        },
        Err(err) => Err(err.to_string()),
    }
}

#[cfg(target_os = "ios")]
fn token_delete(provider: &str) -> Result<(), String> {
    valid_provider(provider)?;
    // 两边都删：同步条目要跨设备撤销，本地条目是旧版本遗留。
    for synchronized in [true, false] {
        match security_framework::passwords::delete_generic_password_options(ios_token_options(
            provider,
            synchronized,
        )) {
            Ok(()) => {}
            Err(err) if err.code() == -25300 => {}
            Err(err) => return Err(err.to_string()),
        }
    }
    Ok(())
}
