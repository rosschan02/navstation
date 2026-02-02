# API Key 对接功能实现计划

## 概述

为 NavStation 添加 API Key 认证机制，允许外部系统通过 API 调用来增加站点、读取统计数据等功能。

## 功能需求

### 核心功能

1. **API Key 管理**
   - 生成新的 API Key
   - 查看已有 Key 列表（Key 只在创建时显示一次）
   - 删除/禁用 Key
   - 为 Key 设置名称和备注（标识用途）

2. **权限控制**
   - `read` - 只读权限（读取站点列表、统计数据）
   - `write` - 读写权限（包含只读 + 增删改站点、软件等）

3. **API 认证**
   - 支持 Header 认证：`X-API-Key: nav_sk_xxxx`
   - 支持 Bearer Token：`Authorization: Bearer nav_sk_xxxx`

4. **安全措施**
   - API Key 哈希存储（只存储哈希值，原始 Key 不可恢复）
   - 记录最后使用时间
   - 可选：速率限制

---

## 数据库设计

### 新增表：`api_keys`

```sql
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- Key 名称（如：OA系统对接）
    key_prefix VARCHAR(10) NOT NULL,         -- Key 前缀用于识别（如：nav_sk_abc）
    key_hash VARCHAR(255) NOT NULL,          -- Key 的 SHA256 哈希值
    permissions VARCHAR(20) DEFAULT 'read',  -- 权限：read / write
    description TEXT DEFAULT '',             -- 备注说明
    is_active BOOLEAN DEFAULT true,          -- 是否启用
    last_used_at TIMESTAMP WITH TIME ZONE,   -- 最后使用时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
```

### Key 格式

```
nav_sk_[随机32位字符]

示例：nav_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

- `nav_` - 项目标识
- `sk_` - secret key 标识
- 后面是 32 位随机字符串

---

## API 接口设计

### 1. API Key 管理接口（需管理员登录）

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/keys` | GET | 获取 API Key 列表 |
| `POST /api/keys` | POST | 创建新 API Key（返回完整 Key，仅此一次） |
| `DELETE /api/keys/:id` | DELETE | 删除 API Key |
| `PUT /api/keys/:id` | PUT | 更新 Key 信息（名称、权限、启用状态） |

#### 创建 Key 请求

```json
POST /api/keys
{
  "name": "OA系统对接",
  "permissions": "write",
  "description": "用于OA系统自动同步站点"
}
```

#### 创建 Key 响应

```json
{
  "id": 1,
  "name": "OA系统对接",
  "key": "nav_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",  // 仅创建时返回
  "permissions": "write",
  "created_at": "2026-02-02T10:00:00Z",
  "message": "请保存此 Key，它不会再次显示"
}
```

#### Key 列表响应

```json
[
  {
    "id": 1,
    "name": "OA系统对接",
    "key_prefix": "nav_sk_a1b",  // 只显示前缀
    "permissions": "write",
    "is_active": true,
    "last_used_at": "2026-02-02T12:30:00Z",
    "created_at": "2026-02-02T10:00:00Z"
  }
]
```

### 2. 外部系统调用接口

使用现有的 API 接口，增加 API Key 认证支持：

| 接口 | 所需权限 | 说明 |
|------|---------|------|
| `GET /api/sites` | read | 获取站点列表 |
| `POST /api/sites` | write | 创建站点 |
| `PUT /api/sites/:id` | write | 更新站点 |
| `DELETE /api/sites/:id` | write | 删除站点 |
| `GET /api/analytics` | read | 获取统计数据 |
| `GET /api/categories` | read | 获取分类列表 |
| `GET /api/software` | read | 获取软件列表 |

#### 调用示例

```bash
# 使用 X-API-Key Header
curl -H "X-API-Key: nav_sk_xxxx" \
     https://your-domain/api/sites

# 使用 Authorization Header
curl -H "Authorization: Bearer nav_sk_xxxx" \
     https://your-domain/api/sites

# 创建站点
curl -X POST \
     -H "X-API-Key: nav_sk_xxxx" \
     -H "Content-Type: application/json" \
     -d '{"name":"新站点","url":"https://example.com","category_id":1}' \
     https://your-domain/api/sites
```

---

## 文件结构

```
src/
├── app/
│   ├── admin/
│   │   └── keys/                          # API Key 管理页面
│   │       ├── page.tsx                   # 服务端组件
│   │       └── KeysClient.tsx             # 客户端组件
│   └── api/
│       └── keys/                          # API Key 管理接口
│           ├── route.ts                   # GET(列表) / POST(创建)
│           └── [id]/
│               └── route.ts               # PUT(更新) / DELETE(删除)
├── lib/
│   └── apiAuth.ts                         # API Key 验证工具函数
└── db/
    └── migrations/
        └── 005_add_api_keys.sql           # 数据库迁移脚本
```

---

## 实现步骤

### 第一阶段：数据库和基础 API

- [ ] 1. 创建数据库迁移脚本 `005_add_api_keys.sql`
- [ ] 2. 更新 `schema.sql` 添加 `api_keys` 表
- [ ] 3. 创建 API Key 验证工具函数 `src/lib/apiAuth.ts`
- [ ] 4. 创建 Key 管理 API `/api/keys`

### 第二阶段：管理界面

- [ ] 5. 创建 Key 管理页面 `/admin/keys`
- [ ] 6. 侧边栏添加「API 管理」菜单入口
- [ ] 7. 实现创建 Key 弹窗（显示完整 Key，提示保存）
- [ ] 8. 实现 Key 列表（显示前缀、权限、最后使用时间）

### 第三阶段：API 认证集成

- [ ] 9. 修改现有 API 路由，支持 API Key 认证
- [ ] 10. 区分认证方式：Cookie（管理员）/ API Key（外部系统）
- [ ] 11. 根据权限控制 read/write 操作

### 第四阶段：文档和测试

- [ ] 12. 更新 README.md 添加 API 对接说明
- [ ] 13. 更新 CHANGELOG.md
- [ ] 14. 测试各种场景（有效 Key、无效 Key、权限不足等）

---

## 认证逻辑流程图

```
请求进入 API 路由
        │
        ▼
┌───────────────────┐
│ 检查 X-API-Key 或  │
│ Authorization     │
└────────┬──────────┘
         │
    有 API Key?
    ┌────┴────┐
    │ Yes     │ No
    ▼         ▼
验证 Key    检查 Cookie
    │            │
    ▼            ▼
┌────────┐  ┌────────┐
│Key有效? │  │已登录?  │
└────┬───┘  └────┬───┘
     │           │
 Yes │ No    Yes │ No
     ▼    ▼      ▼    ▼
 检查权限  401   允许   401
     │
     ▼
┌──────────┐
│权限足够?  │
└────┬─────┘
     │
 Yes │ No
     ▼    ▼
  允许   403
```

---

## API 响应格式

### 成功响应

```json
{
  "data": { ... },
  "success": true
}
```

### 错误响应

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

### 错误码

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 401 | `UNAUTHORIZED` | 未提供认证信息 |
| 401 | `INVALID_API_KEY` | API Key 无效或已禁用 |
| 403 | `PERMISSION_DENIED` | 权限不足（如 read 权限调用 write 接口） |
| 429 | `RATE_LIMITED` | 请求过于频繁（可选） |

---

## 安全考虑

1. **Key 哈希存储**：数据库只存储 SHA256 哈希值，即使数据库泄露也无法还原 Key

2. **Key 只显示一次**：创建时返回完整 Key，之后只能看到前缀

3. **HTTPS 强制**：生产环境必须使用 HTTPS，防止 Key 在传输中泄露

4. **日志脱敏**：日志中不记录完整的 API Key

5. **权限最小化**：建议外部系统使用最小必要权限的 Key

---

## 后续扩展（可选）

- [ ] 速率限制（每分钟/每小时请求次数限制）
- [ ] IP 白名单（限制 Key 只能从特定 IP 使用）
- [ ] Key 过期时间
- [ ] 操作审计日志（记录谁在什么时候做了什么操作）
- [ ] Webhook 支持（站点变更时主动通知外部系统）
