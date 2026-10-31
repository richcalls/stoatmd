//! iOS document import/export. Each picker owns its delegate and temporary
//! export file until UIKit reports selection or cancellation.
use nsh_core::prelude::*;

#[derive(Debug, Clone, PartialEq, JsObject)]
pub struct ImportedMarkdown {
    pub name: String,
    pub content: String,
}

/// Native iOS document picker for portable Markdown files.
#[module]
pub struct MobileFiles;

#[module]
impl MobileFiles {
    /// Wait for UIKit to finish dismissing the app's dialog before navigation.
    pub async fn wait_for_dialog_dismissal() -> Result<(), String> {
        #[cfg(target_os = "ios")]
        { ios::wait_for_dialog().await }
        #[cfg(not(target_os = "ios"))]
        { Ok(()) }
    }

    /// Import one UTF-8 Markdown or text document; cancellation returns null.
    pub async fn import_markdown() -> Result<Option<ImportedMarkdown>, String> {
        #[cfg(target_os = "ios")]
        { ios::pick(None).await }
        #[cfg(not(target_os = "ios"))]
        { Err("Document import requires iOS".into()) }
    }

    /// Export a copy through Files; cancellation returns false.
    pub async fn export_markdown(name: String, content: String) -> Result<bool, String> {
        #[cfg(target_os = "ios")]
        { Ok(ios::pick(Some((name, content))).await?.is_some()) }
        #[cfg(not(target_os = "ios"))]
        { let _ = (name, content); Err("Document export requires iOS".into()) }
    }
}

#[cfg(target_os = "ios")]
mod ios {
    use super::ImportedMarkdown;
    use std::{cell::RefCell, io::Read};
    use futures_channel::oneshot;
    use objc2::{DefinedClass, MainThreadMarker, MainThreadOnly, define_class, msg_send, rc::{Allocated, Retained}, runtime::{AnyClass, AnyObject}};
    use objc2_foundation::{NSArray, NSObject, NSObjectProtocol, NSString, NSURL};
    use objc2_ui_kit::{UIApplication, UIViewController};

    type Answer = Result<Option<ImportedMarkdown>, String>;
    thread_local! {
        static SHOWN: RefCell<Option<Retained<DocumentDelegate>>> = const { RefCell::new(None) };
    }
    pub struct State {
        sender: RefCell<Option<oneshot::Sender<Answer>>>,
        export: Option<tempfile::TempDir>,
    }
    define_class!(
        #[unsafe(super(NSObject))]
        #[thread_kind = MainThreadOnly]
        #[ivars = State]
        struct DocumentDelegate;
        unsafe impl NSObjectProtocol for DocumentDelegate {}
        impl DocumentDelegate {
            #[unsafe(method(documentPicker:didPickDocumentsAtURLs:))]
            fn picked(&self, _picker: &UIViewController, urls: &NSArray<NSURL>) {
                let result = if self.ivars().export.is_some() {
                    Ok(Some(ImportedMarkdown { name: String::new(), content: String::new() }))
                } else if let Some(url) = urls.firstObject() { read_document(&url).map(Some) } else { Ok(None) };
                self.finish(result);
            }
            #[unsafe(method(documentPickerWasCancelled:))]
            fn cancelled(&self, _picker: &UIViewController) { self.finish(Ok(None)); }
            #[unsafe(method(presentationControllerDidDismiss:))]
            fn dismissed(&self, _controller: &AnyObject) { self.finish(Ok(None)); }
        }
    );
    impl DocumentDelegate {
        fn finish(&self, result: Answer) {
            if let Some(sender) = self.ivars().sender.borrow_mut().take() { let _ = sender.send(result); }
            // Keep self alive through the delegate callback even after removing
            // the application's strong ownership.
            let _keep_alive = unsafe { Retained::retain(self as *const Self as *mut Self) };
            SHOWN.with_borrow_mut(|shown| {
                if shown.as_ref().is_some_and(|current| std::ptr::eq(&**current, self)) { shown.take(); }
            });
        }
    }
    fn read_document(url: &NSURL) -> Result<ImportedMarkdown, String> {
        let path = url.path().ok_or("mobile.file.invalid")?.to_string();
        let path = std::path::Path::new(&path);
        let name = path.file_name().and_then(|n| n.to_str()).ok_or("mobile.file.invalid")?.to_owned();
        let ext = path.extension().and_then(|n| n.to_str()).unwrap_or("").to_ascii_lowercase();
        if !matches!(ext.as_str(), "md" | "markdown" | "txt") { return Err("mobile.file.invalid".into()); }
        // Import mode hands us a sandbox copy; security scope also supports
        // providers which return a scoped URL.
        let scoped = unsafe { url.startAccessingSecurityScopedResource() };
        let result = (|| {
            let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
            let mut bytes = Vec::new();
            file.take(5 * 1024 * 1024 + 1).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
            if bytes.len() > 5 * 1024 * 1024 { return Err("mobile.file.tooLarge".into()); }
            let content = String::from_utf8(bytes).map_err(|_| "mobile.file.encoding".to_owned())?;
            let name = if ext == "txt" { format!("{}.md", path.file_stem().unwrap().to_string_lossy()) } else { name };
            Ok(ImportedMarkdown { name, content })
        })();
        if scoped { unsafe { url.stopAccessingSecurityScopedResource(); } }
        result
    }
    fn root_controller(mtm: MainThreadMarker) -> Result<Retained<UIViewController>, String> {
        unsafe {
            let app = UIApplication::sharedApplication(mtm);
            let scenes: Retained<AnyObject> = msg_send![&app, connectedScenes];
            let scenes: Retained<NSArray<AnyObject>> = msg_send![&scenes, allObjects];
            for scene in scenes.iter() {
                let responds: bool = msg_send![&scene, respondsToSelector: objc2::sel!(windows)];
                if !responds { continue; }
                let windows: Retained<NSArray<AnyObject>> = msg_send![&scene, windows];
                for window in windows.iter() {
                    let key: bool = msg_send![&window, isKeyWindow];
                    if key {
                        let root: Option<Retained<UIViewController>> = msg_send![&window, rootViewController];
                        if let Some(root) = root { return Ok(root); }
                    }
                }
            }
        }
        Err("No active window".into())
    }
    // nsh 0.3 removes a controlled Dialog's JS handler before UIKit delivers
    // onClose. Observe the real presentation state instead of guessing an
    // animation delay. Every check executes on UIKit's main queue.
    pub async fn wait_for_dialog() -> Result<(), String> {
        let (sender, receiver) = oneshot::channel();
        dispatch2::DispatchQueue::main().exec_async(move || check_dismissed(sender, std::time::Instant::now()));
        receiver.await.map_err(|_| "Dialog wait cancelled".to_owned())?
    }
    fn check_dismissed(sender: oneshot::Sender<Result<(), String>>, started: std::time::Instant) {
        let mtm = MainThreadMarker::new().expect("main queue");
        let root = match root_controller(mtm) { Ok(root) => root, Err(err) => { let _ = sender.send(Err(err)); return; } };
        if root.presentedViewController().is_none() {
            let _ = sender.send(Ok(()));
        } else if started.elapsed() >= std::time::Duration::from_secs(5) {
            let _ = sender.send(Err("mobile.file.busy".into()));
        } else {
            let when = dispatch2::DispatchTime::try_from(std::time::Duration::from_millis(16)).expect("short interval");
            let _ = dispatch2::DispatchQueue::main().after(when, move || check_dismissed(sender, started));
        }
    }
    pub async fn pick(export: Option<(String, String)>) -> Answer {
        let (sender, receiver) = oneshot::channel();
        dispatch2::DispatchQueue::main().exec_async(move || {
            let sender = RefCell::new(Some(sender));
            let result = present(export, &sender);
            if let Err(error) = result {
                if let Some(sender) = sender.borrow_mut().take() { let _ = sender.send(Err(error)); }
            }
        });
        receiver.await.map_err(|_| "Document picker closed unexpectedly".to_owned())?
    }
    fn present(export: Option<(String, String)>, sender: &RefCell<Option<oneshot::Sender<Answer>>>) -> Result<(), String> {
        let mtm = MainThreadMarker::new().ok_or("Main thread required")?;
        if SHOWN.with_borrow(|s| s.is_some()) { return Err("Document picker already open".into()); }
        // UIKit's scene/window APIs, confined to the main dispatch queue.
        unsafe {
            let mut top = root_controller(mtm)?;
            while let Some(next) = top.presentedViewController() { top = next; }
            if top.isBeingDismissed() || top.isBeingPresented() { return Err("mobile.file.busy".into()); }
            let class = AnyClass::get(c"UIDocumentPickerViewController").ok_or("Document picker unavailable")?;
            let alloc: Allocated<AnyObject> = msg_send![class, alloc];
            let mut temp = None;
            let picker: Option<Retained<AnyObject>> = if let Some((name, content)) = export {
                if name.is_empty() || name.contains(['/', '\\', '\0']) || name.starts_with('.') { return Err("mobile.file.invalid".into()); }
                let dir = tempfile::tempdir().map_err(|e| e.to_string())?;
                let path = dir.path().join(name);
                std::fs::write(&path, content).map_err(|e| e.to_string())?;
                let url = NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy()));
                let urls = NSArray::from_retained_slice(&[url]);
                temp = Some(dir);
                msg_send![alloc, initForExportingURLs: &*urls, asCopy: true]
            } else {
                let types = NSArray::from_retained_slice(&[NSString::from_str("net.daringfireball.markdown"), NSString::from_str("public.plain-text")]);
                // UIDocumentPickerModeImport copies into the app sandbox.
                msg_send![alloc, initWithDocumentTypes: &*types, inMode: 0usize]
            };
            let picker: Retained<UIViewController> = Retained::cast_unchecked(picker.ok_or("Cannot create document picker")?);
            let _: () = msg_send![&picker, setAllowsMultipleSelection: false];
            let delegate = DocumentDelegate::alloc(mtm).set_ivars(State { sender: RefCell::new(sender.borrow_mut().take()), export: temp });
            let delegate: Retained<DocumentDelegate> = msg_send![super(delegate), init];
            let _: () = msg_send![&picker, setDelegate: &*delegate];
            if let Some(sheet) = picker.presentationController() { let _: () = msg_send![&sheet, setDelegate: &*delegate]; }
            SHOWN.with_borrow_mut(|s| *s = Some(delegate));
            top.presentViewController_animated_completion(&picker, true, None);
        }
        Ok(())
    }
}
