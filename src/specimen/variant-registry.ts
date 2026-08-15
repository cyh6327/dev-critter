import type { ObservationState, ObservationStatus } from '../state.js';

import type { SpecimenVariant } from './types.js';
import { sunspotFlopVariant } from './variants/break/sunspot-flop.js';
import { taskReplicationVariant } from './variants/focus/task-replication.js';
import { signalLossVariant } from './variants/offline/signal-loss.js';

export const specimenVariantsByStatus: Record<ObservationStatus, readonly SpecimenVariant[]> = {
  focus: [taskReplicationVariant],
  break: [sunspotFlopVariant],
  offline: [signalLossVariant],
};

function hashVariantSeed(seed: string): number {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

export function selectSpecimenVariant(state: ObservationState): SpecimenVariant {
  const variants = specimenVariantsByStatus[state.status];
  const variant = variants[hashVariantSeed(state.updatedAt) % variants.length];

  if (!variant) {
    throw new Error(`No specimen variant is registered for status: ${state.status}.`);
  }

  return variant;
}
