import type { ObservationState } from './state.js';
import { renderAnimatedFrames, renderAnimatedNarration } from './specimen/animation-renderer.js';
import { escapeXml, renderTextLines, wrapText } from './specimen/svg-text.js';
import type { SpecimenVariant } from './specimen/types.js';
import { selectSpecimenVariant } from './specimen/variant-registry.js';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const statusColors: Record<ObservationState['status'], string> = {
  focus: '#8B5CF6',
  break: '#84B85C',
  offline: '#94A3B8',
};

function formatObservationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const month = monthNames[date.getUTCMonth()];

  if (!month || Number.isNaN(date.getTime())) {
    throw new Error('Cannot render an invalid observation timestamp.');
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} · ${hour}:${minute} UTC`;
}

function renderObservations(observations: SpecimenVariant['observations']): string {
  return observations
    .map(([label, value], index) => {
      const y = 730 + index * 24;

      return `<text class="body observation-label" x="40" y="${y}">${escapeXml(label)}</text>
<line class="dots" x1="220" y1="${y - 4}" x2="340" y2="${y - 4}" />
<text class="body value observation-value" x="460" y="${y}">${escapeXml(value)}</text>`;
    })
    .join('\n');
}

export function renderSpecimenCardVariant(state: ObservationState, variant: SpecimenVariant): string {
  if (variant.status !== state.status) {
    throw new Error(`Cannot render a ${variant.status} variant for status: ${state.status}.`);
  }

  const status = state.status.toUpperCase();
  const statusColor = statusColors[state.status];
  const observedAt = formatObservationTime(state.updatedAt);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="870" viewBox="0 0 500 870" role="img" aria-labelledby="title description">
<title id="title">Dev Critter specimen status: ${status}</title>
<desc id="description">The most recently observed developer status is ${status}, recorded at ${escapeXml(observedAt)}.</desc>
<style>
  text {
    font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
    fill: #D8F9FF;
  }

  /* 보조 라벨 / 계측 항목 */
  .label {
    fill: #6F98A0;
    font-size: 14px;
    letter-spacing: 1px;
  }

  .body {
    fill: #D8F9FF;
    font-size: 15px;
  }

  /* 주요 섹션 제목 = 시스템 강조색 */
  .heading {
    fill: #44E0EE;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 2px;
  }

  /* 현재 상태는 중요한 시스템 값 */
  .status-value {
    fill: ${statusColor};
    font-weight: 700;
  }

  /* 시간은 보조 정보 */
  .timestamp {
    fill: #6F98A0;
  }

  /* 카메라 속 피사체 */
  .ascii {
    fill: #D8F9FF;
    font-size: 17px;
    white-space: pre;
  }

  /* 별도 나레이션 / 시스템 메시지 */
  .narration {
    fill: #44E0EE;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
    text-anchor: middle;
  }

  .note {
    fill: #D8F9FF;
    font-size: 15px;
  }

  /* observation: 왼쪽은 계측 항목, 오른쪽은 결과값 */
  .observation-label {
    fill: #6F98A0;
  }

  .observation-value {
    fill: #D8F9FF;
  }

  .value {
    text-anchor: end;
  }

  .rule {
    stroke: #21464C;
    stroke-width: 1;
  }

  .dots {
    stroke: #21464C;
    stroke-width: 1;
    stroke-dasharray: 2 5;
  }

  .chamber {
    fill: #000000;
    stroke: #21464C;
    stroke-width: 1;
  }

  /* 카메라 HUD */
  .hud {
    fill: #44E0EE;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .marker {
    fill: none;
    stroke: #44E0EE;
    stroke-width: 1;
    opacity: 0.48;
  }

  .rec-dot {
    fill: #44E0EE;
  }
</style>

<rect width="500" height="870" rx="14" fill="#071012" />
<rect x="16" y="16" width="468" height="838" rx="8" fill="#0B1618" stroke="#44E0EE" stroke-width="2" />

<text class="heading" x="40" y="52">SPECIMEN LOG</text>
<text class="label" x="40" y="82">subject</text>
<text class="body" x="195" y="82">: small coding organism</text>
<text class="label" x="40" y="108">status</text>
<text class="body" x="195" y="108">: <tspan class="status-value">${status}</tspan></text>
<text class="label" x="40" y="134">habitat</text>
<text class="body" x="195" y="134">: local workstation</text>
<text class="label" x="40" y="160">last observation</text>
<text class="body" x="195" y="160">: ${escapeXml(observedAt)}</text>
<line class="rule" x1="16" y1="184" x2="484" y2="184" />

<rect class="chamber" x="34" y="198" width="432" height="300" rx="6" />

<circle class="rec-dot" cx="50" cy="217" r="3">
  <animate attributeName="opacity" values="1;0.25;1" keyTimes="0;0.5;1" dur="1.2s" calcMode="discrete" repeatCount="indefinite" />
</circle>
<text class="hud" x="59" y="221">REC</text>
<text class="label" x="250" y="221" text-anchor="middle">OBSERVATION CHAMBER</text>
<text class="hud" x="450" y="221" text-anchor="end">OBS-01</text>

<path class="marker" d="M52 254 V242 H64" />
<path class="marker" d="M436 242 H448 V254" />
<path class="marker" d="M52 470 V482 H64" />
<path class="marker" d="M436 482 H448 V470" />

${renderAnimatedFrames(variant.frames, variant.frameX)}
${renderAnimatedNarration(variant.narration, variant.frames.length, variant.narrationFrameIndexes)}
<line class="rule" x1="16" y1="522" x2="484" y2="522" />

<text class="heading" x="40" y="560">NOTE</text>
${renderTextLines(wrapText(variant.note.join(' '), 46), 40, 596, 24, 'note')}
<line class="rule" x1="16" y1="666" x2="484" y2="666" />

<text class="heading" x="40" y="702">OBSERVATION</text>
${renderObservations(variant.observations)}
</svg>`;
}

export function renderSpecimenCard(state: ObservationState): string {
  return renderSpecimenCardVariant(state, selectSpecimenVariant(state));
}
