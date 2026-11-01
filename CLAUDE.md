# StoatMD 项目约定

## 界面：能用官方组件就用官方组件

**凡是能用框架/系统提供的官方组件的，就用官方组件，不要自己手绘复刻，除非有明确的特殊情况。**

nsh 里对应的系统件：

| 平台 | 官方组件 | 用途 |
|------|----------|------|
| iOS | `nsh/mobile` 的 `TabBar` | UITabBar；iOS 26 自动是悬浮 Liquid Glass 胶囊；图标传 SF Symbol 名（`"clock"` / `"folder"` / `"star"`） |
| iOS | `NavStack` / `NavPage` | UINavigationController；`headerRightSystemItem` 交给 UIKit 画栏按钮 |
| iOS | `Dialog` | 原生模态 |
| 桌面 | `nsh/desktop` 的 `Window` / `titleBar()` / `Menu` | 窗口、红绿灯区域与高度、系统菜单栏与右键菜单 |

组件清单以 `.nsh/types/nsh/*.d.ts` 的注释为准，改界面前先翻一遍——里面会写清哪些是系统件、哪些是自绘。

**确实必须自绘时**，代码注释要写清三件事：官方组件为什么不行、怎么验证的（截图 / 测试 / nsh 版本）。不要拿未经验证的结论当理由——iOS 标签栏曾经因为一句"UITabBar 会铺全宽材质"被手绘了四轮，后来实测那条理由是错的。

## 验证

- 提交前：`nsh check` + `nsh test`
- iOS 视觉改动：用项目工具链跑截图测试
  ```bash
  PATH="$PWD/.nsh/toolchain/cargo/bin:$PATH" RUSTUP_HOME="$PWD/.nsh/toolchain/rustup" \
    nsh test --target ios src/mobile/Screenshot.test.tsx
  ```
  截图产物在 `screenshots/ios-raw/`（gitignored）。开发宿主的图片资源会 403，图标缺失不代表打包版有问题。
- iOS 发版：`scripts/ios_release.py` 打包，再用 `asc builds upload` 上传 TestFlight。
