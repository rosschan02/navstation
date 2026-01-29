# Changelog

本文件记录 NavStation 导航站的所有重要更新。

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
