# NavStation 导航站

综合导航门户与站点管理系统，提供统一的站点导航、软件下载、二维码展示、数据分析与 BIND9 DNS 管理功能。

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript（字体本地托管，无外部 CDN 依赖）
- **后端**: Next.js API Routes + node-postgres
- **数据库**: PostgreSQL 14+
- **认证**: bcryptjs + HttpOnly Cookie + API Key

## 项目结构

```
navstation/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 首页（所有站点按分类展示）
│   │   ├── HomeClient.tsx      # 首页客户端组件（搜索/过滤）
│   │   ├── legacy/             # IE10 兼容页面（纯 HTML）
│   │   ├── admin/              # 后台管理
│   │   │   ├── page.tsx        # 站点管理（统一管理站点+二维码）
│   │   │   ├── categories/     # 分类管理
│   │   │   ├── software/       # 软件管理
│   │   │   ├── phonebook/      # 电话本管理
│   │   │   ├── dns/            # DNS 管理（BIND9）
│   │   │   ├── keys/           # API 密钥管理
│   │   │   └── settings/       # 站点设置
│   │   ├── analytics/          # 数据分析
│   │   ├── software/           # 软件下载页面
│   │   └── api/                # RESTful API
│   │       ├── sites/          # 站点 CRUD（含二维码）
│   │       ├── software/       # 软件上传/下载
│   │       ├── categories/     # 分类 CRUD（支持类型）
│   │       ├── qrcode/         # 二维码生成
│   │       ├── upload/         # 图片上传
│   │       ├── uploads/        # 图片服务
│   │       ├── auth/           # 登录/登出/当前用户
│   │       ├── analytics/      # 统计查询 + 点击记录
│   │       ├── phonebook/      # 电话本查询与管理
│   │       ├── dns/            # DNS Zone/记录/日志管理
│   │       ├── keys/           # API 密钥管理
│   │       └── settings/       # 站点设置 API
│   ├── components/             # 客户端组件
│   │   ├── AppShell.tsx        # 布局壳（Sidebar + 模态框）
│   │   ├── Sidebar.tsx         # 侧边栏导航
│   │   ├── LoginModal.tsx      # 登录弹窗
│   │   ├── PhonebookQuickSearchModal.tsx # 院内电话速查弹窗
│   │   └── IconPicker.tsx      # 图标选择器组件
│   ├── contexts/
│   │   └── AuthContext.tsx      # 认证状态管理
│   ├── lib/
│   │   ├── apiAuth.ts          # API Key 认证工具
│   │   ├── analyticsSource.ts  # 分析埋点 source 构建/解析工具
│   │   ├── dns/bind9.ts        # BIND9 nsupdate 封装
│   │   ├── dns/bind9-forward.ts # BIND9 转发区域配置生成与同步
│   │   └── visitorId.ts        # 匿名访客 ID 生成与读取
│   ├── db/
│   │   ├── index.ts            # PostgreSQL 连接池
│   │   ├── schema.sql          # 建表语句
│   │   ├── seed.sql            # 初始化数据
│   │   └── migrations/         # 数据库迁移脚本
│   ├── types/
│   │   └── index.ts            # TypeScript 类型定义
│   └── middleware.ts           # 中间件（IE 浏览器检测重定向）
├── uploads/                    # 上传文件目录
│   ├── logos/                  # 站点 Logo
│   ├── qr/                     # 二维码图片
│   └── software/               # 软件文件（最大 4GB）
├── Dockerfile
├── docker-compose.yml
├── DEPLOY.md                   # 部署文档
└── CHANGELOG.md                # 更新日志
```

## 快速开始

### 前置条件

- Node.js 20+
- PostgreSQL 14+

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
DATABASE_URL=postgresql://用户名:密码@localhost:5432/数据库名
JWT_SECRET=你的密钥
# 可选：DNS/BIND9 联调配置
# BIND9_DRY_RUN=1
# BIND9_NSUPDATE_BIN=nsupdate
# BIND9_FORWARD_CONF=/etc/bind/named.conf.forward
# BIND9_RESTART_CMD=systemctl restart named
```

> 说明：Docker 运行镜像已内置 `nsupdate`（`bind-tools`），无需在容器内手动安装。

### 3. 初始化数据库

```bash
# 建表
psql -h localhost -U 用户名 -d 数据库名 -f src/db/schema.sql

# 导入初始数据
psql -h localhost -U 用户名 -d 数据库名 -f src/db/seed.sql
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 生产构建

```bash
npm run build
npm run start
```

## Docker 部署

```bash
docker-compose up -d
```

详见 [DEPLOY.md](./DEPLOY.md)

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `categories` | 分类（type: site/qrcode/software） |
| `sites` | 统一站点表（含普通站点和二维码） |
| `software` | 软件下载资源（支持 4GB 文件） |
| `users` | 管理员账号（默认 admin/admin） |
| `click_events` | 点击事件统计 |
| `site_settings` | 站点全局设置（名称、描述、Logo等） |
| `api_keys` | API 密钥（外部系统对接认证） |
| `phonebook_entries` | 电话本条目（科室名、长码、短码） |
| `dns_zones` | DNS Zone 配置（服务器、TSIG、启停状态） |
| `dns_records` | DNS 记录（A/AAAA/CNAME/TXT/MX）与同步状态 |
| `dns_forward_zones` | DNS 转发区域（条件转发到指定 DNS 服务器） |
| `dns_change_logs` | DNS 变更审计日志（动作、结果、操作人） |

### 分类类型说明

| 类型 | 说明 |
|------|------|
| `site` | 普通导航站点 |
| `qrcode` | 公众号/小程序二维码 |
| `software` | 软件下载分类 |

## API 接口

### 站点管理
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/sites` | GET | 站点列表（支持 type/category/search 参数过滤） |
| `POST /api/sites` | POST | 新增站点（含二维码） |
| `PUT /api/sites/:id` | PUT | 更新站点 |
| `DELETE /api/sites/:id` | DELETE | 删除站点 |

### 分类管理
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/categories` | GET | 分类列表（支持 type 参数过滤） |
| `POST /api/categories` | POST | 新增分类（需指定 type） |
| `PUT /api/categories/:id` | PUT | 更新分类 |
| `DELETE /api/categories/:id` | DELETE | 删除分类 |

### 软件下载
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/software` | GET | 软件列表 |
| `POST /api/software` | POST | 上传软件（FormData，最大 4GB，支持 Logo） |
| `PUT /api/software/:id` | PUT | 编辑软件信息 |
| `DELETE /api/software/:id` | DELETE | 删除软件 |
| `GET /api/software/:id/download` | GET | 下载软件文件 |

### 二维码生成
| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/qrcode/generate` | POST | 根据 URL 生成二维码 PNG 图片（需 write 权限） |

### 文件上传
| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/upload` | POST | 上传图片（Logo/二维码，最大 5MB） |
| `GET /api/uploads/[...path]` | GET | 获取上传的图片 |

### 认证
| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/auth/login` | POST | 管理员登录 |
| `GET /api/auth/me` | GET | 获取当前用户（含头像） |
| `POST /api/auth/logout` | POST | 退出登录 |
| `PUT /api/auth/profile` | PUT | 更新头像 |
| `PUT /api/auth/password` | PUT | 修改密码 |

### 数据分析
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/analytics?days=7` | GET | 返回统计仪表盘数据（KPI、趋势、来源、分类、Top、最近活动） |
| `POST /api/analytics/click` | POST | 记录点击事件（支持 `site` / `software`） |

### 站点设置
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/settings` | GET | 获取站点设置 |
| `PUT /api/settings` | PUT | 更新站点设置 |

### 电话本管理
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/phonebook` | GET | 电话本列表（支持 `search`，默认只返回启用条目） |
| `POST /api/phonebook` | POST | 新增电话本条目（需 write 权限） |
| `GET /api/phonebook/:id` | GET | 获取单个电话本条目 |
| `PUT /api/phonebook/:id` | PUT | 更新电话本条目（需 write 权限） |
| `DELETE /api/phonebook/:id` | DELETE | 删除电话本条目（需 write 权限） |

### API 密钥管理（需管理员登录）
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/keys` | GET | 获取 API 密钥列表 |
| `POST /api/keys` | POST | 创建新 API 密钥（仅此一次返回完整密钥） |
| `PUT /api/keys/:id` | PUT | 更新密钥信息（名称、权限、启用状态） |
| `DELETE /api/keys/:id` | DELETE | 删除密钥 |

### DNS 管理
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/dns/zones` | GET | 获取 Zone 列表（需 read 权限） |
| `POST /api/dns/zones` | POST | 新增 Zone（需 write 权限） |
| `PUT /api/dns/zones/:id` | PUT | 更新 Zone（需 write 权限） |
| `DELETE /api/dns/zones/:id` | DELETE | 删除 Zone（需 write 权限） |
| `GET /api/dns/records` | GET | 获取 DNS 记录列表（支持 `zone_id` / `include_inactive`） |
| `POST /api/dns/records` | POST | 新增记录并可同步到 BIND9（需 write 权限） |
| `GET /api/dns/records/:id` | GET | 获取单条 DNS 记录（需 read 权限） |
| `PUT /api/dns/records/:id` | PUT | 更新记录并同步到 BIND9（需 write 权限） |
| `DELETE /api/dns/records/:id` | DELETE | 删除记录并尝试同步删除（需 write 权限） |
| `GET /api/dns/logs` | GET | 获取 DNS 变更日志（支持 `zone_id` / `record_id` / `limit`） |
| `GET /api/dns/forward-zones` | GET | 获取转发区域列表（需 read 权限） |
| `POST /api/dns/forward-zones` | POST | 新增转发区域并同步到 BIND9（需 write 权限） |
| `PUT /api/dns/forward-zones/:id` | PUT | 更新转发区域并同步到 BIND9（需 write 权限） |
| `DELETE /api/dns/forward-zones/:id` | DELETE | 删除转发区域并同步到 BIND9（需 write 权限） |

## 默认账号

- 用户名: `admin`
- 密码: `admin`

## 主要功能

### 用户功能

- **首页导航**: 所有站点按分类分组展示，左侧边栏分类筛选，支持全文搜索，显示服务器局域网 IP 地址
- **院内电话速查**: 首页搜索框旁提供「院内电话速查」按钮，输入关键词后按科室名/短码/长码搜索，支持一键复制号码
- **软件下载**: 下载管理员上传的常用软件（支持大文件，按排序显示）
- **二维码展示**: 公众号/小程序二维码以图片网格形式展示
- **IE8+ 兼容**: 自动检测 IE8/9/10/11 并重定向到兼容页面（float 布局，无 Flexbox/Grid）
- **响应式布局**: 侧边栏在移动设备（iPad/手机）上自动收起为图标模式

### 工作区（管理员）

- **站点管理**: 统一管理所有站点和二维码，支持上传 Logo，支持从已上传软件自动生成下载二维码
- **分类管理**: 管理分类，支持三种类型（站点/二维码/软件）
- **软件管理**: 上传、编辑、删除软件下载资源（单文件最大 4GB），支持自定义 Logo 或图标
- **电话本管理**: 管理科室电话本，支持短码（3-4 位，可留空）和长码（1-13 位，可留空）维护、启用/停用与排序
- **DNS 管理**: 管理 BIND9 的 Zone 与记录，支持 A/AAAA/CNAME/TXT/MX，支持条件转发区域（Forward Zone），同步状态追踪与变更日志审计
- **站点设置**: 自定义站点名称、描述、Logo、版本号、页脚版权
- **账号设置**: 修改管理员头像和密码
- **统一消息提醒**: 后台增删改与状态操作统一使用全局 Message/Toast 提示，支持 success/error/warning/info，交互反馈更一致
- **数据分析**: 查看点击统计、访问趋势和热门站点 Top 10 排行榜（支持 7 天/30 天切换）
  - 支持总点击、独立访客、站点/软件下载点击、搜索上下文点击率
  - 支持 24 小时分布、来源页面分布、热门分类
  - 支持热门站点 Top 10、热门软件 Top 10、最近活动流（最近 20 条）

### 图标选择器

系统内置了基于 Google Material Symbols 的图标选择器，支持：
- 60+ 常用图标可选
- 9 种背景颜色
- 9 种图标颜色
- 搜索过滤功能

## API 对接（外部系统）

NavStation 支持通过 API Key 允许外部系统访问 API。

### 创建 API 密钥

1. 登录管理后台
2. 进入「API 管理」页面
3. 点击「创建密钥」
4. 设置名称和权限（只读/读写）
5. **立即保存显示的密钥**（密钥只显示一次）

### 权限说明

| 权限 | 说明 |
|------|------|
| `read` | 只读权限：读取站点、分类、软件、统计数据 |
| `write` | 读写权限：包含只读 + 增删改站点、分类、软件 |

### 认证方式

支持两种 Header 认证方式：

```bash
# 方式一：X-API-Key Header
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/sites

# 方式二：Authorization Bearer
curl -H "Authorization: Bearer nav_sk_xxxx" https://your-domain/api/sites
```

### 调用示例

```bash
# 获取站点列表
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/sites

# 创建站点（需要 write 权限）
curl -X POST \
  -H "X-API-Key: nav_sk_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"新站点","url":"https://example.com","category_id":1}' \
  https://your-domain/api/sites

# 获取分类列表
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/categories

# 获取统计数据
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/analytics?days=7
```

### 错误响应

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 401 | `UNAUTHORIZED` | 未提供认证信息 |
| 401 | `INVALID_API_KEY` | API Key 无效或已禁用 |
| 403 | `PERMISSION_DENIED` | 权限不足 |

## 数据库迁移

如果从旧版本升级，需要按顺序运行迁移脚本：

```bash
# v1.1.0 - 分类图标字段
psql -d your_database -f src/db/migrations/001_add_category_icons.sql

# v1.2.0 - 软件下载表
psql -d your_database -f src/db/migrations/002_add_software_table.sql

# v2.0.0 - 统一站点架构（重要：会自动迁移旧数据）
psql -d your_database -f src/db/migrations/003_unified_sites.sql

# v2.1.0 - 软件排序字段
psql -d your_database -f src/db/migrations/004_add_software_sort_order.sql

# v2.3.0 - API 密钥表
psql -d your_database -f src/db/migrations/005_add_api_keys.sql

# v2.7.0 - 电话本条目表
psql -d your_database -f src/db/migrations/006_add_phonebook_entries.sql

# v2.7.1 - 放宽电话本短码/长码约束
psql -d your_database -f src/db/migrations/007_relax_phonebook_constraints.sql

# v2.8.0 - DNS 管理（BIND9 权威区域）
psql -d your_database -f src/db/migrations/008_add_dns_management.sql

# v2.9.0 - DNS 转发区域
psql -d your_database -f src/db/migrations/009_add_dns_forward_zones.sql
```

对于全新部署，直接运行：
```bash
psql -d your_database -f src/db/schema.sql
psql -d your_database -f src/db/seed.sql
```
