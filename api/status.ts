import { saveObservationState } from '../src/state-store.js';
import { isObservationStatus, type ObservationState } from '../src/state.js';

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
        status: 405,
        headers: {
          'Allow': 'POST',
          'Content-Type': 'application/json',
        },
      });
    }

    const statusToken = process.env.STATUS_TOKEN;

    if (!statusToken) {
      return jsonResponse({ error: 'Status API is not configured.' }, 500);
    }

    if (request.headers.get('authorization') !== `Bearer ${statusToken}`) {
      return jsonResponse({ error: 'Unauthorized.' }, 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
    }

    if (typeof body !== 'object' || body === null || !isObservationStatus((body as Record<string, unknown>).status)) {
      return jsonResponse({ error: 'Status must be focus, break, or offline.' }, 400);
    }

    const state: ObservationState = {
      status: (body as { status: ObservationState['status'] }).status,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveObservationState(state);
    } catch {
      return jsonResponse({ error: 'Failed to save observation state.' }, 500);
    }

    return jsonResponse(state, 200);
  },
};
