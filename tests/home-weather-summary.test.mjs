import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('home page renders a persistent server-configured weather summary card instead of the old weather quick-search button', () => {
  const source = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');
  const pageSource = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes('defaultWeatherDistrictId: string;') && source.includes('defaultWeatherLabel: string;'),
    'HomeClient should receive weather defaults as props instead of hardcoding them in the client bundle.',
  );

  assert.ok(
    source.includes('aria-label={`${defaultWeatherLabel}天气详情`}'),
    'HomeClient should expose the persistent weather summary card using the configured weather label.',
  );

  assert.ok(
    pageSource.includes('const weatherDefaults = getWeatherDefaults();'),
    'Home page should load weather defaults from a server-side helper before rendering HomeClient.',
  );
});

test('home page weather summary auto-loads without polluting manual weather query analytics', () => {
  const source = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes("params.set('district_id', defaultWeatherDistrictId);"),
    'HomeClient should fetch weather summary using the configured default district.',
  );

  assert.ok(
    source.includes("params.set('track', '0');"),
    'HomeClient should disable analytics tracking for the automatic homepage weather summary fetch.',
  );

  assert.ok(
    source.includes('void loadWeatherSummary();'),
    'HomeClient should automatically load the homepage weather summary on mount.',
  );

  assert.ok(
    source.includes('defaultKeyword={defaultWeatherLabel}') && source.includes('autoLoadKeyword={defaultWeatherLabel}'),
    'HomeClient should open the weather modal with the configured weather label preloaded.',
  );

  assert.ok(
    source.includes('autoLoadTrack={false}'),
    'HomeClient should open the weather modal without recording an automatic weather query.',
  );
});

test('weather api route supports opt-out analytics tracking for passive summary requests', () => {
  const source = readFileSync(new URL('../src/app/api/weather/route.ts', import.meta.url), 'utf8');
  const defaultsSource = readFileSync(new URL('../src/lib/weatherDefaults.ts', import.meta.url), 'utf8');

  assert.ok(
    source.includes('function shouldTrackAnalytics(value: string | null): boolean {'),
    'Weather API should normalize an analytics tracking switch.',
  );

  assert.ok(
    source.includes("const shouldTrack = shouldTrackAnalytics(searchParams.get('track'));"),
    'Weather API should read the optional tracking flag from the query string.',
  );

  assert.ok(
    source.includes('if (shouldTrack) {'),
    'Weather API should only record analytics when tracking is enabled.',
  );

  assert.ok(
    defaultsSource.includes('process.env.WEATHER_DEFAULT_DISTRICT_ID')
      && defaultsSource.includes('process.env.WEATHER_DEFAULT_DISTRICT_NAME'),
    'Weather defaults helper should source the default weather location from environment variables.',
  );
});
