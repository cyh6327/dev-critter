import { getObservationState } from '../src/state-store.js';
import { renderSpecimenCard } from '../src/specimen-card.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method not allowed.', {
        status: 405,
        headers: {
          'Allow': 'GET',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    try {
      const state = await getObservationState();
      const svg = renderSpecimenCard(state);

      return new Response(svg, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=600',
          'Content-Type': 'image/svg+xml',
        },
      });
    } catch {
      return new Response('Failed to render specimen card.', {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }
  },
};
