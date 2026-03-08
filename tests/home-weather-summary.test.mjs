import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('home page renders a persistent Yingde weather summary card instead of the old weather quick-search button', () => {
  const source = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes("const DEFAULT_HOME_WEATHER_LABEL = '英德市';"),
    'HomeClient should pin the persistent home weather summary to Yingde.',
  );

  assert.ok(
    source.includes('aria-label="英德市天气详情"'),
    'HomeClient should expose the persistent weather summary card as the homepage weather entry.',
  );

  assert.ok(
    !source.includes('<span className="hidden md:inline text-sm font-medium">天气速查</span>'),
    'HomeClient should remove the old standalone weather quick-search button label.',
  );
});

test('home page weather summary auto-loads without polluting manual weather query analytics', () => {
  const source = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes("params.set('district_id', DEFAULT_HOME_WEATHER_DISTRICT_ID);"),
    'HomeClient should fetch weather summary using the fixed default district.',
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
    source.includes('autoLoadKeyword={DEFAULT_HOME_WEATHER_LABEL}'),
    'HomeClient should open the weather modal with the fixed Yingde keyword preloaded.',
  );

  assert.ok(
    source.includes('autoLoadTrack={false}'),
    'HomeClient should open the weather modal without recording an automatic weather query.',
  );
});

test('weather api route supports opt-out analytics tracking for passive summary requests', () => {
  const source = readFileSync(new URL('../src/app/api/weather/route.ts', import.meta.url), 'utf8');

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
});
