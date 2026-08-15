import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let getImplementation;
const stateStoreUrl = new URL('../dist/src/state-store.js', import.meta.url).href;

mock.module(stateStoreUrl, {
  exports: {
    getObservationState: (...args) => getImplementation(...args),
  },
});

const { default: specimenApi } = await import('../dist/api/specimen.js');

test('allows only GET requests', async () => {
  const response = await specimenApi.fetch(
    new Request('https://example.test/specimen.svg', { method: 'POST' }),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
});

test('renders the latest state as a public cacheable SVG', async () => {
  getImplementation = async () => ({
    status: 'offline',
    updatedAt: '2026-08-15T03:04:05.123Z',
  });

  const response = await specimenApi.fetch(new Request('https://example.test/specimen.svg'));
  const svg = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/svg+xml');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=600');
  assert.match(svg, /^<svg /);
  assert.match(svg, /status: OFFLINE/);
});

test('returns a non-cacheable stable error when state retrieval fails', async () => {
  getImplementation = async () => {
    throw new Error('blob unavailable');
  };

  const response = await specimenApi.fetch(new Request('https://example.test/specimen.svg'));

  assert.equal(response.status, 500);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await response.text(), 'Failed to render specimen card.');
});
