import { generateSimulatedSamples, deriveTokenName } from '../src/quantum/result-parser';
import { extractMeasurementData, renderMeasurementArt } from '../src/art/measurement-renderer';
import { existsSync, statSync } from 'fs';
import path from 'path';

console.log('=== Measurement Art Tests ===\n');

const outputDir = path.resolve(__dirname, '../output');
const shots = 8192;
const samples = generateSimulatedSamples(shots);
const tokenName = deriveTokenName(samples, 20);
const { qubitBias } = extractMeasurementData(samples, 20);

console.log(`Token: ${tokenName.name}`);
console.log('Qubit bias:', qubitBias.map(b => `${(b * 100).toFixed(0)}%`).join(' '));

const outputPath = path.join(outputDir, 'token_art.png');
const result = renderMeasurementArt({
  tokenName: tokenName.name,
  qubitBias,
  jobId: 'sim-test-12345',
  backend: 'ibm_brisbane',
  shots,
}, outputPath);

console.log(`\nOutput: ${result.path} (${result.width}x${result.height})`);
const stat = statSync(outputPath);
console.log(`Size: ${(stat.size / 1024).toFixed(1)} KB`);

if (!existsSync(outputPath)) throw new Error('Not created');
if (stat.size < 2000) throw new Error('Too small');

console.log('✓ Passed\n');
console.log('=== ALL TESTS PASSED ===');
