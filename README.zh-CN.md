# NavStation 导航站

语言： [English](./README.md) | **简体中文** | [한국어](./README.ko.md) | [日本語](./README.ja.md)

版本变更与发布记录请查看 [CHANGELOG.md](./CHANGELOG.md)。

综合导航门户与站点管理系统，提供统一的站点导航、软件下载、二维码展示、统一行为分析与 BIND9 DNS 管理功能。

当前已支持 `en`、`zh-CN`、`ko`、`ja` 四国语言路由与内容管理，并可在后台“站点设置”中配置站点默认语言。

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript
- **后端**: Next.js API Routes + node-postgres
- **数据库**: PostgreSQL 14+
- **认证**: bcryptjs + HttpOnly Cookie + API Key

## 项目结构

```text
navstation/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # 带语言前缀的页面路由
│   │   ├── page.tsx            # 首页入口（自动跳转）
│   │   ├── HomeClient.tsx      # 首页客户端组件（搜索/过滤）
│   │   ├── legacy/             # IE10 兼容页面（纯 HTML）
│   │   ├── admin/              # 后台管理
│   │   ├── analytics/          # 数据分析
│   │   ├── software/           # 软件下载页面
│   │   └── api/                # RESTful API
│   ├── components/             # 客户端组件
│   ├── contexts/               # 认证与消息状态
│   ├── lib/                    # 公共工具
│   ├── db/                     # PostgreSQL schema、seed、migrations
│   ├── types/                  # TypeScript 类型
│   └── proxy.ts                # Next.js 请求拦截
├── uploads/                    # 上传文件
├── Dockerfile
├── docker-compose.yml
├── DEPLOY.md
└── CHANGELOG.md
```

## 快速开始

### 前置条件

- Node.js 20+
- PostgreSQL 14+

### 1. 安装依赖

```bash
npm install
```

如需执行本地回归检查：

```bash
npm test
```

### 2. 配置环境变量

创建 `.env.local`：

```env
DATABASE_URL=postgresql://用户名:密码@localhost:5432/数据库名
JWT_SECRET=你的密钥
BAIDU_MAP_AK=你的百度地图AK
BAIDU_WEATHER_AK=你的百度天气AK
WEATHER_CACHE_TTL_MINUTES=30
WEATHER_DEFAULT_DISTRICT_ID=441881
WEATHER_DEFAULT_DISTRICT_NAME=英德市
# 可选：DNS/BIND9 联调配置
# BIND9_DRY_RUN=1
# BIND9_NSUPDATE_BIN=nsupdate
# BIND9_FORWARD_CONF=/etc/bind/named.conf.forward
# BIND9_RESTART_CMD=systemctl restart named
```

说明：Docker 镜像已内置 `nsupdate`（`bind-tools`）。

### 3. 初始化数据库

```bash
# 建表
psql -h localhost -U 用户名 -d 数据库名 -f src/db/schema.sql

# 导入初始数据
psql -h localhost -U 用户名 -d 数据库名 -f src/db/seed.sql
```

可选：导入百度天气行政区划映射，用于中文地名解析到 `district_id`。

```bash
npm run import:weather-districts
node scripts/import-weather-districts.mjs data/weather_district_id.csv
```

可选：导入本地四级行政区。

```bash
psql -h localhost -U 用户名 -d 数据库名 -f src/db/migrations/011_add_admin_divisions.sql
psql -h localhost -U 用户名 -d 数据库名 -f scripts/import-admin-divisions.sql
```

如从旧版本升级，还需执行：

```bash
psql -h localhost -U 用户名 -d 数据库名 -f src/db/migrations/012_add_analytics_events.sql
psql -h localhost -U 用户名 -d 数据库名 -f src/db/migrations/013_add_i18n_translation_tables.sql
psql -h localhost -U 用户名 -d 数据库名 -f src/db/migrations/014_add_default_locale_setting.sql
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`。

### 5. 生产构建

```bash
npm run build
npm run start
```

## Docker 部署

```bash
docker-compose up -d
```

完整部署说明见 [DEPLOY.md](./DEPLOY.md)。

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `categories` | 分类（`site` / `qrcode` / `software`） |
| `sites` | 统一站点表 |
| `software` | 软件下载资源 |
| `users` | 管理员账号 |
| `click_events` | 历史点击统计表 |
| `analytics_events` | 统一行为日志表 |
| `site_settings` | 站点全局设置 |
| `category_translations` | 分类多语言翻译表 |
| `site_translations` | 站点名称/描述/标签翻译表 |
| `software_translations` | 软件多语言翻译表 |
| `site_setting_translations` | 站点文案多语言翻译表 |
| `api_keys` | API Key |
| `phonebook_entries` | 电话本条目 |
| `weather_districts` | 天气行政区映射 |
| `weather_cache` | 天气响应缓存 |
| `admin_divisions` | 本地四级行政区 |
| `admin_divisions_import` | 行政区导入暂存表 |
| `dns_zones` | DNS Zone 配置 |
| `dns_records` | DNS 记录与同步状态 |
| `dns_forward_zones` | DNS 转发区域 |
| `dns_change_logs` | DNS 审计日志 |

### 分类类型

| 类型 | 说明 |
|------|------|
| `site` | 普通导航站点 |
| `qrcode` | 二维码分类 |
| `software` | 软件下载分类 |

## API 接口

### 站点管理

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/sites` | GET | 获取站点列表 |
| `POST /api/sites` | POST | 新增站点或二维码条目 |
| `PUT /api/sites/:id` | PUT | 更新站点 |
| `DELETE /api/sites/:id` | DELETE | 删除站点 |

### 分类管理

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/categories` | GET | 获取分类列表 |
| `POST /api/categories` | POST | 新增分类 |
| `PUT /api/categories/:id` | PUT | 更新分类 |
| `DELETE /api/categories/:id` | DELETE | 删除分类 |

### 软件下载

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/software` | GET | 获取软件列表 |
| `POST /api/software` | POST | 上传软件 |
| `PUT /api/software/:id` | PUT | 更新软件信息 |
| `DELETE /api/software/:id` | DELETE | 删除软件 |
| `GET /api/software/:id/download` | GET | 下载软件文件 |

### 二维码生成

| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/qrcode/generate` | POST | 根据 URL 生成二维码 PNG |

### 文件上传

| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/upload` | POST | 上传图片（Logo、站点图标、二维码资源等） |
| `GET /api/uploads/[...path]` | GET | 获取上传图片 |

### 认证

| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/auth/login` | POST | 管理员登录 |
| `GET /api/auth/me` | GET | 获取当前用户 |
| `POST /api/auth/logout` | POST | 退出登录 |
| `PUT /api/auth/profile` | PUT | 更新头像 |
| `PUT /api/auth/password` | PUT | 修改密码 |

### 数据分析

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/analytics?days=7` | GET | 获取统一分析仪表盘数据 |
| `POST /api/analytics/click` | POST | 记录导航点击事件 |

### 站点设置

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/settings` | GET | 获取站点设置 |
| `PUT /api/settings` | PUT | 更新站点设置 |

### 电话本

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/phonebook` | GET | 获取电话本列表 |
| `POST /api/phonebook` | POST | 新增电话本条目 |
| `GET /api/phonebook/:id` | GET | 获取单条电话本记录 |
| `PUT /api/phonebook/:id` | PUT | 更新电话本记录 |
| `DELETE /api/phonebook/:id` | DELETE | 删除电话本记录 |

### 行政区域查询

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/regions/search` | GET | 百度 Place API v3 行政区域查询代理 |
| `GET /api/admin-divisions` | GET | 本地行政区查询与钻取 |

### API 密钥管理

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/keys` | GET | 获取 API 密钥列表 |
| `POST /api/keys` | POST | 创建 API 密钥 |
| `PUT /api/keys/:id` | PUT | 更新 API 密钥 |
| `DELETE /api/keys/:id` | DELETE | 删除 API 密钥 |

### DNS 管理

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/dns/zones` | GET | 获取 DNS Zone 列表 |
| `POST /api/dns/zones` | POST | 新增 Zone |
| `PUT /api/dns/zones/:id` | PUT | 更新 Zone |
| `DELETE /api/dns/zones/:id` | DELETE | 删除 Zone |
| `GET /api/dns/records` | GET | 获取 DNS 记录列表 |
| `POST /api/dns/records` | POST | 新增 DNS 记录 |
| `GET /api/dns/records/:id` | GET | 获取单条 DNS 记录 |
| `PUT /api/dns/records/:id` | PUT | 更新 DNS 记录 |
| `DELETE /api/dns/records/:id` | DELETE | 删除 DNS 记录 |
| `GET /api/dns/logs` | GET | 获取 DNS 审计日志 |
| `GET /api/dns/forward-zones` | GET | 获取转发区域列表 |
| `POST /api/dns/forward-zones` | POST | 新增转发区域 |
| `PUT /api/dns/forward-zones/:id` | PUT | 更新转发区域 |
| `DELETE /api/dns/forward-zones/:id` | DELETE | 删除转发区域 |

### 管理工具

| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/tools/ping` | POST | Ping 测试 |
| `POST /api/tools/tracert` | POST | Traceroute 路由追踪 |

## 默认账号

- 用户名：`admin`
- 密码：`admin`

## 主要功能

### 用户功能

- **首页导航**：按分类展示站点，支持全文搜索，并显示客户端 IP。
- **常驻天气摘要**：首页常驻展示天气摘要卡，默认地点从 `.env` 读取。
- **院内电话速查**：按科室名称、短码、长码检索电话本。
- **行政区域查询**：同一弹窗支持在线查询与本地行政区查询。
- **软件下载**：发布和下载内部软件包。
- **二维码展示**：以网格形式展示二维码资源。
- **IE8+ 兼容**：为老旧 IE 浏览器提供兼容页面。
- **响应式布局**：小屏设备下自动收起侧边栏。

### 管理功能

- **站点管理**：管理普通站点与二维码条目。
- **分类管理**：管理 `site`、`qrcode`、`software` 三类分类。
- **软件管理**：上传和维护最大 4 GB 的软件文件。
- **电话本管理**：维护科室电话本数据。
- **DNS 管理**：管理 BIND9 Zone、记录、转发区域与审计日志。
- **管理工具**：在 Web 界面执行 Ping 和 Traceroute。
- **站点设置**：配置站点名称、描述、Logo、版本号、页脚版权与浏览器 favicon。
- **账号设置**：更新头像和密码。
- **统一消息提示**：后台操作统一通过 Toast 反馈。
- **数据分析仪表盘**：统一展示点击、查询、来源与最近活动。

### 图标选择器

系统内置图标选择器，支持：

- 60+ 常用 Material Symbols
- 9 种背景颜色
- 9 种图标颜色
- 搜索和过滤

## 外部系统 API 对接

NavStation 支持通过 API Key 向外部系统开放接口。

### 创建 API 密钥

1. 登录后台。
2. 进入 `API 管理` 页面。
3. 点击 `创建密钥`。
4. 设置密钥名称和权限。
5. 立即保存完整密钥，系统只显示一次。

### 权限说明

| 权限 | 说明 |
|------|------|
| `read` | 只读权限 |
| `write` | 读写权限 |

### 认证方式

```bash
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/sites
curl -H "Authorization: Bearer nav_sk_xxxx" https://your-domain/api/sites
```

### 调用示例

```bash
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/sites

curl -X POST \
  -H "X-API-Key: nav_sk_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"新站点","url":"https://example.com","category_id":1}' \
  https://your-domain/api/sites

curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/categories
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/analytics?days=7
```

### 错误响应

| HTTP 状态码 | 错误码 | 说明 |
|------|------|------|
| 401 | `UNAUTHORIZED` | 未提供认证信息 |
| 401 | `INVALID_API_KEY` | API Key 无效或已禁用 |
| 403 | `PERMISSION_DENIED` | 权限不足 |

## 数据库迁移

从旧版本升级时，请按顺序执行：

```bash
psql -d your_database -f src/db/migrations/001_add_category_icons.sql
psql -d your_database -f src/db/migrations/002_add_software_table.sql
psql -d your_database -f src/db/migrations/003_unified_sites.sql
psql -d your_database -f src/db/migrations/004_add_software_sort_order.sql
psql -d your_database -f src/db/migrations/005_add_api_keys.sql
psql -d your_database -f src/db/migrations/006_add_phonebook_entries.sql
psql -d your_database -f src/db/migrations/007_relax_phonebook_constraints.sql
psql -d your_database -f src/db/migrations/008_add_dns_management.sql
psql -d your_database -f src/db/migrations/009_add_dns_forward_zones.sql
psql -d your_database -f src/db/migrations/010_add_weather_districts_and_cache.sql
psql -d your_database -f src/db/migrations/011_add_admin_divisions.sql
psql -d your_database -f src/db/migrations/012_add_analytics_events.sql
psql -d your_database -f src/db/migrations/013_add_i18n_translation_tables.sql
psql -d your_database -f src/db/migrations/014_add_default_locale_setting.sql
```

## 多语言说明

- 前台与后台统一使用语言前缀路由，例如 `/en`、`/zh-CN`、`/ko`、`/ja`。
- 默认语言可在后台“站点设置”中修改。
- 分类、站点、软件以及站点名称/描述/页脚等文案支持四语录入，缺失翻译时会回退到默认语言。

若启用本地四级行政区，还需执行：

```bash
psql -d your_database -f scripts/import-admin-divisions.sql
```

全新部署直接执行：

```bash
psql -d your_database -f src/db/schema.sql
psql -d your_database -f src/db/seed.sql
```
