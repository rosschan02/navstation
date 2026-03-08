import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('phonebook quick search requires explicit user action instead of debounced typing requests', () => {
  const source = readFileSync(new URL('../src/components/PhonebookQuickSearchModal.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes('onClick={() => void handleSearch()}'),
    'PhonebookQuickSearchModal should expose an explicit search button.',
  );

  assert.ok(
    !source.includes('setTimeout(async () => {'),
    'PhonebookQuickSearchModal should not trigger debounced background requests on every keystroke.',
  );
});

test('weather quick search does not auto-query on modal open', () => {
  const source = readFileSync(new URL('../src/components/WeatherQuickSearchModal.tsx', import.meta.url), 'utf8');

  assert.ok(
    !source.includes("void queryWeather('')"),
    'WeatherQuickSearchModal should wait for an explicit search action instead of auto-querying on open.',
  );
});
