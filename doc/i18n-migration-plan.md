# i18n 重构计划：从自建系统迁移到 next-intl

> 生成日期：2026-03-11
> 项目：NavStation
> 目标：使用 `next-intl` 替换自建 i18n 系统，实现标准化国际化

---

## 1. 背景

NavStation 当前使用自建 i18n 系统：

| 现状 | 详情 |
|------|------|
| 翻译系统 | `translate.ts` — 271 条精确翻译 + 42 条片段翻译 |
| 自动翻译 | `LocaleAutoTranslate.tsx` — MutationObserver 遍历 DOM |
| 客户端上下文 | `LocaleContext.tsx` — 提供 `t()` 和 `withLocalePath()` |
| 中间件 | `proxy.ts` — 处理 locale 路由和重定向 |
| 支持语言 | `en`, `zh-CN`, `ko`, `ja`（中文为源语言） |
| 数据库翻译 | `content.ts` — 站点/分类/软件/设置的多语言内容 |

**存在的问题：**
- ~19 个组件文件中有 **250+ 硬编码中文字符串** 未纳入翻译系统
- 路由结构重复（`/admin` 和 `/[locale]/admin` 并存）
- `next-i18next` 不兼容 App Router（本项目使用 Next.js 16 App Router）
- 自建方案缺乏类型安全和社区生态支持

**选择 `next-intl` 的理由：**
- App Router 官方推荐方案
- 支持 Server/Client Components
- 类型安全的翻译 key
- ICU 消息格式支持
- 活跃的社区维护

---

## 2. 总览

```
Phase 0  安装 next-intl
    │
Phase 1  创建配置文件（routing, middleware, request, navigation）
    │
Phase 2  构建 4 语言 JSON 消息文件
    │
Phase 3  路由重构 — 移动组件，统一到 /[locale]/ 下
    │
Phase 4  更新客户端组件（~19 个文件，250+ 字符串）
    │
Phase 5  更新服务端组件和 metadata
    │
Phase 6  删除旧系统文件
    │
Phase 7  验证和测试
```

---

## 3. Phase 0: 安装依赖

```bash
npm install next-intl
```

---

## 4. Phase 1: 创建 next-intl 配置

### 4.1 `src/i18n/routing.ts` (新建)

定义路由配置：

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh-CN', 'ko', 'ja'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
```

### 4.2 `src/i18n/navigation.ts` (新建)

创建 locale-aware 导航工具：

```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

替代现有的 `withLocalePath()` 和手动路径构建。

### 4.3 `src/i18n/request.ts` (新建)

服务端请求配置：

```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### 4.4 `src/middleware.ts` (新建，替换 `src/proxy.ts`)

```ts
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过 API、静态资源等路径
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/fonts') ||
    pathname === '/favicon.ico' ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // IE 兼容重定向
  const ua = request.headers.get('user-agent') || '';
  if (/MSIE [89]\.0|MSIE 10\.0|Trident\/7\.0/.test(ua) && pathname === '/') {
    return NextResponse.redirect(new URL('/legacy', request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
```

### 4.5 `next.config.ts` (修改)

```ts
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  output: 'standalone',
  // ... existing config
};

export default withNextIntl(nextConfig);
```

---

## 5. Phase 2: 构建消息文件

在项目根目录创建 `messages/` 目录，包含 4 个语言文件。

### 5.1 命名空间设计

```
messages/
├── en.json
├── zh-CN.json
├── ko.json
└── ja.json
```

每个文件结构：

```jsonc
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "confirm": "确认",
    "upload": "上传",
    "search": "搜索",
    "loading": "加载中...",
    "close": "关闭",
    "refresh": "刷新",
    "add": "添加",
    "name": "名称",
    "description": "描述",
    "status": "状态",
    "active": "启用",
    "inactive": "禁用",
    "sortOrder": "排序",
    "actions": "操作",
    "total": "总数",
    "filterResults": "筛选结果",
    "noResults": "没有找到匹配结果",
    "processing": "处理中..."
  },
  "nav": {
    "home": "首页",
    "softwareDownload": "软件下载",
    "siteManagement": "站点管理",
    "categoryManagement": "分类管理",
    "softwareManagement": "软件管理",
    "phonebookManagement": "院内电话管理",
    "dnsManagement": "DNS 管理",
    "analytics": "数据统计",
    "apiKeys": "API 密钥管理",
    "accountSettings": "账号设置",
    "adminTools": "管理工具",
    "siteSettings": "站点设置",
    "adminLogin": "管理员登录",
    "collapse": "收起侧边栏",
    "expand": "展开侧边栏"
  },
  "auth": {
    "adminLogin": "管理员登录",
    "enterCredentials": "请输入凭据以访问工作区",
    "account": "账号",
    "password": "密码",
    "enterUsername": "请输入用户名",
    "enterPassword": "请输入密码",
    "signIn": "登录",
    "signOut": "退出登录",
    "guestUser": "访客用户",
    "administrator": "管理员",
    "signedIn": "已登录",
    "readOnlyMode": "只读模式"
  },
  "home": { /* 首页相关 */ },
  "weather": { /* 天气相关 */ },
  "admin": { /* 站点管理 */ },
  "categories": { /* 分类管理 */ },
  "settings": { /* 站点设置 */ },
  "software": { /* 软件管理 */ },
  "dns": { /* DNS 管理 */ },
  "phonebook": { /* 电话簿 */ },
  "profile": { /* 个人资料 */ },
  "tools": { /* 管理工具 */ },
  "keys": { /* API 密钥 */ },
  "iconPicker": { /* 图标选择器 */ },
  "messages": { /* Toast 提示 */ }
}
```

### 5.2 数据来源

| 来源 | 处理方式 |
|------|---------|
| `translate.ts` EXACT_TRANSLATIONS (271条) | 中文值 → `zh-CN.json`，英文/韩文/日文值 → 对应 JSON |
| `translate.ts` SEGMENT_TRANSLATIONS (42条) | 同上 |
| 组件硬编码中文 (~250+条) | 提取为新 key，手动翻译到 4 语言 |

---

## 6. Phase 3: 路由重构

### 6.1 当前结构问题

```
src/app/
├── admin/                    ← 实际组件所在（旧路由）
│   ├── AdminClient.tsx
│   ├── page.tsx
│   ├── categories/
│   │   ├── CategoriesClient.tsx
│   │   └── page.tsx
│   └── ... (其他子页面)
├── HomeClient.tsx
├── page.tsx
└── [locale]/
    ├── layout.tsx
    ├── page.tsx              ← re-export from ../../page
    └── admin/
        ├── page.tsx          ← re-export from ../../../admin/page
        └── categories/
            └── page.tsx      ← re-export
```

### 6.2 目标结构

```
src/app/
├── layout.tsx                ← 简化为空 shell
├── page.tsx                  ← 删除或重定向
└── [locale]/
    ├── layout.tsx            ← NextIntlClientProvider
    ├── page.tsx              ← 实际首页
    ├── HomeClient.tsx        ← 移动到这里
    ├── admin/
    │   ├── page.tsx          ← 实际管理页
    │   ├── AdminClient.tsx   ← 移动到这里
    │   ├── categories/
    │   │   ├── page.tsx
    │   │   └── CategoriesClient.tsx
    │   └── ... (其他子页面)
    ├── software/
    └── analytics/
```

### 6.3 操作步骤

1. 移动所有 `*Client.tsx` 到 `[locale]/` 对应目录
2. 更新 `[locale]/*/page.tsx` 的 import 路径
3. 删除 `src/app/admin/` 整个目录
4. 删除 `src/app/HomeClient.tsx`（已移动）

### 6.4 Layout 变更

**根 layout (`src/app/layout.tsx`)：**
```tsx
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

**Locale layout (`src/app/[locale]/layout.tsx`)：**
```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { routing } from '@/i18n/routing';
import { getLocalizedSettings } from '@/lib/i18n/content';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const settings = await getLocalizedSettings(locale);
  return {
    title: `${settings.site_name} - NavStation`,
    description: settings.site_description,
    icons: { icon: settings.site_icon_url || '/favicon.ico' },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) notFound();

  const messages = await getMessages();
  return (
    <html lang={locale}>
      <head />
      <body className="bg-background-light text-slate-900 overflow-hidden">
        <NextIntlClientProvider messages={messages}>
          <AppShell>{children}</AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## 7. Phase 4: 更新客户端组件

### 7.1 模式变更

```tsx
// ============ 旧方式 ============
import { useLocaleContext } from '@/contexts/LocaleContext';

function MyComponent() {
  const { t, withLocalePath } = useLocaleContext();
  return (
    <div>
      <span>站点管理</span>  {/* 硬编码中文 */}
      <a href={withLocalePath('/admin')}>管理</a>
    </div>
  );
}

// ============ 新方式 ============
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

function MyComponent() {
  const t = useTranslations('admin');
  return (
    <div>
      <span>{t('siteManagement')}</span>
      <Link href="/admin">{t('manage')}</Link>  {/* 自动添加 locale 前缀 */}
    </div>
  );
}
```

### 7.2 更新列表（按依赖顺序）

| # | 文件 | 字符串数 | 命名空间 |
|---|------|---------|---------|
| 1 | `AppShell.tsx` | 0 | - (移除 LocaleAutoTranslate) |
| 2 | `MessageContext.tsx` | 0 | - (移除 useLocaleContext) |
| 3 | `Sidebar.tsx` | ~12 | `nav` |
| 4 | `LocaleSwitcher.tsx` | ~4 | `common` |
| 5 | `LoginModal.tsx` | ~8 | `auth` |
| 6 | `ConfirmDialog.tsx` | ~3 | `common` |
| 7 | `IconPicker.tsx` | ~15 | `iconPicker` |
| 8 | `HomeClient.tsx` | ~15 | `home`, `weather` |
| 9 | `AdminClient.tsx` | ~20 | `admin` |
| 10 | `CategoriesClient.tsx` | ~18 | `categories` |
| 11 | `SettingsClient.tsx` | ~25 | `settings` |
| 12 | `SoftwareAdminClient.tsx` | ~28 | `software` |
| 13 | `DnsClient.tsx` | ~40+ | `dns` |
| 14 | `KeysClient.tsx` | ~12 | `keys` |
| 15 | `PhonebookClient.tsx` | ~18 | `phonebook` |
| 16 | `ProfileClient.tsx` | ~8 | `profile` |
| 17 | `ToolsClient.tsx` | ~10 | `tools` |
| 18 | Modal 组件 (3-4个) | ~20 | `home`, `phonebook` |
| 19 | `SoftwareClient.tsx` | ~5 | `software` |

### 7.3 MessageContext 迁移

当前 `MessageContext` 接收中文字符串并通过 `t()` 翻译：

```tsx
// 旧：
message.success('站点创建成功');  // MessageContext 内部调 t() 翻译

// 新：调用方先翻译
const t = useTranslations('messages');
message.success(t('siteCreated'));  // MessageContext 直接显示
```

---

## 8. Phase 5: 更新服务端组件

- 各 `page.tsx` 中用 route param `locale` 替代 `getServerLocale()`
- `generateMetadata` 使用 `getTranslations()` from `next-intl/server`

---

## 9. Phase 6: 清理

### 9.1 删除的文件

| 文件 | 原因 |
|------|------|
| `src/components/LocaleAutoTranslate.tsx` | 被 next-intl 替代 |
| `src/contexts/LocaleContext.tsx` | 被 `useTranslations()` 替代 |
| `src/lib/i18n/translate.ts` | 翻译迁移到 JSON 文件 |
| `src/lib/i18n/request.ts` | 被 `src/i18n/request.ts` 替代 |
| `src/proxy.ts` | 被 `src/middleware.ts` 替代 |
| `src/app/admin/` (整个目录) | 组件已移动到 `[locale]/admin/` |
| `src/app/HomeClient.tsx` | 已移动到 `[locale]/` |

### 9.2 保留的文件

| 文件 | 变更 |
|------|------|
| `src/lib/i18n/config.ts` | 保留类型和常量，删除路径构建函数 |
| `src/lib/i18n/content.ts` | 完全保留（数据库内容翻译不变） |

---

## 10. Phase 7: 验证清单

- [ ] `npm run build` 无报错
- [ ] 访问 `/en/`, `/zh-CN/`, `/ko/`, `/ja/` 均正确渲染
- [ ] LocaleSwitcher 切换语言正常工作
- [ ] `/api/*` 路由不受中间件影响
- [ ] 数据库内容（站点名、分类名等）按语言正确显示
- [ ] Toast 提示消息按当前语言显示
- [ ] `/` 正确重定向到 `/{defaultLocale}/`
- [ ] 静态资源、`/_next`、`/uploads` 路径不受影响
- [ ] IE 浏览器正确重定向到 `/legacy`

---

## 11. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Next.js 16 + next-intl 兼容性 | 高 | 安装后先验证基础功能 |
| 翻译 key 遗漏 | 中 | 逐文件对照检查 |
| 路由重构导致 404 | 高 | 原子化操作，build 验证 |
| MessageContext 调用方未更新 | 中 | 全局搜索 `message.success/error` |
| 数据库默认 locale 动态获取 | 低 | middleware 中保留 API 调用或改用环境变量 |

---

## 12. 文件变更汇总

| 操作 | 文件数 |
|------|--------|
| 新建 | ~8 (配置 4 + JSON 4) |
| 移动 | ~10 (*Client.tsx 移动到 [locale]/) |
| 修改 | ~22 (组件更新 19 + layout 2 + config 1) |
| 删除 | ~7 (旧系统文件) |
| **合计** | **~47 个文件变更** |
