# ---- 阶段 1: 安装依赖 ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ---- 阶段 2: 构建 ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建时需要 DATABASE_URL，使用占位值（运行时会被覆盖）
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/navstation
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- 阶段 3: 运行 ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache bind-tools

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 从 standalone 输出复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建 uploads 目录并设置权限
RUN mkdir -p /app/uploads/logos /app/uploads/qr && \
    chown -R nextjs:nodejs /app/uploads

# 复制数据库迁移脚本（供初始化使用）
COPY --from=builder /app/src/db/schema.sql ./src/db/schema.sql
COPY --from=builder /app/src/db/seed.sql ./src/db/seed.sql

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
