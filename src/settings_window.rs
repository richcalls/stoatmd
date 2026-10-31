//! Independent AppKit settings window. Each window owns an nsh surface;
//! the main engine owns preferences and sync operations through a small RPC queue.
use nsh_core::prelude::*;

#[derive(Clone, Debug, JsObject)]
pub struct SettingsRequest {
    pub id: u32,
    pub data: String,
}

#[module]
/// Independent native settings window and its channel to the main application.
pub struct SettingsWindow;

#[module]
impl SettingsWindow {
    /// Opens or focuses settings with the requested tab and current application state.
    pub fn open(title: String, state: String) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            let state = serde_json::from_str(&state).map_err(|e| e.to_string())?;
            macos::open(title, state)?;
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (title, state);
        Ok(())
    }

    /// Sends the main application's latest settings and sync state to the window.
    pub fn publish(state: String) {
        #[cfg(target_os = "macos")]
        if let Ok(state) = serde_json::from_str(&state) {
            macos::publish(state);
        }
        #[cfg(not(target_os = "macos"))]
        let _ = state;
    }

    /// Drains work requested by the settings engine for execution in the main engine.
    pub fn take_requests() -> Vec<SettingsRequest> {
        #[cfg(target_os = "macos")]
        {
            macos::take_requests()
        }
        #[cfg(not(target_os = "macos"))]
        {
            Vec::new()
        }
    }

    /// Resolves or rejects a queued request from the settings engine.
    pub fn reply(id: u32, data: String, error: Option<String>) {
        #[cfg(target_os = "macos")]
        macos::reply(id, data, error);
        #[cfg(not(target_os = "macos"))]
        let _ = (id, data, error);
    }

    /// Reports whether the settings window is open, including while minimized.
    pub fn is_open() -> bool {
        #[cfg(target_os = "macos")]
        {
            macos::OPEN.load(std::sync::atomic::Ordering::Acquire)
        }
        #[cfg(not(target_os = "macos"))]
        {
            false
        }
    }

    /// Closes settings while preserving its engine and saved window frame for reopening.
    pub fn close() {
        #[cfg(target_os = "macos")]
        macos::close();
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::SettingsRequest;
    use nsh_dev::{
        DevClient, DevEvent, HostInfo,
        protocol::{BundleFormat, HostPlatform},
    };
    use nsh_engine::{HostCall, Policy};
    use nsh_platform_macos::{AppOptions, AppView, AssetBase, Bundle, Limits};
    use objc2::{
        MainThreadMarker, MainThreadOnly, define_class, msg_send, rc::Retained,
        runtime::ProtocolObject,
    };
    use objc2_app_kit::{
        NSApplication, NSBackingStoreType, NSWindow, NSWindowCollectionBehavior, NSWindowDelegate,
        NSWindowStyleMask,
    };
    use objc2_foundation::{NSObject, NSObjectProtocol, NSPoint, NSRect, NSSize, NSString};
    use serde_json::{Value, json};
    use std::{
        cell::RefCell,
        collections::HashMap,
        path::PathBuf,
        rc::Rc,
        sync::{
            Mutex,
            atomic::{AtomicBool, AtomicU32, Ordering},
        },
    };

    pub static OPEN: AtomicBool = AtomicBool::new(false);
    static BUSY: AtomicBool = AtomicBool::new(false);
    static NEXT_ID: AtomicU32 = AtomicU32::new(1);
    static REQUESTS: Mutex<Vec<SettingsRequest>> = Mutex::new(Vec::new());
    static REPLIES: Mutex<Option<HashMap<u32, HostCall>>> = Mutex::new(None);
    thread_local! { static WINDOW: RefCell<Option<SettingsHost>> = const { RefCell::new(None) }; }

    struct SettingsHost {
        window: Retained<NSWindow>,
        view: Rc<AppView>,
        _delegate: Retained<SettingsDelegate>,
        _dev: Option<DevClient>,
    }

    define_class!(
        #[unsafe(super(NSObject))]
        #[thread_kind = MainThreadOnly]
        #[name = "StoatSettingsWindowDelegate"]
        struct SettingsDelegate;
        unsafe impl NSObjectProtocol for SettingsDelegate {}
        unsafe impl NSWindowDelegate for SettingsDelegate {
            #[unsafe(method(windowShouldClose:))]
            fn should_close(&self, _window: &NSWindow) -> bool {
                if BUSY.load(Ordering::Acquire) {
                    return false.into();
                }
                // AppKit completes the close (including full-screen transitions).
                // The retained window and engine remain available for reopening.
                OPEN.store(false, Ordering::Release);
                WINDOW.with(|slot| {
                    if let Some(host) = slot.borrow().as_ref() {
                        let _ = host.view.host().send("visibility", json!(false));
                    }
                });
                true
            }
        }
    );

    fn arg(name: &str) -> Option<String> {
        let args: Vec<_> = std::env::args().collect();
        args.windows(2)
            .find(|pair| pair[0] == name)
            .map(|pair| pair[1].clone())
    }

    enum Source {
        File(PathBuf),
        Dev(String),
    }
    fn source() -> Source {
        if let Some(path) = arg("--bundle") {
            return Source::File(path.into());
        }
        if let Some(url) = arg("--dev-server") {
            return Source::Dev(url);
        }
        let resources = std::env::var_os("NSH_APP_DIR")
            .map(PathBuf::from)
            .or_else(|| {
                let exe = std::env::current_exe().ok()?.canonicalize().ok()?;
                Some(exe.parent()?.parent()?.join("Resources/nsh"))
            });
        if let Some(path) = resources
            .map(|dir| dir.join("bundle.nshc"))
            .filter(|p| p.is_file())
        {
            return Source::File(path);
        }
        Source::Dev("ws://127.0.0.1:8790/ws".into())
    }

    pub fn open(title: String, state: Value) -> Result<(), String> {
        update_busy(&state);
        // Validate/load the local bundle before touching AppKit, so failures reach the caller.
        let source = source();
        let bundle = if let Source::File(path) = &source {
            // SAFETY: same signed app resource or developer-selected CLI bundle as the main host.
            Some(unsafe { Bundle::read_trusted(path) }.map_err(|e| e.to_string())?)
        } else {
            None
        };
        OPEN.store(true, Ordering::Release);
        dispatch2::DispatchQueue::main().exec_async(move || {
            let Some(mtm) = MainThreadMarker::new() else {
                return;
            };
            WINDOW.with(|slot| {
                if let Some(host) = slot.borrow().as_ref() {
                    host.window.setTitle(&NSString::from_str(&title));
                    host.view.host().set_params(
                        json!({"settingsWindow": true, "state": state})
                            .as_object()
                            .unwrap()
                            .clone(),
                    );
                    let _ = host.view.host().send("open", state);
                    let _ = host.view.host().send("visibility", json!(true));
                    if host.window.isMiniaturized() {
                        host.window.deminiaturize(None);
                    }
                    host.window.makeKeyAndOrderFront(None);
                    return;
                }
                let assets = match &source {
                    Source::File(path) => path
                        .parent()
                        .map(|p| AssetBase::Directory(p.join("assets"))),
                    Source::Dev(url) => Some(AssetBase::Http(
                        url.replace("ws://", "http://")
                            .replace("wss://", "https://")
                            .trim_end_matches("/ws")
                            .to_owned()
                            + "/assets/",
                    )),
                };
                let view = AppView::new(
                    mtm,
                    AppOptions {
                        app_id: "com.stoatmd.app".into(),
                        title: title.clone(),
                        size: (820, 640),
                        asset_base: assets,
                        limits: Limits::standalone(),
                        data_dir: arg("--data-dir").map(PathBuf::from),
                        ..AppOptions::default()
                    },
                );
                view.host().set_params(
                    json!({"settingsWindow": true, "state": state})
                        .as_object()
                        .unwrap()
                        .clone(),
                );
                view.host().handle("settings", |mut call| {
                    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
                    let data = call.take_data().to_string();
                    REPLIES
                        .lock()
                        .unwrap()
                        .get_or_insert_with(HashMap::new)
                        .insert(id, call);
                    REQUESTS.lock().unwrap().push(SettingsRequest { id, data });
                });
                let frame = NSRect::new(NSPoint::new(0., 0.), NSSize::new(820., 640.));
                let style = NSWindowStyleMask::Titled
                    | NSWindowStyleMask::Closable
                    | NSWindowStyleMask::Miniaturizable
                    | NSWindowStyleMask::Resizable;
                let window = unsafe {
                    NSWindow::initWithContentRect_styleMask_backing_defer(
                        NSWindow::alloc(mtm),
                        frame,
                        style,
                        NSBackingStoreType::Buffered,
                        false,
                    )
                };
                unsafe { window.setReleasedWhenClosed(false) };
                window.setTitle(&NSString::from_str(&title));
                window.setContentMinSize(NSSize::new(680., 480.));
                window.setCollectionBehavior(NSWindowCollectionBehavior::FullScreenPrimary);
                window.setContentView(Some(&view.view()));
                window.center();
                window.setFrameAutosaveName(&NSString::from_str("StoatMD.Settings.Native"));
                let delegate: Retained<SettingsDelegate> =
                    unsafe { msg_send![SettingsDelegate::alloc(mtm), init] };
                window.setDelegate(Some(ProtocolObject::from_ref(&*delegate)));
                let dev = match source {
                    Source::File(_) => {
                        view.load(bundle.unwrap().into());
                        None
                    }
                    Source::Dev(url) => Some(start_dev(url)),
                };
                window.makeKeyAndOrderFront(None);
                NSApplication::sharedApplication(mtm).activate();
                *slot.borrow_mut() = Some(SettingsHost {
                    window,
                    view,
                    _delegate: delegate,
                    _dev: dev,
                });
            });
        });
        Ok(())
    }

    fn start_dev(url: String) -> DevClient {
        DevClient::start(
            url,
            HostInfo {
                device: "StoatMD Settings".into(),
                platform: HostPlatform::MacOs,
                bytecode_version: nsh_js::BYTECODE_VERSION.into(),
                ui_sets: vec!["nsh/base".into(), "stoatmd/native".into()],
                tests: false,
            },
            |event| {
                if let DevEvent::Bundle {
                    format,
                    bytes,
                    source_map,
                    app_id,
                    capabilities,
                    ..
                } = event
                {
                    let bundle = match format {
                        // SAFETY: the developer's server negotiated this runtime's bytecode format.
                        BundleFormat::Bytecode => unsafe { Bundle::bytecode(bytes) },
                        BundleFormat::Source => match String::from_utf8(bytes) {
                            Ok(code) => Bundle::source(code),
                            Err(_) => return,
                        },
                    }
                    .with_policy(Policy::development())
                    .with_app_id(app_id.as_deref());
                    let Ok(mut bundle) = bundle.with_capabilities_json(capabilities.as_deref())
                    else {
                        return;
                    };
                    if let Some(map) = source_map {
                        bundle = bundle.with_source_map(map);
                    }
                    dispatch2::DispatchQueue::main().exec_async(move || {
                        WINDOW.with(|slot| {
                            if let Some(host) = slot.borrow().as_ref() {
                                host.view.load(bundle.into());
                            }
                        })
                    });
                }
            },
        )
        .expect("start settings dev connection")
    }

    fn update_busy(state: &Value) {
        BUSY.store(
            state
                .pointer("/storage/busy")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            Ordering::Release,
        );
    }

    pub fn publish(state: Value) {
        update_busy(&state);
        dispatch2::DispatchQueue::main().exec_async(move || {
            WINDOW.with(|slot| {
                if let Some(host) = slot.borrow().as_ref() {
                    if let Some(title) = state.get("title").and_then(Value::as_str) {
                        host.window.setTitle(&NSString::from_str(title));
                    }
                    host.view.host().set_params(
                        json!({"settingsWindow": true, "state": state})
                            .as_object()
                            .unwrap()
                            .clone(),
                    );
                    let _ = host.view.host().send("state", state);
                }
            })
        });
    }
    pub fn close() {
        dispatch2::DispatchQueue::main().exec_async(|| {
            WINDOW.with(|slot| {
                if let Some(host) = slot.borrow().as_ref() {
                    host.window.performClose(None);
                }
            })
        });
    }
    pub fn take_requests() -> Vec<SettingsRequest> {
        std::mem::take(&mut *REQUESTS.lock().unwrap())
    }
    pub fn reply(id: u32, data: String, error: Option<String>) {
        let call = REPLIES
            .lock()
            .unwrap()
            .as_mut()
            .and_then(|calls| calls.remove(&id));
        if let Some(call) = call {
            if let Some(error) = error {
                call.reject(error);
            } else {
                call.resolve(serde_json::from_str(&data).unwrap_or(Value::Null));
            }
        }
    }
}
