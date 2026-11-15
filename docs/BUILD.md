# VideoFlow 构建与验证

## GitHub Actions（优先）

进入 https://github.com/fanlaoshi027/mosuan-videoflow/actions

1. 在左侧选择 **CI**。
2. 选择 **Run workflow**，分支选 `main`。
3. 等待 `frontend`、`desktop (windows-latest)` 和 `desktop (macos-latest)` 任务完成。
4. 如有失败，展开失败步骤并查看错误日志。**不要将提交成功误认为构建成功**。
5. 仅当桌面任务成功且确实上传文件后，在对应运行页面的 **Artifacts** 下载 ZIP。

## 本地开发

- Node.js 20 或更高
- Rust stable（含 cargo）
- Windows：WebView2 / C++ Build Tools；macOS：Xcode Command Line Tools

```bash
npm install
npm test
npm run build
npm run tauri icon assets/icon.svg
npm run tauri dev
```

## 安全说明

目前只支持 CSV 导入、SQLite 目录保存、只读单层文件扫描和重命名预览；没有执行重命名的功能。测试时仍建议使用课程素材副本。当前没有任何已验证可用的正式安装包。

## 已知构建限制

- 尚未提交 package-lock.json，CI 临时使用 npm install；后续应锁定依赖版本。
- macOS 安装包未签名、未公证；测试机可能需要额外允许启动。
- GitHub Actions 权限或仓库设置可能影响工作流运行，须以实际运行日志为准。
