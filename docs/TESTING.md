# 测试策略

## 测试类型

- **Unit test**：验证单个纯函数、schema、组件或引擎步骤，隔离外部系统。
- **Integration test**：验证多个边界协作，例如 Worker 路由与 Protocol，或 Web 与模拟 API。
- **End-to-end test**：在真实浏览器中验证用户主流程和前后端协作。
- **Smoke test**：用最小请求确认构建产物、页面和健康端点可启动。
- **Security test**：验证输入拒绝、安全头、授权、资源限制和常见 Web 风险。
- **Property-based test**：用生成输入验证广泛不变量，例如序列化往返和状态约束。
- **Deterministic replay test**：以固定版本、种子和输入验证重放轨迹及最终状态完全一致。

## Milestone 1 已完成

- Protocol unit tests：有效响应、缺字段、非法 status、非法 timestamp。
- Worker integration tests：200、共享 schema、JSON Content-Type、基础安全响应头。
- Web component tests：产品名称、三张能力卡、loading、healthy、unavailable。
- 静态保障：共享 TypeScript strict 配置、ESLint、Prettier、构建和 CI。

测试不依赖真实 Cloudflare 账户、互联网或 Secret。

## 后续计划

E2E、构建产物 smoke、安全输入矩阵、property-based 和 deterministic replay 将在相关正式 Milestone
出现真实功能边界后加入。Milestone 1 不创建没有被产品功能消费的占位测试。

## 本地门禁

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

不得通过删除、跳过或弱化测试来修复失败。
