# NavStation 导航站

综合导航门户与站点管理系统，提供分类链接导航、后台管理、二维码画廊和数据分析功能。

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
│   │   ├── page.tsx            # 首页（推荐/常用访问）
│   │   ├── admin/              # 站点管理后台
│   │   ├── analytics/          # 数据分析
│   │   ├── qr/                 # 公众号/小程序二维码
│   │   ├── resources/[page]/   # 资源页（dev/design/read/fun/shop）
│   │   └── api/                # RESTful API
│   │       ├── sites/          # 站点 CRUD
│   │       ├── resources/      # 资源 CRUD
│   │       ├── qrcodes/        # 二维码 CRUD
│   │       ├── categories/     # 分类列表
│   │       ├── auth/           # 登录/登出/当前用户
│   │       └── analytics/      # 统计查询 + 点击记录
│   ├── components/             # 客户端组件
│   │   ├── AppShell.tsx        # 布局壳（Sidebar + 模态框）
│   │   ├── Sidebar.tsx         # 侧边栏导航
│   │   ├── LoginModal.tsx      # 登录弹窗
│   │   └── AddSiteModal.tsx    # 添加站点弹窗
│   ├── contexts/
│   │   └── AuthContext.tsx      # 认证状态管理
│   ├── db/
│   │   ├── index.ts            # PostgreSQL 连接池
│   │   ├── schema.sql          # 建表语句
│   │   └── seed.sql            # 初始化数据
│   └── types/
│       └── index.ts            # TypeScript 类型定义
├── Dockerfile
├── docker-compose.yml
└── DEPLOY.md                   # 部署文档
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
| `categories` | 站点/资源分类 |
| `sites` | 管理后台的导航站点 |
| `resources` | 各资源页面的项目（dev/design/read/fun/shop） |
| `qr_codes` | 公众号/小程序二维码 |
| `users` | 管理员账号（默认 admin/admin） |
| `click_events` | 点击事件统计 |

## API 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/sites` | GET | 站点列表（含分类信息） |
| `POST /api/sites` | POST | 新增站点 |
| `PUT /api/sites/:id` | PUT | 更新站点 |
| `DELETE /api/sites/:id` | DELETE | 删除站点 |
| `GET /api/resources?page=dev` | GET | 按分类获取资源列表 |
| `POST /api/resources` | POST | 新增资源 |
| `PUT /api/resources/:id` | PUT | 更新资源 |
| `DELETE /api/resources/:id` | DELETE | 删除资源 |
| `GET /api/qrcodes` | GET | 二维码列表 |
| `POST /api/qrcodes` | POST | 新增二维码 |
| `PUT /api/qrcodes/:id` | PUT | 更新二维码 |
| `DELETE /api/qrcodes/:id` | DELETE | 删除二维码 |
| `GET /api/categories` | GET | 分类列表 |
| `POST /api/auth/login` | POST | 管理员登录 |
| `GET /api/auth/me` | GET | 获取当前用户 |
| `POST /api/auth/logout` | POST | 退出登录 |
| `GET /api/analytics?days=7` | GET | 统计数据 |
| `POST /api/analytics/click` | POST | 记录点击事件 |

## 默认账号

- 用户名: `admin`
- 密码: `admin`
