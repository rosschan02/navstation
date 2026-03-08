# NavStation

言語: [English](./README.md) | [简体中文](./README.zh-CN.md) | [한국어](./README.ko.md) | **日本語**

リリース履歴と変更内容は [CHANGELOG.md](./CHANGELOG.md) を参照してください。

NavStation は、サイトナビゲーション、ソフトウェア配布、QR 表示、行動分析、BIND9 DNS 管理を統合したポータルおよび管理システムです。

現在は `en`、`zh-CN`、`ko`、`ja` の 4 言語ルーティングと翻訳コンテンツ管理に対応し、管理画面からデフォルト言語を変更できます。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript
- **バックエンド**: Next.js API Routes + node-postgres
- **データベース**: PostgreSQL 14+
- **認証**: bcryptjs + HttpOnly Cookie + API Key

## プロジェクト構成

```text
navstation/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # 言語プレフィックス付きルート
│   │   ├── page.tsx            # ホーム入口
│   │   ├── HomeClient.tsx      # ホームのクライアントコンポーネント
│   │   ├── legacy/             # IE10 互換ページ
│   │   ├── admin/              # 管理画面
│   │   ├── analytics/          # 分析ページ
│   │   ├── software/           # ソフトウェア配布ページ
│   │   └── api/                # RESTful API
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── db/
│   ├── types/
│   └── proxy.ts
├── uploads/
├── Dockerfile
├── docker-compose.yml
├── DEPLOY.md
└── CHANGELOG.md
```

## クイックスタート

### 前提条件

- Node.js 20+
- PostgreSQL 14+

### 1. 依存関係のインストール

```bash
npm install
```

必要に応じて回帰テストを実行します。

```bash
npm test
```

### 2. 環境変数の設定

`.env.local` を作成します。

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database
JWT_SECRET=your-secret
BAIDU_MAP_AK=your-baidu-map-ak
BAIDU_WEATHER_AK=your-baidu-weather-ak
WEATHER_CACHE_TTL_MINUTES=30
WEATHER_DEFAULT_DISTRICT_ID=441881
WEATHER_DEFAULT_DISTRICT_NAME=Yingde
```

必要であれば DNS/BIND9 関連の追加設定も利用できます。

### 3. データベース初期化

```bash
psql -h localhost -U username -d database -f src/db/schema.sql
psql -h localhost -U username -d database -f src/db/seed.sql
```

中国語地名から `district_id` を解決したい場合:

```bash
npm run import:weather-districts
node scripts/import-weather-districts.mjs data/weather_district_id.csv
```

ローカルの 4 階層行政区データを使う場合:

```bash
psql -h localhost -U username -d database -f src/db/migrations/011_add_admin_divisions.sql
psql -h localhost -U username -d database -f scripts/import-admin-divisions.sql
```

旧バージョンからのアップグレードでは次も実行します。

```bash
psql -h localhost -U username -d database -f src/db/migrations/012_add_analytics_events.sql
psql -h localhost -U username -d database -f src/db/migrations/013_add_i18n_translation_tables.sql
psql -h localhost -U username -d database -f src/db/migrations/014_add_default_locale_setting.sql
```

### 4. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` を開きます。

### 5. 本番ビルド

```bash
npm run build
npm run start
```

## Docker デプロイ

```bash
docker-compose up -d
```

詳細は [DEPLOY.md](./DEPLOY.md) を参照してください。

## データベーステーブル

| テーブル | 説明 |
|------|------|
| `categories` | カテゴリテーブル |
| `sites` | 統合サイトテーブル |
| `software` | ソフトウェア配布リソース |
| `users` | 管理者アカウント |
| `click_events` | 旧クリック統計テーブル |
| `analytics_events` | 統合行動ログ |
| `site_settings` | サイト全体設定 |
| `category_translations` | カテゴリ翻訳テーブル |
| `site_translations` | サイト名/説明/タグ翻訳 |
| `software_translations` | ソフトウェア翻訳 |
| `site_setting_translations` | サイト文言翻訳 |
| `api_keys` | 外部連携用 API Key |
| `phonebook_entries` | 内線電話帳 |
| `weather_districts` | 天気行政区マッピング |
| `weather_cache` | 天気レスポンスキャッシュ |
| `admin_divisions` | ローカル 4 階層行政区 |
| `admin_divisions_import` | 行政区インポート一時テーブル |
| `dns_zones` | DNS Zone 設定 |
| `dns_records` | DNS レコード |
| `dns_forward_zones` | DNS 転送ゾーン |
| `dns_change_logs` | DNS 監査ログ |

## 主な API

### サイト / カテゴリ / ソフトウェア

- `GET /api/sites`
- `POST /api/sites`
- `PUT /api/sites/:id`
- `DELETE /api/sites/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/software`
- `POST /api/software`
- `PUT /api/software/:id`
- `DELETE /api/software/:id`
- `GET /api/software/:id/download`

### アップロードと認証

- `POST /api/upload`
- `GET /api/uploads/[...path]`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

### 分析 / 設定 / 電話帳 / 地域検索

- `GET /api/analytics?days=7`
- `POST /api/analytics/click`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/phonebook`
- `POST /api/phonebook`
- `GET /api/phonebook/:id`
- `PUT /api/phonebook/:id`
- `DELETE /api/phonebook/:id`
- `GET /api/regions/search`
- `GET /api/admin-divisions`

### API Key / DNS / 管理ツール

- `GET /api/keys`
- `POST /api/keys`
- `PUT /api/keys/:id`
- `DELETE /api/keys/:id`
- `GET /api/dns/zones`
- `POST /api/dns/zones`
- `PUT /api/dns/zones/:id`
- `DELETE /api/dns/zones/:id`
- `GET /api/dns/records`
- `POST /api/dns/records`
- `GET /api/dns/logs`
- `GET /api/dns/forward-zones`
- `POST /api/dns/forward-zones`
- `PUT /api/dns/forward-zones/:id`
- `DELETE /api/dns/forward-zones/:id`
- `POST /api/tools/ping`
- `POST /api/tools/tracert`

## デフォルトアカウント

- ユーザー名: `admin`
- パスワード: `admin`

## 主な機能

### ユーザー向け

- **ホームナビゲーション**: カテゴリ別のサイト表示、全文検索、クライアント IP 表示。
- **固定天気サマリー**: ホーム画面に天気サマリーカードを常時表示。既定地点は `.env` から読み込みます。
- **内線電話クイック検索**: 部署名、短縮番号、長番号で検索可能。
- **行政区域検索**: オンライン検索とローカル DB 検索を同じモーダルで提供。
- **ソフトウェア配布**: 内部ソフトウェアの公開とダウンロード。
- **QR 表示**: QR リソースをグリッド表示。
- **IE8+ 互換**: 古い IE 向けの互換ページを提供。
- **レスポンシブレイアウト**: 小さい画面ではサイドバーが自動的に折りたたまれます。

### 管理者向け

- **サイト管理**
- **カテゴリ管理**
- **ソフトウェア管理**
- **電話帳管理**
- **DNS 管理**
- **管理ツール**
- **サイト設定**: サイト名、説明、ロゴ、バージョン、フッター、ブラウザ favicon を設定
- **アカウント設定**
- **統一トーストメッセージ**
- **分析ダッシュボード**

## 外部システム API 連携

NavStation は API Key ベースの外部連携をサポートします。

### API Key 作成

1. 管理画面にログインします。
2. `API 管理` ページを開きます。
3. `创建密钥` をクリックします。
4. 名前と権限を設定します。
5. 完全なキーをすぐ保存してください。表示は一度だけです。

### 権限

| 権限 | 説明 |
|------|------|
| `read` | 読み取り専用 |
| `write` | 読み書き可能 |

### 認証ヘッダー例

```bash
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/sites
curl -H "Authorization: Bearer nav_sk_xxxx" https://your-domain/api/sites
```

## データベースマイグレーション

旧バージョンからアップグレードする場合は順番に実行してください。

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

## 多言語対応

- 公開ページと管理画面は `/en`、`/zh-CN`、`/ko`、`/ja` のような言語プレフィックス付き URL で利用します。
- デフォルト言語は管理画面の **サイト設定** から変更できます。
- カテゴリ、サイト、ソフトウェア、主要なサイト設定文言は 4 言語で登録でき、未翻訳時はデフォルト言語へフォールバックします。

新規導入時:

```bash
psql -d your_database -f src/db/schema.sql
psql -d your_database -f src/db/seed.sql
```
