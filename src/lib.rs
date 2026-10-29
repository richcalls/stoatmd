//! StoatMD 原生桥：TSX 从 `stoatmd/native` 导入。
//! Vault 重活在 `crates/stoatmd-core`；本模块先保留最小占位。

use nsh_core::prelude::*;

/// 混合工程 UI 集（`nsh.json` `"rust": "."`）。
#[native_module("stoatmd/native")]
fn native(registry: &mut Registry) {
    registry.module::<StoatMeta>();
}

/// 构建期元信息（供冒烟与版本核对）。
#[module]
pub struct StoatMeta;

#[module]
impl StoatMeta {
    /// 产品名。
    pub fn product_name() -> String {
        "StoatMD".to_owned()
    }

    /// 一期目标平台说明。
    pub fn phase() -> String {
        "mac-phase-0-1".to_owned()
    }
}
