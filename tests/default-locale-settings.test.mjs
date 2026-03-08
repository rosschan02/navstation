import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('site settings include configurable default locale support', () => {
  const typesSource = readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');
  const settingsApiSource = readFileSync(new URL('../src/app/api/settings/route.ts', import.meta.url), 'utf8');
  const settingsClientSource = readFileSync(new URL('../src/app/admin/settings/SettingsClient.tsx', import.meta.url), 'utf8');
  const schemaSource = readFileSync(new URL('../src/db/schema.sql', import.meta.url), 'utf8');

  assert.ok(
    typesSource.includes('default_locale: Locale;'),
    'SiteSettings should include a default_locale field.',
  );

  assert.ok(
    settingsApiSource.includes("default_locale: 'en',"),
    'Settings API should default default_locale to en.',
  );

  assert.ok(
    settingsClientSource.includes('默认语言'),
    'Settings client should expose a default language control.',
  );

  assert.ok(
    schemaSource.includes("('default_locale', 'en')"),
    'Schema seed should initialize default_locale.',
  );
});

test('proxy reads configured default locale from a dedicated settings route', () => {
  const proxySource = readFileSync(new URL('../src/proxy.ts', import.meta.url), 'utf8');
  const routeSource = readFileSync(new URL('../src/app/api/settings/default-locale/route.ts', import.meta.url), 'utf8');

  assert.ok(
    proxySource.includes("/api/settings/default-locale"),
    'Proxy should fetch the configured default locale from an API route.',
  );

  assert.ok(
    routeSource.includes('getConfiguredDefaultLocale'),
    'Default locale route should return the configured default locale from site settings.',
  );
});
