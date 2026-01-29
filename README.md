# NavStation 导航站

综合导航门户与站点管理系统，提供统一的站点导航、软件下载、二维码展示和数据分析功能。

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript
- **后端**: Next.js API Routes + node-postgres
- **数据库**: PostgreSQL 14+
- **认证**: bcryptjs + HttpOnly Cookie

## 项目结构

```
navstation/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 首页（所有站点按分类展示）
│   │   ├── HomeClient.tsx      # 首页客户端组件（搜索/过滤）
│   │   ├── admin/              # 后台管理
│   │   │   ├── page.tsx        # 站点管理（统一管理站点+二维码）
│   │   │   ├── categories/     # 分类管理
│   │   │   └── software/       # 软件管理
│   │   ├── analytics/          # 数据分析
│   │   ├── software/           # 软件下载页面
│   │   └── api/                # RESTful API
│   │       ├── sites/          # 站点 CRUD（含二维码）
│   │       ├── software/       # 软件上传/下载
│   │       ├── categories/     # 分类 CRUD（支持类型）
│   │       ├── upload/         # 图片上传
│   │       ├── uploads/        # 图片服务
│   │       ├── auth/           # 登录/登出/当前用户
│   │       └── analytics/      # 统计查询 + 点击记录
│   ├── components/             # 客户端组件
│   │   ├── AppShell.tsx        # 布局壳（Sidebar + 模态框）
│   │   ├── Sidebar.tsx         # 侧边栏导航
│   │   ├── LoginModal.tsx      # 登录弹窗
│   │   └── IconPicker.tsx      # 图标选择器组件
│   ├── contexts/
│   │   └── AuthContext.tsx      # 认证状态管理
│   ├── db/
│   │   ├── index.ts            # PostgreSQL 连接池
│   │   ├── schema.sql          # 建表语句
│   │   ├── seed.sql            # 初始化数据
│   │   └── migrations/         # 数据库迁移脚本
│   └── types/
│       └── index.ts            # TypeScript 类型定义
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
```

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
| `POST /api/software` | POST | 上传软件（FormData，最大 4GB） |
| `DELETE /api/software/:id` | DELETE | 删除软件 |
| `GET /api/software/:id/download` | GET | 下载软件文件 |

### 文件上传
| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/upload` | POST | 上传图片（Logo/二维码，最大 5MB） |
| `GET /api/uploads/[...path]` | GET | 获取上传的图片 |

### 认证
| 路径 | 方法 | 说明 |
|------|------|------|
| `POST /api/auth/login` | POST | 管理员登录 |
| `GET /api/auth/me` | GET | 获取当前用户 |
| `POST /api/auth/logout` | POST | 退出登录 |

### 数据分析
| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/analytics?days=7` | GET | 统计数据 |
| `POST /api/analytics/click` | POST | 记录点击事件 |

## 默认账号

- 用户名: `admin`
- 密码: `admin`

## 主要功能

### 用户功能

- **首页导航**: 所有站点按分类分组展示，支持分类过滤和全文搜索
- **软件下载**: 下载管理员上传的常用软件（支持大文件）
- **二维码展示**: 公众号/小程序二维码以图片网格形式展示

### 工作区（管理员）

- **站点管理**: 统一管理所有站点和二维码，支持上传 Logo
- **分类管理**: 管理分类，支持三种类型（站点/二维码/软件）
- **软件管理**: 上传、管理软件下载资源（单文件最大 4GB）
- **数据分析**: 查看点击统计和访问趋势

### 图标选择器

系统内置了基于 Google Material Symbols 的图标选择器，支持：
- 60+ 常用图标可选
- 9 种背景颜色
- 9 种图标颜色
- 搜索过滤功能

## 数据库迁移

如果从旧版本升级，需要按顺序运行迁移脚本：

```bash
# v1.1.0 - 分类图标字段
psql -d your_database -f src/db/migrations/001_add_category_icons.sql

# v1.2.0 - 软件下载表
psql -d your_database -f src/db/migrations/002_add_software_table.sql

# v2.0.0 - 统一站点架构（重要：会自动迁移旧数据）
psql -d your_database -f src/db/migrations/003_unified_sites.sql
```

对于全新部署，直接运行：
```bash
psql -d your_database -f src/db/schema.sql
psql -d your_database -f src/db/seed.sql
```
