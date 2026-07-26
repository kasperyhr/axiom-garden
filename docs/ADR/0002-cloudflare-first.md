# ADR 0002：采用 Cloudflare-first 架构

- 状态：Accepted
- 日期：2026-07-26

## 背景

未来产品需要低延迟 API、静态 Web 分发和逐步增加的受控后端能力，同时希望减少初期运维面。Milestone
1 只建立本地可运行边界，不创建云资源。

## 决策

后端入口优先采用 Cloudflare Workers 与 Web 标准 API，使用 Hono 提供轻量路由。平台能力未来只通过
明确 bindings 接入；核心领域和模拟逻辑不得依赖 Cloudflare runtime。

## 结果

Worker 可在本地用 Wrangler 开发，API 保持 Web 标准形态。平台耦合被限制在 `apps/worker`。Cloudflare
是交付与编排平台，不是领域模型或执行语义。正式部署、D1、KV、Durable Objects 等必须由后续明确
Milestone 决定。
