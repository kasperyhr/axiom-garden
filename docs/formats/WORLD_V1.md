# Axiom Garden World Document v1

## 格式目的

World Document v1 是 Axiom Garden 抽象世界的可移植、可验证静态描述。文件是普通 UTF-8 JSON，根标识为 `axiom-garden/world`，整数 `schemaVersion` 为 `1`。package SemVer 与文档 schema version 独立。v1 不包含 Rule、Condition、Action、DSL、AST、simulation state 或执行顺序。

正式 JSON Schema 采用 Draft 2020-12：[`axiom-garden-world-v1.schema.json`](../../packages/domain/schema/axiom-garden-world-v1.schema.json)。

## 根字段

Canonical 根字段顺序为 `format`、`schemaVersion`、`id`、`metadata`、`grid`、`palette`、`layers`、`cells`、`entities`。根与所有嵌套 object 都是 strict；未知字段不会被丢弃。

## ID

`WorldId`、`SymbolId`、`LayerId`、`CellRecordId`、`EntityId` 在 JSON 中均为 string，在 TypeScript 中为 branded type。分别使用 `world:`、`symbol:`、`layer:`、`cell:`、`entity:` namespace，后接小写 URL-friendly local name；不允许空格、控制字符、HTML、斜杠、路径穿越或连续点。最长 128 字符，解析绝不生成 ID。

## Metadata

- `title`：trim 后非空，最长 120。
- `description`：可为空，最长 2,000。
- `createdAt`、`updatedAt`：带三位毫秒和 `Z` 的 ISO 8601 UTC datetime；`updatedAt >= createdAt`。
- `tags`：最多 32 项，每项 trim 后非空、最长 48。

Tag 去重区分大小写；`alpha` 与 `Alpha` 不等价。Normalization 会 trim、按精确字符串去重，再以明确 code-point 比较稳定排序。Domain 不对自然语言做内容审核；内容安全由更高层负责。

## Grid 与 Coordinate

v1 固定为 `kind: "square"`、`origin: "top-left"`、`boundary: "bounded"`。整数 width/height 范围为 1–256。Coordinate 仅含非负整数 x/y；原点在左上，x 向右、y 向下，且必须在网格内。不支持 z、浮点、wrap、infinite 或 hex。

纯函数 `isCoordinateInBounds`、`coordinateKey`、`compareCoordinates` 提供稳定操作，调用方无需手拼 key。

## Palette 与 Symbol Definition

Palette 最多 128 个 Symbol。每项含 id、name、shape、appearance、defaultProperties。

- shape：`circle | square | triangle | diamond | hexagon`
- fill/stroke：`moss | clay | brass | graphite | paper | blue | amber`
- variant：`solid | outline | ring | dot`

Domain 色板描述世界内容，不依赖 UI CSS token。不允许任意 CSS、SVG、HTML、URL、图片、渐变或脚本。

## Layer

文档必须有 1–32 个 layer。每项含 id、name、唯一整数 order、显式 boolean visible/locked。locked 只是文档状态，不是权限。重复 order 是 validation error，不会被偷偷修复。不同 layer 可在同一坐标有实体；同一 layer 同一坐标也允许多个实体。

## Sparse Cell Record

空白单元格不存储。CellRecord 含 id、layerId、coordinate、tags、properties。tags 与 properties 不得同时为空；layer 引用和坐标必须有效。同一 layer + coordinate 最多一个 record。

Cell record 不预定义 goal、blocked、terrain 等业务含义，也不限制 Entity 数量。

## Entity Instance

Entity 含唯一 id、有效 symbolId/layerId、范围内 coordinate、`orientation: 0 | 90 | 180 | 270` 与 properties。实体属性不会在 parse 阶段展开；`resolveEntityProperties` 显式返回 default properties 被 entity properties 覆盖后的稳定结果。v1 不定义碰撞、移动、速度或执行状态。

## Domain Properties

Property key 以字母开头，只允许字母、数字、点、下划线、连字符，最长 64；`__proto__`、`prototype`、`constructor` 被拒绝。

Value 只允许最长 512 的 string、finite number、boolean、null，或这些标量组成的最长 64 项一维数组。不允许 object、nested array、undefined、NaN、Infinity、bigint、symbol、function、Date、Map、Set 或 class instance。每个 record 最多 32 个属性。

## Limits

| 限制                  |        值 |
| --------------------- | --------: |
| Grid width / height   | 256 / 256 |
| Symbols               |       128 |
| Layers                |        32 |
| Sparse cell records   |     8,192 |
| Entities              |    16,384 |
| Properties per record |        32 |
| Property array items  |        64 |
| Tags per list         |        32 |
| JSON UTF-8 bytes      |     2 MiB |

2 MiB 适合浏览器内粘贴验证，同时限制内存与未来求解输入规模。`parseWorldJson` 在 `JSON.parse` 前检查 UTF-8 bytes；不处理 ZIP、压缩或二进制。

## Validation

1. Syntax：UTF-8 byte size、JSON syntax、object root。
2. Version：format、缺失/非法/未来/不存在的旧 version。
3. Schema：类型、必填、enum、范围、数量、strict unknown keys。
4. Semantic：唯一 ID/order、引用、坐标、时间、cell 唯一性与非空。
5. Normalization：仅 trim title/tags、tag 去重排序、property key 与集合稳定排序。

用户输入错误返回 `ValidationResult<T>` 与 `DomainIssue[]`。Issue 含稳定 code、severity、结构化 path、英文 message 及可选受限 details；不会回显完整文档或 stack trace。

Normalization 不会修坐标、删除未知字段/坏引用、改 ID、移动实体或生成 layer/time/ID。

## Canonical ordering

- symbols 按 id。
- layers 按 order，再按 id。
- cells/entities 按 layer order、y、x、id。
- tags 与 property keys 用不依赖 locale 的 code-point 比较。
- two-space indentation；行尾固定 LF；文件末尾恰好一个 LF。

等价集合顺序产生相同字节，`serialize(parse(serialize(world)))` 稳定；API 不修改调用方输入。

## Examples

- [`minimal-valid-world-v1.json`](../../packages/domain/test/fixtures/minimal-valid-world-v1.json)
- [`representative-valid-world-v1.json`](../../packages/domain/test/fixtures/representative-valid-world-v1.json)
- `/world-format` 可修改、验证并复制 canonical JSON。

Representative fixture 只含抽象几何对象，是格式样本，不是谜题。

## Version policy 与 forward compatibility

`CURRENT_WORLD_SCHEMA_VERSION = 1`。新增字段需结合 strict reader 判断兼容性；改变必填字段、语义、约束或 canonical form 的变化必须增加整数 schemaVersion 并提供显式 migration。

`getWorldDocumentVersion` 区分非文档、缺失、非法、v1、未来未知和不存在的旧版本。`migrateWorldDocument` 目前只验证/规范化 v1；future version 拒绝，v0 不存在且不编造。绝不静默降级。

## Security considerations

世界 JSON 始终不可信。禁止 eval、Function、动态用户路径 import、任意 HTML/SVG/CSS/URL、远程资源和代码执行。原始 property key 在 schema 前检查以防 prototype pollution，解析后仍执行 strict schema 与 semantic checks。

World Format Lab 不上传、不访问网络、不保存到 localStorage/IndexedDB、不读取文件，也不渲染网格或执行模拟。
