import { getPositionFrequencies, getTargetDistribution, bitsToLetter } from '../src/frequency/letter-weights';
import { computeRyAngles, computeTreeAngles, computeAllAngles } from '../src/frequency/angle-calculator';

console.log('=== Letter Frequency Tests ===\n');

// Test 1: Check frequency loading and normalization
for (let pos = 0; pos < 4; pos++) {
  const freqs = getPositionFrequencies(pos);
  const total = Object.values(freqs).reduce((s, v) => s + v, 0);
  const topLetters = Object.entries(freqs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([l, f]) => `${l}:${(f * 100).toFixed(1)}%`);
  console.log(`Position ${pos + 1}: sum=${total.toFixed(4)}, top5=[${topLetters.join(', ')}]`);
  if (Math.abs(total - 1.0) > 0.001) {
    throw new Error(`Position ${pos + 1} frequencies don't sum to 1.0!`);
  }
}
console.log('✓ All positions normalized correctly\n');

// Test 2: Target distribution array
const dist1 = getTargetDistribution(0);
console.log(`Position 1 distribution length: ${dist1.length}`);
console.log(`P(T) at pos 1: ${(dist1[19] * 100).toFixed(1)}% (T is index 19)`);
console.log(`P(S) at pos 1: ${(dist1[18] * 100).toFixed(1)}% (S is index 18)`);
if (dist1.length !== 26) throw new Error('Distribution should have 26 entries');
console.log('✓ Target distribution correct\n');

// Test 3: Ry angle computation
console.log('=== Ry Angle Tests ===\n');
for (let pos = 0; pos < 4; pos++) {
  const angles = computeRyAngles(pos);
  console.log(`Position ${pos + 1}: ${angles.length} angles`);
  // 5-qubit tree: 1 + 2 + 4 + 8 + 16 = 31 angles
  if (angles.length !== 31) throw new Error(`Expected 31 angles, got ${angles.length}`);

  // Verify angles reconstruct a valid distribution
  const reconstructed = reconstructDistribution(angles, 5);
  const origDist = getTargetDistribution(pos);
  const padded = new Array(32).fill(0);
  for (let i = 0; i < 26; i++) padded[i] = origDist[i];
  const total = padded.reduce((s, v) => s + v, 0);
  for (let i = 0; i < 32; i++) padded[i] /= total;

  let maxError = 0;
  for (let i = 0; i < 32; i++) {
    maxError = Math.max(maxError, Math.abs(reconstructed[i] - padded[i]));
  }
  console.log(`  Max reconstruction error: ${maxError.toExponential(3)}`);
  if (maxError > 1e-10) throw new Error('Reconstruction error too large!');
}
console.log('✓ All angles reconstruct correctly\n');

// Test 4: Simulate name generation from the distribution
console.log('=== Simulated Name Generation ===\n');
const allAngles = computeAllAngles();
for (let trial = 0; trial < 5; trial++) {
  let name = '';
  for (let pos = 0; pos < 4; pos++) {
    const dist = reconstructDistribution(allAngles[pos], 5);
    // Weighted random sample
    const r = Math.random();
    let cumulative = 0;
    let chosen = 0;
    for (let i = 0; i < 32; i++) {
      cumulative += dist[i];
      if (r <= cumulative) { chosen = i; break; }
    }
    const letter = bitsToLetter(chosen);
    if (letter) name += letter;
    else name += '?';
  }
  console.log(`  Trial ${trial + 1}: ${name}`);
}
console.log('✓ Name generation works\n');

console.log('=== ALL FREQUENCY TESTS PASSED ===');

function reconstructDistribution(angles: number[], numQubits: number): number[] {
  const dist = new Array(Math.pow(2, numQubits)).fill(1);
  let angleIdx = 0;

  for (let level = 0; level < numQubits; level++) {
    const blockSize = Math.pow(2, numQubits - level);
    const halfBlock = blockSize / 2;
    const numBlocks = Math.pow(2, level);

    for (let block = 0; block < numBlocks; block++) {
      const start = block * blockSize;
      const theta = angles[angleIdx++];
      const p0 = Math.cos(theta / 2) ** 2;
      const p1 = Math.sin(theta / 2) ** 2;

      for (let i = start; i < start + halfBlock; i++) dist[i] *= p0;
      for (let i = start + halfBlock; i < start + blockSize; i++) dist[i] *= p1;
    }
  }
  return dist;
}
