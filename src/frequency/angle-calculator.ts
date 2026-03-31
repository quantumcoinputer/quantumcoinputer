import { getTargetDistribution } from './letter-weights';

/**
 * Compute Ry rotation angles for a 5-qubit group to approximate a target
 * probability distribution over 26 letters (states 0-25 of 32 possible).
 *
 * Strategy: We use a binary tree decomposition. For 5 qubits, the state space
 * is a binary tree of depth 5. Each qubit's Ry angle controls the split
 * probability at that level of the tree.
 *
 * Ry(theta)|0> = cos(theta/2)|0> + sin(theta/2)|1>
 * So P(|1>) = sin^2(theta/2), P(|0>) = cos^2(theta/2)
 * theta = 2 * arcsin(sqrt(p))
 */

/**
 * Given a target distribution over 32 states (padded from 26 letters),
 * compute the Ry angle for each qubit at each conditional branch.
 *
 * Returns a tree of angles: for each qubit q (0-4), and each possible
 * prefix state (determined by qubits 0..q-1), one angle.
 *
 * For simplicity, we return a flat array of angles for qubits 0-4,
 * where each qubit's angle is the marginal split at that level.
 * This is an approximation (ignores conditional structure) but works
 * well when combined with entanglement gates.
 */
export function computeRyAngles(position: number): number[] {
  const dist = getTargetDistribution(position);

  // Pad to 32 states (states 26-31 get zero probability)
  const padded = new Array(32).fill(0);
  for (let i = 0; i < 26; i++) padded[i] = dist[i];

  // Normalize padded to sum to 1
  const total = padded.reduce((s: number, v: number) => s + v, 0);
  for (let i = 0; i < 32; i++) padded[i] /= total;

  return computeTreeAngles(padded, 5);
}

/**
 * Recursive binary tree angle computation.
 * For n qubits encoding 2^n states, compute angles at each level.
 *
 * Returns angles in order: [qubit0_angles..., qubit1_angles..., ...qubit4_angles...]
 * where qubit k has 2^k conditional angles.
 */
export function computeTreeAngles(distribution: number[], numQubits: number): number[] {
  const angles: number[] = [];

  // For each level of the tree
  for (let level = 0; level < numQubits; level++) {
    const blockSize = Math.pow(2, numQubits - level);
    const halfBlock = blockSize / 2;
    const numBlocks = Math.pow(2, level);

    for (let block = 0; block < numBlocks; block++) {
      const start = block * blockSize;
      // Sum of probabilities in the lower half (|0> branch)
      let p0 = 0;
      for (let i = start; i < start + halfBlock; i++) p0 += distribution[i];
      // Sum of probabilities in the upper half (|1> branch)
      let p1 = 0;
      for (let i = start + halfBlock; i < start + blockSize; i++) p1 += distribution[i];

      const totalBlock = p0 + p1;
      if (totalBlock < 1e-10) {
        angles.push(0); // No probability mass here
      } else {
        // P(|1>) = p1 / totalBlock
        // theta = 2 * arcsin(sqrt(P(|1>)))
        const pOne = p1 / totalBlock;
        const theta = 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, pOne))));
        angles.push(theta);
      }
    }
  }

  return angles;
}

/**
 * Get all angles for all 4 letter positions.
 * Returns array of 4 angle arrays, one per position.
 */
export function computeAllAngles(): number[][] {
  return [0, 1, 2, 3].map(pos => computeRyAngles(pos));
}
