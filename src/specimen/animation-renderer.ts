import type { SpecimenVariant } from './types.js';
import { escapeXml, renderTextLines } from './svg-text.js';

const FRAME_START_Y = 244;
const FRAME_LINE_HEIGHT = 22;
const SYSTEM_MESSAGE_LINE_INDEX = 4;
const CHAMBER_CENTER_X = 250;

function isSystemMessageLine(line: string, index: number): boolean {
  const trimmed = line.trim();

  return (
    index === SYSTEM_MESSAGE_LINE_INDEX &&
    trimmed.startsWith('[') &&
    trimmed.endsWith(']')
  );
}

function renderAsciiLine(line: string): string {
  const pattern = /(?<!~)~~([^~\n]+)~~(?!~)/g;
  let result = '';
  let lastIndex = 0;

  for (const match of line.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    const struckText = match[1] ?? '';

    result += escapeXml(line.slice(lastIndex, matchIndex));
    result += `<tspan text-decoration="line-through">${escapeXml(struckText)}</tspan>`;
    lastIndex = matchIndex + match[0].length;
  }

  result += escapeXml(line.slice(lastIndex));
  return result;
}

function renderFrameLines(frame: readonly string[], x: number): string {
  return frame
    .map((line, index) => {
      const y = FRAME_START_Y + index * FRAME_LINE_HEIGHT;

      if (isSystemMessageLine(line, index)) {
        return `<text class="ascii" x="${CHAMBER_CENTER_X}" y="${y}" text-anchor="middle">${renderAsciiLine(line.trim())}</text>`;
      }

      return `<text class="ascii" x="${x}" y="${y}">${renderAsciiLine(line)}</text>`;
    })
    .join('\n');
}

export function renderAnimatedFrames(frames: SpecimenVariant['frames'], x = 160): string {
  const frameCount = frames.length;
  const duration = `${frameCount * 2}s`;
  const keyTimes = Array.from({ length: frameCount + 1 }, (_, index) => index / frameCount)
    .map((value) => value.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''))
    .join(';');

  return frames
    .map((frame, frameIndex) => {
      const values = Array.from({ length: frameCount + 1 }, (_, step) => {
        const activeFrame = step === frameCount ? 0 : step;
        return activeFrame === frameIndex ? '1' : '0';
      }).join(';');

      return `<g opacity="${frameIndex === 0 ? 1 : 0}">
${renderFrameLines(frame, x)}
<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" dur="${duration}" calcMode="discrete" repeatCount="indefinite" />
</g>`;
    })
    .join('\n');
}

export function renderAnimatedNarration(
  lines: SpecimenVariant['narration'],
  frameCount: number,
  visibleFrameIndexes?: readonly number[],
): string {
  if (lines.length === 0) {
    return '';
  }

  if (!visibleFrameIndexes || visibleFrameIndexes.length === 0) {
    return renderTextLines(lines, 250, 438, 24, 'narration');
  }

  const visibleFrames = new Set(visibleFrameIndexes);
  const duration = `${frameCount * 2}s`;
  const keyTimes = Array.from({ length: frameCount + 1 }, (_, index) => index / frameCount)
    .map((value) => value.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''))
    .join(';');
  const values = Array.from({ length: frameCount + 1 }, (_, step) => {
    const activeFrame = step === frameCount ? 0 : step;
    return visibleFrames.has(activeFrame) ? '1' : '0';
  }).join(';');

  return `<g opacity="${visibleFrames.has(0) ? 1 : 0}">
${renderTextLines(lines, 250, 438, 24, 'narration')}
<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" dur="${duration}" calcMode="discrete" repeatCount="indefinite" />
</g>`;
}
