import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let getImplementation;
let putImplementation;

mock.module('@vercel/blob', {
  exports: {
    get: (...args) => getImplementation(...args),
    put: (...args) => putImplementation(...args),
  },
});

const { getObservationState, saveObservationState } = await import('../dist/src/state-store.js');

test('saves valid state to the private state blob', async () => {
  const calls = [];
  putImplementation = async (...args) => {
    calls.push(args);
  };
  const state = { status: 'focus', updatedAt: '2026-08-15T03:04:05.123Z' };

  await saveObservationState(state);

  assert.deepEqual(calls, [
    [
      'state.json',
      JSON.stringify(state),
      { access: 'private', allowOverwrite: true, contentType: 'application/json' },
    ],
  ]);
});

test('refuses to save invalid state', async () => {
  putImplementation = async () => assert.fail('put must not be called');

  await assert.rejects(
    saveObservationState({ status: 'focus', updatedAt: 'invalid' }),
    /Cannot save invalid observation state/,
  );
});

test('creates and returns the initial break state when the blob is absent', async () => {
  const saved = [];
  getImplementation = async () => null;
  putImplementation = async (_pathname, body) => {
    saved.push(JSON.parse(body));
  };
  const before = Date.now();

  const state = await getObservationState();

  const after = Date.now();
  assert.equal(state.status, 'break');
  assert.ok(Date.parse(state.updatedAt) >= before);
  assert.ok(Date.parse(state.updatedAt) <= after);
  assert.deepEqual(saved, [state]);
});

test('returns a valid stored observation state', async () => {
  const state = { status: 'offline', updatedAt: '2026-08-15T03:04:05.123Z' };
  getImplementation = async () => ({
    statusCode: 200,
    stream: new Response(JSON.stringify(state)).body,
  });

  assert.deepEqual(await getObservationState(), state);
});

test('fails when the blob read is unsuccessful', async () => {
  getImplementation = async () => ({ statusCode: 503, stream: null });

  await assert.rejects(getObservationState(), /Blob returned 503/);
});

test('fails when stored data is not JSON', async () => {
  getImplementation = async () => ({ statusCode: 200, stream: new Response('{').body });

  await assert.rejects(getObservationState(), /not valid JSON/);
});

test('fails when stored JSON has an invalid observation structure', async () => {
  getImplementation = async () => ({
    statusCode: 200,
    stream: new Response(JSON.stringify({ status: 'idle', updatedAt: 'invalid' })).body,
  });

  await assert.rejects(getObservationState(), /invalid structure/);
});
