import assert from 'node:assert/strict';
import { after, beforeEach, mock, test } from 'node:test';

let saveImplementation;
const originalStatusToken = process.env.STATUS_TOKEN;
const stateStoreUrl = new URL('../dist/src/state-store.js', import.meta.url).href;

mock.module(stateStoreUrl, {
  exports: {
    saveObservationState: (...args) => saveImplementation(...args),
  },
});

const { default: statusApi } = await import('../dist/api/status.js');

beforeEach(() => {
  process.env.STATUS_TOKEN = 'test-token';
  saveImplementation = async () => {};
});

after(() => {
  if (originalStatusToken === undefined) delete process.env.STATUS_TOKEN;
  else process.env.STATUS_TOKEN = originalStatusToken;
});

function request(body, options = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has('Authorization')) headers.set('Authorization', 'Bearer test-token');
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  return new Request('https://example.test/api/status', {
    method: options.method ?? 'POST',
    headers,
    body,
  });
}

test('allows only POST requests', async () => {
  const response = await statusApi.fetch(new Request('https://example.test/api/status'));

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('fails safely when the status token is not configured', async () => {
  delete process.env.STATUS_TOKEN;

  const response = await statusApi.fetch(request(JSON.stringify({ status: 'focus' })));

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Status API is not configured.' });
});

test('rejects an invalid bearer token before reading the request body', async () => {
  const response = await statusApi.fetch(
    request('{', { headers: { Authorization: 'Bearer wrong-token' } }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized.' });
});

test('rejects invalid JSON and unsupported status values', async () => {
  const invalidJsonResponse = await statusApi.fetch(request('{'));
  assert.equal(invalidJsonResponse.status, 400);
  assert.deepEqual(await invalidJsonResponse.json(), { error: 'Request body must be valid JSON.' });

  const invalidStatusResponse = await statusApi.fetch(request(JSON.stringify({ status: 'idle' })));
  assert.equal(invalidStatusResponse.status, 400);
  assert.deepEqual(await invalidStatusResponse.json(), {
    error: 'Status must be focus, break, or offline.',
  });
});

test('generates updatedAt on the server and saves the accepted state', async () => {
  let savedState;
  saveImplementation = async (state) => {
    savedState = state;
  };
  const before = Date.now();

  const response = await statusApi.fetch(
    request(JSON.stringify({ status: 'focus', updatedAt: '2000-01-01T00:00:00.000Z' })),
  );

  const after = Date.now();
  const returnedState = await response.json();
  assert.equal(response.status, 200);
  assert.equal(returnedState.status, 'focus');
  assert.ok(Date.parse(returnedState.updatedAt) >= before);
  assert.ok(Date.parse(returnedState.updatedAt) <= after);
  assert.notEqual(returnedState.updatedAt, '2000-01-01T00:00:00.000Z');
  assert.deepEqual(savedState, returnedState);
});

test('returns a stable error when saving fails', async () => {
  saveImplementation = async () => {
    throw new Error('blob unavailable');
  };

  const response = await statusApi.fetch(request(JSON.stringify({ status: 'break' })));

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Failed to save observation state.' });
});
