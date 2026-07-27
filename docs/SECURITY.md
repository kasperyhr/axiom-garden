# 安全设计

## 威胁模型初稿

当前攻击面只有静态 Web 构建、健康检查 Worker、依赖供应链和 CI。未来攻击面将扩展到用户提供的世界/
规则文档、账户、分享链接、搜索与协作。保护目标包括执行完整性、用户作品、身份、Secret、可用性和日志
隐私。

潜在威胁包括恶意超大输入、畸形 schema、资源耗尽、跨站脚本、依赖投毒、Secret 泄露、越权访问、
重放篡改以及利用 DSL 绕过限制。

## 任意代码执行禁令

未来 DSL 必须是封闭、版本化、白名单式 AST。禁止 `eval`、`Function`、动态模块加载、用户 JavaScript、
Wasm、shell、宏展开到宿主语言、任意 URL fetch 或系统调用。规则执行只允许文档明确列出的确定性操作，
并受步数、内存、深度和状态空间预算限制。

## 输入校验

- 所有网络、存储、文件和 URL 参数都视为不可信。
- 跨 Web/Worker 边界的结构由 `packages/protocol` 中的 Zod schema 校验。
- 不使用 TypeScript 类型断言代替运行时验证。
- 未来格式必须包含显式版本并有大小、范围、枚举和关联约束。

### World Document v1

- `parseWorldJson` 在 `JSON.parse` 前用 `TextEncoder` 检查 UTF-8 字节数，默认上限为 2 MiB；不以 JavaScript 字符数代替。
- JSON 根必须为 object，所有 v1 object 使用 strict unknown-key 策略。
- 未知未来版本安全拒绝，绝不静默降级；不存在 v0 migration。
- 标识符、集合数、字符串、属性数和一维数组均有显式上限。
- Domain properties 只允许 string、finite number、boolean、null 或这些标量的一维数组；对象、嵌套数组、Date、Map、Set、函数和非有限数值均拒绝。
- `__proto__`、`prototype`、`constructor` 在 schema 前原始 key 检查与 schema key 白名单两层拒绝，测试确认 `Object.prototype` 不受污染。
- schema validation 后继续检查 ID 唯一、引用存在、坐标范围、时间顺序、layer order 与 sparse cell 唯一性。
- issue 只包含稳定 code、结构化 path、通用英文 message 和受限 details，不回显完整输入或 stack trace。

World Format Lab 只接收粘贴到 textarea 的 JSON 文本；不使用 `eval`、`Function`、动态用户路径 import、`dangerouslySetInnerHTML`、URL/CSS 注入、文件上传、网络请求、localStorage world 或 IndexedDB。

### Engine v1

- TransitionPlan 是 strict runtime-validated 的纯数据；拒绝 callback、function、循环引用、class instance、源码字符串和自定义 executable handler。
- 每个 plan 最多 4096 operations；run 最多 10000 steps；tick 最大 1000000。Engine entity/cell 上限分别为 4096/2048，不超过 Domain 上限。
- 所有 operation 在临时状态中按数组顺序预演。任一失败则拒绝整份 plan，原状态、tick 和 digest 不变。
- snapshot restore 会重新验证 SimulationState，并比较已记录 digest；不匹配返回结构化 issue。
- `ag1:` digest 是 FNV-1a 64-bit 一致性标识，不是密码学哈希、签名、MAC 或认证凭据。
- Canonical state 不保存 Map/Set；derived index 可从 canonical arrays 重建，不进入 digest。
- Engine 不读取系统时间、随机数、网络、文件、环境变量、DOM 或持久化存储。
- Engine Playground 只使用内置 world 和内置 transition data；不接受 operation、代码或文件输入。

## 依赖风险

### Renderer v1 资源与内容边界

- Renderer 只读取已经验证的 World/SimulationState 正式字段；未经信任的 tags 和 properties 仅进入转义后的文本 Inspector，不驱动颜色、图标、URL、CSS 或绘制分支。
- 不加载外部图片、任意 SVG、远程字体、第三方脚本或网络资源；Canvas 只绘制内置有限 shape、variant 与 domain color token。
- 网格最大 256×256，entity/cell 数量沿用 Domain/Engine 上限；绘制裁剪到可视范围，网格线在低缩放下降密度。
- DPR 上限为 3，并以 16,777,216 backing-store pixels 为硬资源预算；极端设备参数会安全缩减实际 backing scale。
- zoom、尺寸和 pointer 坐标都做有限数值处理；pointer capture 只作用于 Viewer Canvas，取消时清理，不全局阻止页面滚动。
- hit testing 使用坐标桶与可见图层过滤，不执行 properties、不扫描网络、不创建持久状态。
- Renderer 的 `rs1:` scene key 用于确定性缓存与测试，不是密码学完整性证明。

- 使用固定版本和提交的 `pnpm-lock.yaml`。
- CI 使用 frozen lockfile。
- 新依赖需说明用途、维护状态、许可证和替代方案。
- 定期执行依赖审计，但不以自动升级替代兼容性验证。

## Secret 管理

仓库禁止提交 API Key、Token、`.env`、`.dev.vars` 或凭据。未来 Cloudflare Secret 只通过平台 Secret
机制提供，GitHub Actions 只授予任务所需最小权限。Milestone 1 不需要任何 Secret。

## 日志脱敏

不得记录 Token、认证头、完整用户内容、敏感查询参数或 Secret。未来采用结构化日志、字段白名单、请求
关联 ID 和保留周期。错误响应不得回显内部堆栈。

## 速率限制规划

Milestone 1 不创建限速资源。任何未来公开写端点、求解或生成任务都必须在发布前定义按身份/IP/资源的
速率与并发预算、排队策略、超时和安全失败方式。

## CSP 规划

当前页面无外部图片、脚本、字体或分析服务。正式部署前将设置严格 CSP，优先 `default-src 'self'`，
逐项开放必要来源；避免 `unsafe-eval`，并评估 nonce/hash 方案。Worker 当前设置基础安全响应头。

本地 Wrangler 命令显式禁用匿名使用指标和自动错误报告；产品本身不包含遥测。

## 用户生成内容规划

World Document v1 已完成 schema、大小、结构和引用验证。自然语言 title、description、tags 的内容安全仍由未来更高层负责；Domain 不做语言审核。未来作品还需要报告/下架流程、版本审计和分享权限。
用户内容不得变成可执行 HTML/JS，也不得触发任意第三方网络请求。

## 漏洞报告流程

不要在公开 issue 中披露未修复漏洞。使用 GitHub Security 的私密漏洞报告；不可用时联系仓库所有者。
报告应包含影响、最小复现、受影响版本和建议缓解。维护者确认后协调修复与披露。
