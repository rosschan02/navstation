import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('home page content container does not use centered max-width layout on desktop', () => {
  const source = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');

  assert.ok(
    !source.includes('max-w-[1400px] mx-auto'),
    'HomeClient should not center the main content with a fixed max width on large screens.',
  );
});

test('home page regular site grid expands on large screens with adaptive columns', () => {
  const source = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes('max-w-[2200px]'),
    'HomeClient should allow a wider content area on large screens.',
  );

  assert.ok(
    source.includes('grid-cols-[repeat(auto-fill,minmax(260px,320px))]'),
    'Regular site cards should use an auto-fill grid with a capped width so larger screens can render more columns without stretching sparse rows.',
  );

  assert.ok(
    source.includes('justify-start'),
    'Regular site cards should keep unused space on the right instead of stretching sparse rows.',
  );
});

test('project declares npm as the package manager for the tracked package-lock workflow', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.ok(
    typeof packageJson.packageManager === 'string' && packageJson.packageManager.startsWith('npm@'),
    'package.json should declare npm as the package manager to match the tracked package-lock.json workflow.',
  );
});

test('next request interception uses proxy.ts instead of deprecated middleware.ts', () => {
  const proxyPath = new URL('../src/proxy.ts', import.meta.url);
  const middlewarePath = new URL('../src/middleware.ts', import.meta.url);

  assert.ok(existsSync(proxyPath), 'src/proxy.ts should exist for Next.js 16.');
  assert.ok(!existsSync(middlewarePath), 'src/middleware.ts should be removed to avoid the deprecation warning.');

  const proxySource = readFileSync(proxyPath, 'utf8');

  assert.ok(
    proxySource.includes('export async function proxy(') || proxySource.includes('export function proxy('),
    'src/proxy.ts should export a proxy function.',
  );
});

test('software page grid expands on large screens with adaptive columns', () => {
  const source = readFileSync(new URL('../src/app/software/SoftwareClient.tsx', import.meta.url), 'utf8');

  assert.ok(
    source.includes('max-w-[2200px]'),
    'SoftwareClient should allow a wider content area on large screens.',
  );

  assert.ok(
    source.includes('grid-cols-[repeat(auto-fill,minmax(280px,340px))]'),
    'Software cards should use an auto-fill grid with a capped width so larger screens can render more columns without stretching sparse rows.',
  );

  assert.ok(
    source.includes('justify-start'),
    'Software cards should keep unused space on the right instead of stretching sparse rows.',
  );
});
