# 参与贡献

欢迎提交问题、文档改进与修复。开始较大的功能变更前，先在 issue 中说明使用场景和方案，便于确认产品范围。

## 开发与验证

环境安装和 OAuth 配置见 [docs/BUILDING.md](docs/BUILDING.md)。提交应用代码前执行：

```sh
nsh check
nsh test
```

Rust Vault 变更额外执行 `cargo test -p stoatmd-core`。iOS 界面变更使用可用模拟器执行相关原生测试，例如：

```sh
python3 scripts/ios.py test src/mobile/MobileShell.test.tsx
```

官网变更在 `website/` 执行 `npm ci`、`npm run check` 和 `npm run build`。修改 workflow 时执行 `actionlint`。Python 打包脚本测试通过 `python3 -m unittest discover -s scripts -p 'test_ios_packaging.py'` 执行。

## 提交要求

- 每个 PR 聚焦一个问题，写清触发条件、实际改动与验证结果；界面变更附截图。
- 界面优先使用 nsh / 系统提供的原生组件；自绘组件的理由和验证方式写在代码注释中。
- 界面文案与已有的 8 种语言保持一致；产品约束见 `docs/product/`。
- 新增或修改环境变量时，同步更新根目录 `.env.example`。
- 新增第三方代码、字体、图标或主题时，核对原许可并补充 `THIRD_PARTY_NOTICES.md`。
- 本机 OAuth 配置、访问令牌、签名私钥、描述文件与生成产物保存在 Git 忽略目录。

## 贡献许可与官方发行

本项目使用 [PolyForm Noncommercial 1.0.0](LICENSE)。项目的官方 iOS App Store 买断版为持续开发提供收入。

提交贡献时，请在 PR 描述中确认以下条款：

> 我有权提交本次贡献，并同意按本仓库的 PolyForm Noncommercial 1.0.0 许可向公众提供该贡献。同时，我授予 StoatMD 项目维护者永久、全球、非独占、免版税且不可撤销的许可，允许其为构建、运营和发行 StoatMD 官方版本而使用、修改、复制、分发本次贡献，并向官方分发所需的合作方授予相应许可，包括收费的 iOS App Store 版本。我保留自己贡献的版权。

涉及第三方代码时，请明确来源与授权；上述确认以你拥有的权利为限。维护者仅在贡献权利确认完整后合并。

个人与社区版本的使用范围继续遵循项目的非商业许可证。
