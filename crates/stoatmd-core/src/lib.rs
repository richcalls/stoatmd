//! StoatMD Vault 核心：本地库读写、路径沙箱。
//!
//! 监视与系统选文件夹在 `nsh-app-stoatmd` 原生桥中接通。

mod vault;

pub use vault::{Vault, VaultEntry, VaultError, VaultFile, now_ms};
