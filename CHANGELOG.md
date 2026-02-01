# Changelog

本文件记录 NavStation 导航站的所有重要更新。

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
