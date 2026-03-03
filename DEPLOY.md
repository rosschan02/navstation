# NavStation 部署文档

## 目录

- [Docker Compose 部署（推荐）](#docker-compose-部署推荐)
- [Docker 单独构建](#docker-单独构建)
- [手动部署](#手动部署)
- [环境变量说明](#环境变量说明)
- [数据库管理](#数据库管理)
- [常见问题](#常见问题)

---

## Docker Compose 部署（推荐）

一键启动应用 + PostgreSQL 数据库，数据库会自动建表和导入初始数据。

### 前置条件

- Docker 20.10+
- Docker Compose V2

### 启动

```bash
# 构建并启动所有服务（后台运行）
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

启动后访问 http://localhost:3000

### 停止

```bash
# 停止服务（保留数据）
docker-compose down

# 停止服务并删除数据卷（清除所有数据）
docker-compose down -v
```

### 自定义配置

修改 `docker-compose.yml` 中的环境变量：

```yaml
services:
  db:
    environment:
      POSTGRES_DB: navstation        # 数据库名
      POSTGRES_USER: navstation      # 数据库用户
      POSTGRES_PASSWORD: 你的密码     # 数据库密码

  app:
    ports:
      - "8080:3000"                  # 修改对外端口
    environment:
      DATABASE_URL: postgresql://navstation:你的密码@db:5432/navstation
      JWT_SECRET: 你的JWT密钥
      BAIDU_WEATHER_AK: 你的百度天气AK
      WEATHER_CACHE_TTL_MINUTES: 30
```

### 更新部署

```bash
# 拉取最新代码后重新构建
git pull
docker-compose up -d --build
```

### 导入四级行政区数据（Docker 数据库）

如果你要启用首页「本地行政区查询」按钮，请执行以下步骤：

```bash
# 1) 下载并转换 Excel
mkdir -p data
curl -L "https://mapopen-pub-webserviceapi.cdn.bcebos.com/geocoding/admin_code_251218.xlsx" -o data/admin_code_251218.xlsx
npx -y xlsx-cli -o data/admin_code_251218.csv data/admin_code_251218.xlsx
awk -F',' 'BEGIN{OFS=","} NR==1{sub(/^\xef\xbb\xbf/,"",$1)} NF>=12{print $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12}' data/admin_code_251218.csv > data/admin_code_251218.clean.csv

# 2) 执行迁移与导入（默认 docker-compose 数据库账号）
PGPASSWORD='navstation123' psql -h 127.0.0.1 -U navstation -d navstation -f src/db/migrations/011_add_admin_divisions.sql
PGPASSWORD='navstation123' psql -h 127.0.0.1 -U navstation -d navstation -f scripts/import-admin-divisions.sql
```

校验导入结果：

```bash
PGPASSWORD='navstation123' psql -h 127.0.0.1 -U navstation -d navstation -c "SELECT level, COUNT(*) FROM admin_divisions GROUP BY level ORDER BY level;"
```

预期输出：`1/2/3/4` 四个层级都应有数据。

---

## Docker 单独构建

如果已有外部 PostgreSQL 实例，可以只构建应用镜像。

### 构建镜像

```bash
docker build -t navstation .
```

### 运行容器

```bash
docker run -d \
  --name navstation \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名" \
  -e JWT_SECRET="你的JWT密钥" \
  -e BAIDU_WEATHER_AK="你的百度天气AK" \
  -e WEATHER_CACHE_TTL_MINUTES="30" \
  navstation
```

### 初始化外部数据库

连接到你的 PostgreSQL，执行建表和数据导入：

```bash
psql -h 数据库地址 -U 用户名 -d 数据库名 -f src/db/schema.sql
psql -h 数据库地址 -U 用户名 -d 数据库名 -f src/db/seed.sql
```

---

## 手动部署

不使用 Docker，直接在服务器上运行。

### 前置条件

- Node.js 20+
- PostgreSQL 14+
- npm 或 pnpm

### 步骤

#### 1. 安装依赖

```bash
npm ci
```

#### 2. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
DATABASE_URL=postgresql://用户名:密码@localhost:5432/数据库名
JWT_SECRET=你的JWT密钥
BAIDU_WEATHER_AK=你的百度天气AK
WEATHER_CACHE_TTL_MINUTES=30
```

#### 3. 初始化数据库

```bash
# 建表（6 张表 + 4 个索引）
psql -h localhost -U 用户名 -d 数据库名 -f src/db/schema.sql

# 导入初始数据（分类、站点、资源、二维码、管理员账号、示例点击数据）
psql -h localhost -U 用户名 -d 数据库名 -f src/db/seed.sql

# 可选：导入天气行政区划映射表（中文地名查询天气会用到）
npm run import:weather-districts

# 可选：导入本地四级行政区（本地行政区查询按钮会用到）
psql -h localhost -U 用户名 -d 数据库名 -f src/db/migrations/011_add_admin_divisions.sql
psql -h localhost -U 用户名 -d 数据库名 -f scripts/import-admin-divisions.sql
```

#### 4. 构建

```bash
npm run build
```

#### 5. 启动

```bash
npm run start
```

默认监听 3000 端口。

#### 6. 使用 PM2 守护进程（推荐）

```bash
npm install -g pm2

pm2 start npm --name navstation -- start
pm2 save
pm2 startup
```

### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 环境变量说明

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 连接字符串 | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | 是 | 认证令牌加密密钥，生产环境请使用随机字符串 | `openssl rand -base64 32` 生成 |
| `BAIDU_WEATHER_AK` | 建议 | 百度天气 API 密钥（天气查询） | 控制台申请 |
| `WEATHER_CACHE_TTL_MINUTES` | 否 | 天气缓存时长（分钟）默认 30 | `30` |
| `PORT` | 否 | 应用监听端口，默认 3000 | `3000` |

---

## 数据库管理

### 表结构

```
categories             - 分类
sites                  - 导航站点
software               - 软件下载
users                  - 管理员
click_events           - 点击事件统计
site_settings          - 站点设置
api_keys               - API 密钥
phonebook_entries      - 电话本条目
weather_districts      - 天气行政区映射
weather_cache          - 天气缓存
admin_divisions        - 本地四级行政区
admin_divisions_import - 本地行政区导入暂存表
dns_zones              - DNS 区域
dns_records            - DNS 记录
dns_forward_zones      - DNS 转发区域
dns_change_logs        - DNS 审计日志
```

### 重置数据库

```bash
# 删除所有表
psql -U 用户名 -d 数据库名 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 重新建表 + 导入数据
psql -U 用户名 -d 数据库名 -f src/db/schema.sql
psql -U 用户名 -d 数据库名 -f src/db/seed.sql
```

### 修改管理员密码

```bash
# 生成新的 bcrypt hash
node -e "require('bcryptjs').hash('新密码', 10).then(h => console.log(h))"

# 更新数据库
psql -U 用户名 -d 数据库名 -c "UPDATE users SET password_hash='生成的hash' WHERE username='admin';"
```

### 备份与恢复

```bash
# 备份
pg_dump -U 用户名 -d 数据库名 > backup.sql

# 恢复
psql -U 用户名 -d 数据库名 < backup.sql
```

---

## 常见问题

### 1. Docker Compose 启动后 app 连不上数据库

app 服务设置了 `depends_on` + `healthcheck`，会等待数据库就绪。如果仍然失败：

```bash
# 检查数据库是否健康
docker-compose ps

# 查看数据库日志
docker-compose logs db

# 重启 app 服务
docker-compose restart app
```

### 2. 端口 3000 被占用

修改 `docker-compose.yml` 中 app 的端口映射：

```yaml
ports:
  - "8080:3000"   # 改为 8080 对外
```

或手动部署时设置环境变量：

```bash
PORT=8080 npm run start
```

### 3. 生产环境安全建议

- 修改默认管理员密码
- 设置强 `JWT_SECRET`（使用 `openssl rand -base64 32` 生成）
- 使用 HTTPS（Nginx + Let's Encrypt）
- 设置 PostgreSQL 强密码并限制网络访问
- Docker Compose 中不要对外暴露 5432 端口（删除 db 的 ports 配置）
