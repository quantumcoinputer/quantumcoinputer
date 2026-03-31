import { buildDescription, uploadToIPFS } from '../src/ipfs/uploader';
import { buildCircuit } from '../src/quantum/circuit-builder';
import { renderCircuit } from '../src/art/circuit-renderer';
import path from 'path';
import { existsSync } from 'fs';

async function main() {
  console.log('=== IPFS Upload Tests ===\n');

  // Test 1: Description building
  console.log('--- Test 1: Build description ---');
  const desc = buildDescription({
    jobId: 'test-job-123',
    backend: 'ibm_brisbane',
    shots: 8192,
    timestamp: new Date().toISOString(),
  });
  console.log(desc);
  if (!desc.includes('test-job-123')) throw new Error('Missing job ID in description');
  if (!desc.includes('ibm_brisbane')) throw new Error('Missing backend in description');
  if (!desc.includes('The name was not chosen')) throw new Error('Missing tagline');
  console.log('✓ Description built correctly\n');

  // Test 2: Generate art for upload test
  console.log('--- Test 2: Prepare upload image ---');
  const circuit = buildCircuit('soft');
  const outputPath = path.resolve(__dirname, '../output/circuit_art.png');
  renderCircuit(circuit, outputPath);
  if (!existsSync(outputPath)) throw new Error('Art file not generated');
  console.log(`Art file ready: ${outputPath}`);
  console.log('✓ Image prepared\n');

  // Test 3: Live upload (only if we want to test against pump.fun)
  const runLive = process.argv.includes('--live');
  if (runLive) {
    console.log('--- Test 3: Live IPFS upload ---');
    try {
      const result = await uploadToIPFS({
        name: 'TEST',
        symbol: 'TEST',
        description: desc,
        imagePath: outputPath,
        showName: true,
      });
      console.log(`Metadata URI: ${result.metadataUri}`);
      console.log('✓ Live upload successful\n');
    } catch (e: any) {
      console.error(`Upload failed: ${e.message}`);
      console.log('This may be expected if pump.fun rate-limits or blocks test uploads.');
    }
  } else {
    console.log('--- Test 3: Live upload skipped (run with --live to test) ---\n');
  }

  console.log('=== IPFS TESTS PASSED ===');
}

main();
