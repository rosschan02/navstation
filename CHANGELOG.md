# Changelog

本文件记录 NavStation 导航站的所有重要更新。

## [2.9.2] - 2026-02-14

### 新增

#### 统一确认弹窗（ConfirmDialog）
- 新增 `src/components/ConfirmDialog.tsx`，用于替换后台管理页的原生 `confirm()` 删除确认
- DNS 管理、站点管理、软件管理、电话本管理统一接入同一删除确认交互

### 变更

#### DNS 管理页面交互优化
- `新增 Zone` 从页面常驻表单改为弹窗填写
- `新增记录` 入口下沉到 Zone 列表行内图标按钮，点击后弹窗添加并默认绑定当前 Zone
- `新增转发区域` 从页面常驻表单改为弹窗填写

#### 全局消息提示体验
- `MessageContext` 消息提示改为页面居中弹出，统一后台操作反馈位置

### 修改文件

```
src/app/admin/dns/DnsClient.tsx
src/app/admin/AdminClient.tsx
src/app/admin/software/SoftwareAdminClient.tsx
src/app/admin/phonebook/PhonebookClient.tsx
src/contexts/MessageContext.tsx
src/components/ConfirmDialog.tsx
README.md
```

---

## [2.9.1] - 2026-02-14

### 新增

#### 全局消息提醒（Message/Toast）
- 新增 `src/contexts/MessageContext.tsx`，提供全局可复用的 `success/error/info/warning` 消息能力
- 在 `AppShell` 注入 `MessageProvider`，后台管理页面统一使用全局消息提醒
- 替换后台管理中的原生 `alert` 提示，覆盖站点、分类、软件、电话本、API 密钥、DNS、设置、账号等操作反馈

### 修复

#### DNS 记录创建后误报失败
- 修复 `dns_records` 同步状态更新 SQL 的参数类型推断冲突（`42P08`）
- 解决“接口返回 500 但刷新后记录已存在”的问题

#### Docker 环境 BIND9 联动
- 运行镜像增加 `bind-tools`，内置 `nsupdate`，避免 `spawn nsupdate ENOENT`

---

## [2.9.0] - 2026-02-13

### 新增

#### DNS 转发区域（Forward Zone）
- DNS 管理页面新增「转发区域」板块，支持 BIND9 条件转发（Conditional Forwarding）
- 支持转发区域的增删改查，每次操作自动生成配置并重启 BIND9
- 支持 `forward only`（仅转发）和 `forward first`（优先转发，失败回退）两种策略
- 转发 DNS 地址支持多个 IP（逗号或换行分隔）
- 每条转发区域显示同步状态（pending/success/failed/skipped）
- 统计卡片新增「转发区域」计数

#### DNS 转发区域 API
- 新增 `GET /api/dns/forward-zones` — 获取转发区域列表
- 新增 `POST /api/dns/forward-zones` — 新增转发区域
- 新增 `PUT /api/dns/forward-zones/:id` — 更新转发区域
- 新增 `DELETE /api/dns/forward-zones/:id` — 删除转发区域

### 变更

#### BIND9 转发配置同步
- 新增 `src/lib/dns/bind9-forward.ts`，负责生成 `named.conf.forward` 配置文件并重启 BIND9
- 增删改转发区域后自动全量重新生成配置并重启服务
- 支持 `BIND9_DRY_RUN=1` 模式跳过文件写入和服务重启
- 配置文件路径通过 `BIND9_FORWARD_CONF` 环境变量指定（默认 `/etc/bind/named.conf.forward`）
- 重启命令通过 `BIND9_RESTART_CMD` 环境变量覆盖（默认 `systemctl restart named`）

#### 数据库与类型
- 新增 `dns_forward_zones` 表
- 新增 `DnsForwardZone` TypeScript 类型

### 新增文件

```
src/db/migrations/009_add_dns_forward_zones.sql
src/lib/dns/bind9-forward.ts
src/app/api/dns/forward-zones/route.ts
src/app/api/dns/forward-zones/[id]/route.ts
```

### 修改文件

```
src/db/schema.sql
src/types/index.ts
src/app/admin/dns/page.tsx
src/app/admin/dns/DnsClient.tsx
README.md
```

### 升级指南

如果从 2.8.0 升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/009_add_dns_forward_zones.sql
```

用户还需要在 BIND9 的 `named.conf` 中添加：
```
include "/etc/bind/named.conf.forward";
```

---

## [2.8.0] - 2026-02-12

### 新增

#### DNS 管理 MVP（BIND9）
- 工作区新增「DNS 管理」菜单与页面（`/admin/dns`）
- 支持 Zone 管理：新增、编辑、启停、删除（删除前校验是否存在记录）
- 支持记录管理：新增、启停、删除，覆盖 `A` / `AAAA` / `CNAME` / `TXT` / `MX`
- 支持 DNS 变更日志列表（最近 100 条，支持按 Zone 过滤）

#### DNS API
- 新增 `GET/POST /api/dns/zones`
- 新增 `PUT/DELETE /api/dns/zones/:id`
- 新增 `GET/POST /api/dns/records`
- 新增 `GET/PUT/DELETE /api/dns/records/:id`
- 新增 `GET /api/dns/logs`

### 变更

#### BIND9 同步能力
- 新增 `src/lib/dns/bind9.ts`，封装 `nsupdate` 动态更新
- 记录新增/更新/删除时可同步到 BIND9，并回写同步状态与消息
- 支持 `BIND9_DRY_RUN=1` 模式，便于联调

#### 数据库与类型
- 新增 `dns_zones`、`dns_records`、`dns_change_logs` 表
- 新增 DNS 相关 TypeScript 类型

### 新增文件

```
src/db/migrations/008_add_dns_management.sql
src/lib/dns/bind9.ts
src/app/api/dns/shared.ts
src/app/api/dns/zones/route.ts
src/app/api/dns/zones/[id]/route.ts
src/app/api/dns/records/route.ts
src/app/api/dns/records/[id]/route.ts
src/app/api/dns/logs/route.ts
src/app/admin/dns/page.tsx
src/app/admin/dns/DnsClient.tsx
```

### 修改文件

```
src/components/Sidebar.tsx
src/db/schema.sql
src/types/index.ts
README.md
```

### 升级指南

如果从 2.7.1 升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/008_add_dns_management.sql
```

---

## [2.7.1] - 2026-02-12

### 变更

#### 电话本约束放宽
- 短码支持 3-4 位数字，允许留空，允许重复（移除 UNIQUE 约束）
- 长码允许留空，允许重复（移除 UNIQUE 约束）
- 后台表单短码/长码不再为必填项

#### 院内电话速查优化
- 首页按钮名称从「电话本速查」改为「院内电话速查」
- 打开弹窗时不再加载全部数据，输入关键词后才开始搜索
- 搜索结果改为表格式单行布局（科室 | 短码 | 长码），更紧凑高效
- 移除拨号按钮，短码/长码点击可复制

### 新增文件

```
src/db/migrations/007_relax_phonebook_constraints.sql
```

### 修改文件

```
src/db/schema.sql
src/db/migrations/006_add_phonebook_entries.sql
src/app/api/phonebook/route.ts
src/app/api/phonebook/[id]/route.ts
src/app/admin/phonebook/PhonebookClient.tsx
src/components/PhonebookQuickSearchModal.tsx
src/app/HomeClient.tsx
README.md
```

### 升级指南

如果从 2.7.0 升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/007_relax_phonebook_constraints.sql
```

---

## [2.7.0] - 2026-02-11

### 新增

#### 电话本速查（首页）
- 首页搜索框右侧新增「电话本速查」快捷按钮
- 新增电话本弹窗，支持按科室名称、短码、长码快速搜索
- 支持一键复制短码/长码，支持点击长码直接拨号

#### 电话本管理（后台）
- 工作区新增「电话本管理」菜单入口
- 新增 `/admin/phonebook` 页面，支持电话本条目的增删改查
- 支持状态筛选、关键词搜索、排序维护

#### 电话本 API
- 新增 `GET /api/phonebook`（公开读，默认仅返回启用条目）
- 新增 `POST /api/phonebook`、`PUT /api/phonebook/:id`、`DELETE /api/phonebook/:id`（需 write 权限）
- 新增 `GET /api/phonebook/:id` 获取单条数据

### 变更

#### 数据库与类型
- 新增 `phonebook_entries` 表，包含 `department_name`、`short_code`、`long_code`、`status`、`sort_order` 等字段
- 增加短码/长码唯一约束与格式校验（短码固定 4 位，长码 1-13 位数字）
- 新增 `PhonebookEntry` TypeScript 类型

### 新增文件

```
src/app/admin/phonebook/page.tsx
src/app/admin/phonebook/PhonebookClient.tsx
src/app/api/phonebook/route.ts
src/app/api/phonebook/[id]/route.ts
src/components/PhonebookQuickSearchModal.tsx
src/db/migrations/006_add_phonebook_entries.sql
```

### 修改文件

```
src/app/HomeClient.tsx
src/components/Sidebar.tsx
src/db/schema.sql
src/types/index.ts
README.md
```

### 升级指南

如果从旧版本升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/006_add_phonebook_entries.sql
```

---

## [2.6.0] - 2026-02-06

### 新增

#### 数据分析仪表盘增强
- 分析页面升级为多模块仪表盘，新增 KPI 卡片、点击趋势、24 小时分布、热门分类、来源页面、最近活动流
- 新增热门软件 Top 10 排行，与原有热门站点 Top 10 并列展示
- 新增搜索上下文点击率、独立访客（匿名设备维度）等核心指标

#### 埋点能力增强
- 首页站点点击埋点新增上下文信息：来源页面、匿名访客 ID、分类、是否处于搜索态
- 软件下载链路新增埋点：下载接口服务端写入 `click_events`，避免前端异常导致漏记
- 新增 `analyticsSource` 工具统一构建和解析埋点来源字段，兼容历史旧埋点格式
- 新增 `visitorId` 工具，基于浏览器本地存储生成稳定匿名 ID

### 变更

#### Analytics API 重构
- `GET /api/analytics` 从基础点击统计扩展为聚合接口，返回：
  - `summary`：总点击、UV、站点/软件下载点击、日环比、周期环比
  - `daily`：按天趋势（含站点/软件下载拆分）
  - `hourly`：24 小时点击热度
  - `source_pages`：来源页面分布
  - `categories`：分类点击排行
  - `top_sites` / `top_software`：热门目标排行
  - `recent`：最近行为流
- `POST /api/analytics/click` 新增参数校验并支持 `software` 目标类型

### 修改文件

```
src/lib/analyticsSource.ts            # 新增埋点来源协议工具
src/lib/visitorId.ts                  # 新增匿名访客 ID 工具
src/app/HomeClient.tsx                # 首页点击埋点补充上下文
src/app/software/SoftwareClient.tsx   # 下载链接携带埋点上下文参数
src/app/api/software/[id]/download/route.ts # 下载时服务端记录 analytics 事件
src/app/api/analytics/click/route.ts  # 点击接口参数校验与标准化
src/app/api/analytics/route.ts        # 统计聚合逻辑重构
src/app/analytics/page.tsx            # 分析页 UI 重构
README.md                             # 文档更新
```

---

## [2.5.0] - 2026-02-06

### 新增

#### 从已上传软件生成二维码
- 站点管理添加二维码时，新增「从已上传软件生成」功能
- 下拉选择已上传的软件后，一键自动生成下载二维码
- 生成后自动填入软件名称、描述和下载链接
- 保留原有的手动上传二维码图片功能，两种方式可切换使用

#### 二维码生成 API
- 新增 `POST /api/qrcode/generate` 端点，接收 URL 生成 512x512 PNG 二维码
- 需要认证（write 权限）
- 生成的图片保存到 `uploads/qr/` 目录

### 新增文件

```
src/app/api/qrcode/generate/route.ts  # 二维码生成 API
```

### 修改文件

```
src/app/admin/AdminClient.tsx          # 添加软件选择和二维码生成 UI
package.json                           # 新增 qrcode 依赖
```

---

## [2.4.0] - 2026-02-03

### 新增

#### 站点点击统计
- 首页站点链接点击时自动记录点击事件（使用 `navigator.sendBeacon` 无阻塞发送）
- 数据分析页面新增「热门站点 Top 10」排行榜，展示站点图标、名称、点击量和比例条
- 前三名使用主题色高亮徽章
- 时间范围按钮支持切换（7 天 / 30 天），数据实时刷新

### 变更

#### 数据分析页面重构
- 移除硬编码假数据卡片（平均停留时间、跳出率、移动端占比）
- 移除无实际数据支撑的流量来源模块
- 改为客户端组件，支持交互式时间范围切换
- 点击趋势图悬浮提示显示实际点击次数

#### Analytics API 增强
- Top 10 查询 JOIN `sites` 表，返回站点名称、Logo、图标等详细信息

### 修改文件

```
src/app/HomeClient.tsx           # 添加 trackClick 点击追踪（sendBeacon）
src/app/analytics/page.tsx       # 重构为客户端组件，新增 Top 10 排行榜
src/app/api/analytics/route.ts   # Top 10 查询 JOIN sites 表
```

---

## [2.3.3] - 2026-02-03

### 优化

#### IE8/IE9 兼容支持
- 扩展 IE 浏览器检测范围，从 IE10/11 扩展到 IE8/9/10/11
- IE8/IE9 用户访问首页时自动重定向到兼容页面
- 搜索框增加 `propertychange` 事件绑定，兼容 IE8 输入检测

---

## [2.3.2] - 2026-02-03

### 优化

#### 字体本地化
- 将 Google Fonts CDN 字体（Inter、Material Symbols Outlined）下载到本地
- 移除对 `fonts.googleapis.com` 的外部依赖
- 断网环境下仍可正常显示图标和文字

### 修改文件

```
public/fonts/                  # 新增本地字体文件（Inter + Material Symbols）
src/app/globals.css            # 添加 @font-face 规则引用本地字体
src/app/layout.tsx             # 移除 Google Fonts CDN <link> 标签
```

---

## [2.3.1] - 2026-02-03

### 修复

#### 软件 Logo 功能修复
- 修复软件管理后台 Logo 上传失败问题（API 端点错误）
- 修复软件下载页面不显示自定义 Logo 的问题

### 修改文件

```
src/app/admin/software/SoftwareAdminClient.tsx  # 修正 Logo 上传 API 端点
src/app/software/SoftwareClient.tsx             # 添加 Logo 图片显示逻辑
```

---

## [2.3.0] - 2026-02-03

### 新增

#### API 密钥功能
- 新增 API 密钥管理，允许外部系统通过 API Key 调用接口
- 支持创建、编辑、删除、启用/禁用 API 密钥
- 密钥权限分为「只读」和「读写」两级
- 密钥使用 SHA256 哈希存储，安全可靠
- 记录密钥最后使用时间
- 密钥仅在创建时显示一次，之后只显示前缀

#### API 认证支持
- 站点、分类、软件、统计等 API 支持 API Key 认证
- 支持两种认证方式：
  - `X-API-Key: nav_sk_xxxx`
  - `Authorization: Bearer nav_sk_xxxx`
- 读操作允许公开访问或 API Key（read 权限）
- 写操作需要 API Key（write 权限）或管理员登录

#### 管理界面
- 新增 API 管理页面 `/admin/keys`
- 侧边栏工作区新增「API 管理」入口
- 创建密钥后显示完整密钥，支持一键复制

### 数据库变更

- 新增 `api_keys` 表存储 API 密钥

### 新增文件

```
src/lib/apiAuth.ts                    # API Key 认证工具函数
src/app/api/keys/route.ts             # API 密钥列表/创建 API
src/app/api/keys/[id]/route.ts        # API 密钥更新/删除 API
src/app/admin/keys/page.tsx           # API 管理页面
src/app/admin/keys/KeysClient.tsx     # API 管理客户端组件
src/db/migrations/005_add_api_keys.sql # 数据库迁移脚本
```

### 修改文件

```
src/app/api/sites/route.ts            # 添加 API Key 认证
src/app/api/sites/[id]/route.ts       # 添加 API Key 认证
src/app/api/categories/route.ts       # 添加 API Key 认证
src/app/api/categories/[id]/route.ts  # 添加 API Key 认证
src/app/api/software/route.ts         # 添加 API Key 认证
src/app/api/software/[id]/route.ts    # 添加 API Key 认证
src/app/api/analytics/route.ts        # 添加 API Key 认证
src/components/Sidebar.tsx            # 新增 API 管理菜单
src/types/index.ts                    # 新增 ApiKey 类型
src/db/schema.sql                     # 新增 api_keys 表
```

### 升级指南

如果从 2.2.x 版本升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/005_add_api_keys.sql
```

---

## [2.2.2] - 2026-02-02

### 新增

#### 软件管理增强
- 软件管理新增编辑功能，支持修改已上传软件的名称、版本号、分类、说明和图标
- 软件支持上传自定义 Logo 图片（与站点管理一致）
- 上传 Logo 后自动隐藏图标选择器，移除 Logo 后恢复图标选择
- 列表显示优先使用 Logo，无 Logo 时显示图标

#### 侧边栏响应式优化
- 侧边栏支持收起/展开功能
- 屏幕宽度小于 1024px（iPad、手机等）时自动收起
- 收起状态只显示图标，悬停显示文字提示
- 底部新增收起/展开切换按钮
- 收起/展开有平滑过渡动画

### 数据库变更

- `software` 表新增 `logo` 字段

### 修改文件

```
src/app/api/software/route.ts              # POST 支持 logo 字段
src/app/api/software/[id]/route.ts         # 新增 PUT 方法支持编辑
src/app/admin/software/SoftwareAdminClient.tsx  # 编辑功能 + Logo 上传
src/components/Sidebar.tsx                 # 响应式收起功能
src/types/index.ts                         # SoftwareItem 新增 logo 字段
src/db/schema.sql                          # software 表新增 logo 字段
```

### 升级指南

如果从 2.2.x 版本升级，需要运行数据库迁移：

```sql
-- 软件 Logo 字段
ALTER TABLE software ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '';
```

---

## [2.2.1] - 2026-02-01

### 新增

#### 本机IP地址显示
- 首页搜索框左侧显示服务器局域网 IP 地址
- IE10 兼容页面同步显示本机 IP 地址
- 方便用户快速获取导航站服务器地址

### 修改文件

```
src/app/page.tsx              # 获取本机 IP 地址
src/app/HomeClient.tsx        # 显示 IP 标签
src/app/legacy/route.ts       # IE10 页面显示 IP
```

---

## [2.2.0] - 2026-01-31

### 新增

#### 站点设置功能
- 新增站点设置管理页面 `/admin/settings`
- 支持自定义站点名称、描述、版本号
- 支持上传自定义 Logo（替换默认火箭图标）
- 支持自定义页脚版权信息
- 设置实时同步到侧边栏、页面标题、页脚
- IE10 兼容页面同步显示设置

#### 账号设置功能
- 新增账号设置页面 `/admin/profile`
- 支持上传和修改管理员头像
- 支持修改登录密码（需验证旧密码）
- 侧边栏底部显示用户头像和用户名

#### 数据库变更
- 新增 `site_settings` 表存储全局配置
- `users` 表新增 `avatar` 字段

### 变更

#### 工作区菜单优化
- 修复站点管理高亮问题（精确匹配 `/admin` 路径）
- 调整菜单顺序：账号设置、站点设置移至最后
- 侧边栏底部显示实际用户名和头像

#### IE10 兼容页面优化
- 头部背景改为与页面一致的灰色
- Logo 与标题并排显示
- 移除描述文字和搜索提示

### 新增文件

```
src/app/api/settings/route.ts           # 站点设置 API
src/app/api/auth/profile/route.ts       # 头像更新 API
src/app/api/auth/password/route.ts      # 密码修改 API
src/app/admin/settings/page.tsx         # 站点设置页面
src/app/admin/settings/SettingsClient.tsx
src/app/admin/profile/page.tsx          # 账号设置页面
src/app/admin/profile/ProfileClient.tsx
```

### 修改文件

```
src/db/schema.sql                       # 新增 site_settings 表，users 表增加 avatar
src/types/index.ts                      # 新增 SiteSettings 类型，User 增加 avatar
src/components/Sidebar.tsx              # 菜单修复 + 动态头像
src/contexts/AuthContext.tsx            # 新增 refreshUser 方法
src/app/api/auth/me/route.ts            # 返回用户头像
```

### 升级指南

如果从 2.1.x 版本升级，需要运行数据库迁移：

```sql
-- 站点设置表
CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES
    ('site_name', '导航站'),
    ('site_description', '综合导航门户与站点管理仪表板'),
    ('site_version', 'v2.0 中文版'),
    ('footer_text', '© 2024 通用站点导航。保留所有权利。'),
    ('logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- 用户头像字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
```

---

## [2.1.2] - 2026-01-29

### 新增

#### 软件分类支持
- 后台上传软件时可选择分类
- 软件下载页面按分类分组显示（与首页站点风格一致）
- 每个分类显示图标、名称和软件数量

### 变更

#### IE10 兼容页面优化
- 重构为 route handler，直接返回 HTML（解决布局嵌套问题）
- 移除侧边栏，纯内容展示
- 新增软件下载分类显示
- 站点卡片 4 列、二维码 6 列、软件 3 列布局

### 修改文件

```
src/app/admin/software/page.tsx              # 传入软件分类列表
src/app/admin/software/SoftwareAdminClient.tsx  # 添加分类选择下拉框
src/app/software/page.tsx                    # 传入软件分类列表
src/app/software/SoftwareClient.tsx          # 按分类分组显示
src/app/legacy/route.ts                      # 重构为 route handler（原 page.tsx）
```

---

## [2.1.1] - 2026-01-29

### 修复

#### Docker 上传权限问题
- Dockerfile 中创建 `/app/uploads/logos` 和 `/app/uploads/qr` 目录
- 设置 `nextjs` 用户对 uploads 目录的写权限
- docker-compose.yml 添加 `uploads` volume 持久化上传文件

### 变更

#### 站点卡片简化
- 移除站点卡片中的标签显示，界面更简洁
- 优化文字内容垂直居中对齐

---

## [2.1.0] - 2026-01-29

### 新增

#### IE10/IE11 兼容支持
- 新增 `/legacy` 页面，纯 HTML 服务端渲染，兼容 IE10/IE11
- 新增中间件自动检测 User-Agent，IE 用户自动重定向到兼容页面
- 兼容页面特点：
  - 零客户端 JavaScript
  - 使用 float 布局（避免 Flexbox/Grid）
  - 内联 CSS（避免加载问题）
  - 数据库实时数据，与主站同步

#### 软件排序功能
- `software` 表新增 `sort_order` 字段
- 软件下载页面按 `sort_order` 排序显示

### 变更

#### 侧边栏布局优化
- 分类筛选从右侧内容区移至左侧边栏
- 首页作为"全部"选项，分类按数据库排序直接排列
- 移除独立的"分类筛选"标题，界面更简洁

### 新增文件

```
src/middleware.ts                           # IE 浏览器检测中间件
src/app/legacy/page.tsx                     # IE 兼容页面
src/db/migrations/004_add_software_sort_order.sql  # 软件排序迁移
```

### 升级指南

如果从 2.0.x 版本升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/004_add_software_sort_order.sql
```

---

## [2.0.0] - 2026-01-29

### 重大变更

#### 数据库架构重构
- 合并 `sites`、`resources`、`qr_codes` 表为统一的 `sites` 表
- `categories` 表新增 `type` 字段，支持三种类型：
  - `site` - 普通站点
  - `qrcode` - 二维码（公众号/小程序）
  - `software` - 软件下载
- `categories` 表新增 `sort_order` 字段用于排序
- `sites` 表新增字段：`logo`、`qr_image`、`tags`

#### 首页改造
- 移除硬编码数据，所有站点从数据库读取
- 按分类分组显示所有站点
- 支持分类过滤（点击分类标签筛选）
- 支持全文搜索（名称、描述、标签）
- 二维码类型以图片网格形式展示

#### 后台管理改造
- 统一站点管理：管理所有站点和二维码
- 分类管理支持选择类型
- 支持上传站点 Logo 图片
- 支持上传二维码图片
- 简化侧边栏导航

### 新增

#### 图片上传功能
- 新增 `/api/upload` 接口，支持 Logo 和二维码图片上传
- 新增 `/api/uploads/[...path]` 接口，用于图片服务
- 图片存储在 `uploads/logos/` 和 `uploads/qr/` 目录

### 删除

#### 移除旧页面和组件
- 删除 `/qr` 页面（功能合并到首页）
- 删除 `/resources/[page]` 页面（功能合并到首页）
- 删除 `AddResourceModal`、`AddSiteModal`、`ResourcesClient` 组件
- 删除 `/api/qrcodes`、`/api/resources` API

### 升级指南

**重要：此版本有破坏性变更，需要数据库迁移**

```bash
# 运行迁移脚本（会自动迁移旧数据）
psql -d your_database -f src/db/migrations/003_unified_sites.sql
```

或者对于全新部署：
```bash
psql -d your_database -f src/db/schema.sql
psql -d your_database -f src/db/seed.sql
```

---

## [1.2.0] - 2026-01-29

### 新增

#### 软件下载功能
- 新增软件下载页面 `/software`，用户可浏览和下载管理员上传的软件
- 新增软件管理页面 `/admin/software`，管理员可上传、删除软件
- 支持单文件最大 4GB 上传
- 支持上传进度显示
- 支持下载次数统计
- 支持自定义软件图标和颜色
- 新增软件 API：
  - `GET /api/software` - 获取软件列表
  - `POST /api/software` - 上传软件（FormData）
  - `DELETE /api/software/:id` - 删除软件
  - `GET /api/software/:id/download` - 下载软件文件

### 变更

#### UI 优化
- 移除资源页面的"提交新资源"按钮
- 优化站点卡片布局：左侧 Logo，右侧名称和说明（水平排列）
- 卡片标签最多显示 3 个，更加简洁

#### 侧边栏更新
- 新增"软件下载"导航入口
- 工作区新增"软件管理"入口

### 数据库变更

#### 新增 software 表
- `name` - 软件名称
- `description` - 软件说明
- `version` - 版本号
- `file_name` - 原始文件名
- `file_path` - 存储路径
- `file_size` - 文件大小（字节）
- `icon` - 图标名称
- `icon_bg` - 图标背景色
- `icon_color` - 图标颜色
- `download_count` - 下载次数

### 新增文件

```
src/app/software/page.tsx                    # 软件下载页面
src/app/software/SoftwareClient.tsx          # 软件下载客户端组件
src/app/admin/software/page.tsx              # 软件管理页面
src/app/admin/software/SoftwareAdminClient.tsx # 软件管理客户端组件
src/app/api/software/route.ts                # 软件列表/上传 API
src/app/api/software/[id]/route.ts           # 软件删除 API
src/app/api/software/[id]/download/route.ts  # 软件下载 API
src/db/migrations/002_add_software_table.sql # 数据库迁移脚本
uploads/.gitkeep                             # 上传目录占位文件
```

### 升级指南

如果从 1.1.x 版本升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/002_add_software_table.sql
```

---

## [1.1.0] - 2026-01-29

### 新增

#### 分类管理功能
- 新增分类管理页面 `/admin/categories`
- 支持分类的增删改查操作
- 分类支持自定义图标、背景色和图标颜色
- 在侧边栏工作区添加"分类管理"入口

#### 图标选择器组件
- 新增 `IconPicker` 组件，基于 Google Material Symbols
- 提供 60+ 常用图标供选择
- 支持 9 种背景颜色和 9 种图标颜色
- 支持图标搜索过滤功能

#### 资源提交功能
- 修复"提交新资源"按钮无响应的问题
- 新增 `AddResourceModal` 弹窗组件
- 支持在资源页面直接添加新资源
- 资源支持图标选择、标签等属性

### 变更

#### UI/UX 改进
- 将"添加站点"按钮从侧边栏移至站点管理页面
- 优化站点管理页面布局，按钮位置更合理

### 数据库变更

#### Categories 表新增字段
- `icon` - 图标名称（Material Symbols）
- `icon_bg` - 图标背景色 CSS 类
- `icon_color` - 图标颜色 CSS 类

### 新增文件

```
src/components/IconPicker.tsx          # 图标选择器组件
src/components/AddResourceModal.tsx    # 添加资源弹窗
src/components/ResourcesClient.tsx     # 资源页客户端组件
src/app/admin/categories/page.tsx      # 分类管理页面
src/app/admin/categories/CategoriesClient.tsx  # 分类管理客户端组件
src/app/api/categories/[id]/route.ts   # 分类 CRUD API
src/db/migrations/001_add_category_icons.sql   # 数据库迁移脚本
```

### 升级指南

如果从 1.0.x 版本升级，需要运行数据库迁移：

```bash
psql -d your_database -f src/db/migrations/001_add_category_icons.sql
```

---

## [1.0.0] - 2026-01-28

### 初始版本

- 首页推荐站点展示
- 资源分类页面（开发工具、设计资源、阅读、娱乐、购物）
- 公众号/小程序二维码画廊
- 站点管理后台
- 数据分析仪表盘
- 管理员登录认证
- Docker 部署支持
