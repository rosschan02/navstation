# GitLab 自动部署配置指南

本项目通过 GitLab CI/CD + GitLab Runner 实现推送代码后自动部署。

## 原理

```
开发机 git push → GitLab → 触发 Pipeline → Runner 在部署服务器执行 deploy.sh
                                                  ↓
                                        docker compose build & up
```

---

## 第一步：在部署服务器上安装 GitLab Runner

> 部署服务器 = 运行 Docker Compose 的那台机器

```bash
# 添加 GitLab Runner 官方仓库（以 Debian/Ubuntu 为例）
curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | sudo bash
sudo apt install gitlab-runner

# CentOS/RHEL
curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh | sudo bash
sudo yum install gitlab-runner
```

---

## 第二步：注册 Runner

在 GitLab 项目页面找到 Runner 注册令牌：
**Settings → CI/CD → Runners → New project runner**

```bash
sudo gitlab-runner register
```

按提示填写：

| 问题 | 填写内容 |
|------|---------|
| GitLab URL | `http://你的GitLab局域网地址/` |
| Registration token | 从 GitLab 项目设置复制 |
| Description | `navstation-server` |
| Tags | `navstation-deploy` （必须与 .gitlab-ci.yml 中一致） |
| Executor | `shell` |

---

## 第三步：给 Runner 用户 Docker 权限

```bash
# gitlab-runner 用户需要能操作 Docker
sudo usermod -aG docker gitlab-runner

# 验证
sudo -u gitlab-runner docker ps
```

---

## 第四步：初始化部署目录

在部署服务器上克隆项目（仅首次）：

```bash
sudo mkdir -p /opt/navstation
sudo chown gitlab-runner:gitlab-runner /opt/navstation
sudo -u gitlab-runner git clone http://你的GitLab地址/用户名/navstation.git /opt/navstation
```

---

## 第五步：在 GitLab 配置 CI/CD 变量（保存密钥）

**Settings → CI/CD → Variables → Add variable**

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `JWT_SECRET` | 随机字符串 | 必填，至少32位，勾选 Masked |
| `BAIDU_MAP_AK` | 你的Key | 可选 |
| `BAIDU_WEATHER_AK` | 你的Key | 可选 |
| `DEPLOY_HOST` | 服务器IP | 用于 CI 界面显示 Environment URL |

生成随机 JWT_SECRET：
```bash
openssl rand -base64 32
```

---

## 第六步：推送代码触发部署

```bash
git push origin master   # 或 main
```

在 GitLab 项目的 **CI/CD → Pipelines** 页面查看部署进度。

---

## 手动部署（不经过 CI/CD）

```bash
cd /opt/navstation
# 设置必要环境变量
export JWT_SECRET="你的密钥"
bash deploy.sh
```

---

## 常见问题

**Runner 无法连接 GitLab？**
```bash
# 检查 Runner 状态
sudo gitlab-runner status
sudo gitlab-runner verify
```

**Docker 权限问题？**
```bash
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner
```

**查看部署日志**
```bash
# 在部署服务器上查看应用日志
docker compose -p navstation logs -f
```

**回滚到上一个版本**
```bash
cd /opt/navstation
git log --oneline -5          # 找到上一个提交 hash
git checkout <上一个hash>
bash deploy.sh
```
