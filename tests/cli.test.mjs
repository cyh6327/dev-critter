import assert from 'node:assert/strict';
import test from 'node:test';

let runNumber = 0;

async function runCli({ args, token = 'test-token', apiUrl = 'https://preview.example', fetchImplementation }) {
  const originalArgv = process.argv;
  const originalExitCode = process.exitCode;
  const originalFetch = globalThis.fetch;
  const originalStatusToken = process.env.STATUS_TOKEN;
  const originalApiUrl = process.env.DEV_CRITTER_URL;
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;

  process.argv = ['node', 'dev-critter', ...args];
  process.exitCode = undefined;
  globalThis.fetch = fetchImplementation ?? (async () => assert.fail('fetch must not be called'));
  console.log = (...values) => logs.push(values.join(' '));
  console.error = (...values) => errors.push(values.join(' '));

  if (token === null) delete process.env.STATUS_TOKEN;
  else process.env.STATUS_TOKEN = token;
  process.env.DEV_CRITTER_URL = apiUrl;

  try {
    runNumber += 1;
    await import(`../dist/src/cli.js?run=${runNumber}`);
    return { logs, errors, exitCode: process.exitCode };
  } finally {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.error = originalError;

    if (originalStatusToken === undefined) delete process.env.STATUS_TOKEN;
    else process.env.STATUS_TOKEN = originalStatusToken;
    if (originalApiUrl === undefined) delete process.env.DEV_CRITTER_URL;
    else process.env.DEV_CRITTER_URL = originalApiUrl;
  }
}

test('posts an authenticated status update and reports the saved state', async () => {
  let capturedUrl;
  let capturedInit;
  const result = await runCli({
    args: ['focus'],
    fetchImplementation: async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return Response.json({ status: 'focus', updatedAt: '2026-08-15T03:04:05.123Z' });
    },
  });

  assert.equal(capturedUrl.href, 'https://preview.example/api/status');
  assert.equal(capturedInit.method, 'POST');
  assert.equal(capturedInit.headers.Authorization, 'Bearer test-token');
  assert.equal(capturedInit.headers['Content-Type'], 'application/json');
  assert.equal(capturedInit.body, JSON.stringify({ status: 'focus' }));
  assert.deepEqual(result, {
    logs: ['Status updated to focus at 2026-08-15T03:04:05.123Z.'],
    errors: [],
    exitCode: undefined,
  });
});

test('rejects invalid commands without making a request', async () => {
  const result = await runCli({ args: ['idle'] });

  assert.deepEqual(result.logs, []);
  assert.deepEqual(result.errors, ['Usage: dev-critter <focus|break|offline>']);
  assert.equal(result.exitCode, 1);
});

test('requires STATUS_TOKEN before making a request', async () => {
  const result = await runCli({ args: ['break'], token: null });

  assert.deepEqual(result.errors, ['STATUS_TOKEN is not configured.']);
  assert.equal(result.exitCode, 1);
});

test('reports authentication failure separately', async () => {
  const result = await runCli({
    args: ['offline'],
    fetchImplementation: async () => Response.json({ error: 'Unauthorized.' }, { status: 401 }),
  });

  assert.deepEqual(result.errors, ['Authentication failed. Check STATUS_TOKEN.']);
  assert.equal(result.exitCode, 1);
});

test('reports network and API failures', async (t) => {
  await t.test('network failure', async () => {
    const result = await runCli({
      args: ['focus'],
      fetchImplementation: async () => {
        throw new Error('offline');
      },
    });

    assert.deepEqual(result.errors, ['Could not connect to https://preview.example.']);
    assert.equal(result.exitCode, 1);
  });

  await t.test('API failure', async () => {
    const result = await runCli({
      args: ['break'],
      fetchImplementation: async () =>
        Response.json({ error: 'Failed to save observation state.' }, { status: 500 }),
    });

    assert.deepEqual(result.errors, ['Status update failed: Failed to save observation state.']);
    assert.equal(result.exitCode, 1);
  });
});

test('rejects a malformed success response', async () => {
  const result = await runCli({
    args: ['focus'],
    fetchImplementation: async () => Response.json({ status: 'focus' }),
  });

  assert.deepEqual(result.errors, [
    'Status update failed: the API returned an invalid observation state.',
  ]);
  assert.equal(result.exitCode, 1);
});
