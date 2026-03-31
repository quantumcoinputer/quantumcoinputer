import { buildCircuit } from '../src/quantum/circuit-builder';
import { submitJob, waitForJob, getJobResults, executeCircuit } from '../src/quantum/ibm-client';

async function main() {
  console.log('=== IBM Quantum API Tests ===\n');

  // Check if API key is configured
  const apiKey = process.env.IBM_QUANTUM_TOKEN;
  if (!apiKey) {
    console.log('⚠ IBM_QUANTUM_TOKEN not set. Skipping live API tests.');
    console.log('  Set it in .env to run integration tests.\n');

    // Still test circuit generation
    const circuit = buildCircuit('soft');
    console.log('Circuit QASM generated successfully');
    console.log(`QASM length: ${circuit.qasm.length} chars`);
    console.log(`First 200 chars:\n${circuit.qasm.substring(0, 200)}...`);
    console.log('\n=== IBM TESTS SKIPPED (no API key) ===');
    return;
  }

  // Build circuit
  const circuit = buildCircuit('soft');
  console.log('Circuit built:', circuit.gates.length, 'gates');

  // Submit and execute
  const shots = parseInt(process.env.SHOTS || '8192', 10);
  console.log(`\nSubmitting to IBM Quantum (${shots} shots)...`);

  try {
    const result = await executeCircuit(circuit.qasm, shots);

    console.log('\n=== Job Results ===');
    console.log(`Job ID: ${result.jobId}`);
    console.log(`Backend: ${result.backend}`);
    console.log(`Status: ${result.status}`);
    console.log(`Shots: ${result.shots}`);
    console.log(`Samples received: ${result.samples.length}`);
    console.log(`Num bits: ${result.numBits}`);
    console.log(`Created: ${result.createdAt}`);
    console.log(`Finished: ${result.finishedAt}`);

    if (result.samples.length > 0) {
      console.log(`\nFirst 5 samples: ${result.samples.slice(0, 5).join(', ')}`);
    }

    console.log('\n=== IBM TESTS PASSED ===');
  } catch (e: any) {
    console.error(`\nIBM API Error: ${e.message}`);
    console.log('\nThis may be due to:');
    console.log('  - Invalid API key');
    console.log('  - Backend not available');
    console.log('  - API endpoint changes');
    console.log('\nCheck the error message and update ibm-client.ts accordingly.');
    process.exit(1);
  }
}

main();
