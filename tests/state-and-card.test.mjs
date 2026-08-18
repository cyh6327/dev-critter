import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isIsoUtcTimestamp,
  isObservationState,
  isObservationStatus,
} from '../dist/src/state.js';
import { renderSpecimenCard, renderSpecimenCardVariant } from '../dist/src/specimen-card.js';
import { specimenVariantsByStatus } from '../dist/src/specimen/variant-registry.js';

test('observation statuses accept only the three supported values', () => {
  for (const status of ['focus', 'break', 'offline']) {
    assert.equal(isObservationStatus(status), true);
  }

  for (const status of ['', 'idle', 'FOCUS', null, 1]) {
    assert.equal(isObservationStatus(status), false);
  }
});

test('UTC timestamps require a real ISO 8601 UTC instant', () => {
  assert.equal(isIsoUtcTimestamp('2026-08-15T03:04:05Z'), true);
  assert.equal(isIsoUtcTimestamp('2026-08-15T03:04:05.123Z'), true);
  assert.equal(isIsoUtcTimestamp('2026-02-29T03:04:05Z'), false);
  assert.equal(isIsoUtcTimestamp('2026-08-15T03:04:05+00:00'), false);
  assert.equal(isIsoUtcTimestamp('not-a-date'), false);
});

test('observation state requires exactly status and updatedAt', () => {
  assert.equal(
    isObservationState({ status: 'focus', updatedAt: '2026-08-15T03:04:05.123Z' }),
    true,
  );
  assert.equal(isObservationState({ status: 'idle', updatedAt: '2026-08-15T03:04:05.123Z' }), false);
  assert.equal(isObservationState({ status: 'focus', updatedAt: 'invalid' }), false);
  assert.equal(
    isObservationState({ status: 'focus', updatedAt: '2026-08-15T03:04:05.123Z', extra: true }),
    false,
  );
});

const statusColors = {
  focus: '#8B5CF6',
  break: '#84B85C',
  offline: '#94A3B8',
};

for (const [status, statusColor] of Object.entries(statusColors)) {
  test(`renders the complete animated ${status} specimen card`, () => {
    const svg = renderSpecimenCard({ status, updatedAt: '2026-08-15T03:04:05.123Z' });

    assert.match(svg, /^<svg /);
    assert.match(svg, new RegExp(`status: ${status.toUpperCase()}`));
    assert.match(svg, /15 Aug 2026 · 03:04 UTC/);
    assert.match(svg, /<text class="heading" x="40" y="560">NOTE<\/text>/);
    assert.match(svg, /<text class="heading" x="40" y="702">OBSERVATION<\/text>/);
    assert.match(svg, /<animate attributeName="opacity"/);
    assert.match(svg, new RegExp(`\\.status-value \\{\\s+fill: ${statusColor};`));
    assert.match(
      svg,
      new RegExp(`<text class="body" x="195" y="108">: <tspan class="status-value">${status.toUpperCase()}<\\/tspan><\\/text>`),
    );
  });
}

test('rejects a specimen variant for a different status', () => {
  assert.throws(
    () =>
      renderSpecimenCardVariant(
        { status: 'focus', updatedAt: '2026-08-15T03:04:05.123Z' },
        specimenVariantsByStatus.break[0],
      ),
    /Cannot render a break variant for status: focus/,
  );
});
