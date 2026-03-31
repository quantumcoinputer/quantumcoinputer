/**
 * Circuit style presets define entanglement patterns between letter groups.
 * Each style creates different correlations between letter positions.
 */
export interface CircuitStyle {
  name: string;
  description: string;
  /** CNOT pairs: [control_qubit, target_qubit] across letter groups */
  entanglements: [number, number][];
}

/**
 * "Soft" style: vowel-consonant alternation bias.
 * Entangles adjacent letter groups to create natural-sounding names.
 */
const soft: CircuitStyle = {
  name: 'soft',
  description: 'Vowel-consonant alternation bias via adjacent group entanglement',
  entanglements: [
    // Group 0 → Group 1 (pos1 influences pos2)
    [2, 5], [3, 6],
    // Group 1 → Group 2 (pos2 influences pos3)
    [7, 10], [8, 11],
    // Group 2 → Group 3 (pos3 influences pos4)
    [12, 15], [13, 16],
  ],
};

/**
 * "Hard" style: minimal entanglement, positions mostly independent.
 * Produces more random/alien names.
 */
const hard: CircuitStyle = {
  name: 'hard',
  description: 'Minimal entanglement for more random names',
  entanglements: [
    [4, 9],   // Sparse connection group 0→1
    [14, 19], // Sparse connection group 2→3
  ],
};

/**
 * "Harmonic" style: positions 1↔3 and 2↔4 entangled.
 * Creates palindromic tendencies.
 */
const harmonic: CircuitStyle = {
  name: 'harmonic',
  description: 'Cross-position entanglement for palindromic tendencies',
  entanglements: [
    // Group 0 ↔ Group 2 (pos1 ↔ pos3)
    [0, 10], [2, 12], [4, 14],
    // Group 1 ↔ Group 3 (pos2 ↔ pos4)
    [5, 15], [7, 17], [9, 19],
  ],
};

export const STYLES: Record<string, CircuitStyle> = { soft, hard, harmonic };
