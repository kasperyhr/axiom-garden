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

## Milestone 4 已完成

### Unit 与 integration

- Protocol：有效/缺字段/非法 status/非法 timestamp。
- Worker：200、共享 schema、Content-Type、安全响应头。
- UI：Button variant/loading、IconButton 名称、Status、Tabs 键盘、Dialog 打开/关闭/Escape/焦点返回、Tooltip focus、Toast 关闭、Theme 默认/持久化。
- Web：App Shell、首页与健康三态、Workspace、Components、Not Found、title、主题切换。
- Domain schema：最小/代表性文档、strict key、enum、网格、ID、datetime、orientation、properties。
- Domain semantic：ID/order/coordinate/cell 唯一性、引用、时间、空 sparse cell、数量限制。
- Domain serialization/migration：字段和集合顺序、LF、round trip、版本识别与无虚构 v0。
- Domain security：UTF-8 byte 上限、dangerous key 与 prototype pollution。
- World Format Lab：默认有效、syntax issue、reset、canonical output 与 clipboard。
- Engine initial state：tick 0、防御性复制、canonical ordering、无效 world 与 selectors。
- Engine transition：六类 operation、顺序 staged semantics、空 no-op、原子失败、tick/operation/entity/cell 限制。
- Engine snapshot/digest：create/restore、tamper、clone、comparison、JSON round trip 与 golden vectors。
- Engine Playground：step、demonstration transition、run 10、reset、snapshot restore 与 tamper issue。

### Property-based 与 schema drift

`fast-check` 使用有限规模生成器验证 coordinate key 稳定、tags/properties normalization 幂等、canonical serialization 幂等，以及 validate/serialize 不修改输入。测试不生成无界文档。

Engine property tests 验证 state canonicalization、clone、snapshot round-trip、no-op stepping、atomic failure 与 selectors 的不变性。Determinism tests 固定相同 world、Engine、plan sequence 必须产生相同 state、receipt、issue order、digest 和 final state。

JSON Schema 由 Zod 4 单一来源生成；`schema-drift.test.ts` 将生成结果与已提交 schema 逐字节比较。Representative fixture 同时参与 runtime schema、semantic validation、canonical round-trip 和 smoke。

### Playwright E2E

`pnpm test:e2e` 覆盖：

- 首页与受控 healthy 响应
- Home → Workspace 导航
- 390px 移动 Inspector Dialog
- 主题切换与刷新后持久化
- Help Dialog 与 Escape
- Components
- World Format Lab：valid、invalid syntax、out-of-bounds、reset、canonical clipboard
- Engine Playground：no-op、run 10、demonstration transition、reset、snapshot restore、tamper rejection、Workspace 入口
- 404 返回 Home
- 1440、390、360 宽度无水平溢出

健康请求由本地 route mock 控制，不访问互联网。

### Accessibility

`pnpm test:a11y` 对 Home、Workspace、Components、World Format Lab、Engine Playground、Not Found、打开 Dialog、Engine receipt 和 Engine issue 状态运行完整 axe 扫描。测试不关闭严重规则；失败输出规则 ID、目标和摘要。

### Smoke

`pnpm test:smoke` 先执行完整 build，再验证：

- Home、Workspace、Components、Not Found 路由存在
- Worker 应用的 `/api/health` 响应通过共享 `HealthResponseSchema`
- World Format 路由存在、representative world 通过、未来版本被拒绝、canonical round-trip 稳定
- Engine 可导入、initial state/digest 稳定、no-op tick、atomic failure 与 snapshot round-trip

## Engine 性能策略

`pnpm benchmark:engine` 使用宽松 30 秒安全预算完成 representative initial state、100 个 no-op ticks、约 1000 个顺序 operation 和 digest。它用于发现意外指数复杂度，不作为默认 CI 的短毫秒性能断言；CI 始终执行全部 Engine correctness 与 determinism tests。

## Milestone 5 Renderer 覆盖

- Unit：World/SimulationState scene、canonical ordering、隐藏图层、五种 shape、orientation、同格布局、简化 glyph、输入不可变。
- Viewport/property：坐标 round-trip、zoom anchor、pinch、pan、fit、clamp、visible bounds、DPR 预算、重复命中与 scene determinism。
- Drawing/hit：命令顺序、可视裁剪、网格密度、light/dark、selection overlay，以及 entity/cell/empty、图层优先级和坐标桶。
- Web/E2E：Viewer toolbar、Inspector、layer override、mouse pan/wheel、键盘、初始/演示状态、主题、Workspace 入口和 390px 水平溢出。
- Axe：Viewer 初始、Entity selection、移动端 Inspector 与 dark theme，不关闭严重规则。
- Smoke：Renderer 导入、World/Engine scene、transform、hit test、hidden layer、draw command determinism 与 `/viewer` 路由。

`pnpm benchmark:renderer` 以宽松 30 秒预算覆盖 scene creation、fit-to-view、1000 次坐标转换、1000 次 hit test、draw command generation，以及 4000 entities 的最小 Canvas context 绘制。它不进入 CI 硬时序门禁；CI 的 `pnpm test` 始终执行 Renderer correctness、property 与 determinism tests。

视觉回归以确定性 draw-command、shape geometry、overlay 与 theme tests 作为稳定主门禁。Canvas 跨平台字体栅格化和抗锯齿会使整图 pixel snapshot 易抖动，因此本 Milestone 不提交截图基线；固定 viewport/DPR 的本地 Playwright 截图用于人工验收，失败诊断仍自动保留。

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
pnpm test:domain
pnpm test:engine
pnpm benchmark:engine
pnpm test:renderer
pnpm benchmark:renderer
pnpm schema:check
pnpm build
pnpm test:e2e
pnpm test:a11y
pnpm test:smoke
```

不得通过删除、跳过或弱化测试修复失败。Milestone 4 只验证相同输入与 plan sequence 的确定性执行，不保存完整 replay 历史；完整重放属于 Milestone 14。
