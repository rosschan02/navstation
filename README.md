# NavStation

Languages: **English** | [简体中文](./README.zh-CN.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md)

For release history and change details, see [CHANGELOG.md](./CHANGELOG.md).

NavStation is a unified navigation portal and site management system that combines site navigation, software distribution, QR display, behavior analytics, and BIND9 DNS management in one application.

It now supports multilingual site routing and content management for `en`, `zh-CN`, `ko`, and `ja`, including a configurable default language in the admin settings page.
The i18n runtime is now based on `next-intl`, with locale-aware routing, request configuration, navigation helpers, and per-page message loading handled in `src/i18n/*`.
The locale proxy also skips API routes, internal prefetch requests, and static assets such as `/fonts` to prevent redirect loops or broken asset loads after Docker rebuilds.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript
- **i18n**: next-intl
- **Backend**: Next.js API Routes + node-postgres
- **Database**: PostgreSQL 14+
- **Authentication**: bcryptjs + HttpOnly Cookie + API Key

## Project Structure

```text
navstation/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # Locale-prefixed routes
│   │   ├── page.tsx            # Home page entry
│   │   ├── HomeClient.tsx      # Home page client component
│   │   ├── legacy/             # IE10-compatible page
│   │   ├── admin/              # Admin workspace
│   │   ├── analytics/          # Analytics page
│   │   ├── software/           # Software downloads page
│   │   └── api/                # RESTful APIs
│   ├── components/             # Client components
│   ├── contexts/               # Auth and toast/message state
│   ├── i18n/                   # next-intl routing/request/navigation helpers
│   ├── lib/                    # Shared utilities
│   ├── db/                     # PostgreSQL schema, seed, migrations
│   ├── types/                  # TypeScript types
│   └── proxy.ts                # Next.js request interception
├── uploads/                    # Uploaded files
├── Dockerfile
├── docker-compose.yml
├── DEPLOY.md
└── CHANGELOG.md
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### 1. Install Dependencies

```bash
npm install
```

Run local regression tests if needed:

```bash
npm test
```

### 2. Configure Environment Variables

Create `.env.local`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database
JWT_SECRET=your-secret
BAIDU_MAP_AK=your-baidu-map-ak
BAIDU_WEATHER_AK=your-baidu-weather-ak
WEATHER_CACHE_TTL_MINUTES=30
WEATHER_DEFAULT_DISTRICT_ID=441881
WEATHER_DEFAULT_DISTRICT_NAME=Yingde
# Optional: DNS/BIND9 integration
# BIND9_DRY_RUN=1
# BIND9_NSUPDATE_BIN=nsupdate
# BIND9_FORWARD_CONF=/etc/bind/named.conf.forward
# BIND9_RESTART_CMD=systemctl restart named
```

Note: the Docker image already includes `nsupdate` (`bind-tools`).

### 3. Initialize the Database

```bash
# Create tables
psql -h localhost -U username -d database -f src/db/schema.sql

# Seed initial data
psql -h localhost -U username -d database -f src/db/seed.sql
```

Optional: import the Baidu weather district mapping for Chinese place-name to `district_id` resolution.

```bash
npm run import:weather-districts
# Or provide an explicit CSV path
node scripts/import-weather-districts.mjs data/weather_district_id.csv
```

Optional: import local four-level administrative divisions.

```bash
# 1) Create related tables
psql -h localhost -U username -d database -f src/db/migrations/011_add_admin_divisions.sql

# 2) Import/merge data
psql -h localhost -U username -d database -f scripts/import-admin-divisions.sql
```

If you are upgrading from an older version, also run:

```bash
psql -h localhost -U username -d database -f src/db/migrations/012_add_analytics_events.sql
psql -h localhost -U username -d database -f src/db/migrations/013_add_i18n_translation_tables.sql
psql -h localhost -U username -d database -f src/db/migrations/014_add_default_locale_setting.sql
```

### 4. Start the Development Server

```bash
npm run dev
```

Open `http://localhost:3000`.

Locale-prefixed routes are available at `/en`, `/zh-CN`, `/ko`, and `/ja`. The root path `/` will redirect using the browser locale first, then fall back to the admin-configured default locale.

### 5. Production Build

```bash
npm run build
npm run start
```

## Docker Deployment

```bash
docker-compose up -d
```

Locale routing is handled inside Next.js. The bundled `nginx` reverse proxy does not need extra rewrite rules for `/en`, `/zh-CN`, `/ko`, or `/ja`.

See [DEPLOY.md](./DEPLOY.md) for full deployment details.

## Database Tables

| Table | Description |
|------|------|
| `categories` | Categories (`site` / `qrcode` / `software`) |
| `sites` | Unified site table, including normal sites and QR entries |
| `software` | Software resources, including large files |
| `users` | Admin accounts |
| `click_events` | Legacy click-event table kept for compatibility |
| `analytics_events` | Unified behavior log table |
| `site_settings` | Global site settings |
| `category_translations` | Category translations for `en/zh-CN/ko/ja` |
| `site_translations` | Site name/description/tag translations |
| `software_translations` | Software translations |
| `site_setting_translations` | Translated global site text |
| `api_keys` | API keys for external integrations |
| `phonebook_entries` | Internal phonebook entries |
| `weather_districts` | Weather district lookup table |
| `weather_cache` | Cached weather responses |
| `admin_divisions` | Local four-level administrative divisions |
| `admin_divisions_import` | Staging table for admin-division imports |
| `dns_zones` | DNS zone configuration |
| `dns_records` | DNS records and sync state |
| `dns_forward_zones` | Conditional DNS forward zones |
| `dns_change_logs` | DNS audit logs |

### Category Types

| Type | Description |
|------|------|
| `site` | Standard navigation site |
| `qrcode` | QR code category |
| `software` | Software download category |

## API Endpoints

### Site Management

| Path | Method | Description |
|------|------|------|
| `GET /api/sites` | GET | List sites with optional filters |
| `POST /api/sites` | POST | Create a new site or QR entry |
| `PUT /api/sites/:id` | PUT | Update a site |
| `DELETE /api/sites/:id` | DELETE | Delete a site |

### Category Management

| Path | Method | Description |
|------|------|------|
| `GET /api/categories` | GET | List categories |
| `POST /api/categories` | POST | Create a category |
| `PUT /api/categories/:id` | PUT | Update a category |
| `DELETE /api/categories/:id` | DELETE | Delete a category |

### Software

| Path | Method | Description |
|------|------|------|
| `GET /api/software` | GET | List software |
| `POST /api/software` | POST | Upload software with FormData |
| `PUT /api/software/:id` | PUT | Update software metadata |
| `DELETE /api/software/:id` | DELETE | Delete software |
| `GET /api/software/:id/download` | GET | Download the file |

### QR Code Generation

| Path | Method | Description |
|------|------|------|
| `POST /api/qrcode/generate` | POST | Generate a QR PNG from a URL |

### File Upload

| Path | Method | Description |
|------|------|------|
| `POST /api/upload` | POST | Upload images such as logos, site icons, and QR assets |
| `GET /api/uploads/[...path]` | GET | Serve uploaded images |

### Authentication

| Path | Method | Description |
|------|------|------|
| `POST /api/auth/login` | POST | Admin login |
| `GET /api/auth/me` | GET | Current user info |
| `POST /api/auth/logout` | POST | Logout |
| `PUT /api/auth/profile` | PUT | Update avatar |
| `PUT /api/auth/password` | PUT | Change password |

### Analytics

| Path | Method | Description |
|------|------|------|
| `GET /api/analytics?days=7` | GET | Unified analytics dashboard data |
| `POST /api/analytics/click` | POST | Record navigation click events |

### Site Settings

| Path | Method | Description |
|------|------|------|
| `GET /api/settings` | GET | Fetch site settings |
| `PUT /api/settings` | PUT | Update site settings |

### Phonebook

| Path | Method | Description |
|------|------|------|
| `GET /api/phonebook` | GET | List phonebook entries |
| `POST /api/phonebook` | POST | Create a phonebook entry |
| `GET /api/phonebook/:id` | GET | Get one entry |
| `PUT /api/phonebook/:id` | PUT | Update an entry |
| `DELETE /api/phonebook/:id` | DELETE | Delete an entry |

### Administrative Region Lookup

| Path | Method | Description |
|------|------|------|
| `GET /api/regions/search` | GET | Proxy for Baidu Place API v3 region search |
| `GET /api/admin-divisions` | GET | Local admin-division search and drill-down |

### API Key Management

| Path | Method | Description |
|------|------|------|
| `GET /api/keys` | GET | List API keys |
| `POST /api/keys` | POST | Create a new API key |
| `PUT /api/keys/:id` | PUT | Update API key metadata |
| `DELETE /api/keys/:id` | DELETE | Delete an API key |

### DNS Management

| Path | Method | Description |
|------|------|------|
| `GET /api/dns/zones` | GET | List DNS zones |
| `POST /api/dns/zones` | POST | Create a zone |
| `PUT /api/dns/zones/:id` | PUT | Update a zone |
| `DELETE /api/dns/zones/:id` | DELETE | Delete a zone |
| `GET /api/dns/records` | GET | List DNS records |
| `POST /api/dns/records` | POST | Create a DNS record |
| `GET /api/dns/records/:id` | GET | Get one DNS record |
| `PUT /api/dns/records/:id` | PUT | Update a DNS record |
| `DELETE /api/dns/records/:id` | DELETE | Delete a DNS record |
| `GET /api/dns/logs` | GET | List DNS change logs |
| `GET /api/dns/forward-zones` | GET | List forward zones |
| `POST /api/dns/forward-zones` | POST | Create a forward zone |
| `PUT /api/dns/forward-zones/:id` | PUT | Update a forward zone |
| `DELETE /api/dns/forward-zones/:id` | DELETE | Delete a forward zone |

### Admin Tools

| Path | Method | Description |
|------|------|------|
| `POST /api/tools/ping` | POST | Ping test |
| `POST /api/tools/tracert` | POST | Traceroute |

## Default Account

- Username: `admin`
- Password: `admin`

## Main Features

### User Features

- **Home navigation**: Category-based site navigation with full-text search and client IP display.
- **Persistent weather summary**: The home page shows a persistent weather summary card. The default location is read from `.env`.
- **Phonebook quick search**: Search internal departments by name, short code, or long code.
- **Administrative region lookup**: Supports online search and local database search in the same modal.
- **Software downloads**: Publish and download internal software packages.
- **QR display**: Show QR assets in a grid layout.
- **IE8+ compatibility**: Legacy fallback route for old IE browsers.
- **Responsive layout**: Sidebar collapses automatically on smaller screens.

### Admin Features

- **Site management**: Manage sites and QR entries.
- **Category management**: Manage `site`, `qrcode`, and `software` categories.
- **Software management**: Upload and manage software packages up to 4 GB.
- **Phonebook management**: Maintain department phonebook data.
- **DNS management**: Manage BIND9 zones, records, forward zones, and audit logs.
- **Admin tools**: Run Ping and Traceroute from the web UI.
- **Site settings**: Configure site name, description, logo, version, footer text, and browser favicon.
- **Profile settings**: Update avatar and password.
- **Unified messages**: Global success/error/warning/info toasts for admin actions.
- **Analytics dashboard**: Unified dashboard for clicks, queries, sources, and recent activity.

### Icon Picker

The built-in icon picker provides:

- 60+ common Material Symbols
- 9 background colors
- 9 icon colors
- Search/filter support

## External API Integration

NavStation supports API Key based access for external systems.

### Create an API Key

1. Log in to the admin panel.
2. Open the `API 管理` page.
3. Click `创建密钥`.
4. Set the key name and permission.
5. Save the full key immediately. It is shown only once.

### Permission Levels

| Permission | Description |
|------|------|
| `read` | Read-only access |
| `write` | Read + write access |

### Authentication Headers

```bash
# Option 1: X-API-Key
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/sites

# Option 2: Authorization Bearer
curl -H "Authorization: Bearer nav_sk_xxxx" https://your-domain/api/sites
```

### Example Calls

```bash
# List sites
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/sites

# Create a site (write permission required)
curl -X POST \
  -H "X-API-Key: nav_sk_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Site","url":"https://example.com","category_id":1}' \
  https://your-domain/api/sites

# List categories
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/categories

# Fetch analytics
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/analytics?days=7
```

### Error Responses

| HTTP Status | Error Code | Description |
|------|------|------|
| 401 | `UNAUTHORIZED` | Missing authentication |
| 401 | `INVALID_API_KEY` | Invalid or disabled key |
| 403 | `PERMISSION_DENIED` | Insufficient permission |

## Database Migrations

Run migrations in order when upgrading from an older version:

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

## Internationalization

- Public pages and admin pages are available under locale-prefixed routes such as `/en`, `/zh-CN`, `/ko`, and `/ja`.
- The default site language is configurable in **Admin > Site Settings**.
- Categories, sites, software, and selected site settings support translated content stored in dedicated translation tables.

If you enable local administrative divisions, also run:

```bash
psql -d your_database -f scripts/import-admin-divisions.sql
```

For a fresh deployment:

```bash
psql -d your_database -f src/db/schema.sql
psql -d your_database -f src/db/seed.sql
```
