import { bitsToLetter } from '../frequency/letter-weights';

const NUM_QUBITS = 20;
const QUBITS_PER_GROUP = 5;
const NUM_GROUPS = 4;

export interface TokenName {
  name: string;
  symbol: string;
  bitstring: string;
  count: number;
  totalShots: number;
  probability: number;
}

/**
 * Parse IBM Quantum Sampler V2 results (hex-encoded samples) into a histogram
 * of 20-bit measurement outcomes.
 *
 * Each sample is a hex string like "0x4a3f2" representing the measured bits.
 */
export function samplesToHistogram(samples: string[], numBits: number): Map<string, number> {
  const histogram = new Map<string, number>();

  for (const sample of samples) {
    // Convert hex to binary string, pad to numBits
    const value = parseInt(sample, 16);
    const bitstring = value.toString(2).padStart(numBits, '0');
    histogram.set(bitstring, (histogram.get(bitstring) || 0) + 1);
  }

  return histogram;
}

/**
 * Extract a 4-letter name from a 20-bit measurement string.
 * Splits into 4 groups of 5 bits, maps each to a letter (0-25 = A-Z).
 * Returns null if any group maps to 26-31 (invalid).
 */
export function bitstringToName(bitstring: string): string | null {
  if (bitstring.length !== NUM_QUBITS) return null;

  let name = '';
  for (let group = 0; group < NUM_GROUPS; group++) {
    const start = group * QUBITS_PER_GROUP;
    const bits = bitstring.substring(start, start + QUBITS_PER_GROUP);
    const value = parseInt(bits, 2);
    const letter = bitsToLetter(value);
    if (!letter) return null; // Value 26-31, invalid
    name += letter;
  }
  return name;
}

/**
 * Derive the token name from measurement results.
 *
 * Strategy (deterministic): Take the most-frequently measured 20-bit string
 * that maps to a valid 4-letter name. This makes the name reproducibly
 * derivable from the IBM job results.
 */
export function deriveTokenName(samples: string[], numBits: number = NUM_QUBITS): TokenName {
  const histogram = samplesToHistogram(samples, numBits);
  const totalShots = samples.length;

  // Sort by count descending
  const sorted = Array.from(histogram.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log(`[Parser] ${histogram.size} unique outcomes from ${totalShots} shots`);
  console.log(`[Parser] Top 10 outcomes:`);
  for (const [bits, count] of sorted.slice(0, 10)) {
    const name = bitstringToName(bits);
    const pct = ((count / totalShots) * 100).toFixed(2);
    console.log(`  ${bits} → ${name || 'INVALID'} (${count} shots, ${pct}%)`);
  }

  // Find the most-measured valid name
  for (const [bitstring, count] of sorted) {
    const name = bitstringToName(bitstring);
    if (name) {
      const probability = count / totalShots;
      console.log(`\n[Parser] Selected: ${name} (${count}/${totalShots} = ${(probability * 100).toFixed(2)}%)`);
      return {
        name,
        symbol: name,
        bitstring,
        count,
        totalShots,
        probability,
      };
    }
  }

  throw new Error('No valid 4-letter name found in measurement results. All outcomes mapped to invalid states (26-31).');
}

/**
 * Create a simulated measurement result for testing purposes.
 * Generates samples that mimic real IBM output based on circuit probabilities.
 */
export function generateSimulatedSamples(shots: number = 8192): string[] {
  const samples: string[] = [];

  for (let i = 0; i < shots; i++) {
    // Generate a random 20-bit value, biased toward lower values per group
    // (since our Ry angles bias toward common letters which tend to be lower indices)
    let value = 0;
    for (let group = 0; group < NUM_GROUPS; group++) {
      // Generate a biased 5-bit value (0-25 preferred)
      let groupValue: number;
      const r = Math.random();
      if (r < 0.85) {
        // 85% chance: valid letter range (0-25)
        groupValue = Math.floor(Math.random() * 26);
      } else {
        // 15% chance: full range (0-31)
        groupValue = Math.floor(Math.random() * 32);
      }
      value |= (groupValue << (group * QUBITS_PER_GROUP));
    }
    samples.push('0x' + value.toString(16));
  }

  return samples;
}
