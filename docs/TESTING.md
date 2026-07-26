# 测试策略

## 分层

- **Unit test**：单个函数、schema、hook 或组件，隔离外部系统。
- **Integration test**：多个边界协作，例如 Worker 路由与 Protocol、Web 与受控 API。
- **End-to-end test**：真实浏览器中的关键用户流。
- **Smoke test**：构建产物、关键路由和健康契约的最小可运行验证。
- **Accessibility test**：自动规则扫描与键盘/焦点交互测试。
- **Security test**：输入校验、安全头、授权、资源限制和常见 Web 风险。
- **Property-based test**：未来用生成输入验证广泛不变量。
- **Deterministic replay test**：未来验证相同版本、输入与种子产生完全一致轨迹。

## Milestone 2 已完成

### Unit 与 integration

- Protocol：有效/缺字段/非法 status/非法 timestamp。
- Worker：200、共享 schema、Content-Type、安全响应头。
- UI：Button variant/loading、IconButton 名称、Status、Tabs 键盘、Dialog 打开/关闭/Escape/焦点返回、Tooltip focus、Toast 关闭、Theme 默认/持久化。
- Web：App Shell、首页与健康三态、Workspace、Components、Not Found、title、主题切换。

### Playwright E2E

`pnpm test:e2e` 覆盖：

- 首页与受控 healthy 响应
- Home → Workspace 导航
- 390px 移动 Inspector Dialog
- 主题切换与刷新后持久化
- Help Dialog 与 Escape
- Components
- 404 返回 Home
- 1440、390、360 宽度无水平溢出

健康请求由本地 route mock 控制，不访问互联网。

### Accessibility

`pnpm test:a11y` 对四个页面和打开 Dialog 状态运行完整 axe 扫描。测试不关闭严重规则；失败输出规则 ID、目标和摘要。

### Smoke

`pnpm test:smoke` 先执行完整 build，再验证：

- Home、Workspace、Components、Not Found 路由存在
- Worker 应用的 `/api/health` 响应通过共享 `HealthResponseSchema`

## 浏览器测试编排

`scripts/run-browser-tests.mjs` 只接受 `e2e`、`a11y`、`smoke` 白名单参数，直接启动本地 Vite、等待 `127.0.0.1:5173`、运行 Playwright 并关闭子进程。它不执行用户代码、不访问外部网络，也不启动真实 Cloudflare 资源。

## Artifact 策略

Playwright 仅在失败时保留 screenshot、trace 和 video。`test-results/`、`playwright-report/` 均被忽略；GitHub Actions 只在失败时上传诊断 artifact，保留 7 天。成功构建不上传大体积 artifact。

## 本地质量门禁

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:a11y
pnpm test:smoke
```

不得通过删除、跳过或弱化测试修复失败。Property-based、deterministic replay 仍属于对应后续 Milestone；Milestone 2 没有领域模型可供这些测试使用。
