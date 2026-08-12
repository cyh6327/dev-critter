import { get, put } from '@vercel/blob';

import { isObservationState, type ObservationState } from './state.js';

const STATE_PATHNAME = 'state.json';

export async function saveObservationState(state: ObservationState): Promise<void> {
  if (!isObservationState(state)) {
    throw new Error('Cannot save invalid observation state.');
  }

  await put(STATE_PATHNAME, JSON.stringify(state), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function getObservationState(): Promise<ObservationState> {
  const result = await get(STATE_PATHNAME, { access: 'private' });

  if (result === null) {
    const initialState: ObservationState = {
      status: 'break',
      updatedAt: new Date().toISOString(),
    };

    await saveObservationState(initialState);
    return initialState;
  }

  if (result.statusCode !== 200 || result.stream === null) {
    throw new Error(`Failed to read observation state: Blob returned ${result.statusCode}.`);
  }

  let storedValue: unknown;

  try {
    storedValue = JSON.parse(await new Response(result.stream).text());
  } catch {
    throw new Error('Stored observation state is not valid JSON.');
  }

  if (!isObservationState(storedValue)) {
    throw new Error('Stored observation state has an invalid structure.');
  }

  return storedValue;
}
