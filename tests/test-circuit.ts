import { buildCircuit, circuitSummary } from '../src/quantum/circuit-builder';

console.log('=== Circuit Builder Tests ===\n');

// Test all three styles
for (const style of ['soft', 'hard', 'harmonic']) {
  console.log(`--- Style: ${style} ---`);
  const circuit = buildCircuit(style);
  console.log(circuitSummary(circuit));
  console.log(`QASM length: ${circuit.qasm.length} chars`);
  console.log(`Gates: ${circuit.gates.length}`);

  // Verify QASM structure
  if (!circuit.qasm.startsWith('OPENQASM 3.0;')) throw new Error('Missing QASM header');
  if (!circuit.qasm.includes('include "stdgates.inc"')) throw new Error('Missing stdgates include');
  if (!circuit.qasm.includes('qubit[20] q;')) throw new Error('Missing qubit declaration');
  if (!circuit.qasm.includes('bit[20] c;')) throw new Error('Missing classical bit declaration');
  if (!circuit.qasm.includes('c[19] = measure q[19];')) throw new Error('Missing final measurement');

  // Count measurements
  const measureCount = (circuit.qasm.match(/measure/g) || []).length;
  if (measureCount !== 20) throw new Error(`Expected 20 measurements, got ${measureCount}`);

  console.log('✓ QASM structure valid\n');
}

// Print full QASM for "soft" style
console.log('=== Full QASM (soft style) ===\n');
const softCircuit = buildCircuit('soft');
console.log(softCircuit.qasm);

// Test invalid style
try {
  buildCircuit('invalid');
  throw new Error('Should have thrown');
} catch (e: any) {
  if (!e.message.includes('Unknown style')) throw e;
  console.log('\n✓ Invalid style correctly rejected');
}

console.log('\n=== ALL CIRCUIT TESTS PASSED ===');
