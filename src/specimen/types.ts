import type { ObservationStatus } from '../state.js';

export interface SpecimenVariant {
  id: string;
  status: ObservationStatus;
  frames: readonly (readonly string[])[];
  narration: readonly string[];
  narrationFrameIndexes?: readonly number[];
  frameX?: number;
  note: readonly string[];
  observations: readonly (readonly [label: string, value: string])[];
}
