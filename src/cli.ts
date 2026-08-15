#!/usr/bin/env node

import { isObservationState, isObservationStatus } from './state.js';

const DEFAULT_API_URL = 'https://dev-critter.vercel.app';

function fail(message: string): never {
  throw new Error(message);
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as unknown;

    if (typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).error === 'string') {
      return (body as { error: string }).error;
    }
  } catch {
    // Use the HTTP status when the API does not return a JSON error body.
  }

  return `${response.status} ${response.statusText}`.trim();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const status = args[0];

  if (args.length !== 1 || !isObservationStatus(status)) {
    fail('Usage: dev-critter <focus|break|offline>');
  }

  const statusToken = process.env.STATUS_TOKEN;

  if (!statusToken) {
    fail('STATUS_TOKEN is not configured.');
  }

  const apiUrl = process.env.DEV_CRITTER_URL ?? DEFAULT_API_URL;
  const statusUrl = new URL('/api/status', apiUrl);
  let response: Response;

  try {
    response = await fetch(statusUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${statusToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
  } catch {
    fail(`Could not connect to ${statusUrl.origin}.`);
  }

  if (response.status === 401) {
    fail('Authentication failed. Check STATUS_TOKEN.');
  }

  if (!response.ok) {
    fail(`Status update failed: ${await readApiError(response)}`);
  }

  let state: unknown;

  try {
    state = await response.json();
  } catch {
    fail('Status update failed: the API returned invalid JSON.');
  }

  if (!isObservationState(state)) {
    fail('Status update failed: the API returned an invalid observation state.');
  }

  console.log(`Status updated to ${state.status} at ${state.updatedAt}.`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Status update failed.');
  process.exitCode = 1;
}
