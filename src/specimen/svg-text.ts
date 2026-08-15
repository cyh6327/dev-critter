export function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function renderTextLines(
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
  className: string,
): string {
  return lines
    .map((line, index) => `<text class="${className}" x="${x}" y="${y + index * lineHeight}">${escapeXml(line)}</text>`)
    .join('\n');
}

export function wrapText(value: string, maxChars: number): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}
