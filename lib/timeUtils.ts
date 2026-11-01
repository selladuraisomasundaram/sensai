/**
 * Converts formatted timestamp strings (MM:SS, HH:MM:SS) or numbers into total seconds.
 */
export function parseTimestampToSeconds(timestamp: string | number | undefined | null): number {
  if (timestamp === undefined || timestamp === null) return 0;
  if (typeof timestamp === 'number') return timestamp;

  const clean = timestamp.trim();
  const parts = clean.split(':').map(Number);

  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  const numeric = parseFloat(clean);
  return isNaN(numeric) ? 0 : numeric;
}

/**
 * Formats total seconds into a clean MM:SS or HH:MM:SS string.
 */
export function formatSecondsToTimestamp(totalSeconds: number): string {
  const rounded = Math.floor(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

