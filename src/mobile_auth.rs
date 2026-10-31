//! iOS OAuth uses a system authentication session and public PKCE clients.
use crate::OAuthResultDto;
use block2::RcBlock;
use futures_channel::oneshot;
use objc2::{DefinedClass, MainThreadMarker, MainThreadOnly, define_class, extern_protocol, msg_send, rc::{Allocated, Retained}, runtime::{AnyClass, AnyObject}};
use objc2_foundation::{NSArray, NSError, NSObject, NSObjectProtocol, NSString, NSURL};
use objc2_ui_kit::UIApplication;
use std::{cell::RefCell, sync::{Arc, Mutex}};

#[link(name = "AuthenticationServices", kind = "framework")]
unsafe extern "C" {}

type Answer = Result<OAuthResultDto, String>;
type Sender = Arc<Mutex<Option<oneshot::Sender<Answer>>>>;
struct Authentication {
    session: Retained<AnyObject>,
    _context: Retained<PresentationContext>,
    sender: Sender,
}
thread_local! {
    static SESSION: RefCell<Option<Authentication>> = const { RefCell::new(None) };
}
extern_protocol!(
    unsafe trait ASWebAuthenticationPresentationContextProviding: NSObjectProtocol {
        #[unsafe(method(presentationAnchorForWebAuthenticationSession:))]
        fn anchor(&self, session: &AnyObject) -> *mut AnyObject;
    }
);
pub struct Anchor(Retained<AnyObject>);
define_class!(
    #[unsafe(super(NSObject))]
    #[thread_kind = MainThreadOnly]
    #[ivars = Anchor]
    struct PresentationContext;
    unsafe impl NSObjectProtocol for PresentationContext {}
    unsafe impl ASWebAuthenticationPresentationContextProviding for PresentationContext {
        #[unsafe(method(presentationAnchorForWebAuthenticationSession:))]
        fn anchor(&self, _session: &AnyObject) -> *mut AnyObject {
            Retained::as_ptr(&self.ivars().0) as *mut AnyObject
        }
    }
);

pub async fn authorize(template: String, state: String) -> Answer {
    let (sender, receiver) = oneshot::channel();
    let sender = Arc::new(Mutex::new(Some(sender)));
    dispatch2::DispatchQueue::main().exec_async(move || {
        if let Err(err) = present(template, state, sender.clone()) { finish(&sender, Err(err)); }
    });
    receiver.await.map_err(|_| "oauth_cancelled".to_owned())?
}
pub fn cancel() {
    dispatch2::DispatchQueue::main().exec_async(|| {
        let auth = SESSION.with_borrow_mut(|shown| shown.take());
        if let Some(auth) = auth {
            unsafe { let _: () = msg_send![&auth.session, cancel]; }
            finish(&auth.sender, Err("oauth_cancelled".to_owned()));
        }
    });
}
fn finish(sender: &Sender, result: Answer) {
    if let Some(sender) = sender.lock().expect("OAuth sender").take() { let _ = sender.send(result); }
}
fn present(template: String, state: String, sender: Sender) -> Result<(), String> {
    let mtm = MainThreadMarker::new().ok_or("Main thread required")?;
    if SESSION.with_borrow(|s| s.is_some()) { return Err("oauth_already_running".into()); }
    let query = crate::parse_query(template.split_once('?').ok_or("Invalid OAuth URL")?.1);
    let client = query.get("client_id").ok_or("Missing client ID")?;
    let redirect = if template.starts_with("https://accounts.google.com/") {
        let prefix = client.strip_suffix(".apps.googleusercontent.com").ok_or("Invalid Google iOS client ID")?;
        format!("com.googleusercontent.apps.{prefix}:/oauthredirect")
    } else if template.starts_with("https://www.dropbox.com/") {
        format!("db-{client}://oauth2redirect")
    } else { return Err("Unsupported OAuth provider".into()); };
    let scheme = redirect.split(':').next().ok_or("Invalid callback scheme")?;
    let url = NSURL::URLWithString(&NSString::from_str(&template.replace("__REDIRECT__", &crate::percent_encode(&redirect))))
        .ok_or("Invalid OAuth URL")?;
    let redirect_copy = redirect.clone();
    let callback_sender = sender.clone();
    let completion = RcBlock::new(move |url: *mut NSURL, error: *mut NSError| {
        let answer = if !error.is_null() {
            let error = unsafe { &*error };
            Err(if error.domain().to_string() == "com.apple.AuthenticationServices.WebAuthenticationSession" && error.code() == 1 {
                "oauth_cancelled".to_owned()
            } else { error.localizedDescription().to_string() })
        } else if url.is_null() { Err("oauth_cancelled".to_owned()) } else {
            let callback = unsafe { (&*url).absoluteString().map(|s| s.to_string()).unwrap_or_default() };
            parse_callback(&callback, &redirect_copy, &state)
        };
        let sender = callback_sender.clone();
        dispatch2::DispatchQueue::main().exec_async(move || {
            SESSION.with_borrow_mut(|shown| {
                if shown.as_ref().is_some_and(|auth| Arc::ptr_eq(&auth.sender, &sender)) { shown.take(); }
            });
            finish(&sender, answer);
        });
    });
    unsafe {
        let app = UIApplication::sharedApplication(mtm);
        let scenes: Retained<AnyObject> = msg_send![&app, connectedScenes];
        let scenes: Retained<NSArray<AnyObject>> = msg_send![&scenes, allObjects];
        let mut anchor = None;
        for scene in scenes.iter() {
            let responds: bool = msg_send![&scene, respondsToSelector: objc2::sel!(windows)];
            if !responds { continue; }
            let windows: Retained<NSArray<AnyObject>> = msg_send![&scene, windows];
            for window in windows.iter() {
                let key: bool = msg_send![&window, isKeyWindow];
                if key { anchor = Some(window); break; }
            }
            if anchor.is_some() { break; }
        }
        let context = PresentationContext::alloc(mtm).set_ivars(Anchor(anchor.ok_or("No active window")?));
        let context: Retained<PresentationContext> = msg_send![super(context), init];
        let class = AnyClass::get(c"ASWebAuthenticationSession").ok_or("Authentication session unavailable")?;
        let alloc: Allocated<AnyObject> = msg_send![class, alloc];
        let session: Option<Retained<AnyObject>> = msg_send![alloc, initWithURL: &*url, callbackURLScheme: &*NSString::from_str(scheme), completionHandler: &*completion];
        let session = session.ok_or("Cannot create authentication session")?;
        let _: () = msg_send![&session, setPresentationContextProvider: &*context];
        SESSION.with_borrow_mut(|shown| *shown = Some(Authentication { session, _context: context, sender: sender.clone() }));
        start_session(sender, std::time::Instant::now());
    }
    Ok(())
}
// Wait for the foreground scene after a previous system sheet closes.
// Apple allows calling start only once per session; canStart is safe to poll.
fn start_session(sender: Sender, started: std::time::Instant) {
    let context = SESSION.with_borrow(|shown| shown.as_ref()
        .filter(|auth| Arc::ptr_eq(&auth.sender, &sender)).map(|auth| (auth.session.clone(), auth._context.ivars().0.clone())));
    let Some((session, anchor)) = context else { return; };
    let ready = unsafe {
        let scene: Option<Retained<AnyObject>> = msg_send![&anchor, windowScene];
        let active = scene.is_some_and(|scene| { let state: isize = msg_send![&scene, activationState]; state == 0 });
        let can_start: bool = msg_send![&session, canStart];
        active && can_start
    };
    if ready {
        let success: bool = unsafe { msg_send![&session, start] };
        if !success {
            SESSION.with_borrow_mut(|shown| { shown.take(); });
            finish(&sender, Err("Cannot start authentication session".into()));
        }
        return;
    }
    if started.elapsed() >= std::time::Duration::from_secs(5) {
        SESSION.with_borrow_mut(|shown| { shown.take(); });
        finish(&sender, Err("Cannot start authentication session".into()));
    } else {
        let when = dispatch2::DispatchTime::try_from(std::time::Duration::from_millis(16)).expect("short interval");
        let _ = dispatch2::DispatchQueue::main().after(when, move || start_session(sender, started));
    }
}
fn parse_callback(callback: &str, redirect: &str, expected_state: &str) -> Answer {
    let (target, query) = callback.split_once('?').ok_or("oauth_no_code")?;
    if target != redirect { return Err("oauth_redirect_mismatch".into()); }
    let query = crate::parse_query(query);
    if query.get("state").map(String::as_str) != Some(expected_state) { return Err("oauth_state_mismatch".into()); }
    if let Some(error) = query.get("error") { return Err(format!("oauth_error:{error}")); }
    let code = query.get("code").filter(|s| !s.is_empty()).ok_or("oauth_no_code")?;
    Ok(OAuthResultDto { code: code.clone(), state: expected_state.to_owned(), redirect_uri: redirect.to_owned() })
}
