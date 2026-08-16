import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SIZE = 128;
const PREVIEW_SIZES = [16, 32] as const;
const BACKGROUND_INSET = 4;
const CORNER_RADIUS = 18;
const BORDER_WIDTH = 8;

// 터미널 계열의 짙은 차콜 배경 + 밝은 전경색.
const BACKGROUND_COLOR = '#1E1F22';
const FOREGROUND_COLOR = '#F5F5F5';

// 기존 SVG 카드에서 쓰는 monospace 계열과 맞추면 됨.
const FONT_FAMILY =
  'Consolas, "Liberation Mono", "Courier New", monospace';

const icons = {
  focus: {
    lines: ['/\\_/\\', '■.■'],
    borderColor: '#8B5CF6',
    expressionColor: '#F3EEFF',
  },
  break: {
    lines: ['/\\_/\\', '-.-'],
    borderColor: '#84B85C',
    expressionColor: '#F2F9EC',
  },
  offline: {
    lines: ['/\\_/\\', 'u.u'],
    borderColor: '#94A3B8',
    expressionColor: '#F1F5F9',
  },
} as const;

type TrayIconDefinition = (typeof icons)[keyof typeof icons];

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderTraySvg(
  icon: TrayIconDefinition,
  outputSize = SIZE,
): string {
  const lineLayouts = [
    { y: 54, fontSize: 56, textLength: 112 },
    { y: 114, fontSize: 64, textLength: 96 },
  ] as const;

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${outputSize}"
  height="${outputSize}"
  viewBox="0 0 ${SIZE} ${SIZE}"
>
  <rect
    x="${BACKGROUND_INSET}"
    y="${BACKGROUND_INSET}"
    width="${SIZE - BACKGROUND_INSET * 2}"
    height="${SIZE - BACKGROUND_INSET * 2}"
    rx="${CORNER_RADIUS}"
    ry="${CORNER_RADIUS}"
    fill="${BACKGROUND_COLOR}"
    stroke="${icon.borderColor}"
    stroke-width="${BORDER_WIDTH}"
  />

  <g
    stroke-width="1.5"
    stroke-linejoin="round"
    paint-order="stroke fill"
    font-family='${FONT_FAMILY}'
    font-weight="700"
    text-anchor="middle"
  >
    ${icon.lines
      .map((line, index) => {
        const layout = lineLayouts[index];
        if (layout === undefined) {
          throw new Error(`Missing tray icon layout for line ${index}.`);
        }
        const glyphColor =
          index === 0 ? FOREGROUND_COLOR : icon.expressionColor;

        return `
      <text
        x="${SIZE / 2}"
        y="${layout.y}"
        font-size="${layout.fontSize}"
        textLength="${layout.textLength}"
        lengthAdjust="spacingAndGlyphs"
        fill="${glyphColor}"
        stroke="${glyphColor}"
        xml:space="preserve"
      >${escapeXml(line)}</text>
    `;
      })
      .join('')}
  </g>
</svg>
`.trim();
}

async function main() {
  const outputDir = 'preview/tray-icons';

  mkdirSync(outputDir, { recursive: true });
  for (const previewSize of PREVIEW_SIZES) {
    mkdirSync(`${outputDir}/${previewSize}x${previewSize}`, {
      recursive: true,
    });
  }

  for (const [status, icon] of Object.entries(icons)) {
    const svg = renderTraySvg(icon);
    const input = Buffer.from(svg);

    await sharp(input)
      .png()
      .toFile(`${outputDir}/${status}.png`);

    for (const previewSize of PREVIEW_SIZES) {
      await sharp(Buffer.from(renderTraySvg(icon, previewSize)))
        .png()
        .toFile(
          `${outputDir}/${previewSize}x${previewSize}/${status}.png`,
        );
    }

    console.log(`rendered: ${status} (128, 32, 16)`);
  }
}

await main();
