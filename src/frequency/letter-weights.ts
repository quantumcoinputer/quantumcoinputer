import norvigData from '../../data/norvig-frequencies.json';

export type LetterFrequencies = Record<string, number>;

const POSITIONS = ['position1', 'position2', 'position3', 'position4'] as const;

/**
 * Returns normalized frequency distribution for a given letter position (0-3).
 * Keys are uppercase letters A-Z, values sum to 1.0.
 */
export function getPositionFrequencies(position: number): LetterFrequencies {
  if (position < 0 || position > 3) throw new Error(`Invalid position: ${position}`);
  const key = POSITIONS[position];
  const raw = norvigData[key] as Record<string, number>;

  // Normalize so values sum exactly to 1.0
  const total = Object.values(raw).reduce((s, v) => s + v, 0);
  const normalized: LetterFrequencies = {};
  for (const [letter, freq] of Object.entries(raw)) {
    normalized[letter] = freq / total;
  }
  return normalized;
}

/**
 * Returns a target probability distribution as an array of 26 values (A=0, B=1, ..., Z=25).
 */
export function getTargetDistribution(position: number): number[] {
  const freqs = getPositionFrequencies(position);
  const dist = new Array(26).fill(0);
  for (const [letter, prob] of Object.entries(freqs)) {
    const idx = letter.charCodeAt(0) - 65; // A=0
    dist[idx] = prob;
  }
  return dist;
}

/**
 * Maps a 5-bit integer (0-25) to a letter. Returns null for 26-31.
 */
export function bitsToLetter(value: number): string | null {
  if (value < 0 || value > 25) return null;
  return String.fromCharCode(65 + value);
}

/**
 * Maps a letter to its 5-bit integer (A=0, B=1, ..., Z=25).
 */
export function letterToBits(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65;
}
