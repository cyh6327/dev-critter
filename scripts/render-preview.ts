import { mkdirSync, writeFileSync } from 'node:fs';

import { renderSpecimenCardVariant } from '../dist/src/specimen-card.js';
import { specimenVariantsByStatus } from '../dist/src/specimen/variant-registry.js';

const statuses = ['focus', 'break', 'offline'] as const;

mkdirSync('preview', { recursive: true });

for (const status of statuses) {
  const state = {
    status,
    updatedAt: new Date().toISOString(),
  };

  for (const variant of specimenVariantsByStatus[status]) {
    const svg = renderSpecimenCardVariant(state, variant);

    writeFileSync(`preview/${status}-${variant.id}-preview.svg`, svg, 'utf8');
  }
}
