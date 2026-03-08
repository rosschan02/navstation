import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('site settings type and defaults include browser site icon support', () => {
  const typesSource = readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');
  const settingsApiSource = readFileSync(new URL('../src/app/api/settings/route.ts', import.meta.url), 'utf8');
  const settingsPageSource = readFileSync(new URL('../src/app/admin/settings/page.tsx', import.meta.url), 'utf8');

  assert.ok(
    typesSource.includes('site_icon_url: string;'),
    'SiteSettings should include a site_icon_url field.',
  );

  assert.ok(
    settingsApiSource.includes("site_icon_url: '',"),
    'Settings API should provide a default empty site_icon_url value.',
  );

  assert.ok(
    settingsPageSource.includes("site_icon_url: '',"),
    'Settings page should include a default empty site_icon_url value.',
  );
});

test('settings client exposes a dedicated site icon upload control', () => {
  const source = readFileSync(new URL('../src/app/admin/settings/SettingsClient.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes('站点图标'),
    'SettingsClient should render a dedicated site icon field.',
  );

  assert.ok(
    source.includes("void handleImageUpload(file, 'site_icon_url', setIconPreview)"),
    'SettingsClient should save uploaded site icons into the site_icon_url setting.',
  );
});

test('upload route accepts ico-based brand assets and layout emits configured favicon metadata', () => {
  const uploadSource = readFileSync(new URL('../src/app/api/upload/route.ts', import.meta.url), 'utf8');
  const layoutSource = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');

  assert.ok(
    uploadSource.includes("'image/x-icon'") && uploadSource.includes("'image/vnd.microsoft.icon'"),
    'Upload route should accept ICO mime types.',
  );

  assert.ok(
    uploadSource.includes("'.ico'"),
    'Upload route should accept ICO files by extension fallback as well.',
  );

  assert.ok(
    layoutSource.includes("['site_name', 'site_description', 'site_icon_url']"),
    'Root layout should load the site_icon_url setting.',
  );

  assert.ok(
    layoutSource.includes('icons: {'),
    'Root layout metadata should emit icon links from settings.',
  );
});
