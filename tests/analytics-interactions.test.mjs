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

test('weather quick search stays manual by default but supports silent opt-in auto-load', () => {
  const source = readFileSync(new URL('../src/components/WeatherQuickSearchModal.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes('if (!isOpen || !autoLoadKeyword) return;'),
    'WeatherQuickSearchModal should only auto-load when an explicit autoLoadKeyword prop is provided.',
  );

  assert.ok(
    source.includes("params.set('track', '0');"),
    'WeatherQuickSearchModal should support silent auto-load requests that skip analytics tracking.',
  );
});
