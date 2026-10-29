//! StoatMD Vault 核心（stub）。
//!
//! 下一 PR（Phase 2）实现：
//! - `open(root)` / `list` / `read` / `write` / `create` / `rename` / `delete`
//! - 路径规范化，禁止逃出 `root`
//! - 文件监视 → UI 冲突提示

/// 本地笔记库根（尚未接通选文件夹）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VaultRoot {
    path: String,
}

impl VaultRoot {
    /// 构造一个尚未打开的占位根路径。
    pub fn placeholder() -> Self {
        Self {
            path: String::new(),
        }
    }

    /// 是否已选择真实文件夹。
    pub fn is_open(&self) -> bool {
        !self.path.is_empty()
    }

    /// 库根路径（未打开时为空）。
    pub fn path(&self) -> &str {
        &self.path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_is_closed() {
        assert!(!VaultRoot::placeholder().is_open());
    }
}
