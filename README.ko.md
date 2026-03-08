# NavStation

언어: [English](./README.md) | [简体中文](./README.zh-CN.md) | **한국어** | [日本語](./README.ja.md)

릴리스 내역과 변경 사항은 [CHANGELOG.md](./CHANGELOG.md)를 확인하세요.

NavStation은 사이트 내비게이션, 소프트웨어 배포, QR 표시, 행동 분석, BIND9 DNS 관리를 하나로 통합한 포털 및 관리 시스템입니다.

현재 `en`, `zh-CN`, `ko`, `ja` 4개 언어 라우팅과 번역 콘텐츠 관리를 지원하며, 관리자 설정에서 기본 언어를 변경할 수 있습니다.

## 기술 스택

- **프론트엔드**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript
- **백엔드**: Next.js API Routes + node-postgres
- **데이터베이스**: PostgreSQL 14+
- **인증**: bcryptjs + HttpOnly Cookie + API Key

## 프로젝트 구조

```text
navstation/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # 언어 접두사 라우트
│   │   ├── page.tsx            # 홈 진입점
│   │   ├── HomeClient.tsx      # 홈 클라이언트 컴포넌트
│   │   ├── legacy/             # IE10 호환 페이지
│   │   ├── admin/              # 관리자 영역
│   │   ├── analytics/          # 분석 페이지
│   │   ├── software/           # 소프트웨어 다운로드 페이지
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

## 빠른 시작

### 사전 요구 사항

- Node.js 20+
- PostgreSQL 14+

### 1. 의존성 설치

```bash
npm install
```

회귀 테스트 실행:

```bash
npm test
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성합니다.

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database
JWT_SECRET=your-secret
BAIDU_MAP_AK=your-baidu-map-ak
BAIDU_WEATHER_AK=your-baidu-weather-ak
WEATHER_CACHE_TTL_MINUTES=30
WEATHER_DEFAULT_DISTRICT_ID=441881
WEATHER_DEFAULT_DISTRICT_NAME=Yingde
```

필요하면 DNS/BIND9 관련 옵션도 추가할 수 있습니다.

### 3. 데이터베이스 초기화

```bash
psql -h localhost -U username -d database -f src/db/schema.sql
psql -h localhost -U username -d database -f src/db/seed.sql
```

중국어 지명에서 `district_id` 를 자동 매핑하려면:

```bash
npm run import:weather-districts
node scripts/import-weather-districts.mjs data/weather_district_id.csv
```

로컬 4단계 행정구역을 사용하려면:

```bash
psql -h localhost -U username -d database -f src/db/migrations/011_add_admin_divisions.sql
psql -h localhost -U username -d database -f scripts/import-admin-divisions.sql
```

구버전에서 업그레이드하는 경우:

```bash
psql -h localhost -U username -d database -f src/db/migrations/012_add_analytics_events.sql
psql -h localhost -U username -d database -f src/db/migrations/013_add_i18n_translation_tables.sql
psql -h localhost -U username -d database -f src/db/migrations/014_add_default_locale_setting.sql
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 을 엽니다.

### 5. 프로덕션 빌드

```bash
npm run build
npm run start
```

## Docker 배포

```bash
docker-compose up -d
```

자세한 내용은 [DEPLOY.md](./DEPLOY.md)를 참고하세요.

## 데이터베이스 테이블

| 테이블 | 설명 |
|------|------|
| `categories` | 카테고리 테이블 |
| `sites` | 통합 사이트 테이블 |
| `software` | 소프트웨어 리소스 |
| `users` | 관리자 계정 |
| `click_events` | 레거시 클릭 통계 |
| `analytics_events` | 통합 행동 로그 |
| `site_settings` | 전역 사이트 설정 |
| `category_translations` | 분류 번역 테이블 |
| `site_translations` | 사이트 이름/설명/태그 번역 |
| `software_translations` | 소프트웨어 번역 |
| `site_setting_translations` | 사이트 문구 번역 |
| `api_keys` | 외부 연동용 API Key |
| `phonebook_entries` | 전화번호부 항목 |
| `weather_districts` | 날씨 행정구역 매핑 |
| `weather_cache` | 날씨 응답 캐시 |
| `admin_divisions` | 로컬 4단계 행정구역 |
| `admin_divisions_import` | 행정구역 임시 적재 테이블 |
| `dns_zones` | DNS Zone 설정 |
| `dns_records` | DNS 레코드 |
| `dns_forward_zones` | DNS 포워드 존 |
| `dns_change_logs` | DNS 감사 로그 |

## 주요 API

### 사이트/분류/소프트웨어

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

### 업로드 및 인증

- `POST /api/upload`
- `GET /api/uploads/[...path]`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

### 분석 / 설정 / 전화번호부 / 지역 검색

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

### API Key / DNS / 관리 도구

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

## 기본 계정

- 사용자 이름: `admin`
- 비밀번호: `admin`

## 주요 기능

### 사용자 기능

- **홈 내비게이션**: 카테고리 기반 사이트 탐색과 전체 검색을 제공합니다.
- **고정 날씨 요약 카드**: 홈 화면에서 기본 날씨 요약을 상시 표시합니다. 기본 위치는 `.env` 에서 읽습니다.
- **내선 전화 빠른 검색**: 부서명, 단축번호, 장축번호로 전화번호를 검색합니다.
- **행정구역 조회**: 온라인 검색과 로컬 데이터 검색을 같은 모달에서 지원합니다.
- **소프트웨어 다운로드**: 내부 소프트웨어를 배포하고 다운로드할 수 있습니다.
- **QR 표시**: QR 리소스를 그리드로 표시합니다.
- **IE8+ 호환**: 구형 IE 브라우저용 호환 페이지를 제공합니다.
- **반응형 레이아웃**: 작은 화면에서 사이드바가 자동으로 접힙니다.

### 관리자 기능

- **사이트 관리**
- **카테고리 관리**
- **소프트웨어 관리**
- **전화번호부 관리**
- **DNS 관리**
- **관리 도구**
- **사이트 설정**: 사이트명, 설명, 로고, 버전, 푸터, 브라우저 favicon 설정
- **계정 설정**
- **통합 토스트 메시지**
- **분석 대시보드**

## 외부 시스템 API 연동

NavStation은 API Key 기반 외부 시스템 연동을 지원합니다.

### API Key 생성

1. 관리자 페이지에 로그인합니다.
2. `API 管理` 페이지를 엽니다.
3. `创建密钥` 를 클릭합니다.
4. 이름과 권한을 설정합니다.
5. 전체 키를 즉시 저장합니다. 한 번만 표시됩니다.

### 권한

| 권한 | 설명 |
|------|------|
| `read` | 읽기 전용 |
| `write` | 읽기 + 쓰기 |

### 인증 헤더 예시

```bash
curl -H "X-API-Key: nav_sk_xxxx" https://your-domain/api/sites
curl -H "Authorization: Bearer nav_sk_xxxx" https://your-domain/api/sites
```

## 데이터베이스 마이그레이션

구버전 업그레이드 시 순서대로 실행하세요.

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

## 다국어 지원

- 공개 페이지와 관리자 페이지는 `/en`, `/zh-CN`, `/ko`, `/ja` 같은 언어 접두사 URL로 접근합니다.
- 기본 언어는 관리자 **사이트 설정** 화면에서 변경할 수 있습니다.
- 분류, 사이트, 소프트웨어, 주요 사이트 설정 문구는 4개 언어로 저장할 수 있으며, 번역이 없으면 기본 언어로 자동 대체됩니다.

신규 설치 시:

```bash
psql -d your_database -f src/db/schema.sql
psql -d your_database -f src/db/seed.sql
```
