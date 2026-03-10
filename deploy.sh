#!/usr/bin/env bash
# NavStation 自动部署脚本
# 由 GitLab CI/CD 调用，也可手动执行：bash deploy.sh

set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_PREFIX="[NavStation Deploy]"

log() { echo "$LOG_PREFIX $*"; }
err() { echo "$LOG_PREFIX ERROR: $*" >&2; exit 1; }

# ── 1. 进入项目目录 ────────────────────────────────────────────────────────────
cd "$DEPLOY_DIR"
log "工作目录: $DEPLOY_DIR"

# ── 2. 拉取最新代码 ────────────────────────────────────────────────────────────
log "拉取最新代码..."
git fetch origin
git reset --hard "origin/${CI_COMMIT_BRANCH:-master}"
log "当前提交: $(git rev-parse --short HEAD) - $(git log -1 --format='%s')"

# ── 3. 写入生产环境变量（来自 GitLab CI/CD 变量） ──────────────────────────────
log "生成 .env 文件..."
cat > .env << EOF
# 由 deploy.sh 自动生成，请勿手动编辑
JWT_SECRET=${JWT_SECRET:?请在 GitLab CI/CD 变量中设置 JWT_SECRET}
BAIDU_MAP_AK=${BAIDU_MAP_AK:-}
BAIDU_WEATHER_AK=${BAIDU_WEATHER_AK:-}
WEATHER_CACHE_TTL_MINUTES=${WEATHER_CACHE_TTL_MINUTES:-30}
EOF

# ── 4. 构建并重启服务 ──────────────────────────────────────────────────────────
log "构建 Docker 镜像..."
docker compose build --no-cache app

log "滚动重启服务..."
# 先启动新容器，再停止旧容器，最大限度减少停机时间
docker compose up -d --remove-orphans

# ── 5. 等待健康检查通过 ────────────────────────────────────────────────────────
log "等待服务就绪..."
RETRIES=30
until docker compose exec -T app wget -qO- http://localhost:3000/api/settings > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  [ $RETRIES -eq 0 ] && err "服务启动超时，请检查日志: docker compose logs app"
  log "等待中... ($RETRIES 次剩余)"
  sleep 5
done

# ── 6. 清理旧镜像 ──────────────────────────────────────────────────────────────
log "清理悬空镜像..."
docker image prune -f

log "✓ 部署完成！提交: $(git rev-parse --short HEAD)"
