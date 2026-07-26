# ADR 0005：strict、versioned、canonical JSON 世界文件

- 状态：Accepted
- 日期：2026-07-26

## 背景

世界文件未来会被 Web、Worker 和确定性 Engine 共同读取，也需要支持重放、迁移、差异比较与长期保存。宽松解析、隐式默认或依赖集合输入顺序会让同一语义产生不同字节，并掩盖拼写错误和坏引用。

## 决策

World Document 使用普通 UTF-8 JSON，固定根标识 `axiom-garden/world` 与整数 `schemaVersion`。v1 的所有对象采用 strict unknown-key 策略；Zod 是运行时模型与 JSON Schema 的单一来源，生成文件由 drift test 锁定。跨字段引用由独立 semantic validation 处理。

验证成功后只进行无争议规范化，再按显式字段和集合顺序输出 two-space JSON，并保留一个 LF。未知未来版本拒绝处理，不静默降级；不存在的 v0 不编造迁移。

## 结果

优点是输入错误可见、结果字节稳定、边界可审计，未来 migration 有明确入口。代价是新增字段需要有意识地判断兼容性与版本升级，手写 JSON 的未知字段不会被忽略。package SemVer 与 document `schemaVersion` 保持独立。

JSON Schema 生成使用 Zod 4 自带 `toJSONSchema`，避免增加第二套 schema 工具和模型。无法由 JSON Schema 表达的引用、时间顺序与稀疏记录唯一性由 Domain semantic validation 保证，并在格式文档中明确。
