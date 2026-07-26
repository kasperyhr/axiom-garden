# ADR 0004：独立 UI package 与语义 Design Token

- 状态：Accepted
- 日期：2026-07-26

## 背景

Milestone 2 需要让 Home、Workspace Shell 与 Components 共享一致的视觉、主题和无障碍行为，同时保持 Web、Worker、Protocol 与未来 Engine 的依赖边界。

## 决策

建立独立 `packages/ui`：

- 以 CSS Custom Properties 定义语义 token。
- 以 React peer dependency 提供无业务状态组件。
- Web 依赖 UI；UI 不依赖任何 app、Worker、Protocol 或领域模型。
- Radix UI 作为唯一 headless primitive 体系，负责 Tabs、Dialog、Tooltip、Popover、Dropdown 的成熟键盘和焦点行为。
- Lucide React 作为唯一通用图标源。
- Tailwind 只映射语义 token，不成为第二套设计事实源。

## 理由

- 单一 package 可让组件测试、主题和导出边界独立演进。
- 语义 token 允许 light/dark 重新设计，而不用修改组件实现。
- 复用成熟 headless primitive 降低 focus trap、Escape、方向键和 ARIA 的实现风险。
- 不引入完整视觉框架，保留 Axiom Garden 的原创视觉语言与较小决策面。

## 后果

正向：

- Web 页面不再复制基础交互和颜色。
- Components 路由可直接作为人工与自动验收面。
- 未来页面可复用稳定外壳，不需要依赖 Worker 或领域包。

代价：

- React 页面入口包含主题、菜单与 Dialog 所需的基础交互代码。
- UI package 需要保持严格的无业务边界和独立测试。
- 任何 token 变更都需要同时复核 light/dark、axe 与移动视口。
