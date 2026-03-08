import { PoolClient } from 'pg';
import pool from '@/db';
import type {
  Category,
  CategoryTranslationFields,
  LocaleMap,
  LocalizedSettingFields,
  SiteData,
  SiteSettings,
  SiteTranslationFields,
  SoftwareItem,
  SoftwareTranslationFields,
} from '@/types';
import { DEFAULT_LOCALE, type Locale } from './config';

export const LOCALIZABLE_SETTING_KEYS = [
  'site_name',
  'site_description',
  'site_version',
  'footer_text',
] as const;

type SettingKey = (typeof LOCALIZABLE_SETTING_KEYS)[number];

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: '导航站',
  site_description: '综合导航门户与站点管理仪表板',
  site_version: 'v2.0 中文版',
  footer_text: '© 2024 通用站点导航。保留所有权利。',
  logo_url: '',
  site_icon_url: '',
  default_locale: DEFAULT_LOCALE,
  translations: {},
};

export async function getConfiguredDefaultLocale(): Promise<Locale> {
  try {
    const { rows } = await pool.query<{ value: string }>(
      `SELECT value FROM site_settings WHERE key = 'default_locale' LIMIT 1`
    );
    const value = rows[0]?.value;
    return value === 'en' || value === 'zh-CN' || value === 'ko' || value === 'ja'
      ? value
      : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function hasMeaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => String(item || '').trim());
  return typeof value === 'string' ? value.trim().length > 0 : false;
}

function normalizeLocaleMap<T>(value: unknown): LocaleMap<T> {
  return value && typeof value === 'object' ? (value as LocaleMap<T>) : {};
}

export async function getLocalizedCategories(locale: Locale, includeTranslations = false): Promise<Category[]> {
  const fallbackLocale = await getConfiguredDefaultLocale();
  const { rows } = await pool.query<Category & { translations_json?: unknown }>(
    `
      SELECT
        c.id,
        COALESCE(ct_locale.name, ct_default.name, c.name) AS name,
        COALESCE(ct_locale.label, ct_default.label, c.label) AS label,
        c.type,
        c.css_class,
        c.icon,
        c.icon_bg,
        c.icon_color,
        c.sort_order,
        c.created_at,
        translations.translations_json
      FROM categories c
      LEFT JOIN category_translations ct_locale
        ON ct_locale.category_id = c.id AND ct_locale.locale = $1
      LEFT JOIN category_translations ct_default
        ON ct_default.category_id = c.id AND ct_default.locale = $2
      LEFT JOIN (
        SELECT
          category_id,
          jsonb_object_agg(locale, jsonb_build_object('name', name, 'label', label)) AS translations_json
        FROM category_translations
        GROUP BY category_id
      ) translations ON translations.category_id = c.id
      ORDER BY c.sort_order ASC, c.id ASC
    `,
    [locale, fallbackLocale]
  );

  return rows.map((row) => ({
    ...row,
    translations: includeTranslations ? normalizeLocaleMap<CategoryTranslationFields>(row.translations_json) : undefined,
  }));
}

export async function getLocalizedSites(locale: Locale, includeInactive = false, includeTranslations = false): Promise<SiteData[]> {
  const fallbackLocale = await getConfiguredDefaultLocale();
  const where = includeInactive ? '' : `WHERE s.status = 'active'`;
  const { rows } = await pool.query<SiteData & { translations_json?: unknown }>(
    `
      SELECT
        s.id,
        COALESCE(st_locale.name, st_default.name, s.name) AS name,
        COALESCE(st_locale.description, st_default.description, s.description) AS description,
        s.url,
        s.category_id,
        s.logo,
        s.icon,
        s.icon_bg,
        s.icon_color,
        s.qr_image,
        COALESCE(st_locale.tags, st_default.tags, s.tags) AS tags,
        s.sort_order,
        s.status,
        s.created_at,
        s.updated_at,
        c.name AS category_name,
        COALESCE(ct_locale.label, ct_default.label, c.label) AS category_label,
        c.type AS category_type,
        site_translations.translations_json
      FROM sites s
      LEFT JOIN categories c ON c.id = s.category_id
      LEFT JOIN site_translations st_locale
        ON st_locale.site_id = s.id AND st_locale.locale = $1
      LEFT JOIN site_translations st_default
        ON st_default.site_id = s.id AND st_default.locale = $2
      LEFT JOIN category_translations ct_locale
        ON ct_locale.category_id = c.id AND ct_locale.locale = $1
      LEFT JOIN category_translations ct_default
        ON ct_default.category_id = c.id AND ct_default.locale = $2
      LEFT JOIN (
        SELECT
          site_id,
          jsonb_object_agg(
            locale,
            jsonb_build_object('name', name, 'description', description, 'tags', to_jsonb(tags))
          ) AS translations_json
        FROM site_translations
        GROUP BY site_id
      ) site_translations ON site_translations.site_id = s.id
      ${where}
      ORDER BY c.sort_order ASC NULLS LAST, s.sort_order ASC, s.created_at DESC
    `,
    [locale, fallbackLocale]
  );

  return rows.map((row) => ({
    ...row,
    translations: includeTranslations ? normalizeLocaleMap<SiteTranslationFields>(row.translations_json) : undefined,
  }));
}

export async function getLocalizedSoftware(locale: Locale, includeTranslations = false): Promise<SoftwareItem[]> {
  const fallbackLocale = await getConfiguredDefaultLocale();
  const { rows } = await pool.query<SoftwareItem & { translations_json?: unknown }>(
    `
      SELECT
        s.id,
        COALESCE(st_locale.name, st_default.name, s.name) AS name,
        COALESCE(st_locale.description, st_default.description, s.description) AS description,
        s.version,
        s.category_id,
        s.file_name,
        s.file_path,
        s.file_size,
        s.logo,
        s.icon,
        s.icon_bg,
        s.icon_color,
        s.sort_order,
        s.download_count,
        s.created_at,
        s.updated_at,
        c.name AS category_name,
        COALESCE(ct_locale.label, ct_default.label, c.label) AS category_label,
        software_translations.translations_json
      FROM software s
      LEFT JOIN categories c ON c.id = s.category_id
      LEFT JOIN software_translations st_locale
        ON st_locale.software_id = s.id AND st_locale.locale = $1
      LEFT JOIN software_translations st_default
        ON st_default.software_id = s.id AND st_default.locale = $2
      LEFT JOIN category_translations ct_locale
        ON ct_locale.category_id = c.id AND ct_locale.locale = $1
      LEFT JOIN category_translations ct_default
        ON ct_default.category_id = c.id AND ct_default.locale = $2
      LEFT JOIN (
        SELECT
          software_id,
          jsonb_object_agg(locale, jsonb_build_object('name', name, 'description', description)) AS translations_json
        FROM software_translations
        GROUP BY software_id
      ) software_translations ON software_translations.software_id = s.id
      ORDER BY s.sort_order ASC, s.created_at DESC
    `,
    [locale, fallbackLocale]
  );

  return rows.map((row) => ({
    ...row,
    translations: includeTranslations ? normalizeLocaleMap<SoftwareTranslationFields>(row.translations_json) : undefined,
  }));
}

export async function getLocalizedSettings(locale: Locale): Promise<SiteSettings> {
  const fallbackLocale = await getConfiguredDefaultLocale();
  const settings = { ...DEFAULT_SETTINGS, translations: {} as SiteSettings['translations'] };
  const { rows } = await pool.query<{ key: string; value: string }>(
    `
      SELECT
        base.key,
        COALESCE(st_locale.value, st_default.value, base.value) AS value
      FROM site_settings base
      LEFT JOIN site_setting_translations st_locale
        ON st_locale.setting_key = base.key AND st_locale.locale = $1
      LEFT JOIN site_setting_translations st_default
        ON st_default.setting_key = base.key AND st_default.locale = $2
    `,
    [locale, fallbackLocale]
  );

  for (const row of rows) {
    const key = row.key as keyof SiteSettings;
    if (key in settings) {
      settings[key] = row.value as never;
    }
  }

  const { rows: translationRows } = await pool.query<{ setting_key: SettingKey; locale: Locale; value: string }>(
    `
      SELECT setting_key, locale, value
      FROM site_setting_translations
      WHERE setting_key = ANY($1::text[])
    `,
    [LOCALIZABLE_SETTING_KEYS]
  );

  for (const row of translationRows) {
    settings.translations ||= {};
    settings.translations[row.locale] ||= {};
    settings.translations[row.locale]![row.setting_key] = row.value;
  }

  return settings;
}

export async function upsertCategoryTranslations(
  client: PoolClient,
  categoryId: number,
  translations?: LocaleMap<CategoryTranslationFields>
) {
  if (!translations) return;

  for (const [locale, fields] of Object.entries(translations) as [Locale, CategoryTranslationFields][]) {
    if (!fields) continue;
    if (!hasMeaningfulValue(fields.name) && !hasMeaningfulValue(fields.label)) {
      await client.query('DELETE FROM category_translations WHERE category_id = $1 AND locale = $2', [categoryId, locale]);
      continue;
    }

    await client.query(
      `
        INSERT INTO category_translations (category_id, locale, name, label, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (category_id, locale)
        DO UPDATE SET
          name = EXCLUDED.name,
          label = EXCLUDED.label,
          updated_at = NOW()
      `,
      [categoryId, locale, fields.name || '', fields.label || '']
    );
  }
}

export async function upsertSiteTranslations(
  client: PoolClient,
  siteId: number,
  translations?: LocaleMap<SiteTranslationFields>
) {
  if (!translations) return;

  for (const [locale, fields] of Object.entries(translations) as [Locale, SiteTranslationFields][]) {
    if (!fields) continue;
    if (!hasMeaningfulValue(fields.name) && !hasMeaningfulValue(fields.description) && !hasMeaningfulValue(fields.tags)) {
      await client.query('DELETE FROM site_translations WHERE site_id = $1 AND locale = $2', [siteId, locale]);
      continue;
    }

    await client.query(
      `
        INSERT INTO site_translations (site_id, locale, name, description, tags, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (site_id, locale)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          updated_at = NOW()
      `,
      [siteId, locale, fields.name || '', fields.description || '', fields.tags || []]
    );
  }
}

export async function upsertSoftwareTranslations(
  client: PoolClient,
  softwareId: number,
  translations?: LocaleMap<SoftwareTranslationFields>
) {
  if (!translations) return;

  for (const [locale, fields] of Object.entries(translations) as [Locale, SoftwareTranslationFields][]) {
    if (!fields) continue;
    if (!hasMeaningfulValue(fields.name) && !hasMeaningfulValue(fields.description)) {
      await client.query('DELETE FROM software_translations WHERE software_id = $1 AND locale = $2', [softwareId, locale]);
      continue;
    }

    await client.query(
      `
        INSERT INTO software_translations (software_id, locale, name, description, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (software_id, locale)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW()
      `,
      [softwareId, locale, fields.name || '', fields.description || '']
    );
  }
}

export async function upsertSettingTranslations(
  client: PoolClient,
  translations?: LocaleMap<Partial<LocalizedSettingFields>>
) {
  if (!translations) return;

  for (const [locale, fields] of Object.entries(translations) as [Locale, Partial<LocalizedSettingFields>][]) {
    if (!fields) continue;
    for (const key of LOCALIZABLE_SETTING_KEYS) {
      const value = fields[key];
      if (!hasMeaningfulValue(value)) {
        await client.query(
          'DELETE FROM site_setting_translations WHERE setting_key = $1 AND locale = $2',
          [key, locale]
        );
        continue;
      }

      await client.query(
        `
          INSERT INTO site_setting_translations (setting_key, locale, value, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (setting_key, locale)
          DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()
        `,
        [key, locale, value]
      );
    }
  }
}
