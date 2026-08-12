export const observationStatuses = ['focus', 'break', 'offline'] as const;

export type ObservationStatus = (typeof observationStatuses)[number];

export interface ObservationState {
  status: ObservationStatus;
  updatedAt: string;
}

export function isObservationStatus(value: unknown): value is ObservationStatus {
  return typeof value === 'string' && observationStatuses.includes(value as ObservationStatus);
}

export function isIsoUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/.exec(value);

  if (!match) {
    return false;
  }

  const [, year, month, day, hour, minute, second, milliseconds = '000'] = match;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(milliseconds),
  );

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const date = new Date(timestamp);

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day) &&
    date.getUTCHours() === Number(hour) &&
    date.getUTCMinutes() === Number(minute) &&
    date.getUTCSeconds() === Number(second) &&
    date.getUTCMilliseconds() === Number(milliseconds)
  );
}

export function isObservationState(value: unknown): value is ObservationState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Object.keys(candidate).length === 2 &&
    isObservationStatus(candidate.status) &&
    isIsoUtcTimestamp(candidate.updatedAt)
  );
}
