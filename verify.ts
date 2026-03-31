/**
 * QOT Verifier — Reproduce a token name from an IBM Quantum job ID.
 *
 * Usage:
 *   npx ts-node verify.ts <job_id>
 *
 * Requires IBM_QUANTUM_TOKEN in .env or as environment variable.
 * Connects to IBM Quantum, pulls the measurement results for the given job,
 * and derives the token name using the same algorithm as the pipeline.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx ts-node verify.ts <IBM_JOB_ID>');
  console.error('Example: npx ts-node verify.ts d75s3oq3qcgc73fs60p0');
  process.exit(1);
}

const token = process.env.IBM_QUANTUM_TOKEN;
if (!token) {
  console.error('Set IBM_QUANTUM_TOKEN in .env or environment.');
  process.exit(1);
}

async function main() {
  console.log(`\nVerifying job: ${jobId}\n`);

  // Step 1: Connect to IBM and fetch job results via Qiskit
  console.log('Fetching measurement results from IBM Quantum...');

  const { execSync } = require('child_process');
  const outputPath = path.resolve(__dirname, 'output', `verify_${jobId}.json`);

  const script = `
import json, sys
from qiskit_ibm_runtime import QiskitRuntimeService

service = QiskitRuntimeService(
    channel="ibm_quantum_platform",
    token="${token}",
)

job = service.job("${jobId}")
status = job.status()
print(f"Job status: {status}", file=sys.stderr)

if str(status) not in ("JobStatus.DONE", "DONE", "Completed"):
    print(f"Job is not completed (status: {status}). Cannot verify.", file=sys.stderr)
    sys.exit(1)

result = job.result()
pub_result = result[0]
bit_array = pub_result.data.meas
samples = []
for bitstring in bit_array.get_bitstrings():
    val = int(bitstring, 2)
    samples.append(f"0x{val:x}")

meta = {
    "jobId": "${jobId}",
    "backend": str(job.backend()),
    "samples": samples,
    "numBits": 20,
    "shots": len(samples),
}

with open("${outputPath}", "w") as f:
    json.dump(meta, f)

print(f"Got {len(samples)} samples from {meta['backend']}", file=sys.stderr)
`;

  execSync(`python3 -c '${script.replace(/'/g, "'\\''")}'`, {
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 120000,
  });

  // Step 2: Derive the name using the same algorithm
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

  console.log(`\nBackend: ${data.backend}`);
  console.log(`Shots: ${data.shots}`);
  console.log(`Samples received: ${data.samples.length}\n`);

  // Build histogram
  const histogram = new Map<string, number>();
  for (const sample of data.samples) {
    const value = parseInt(sample, 16);
    const bitstring = value.toString(2).padStart(20, '0');
    histogram.set(bitstring, (histogram.get(bitstring) || 0) + 1);
  }

  // Sort by frequency
  const sorted = Array.from(histogram.entries()).sort((a, b) => b[1] - a[1]);

  console.log(`Unique outcomes: ${histogram.size}`);
  console.log(`\nTop 10 measurement outcomes:`);

  for (const [bits, count] of sorted.slice(0, 10)) {
    const name = bitsToName(bits);
    const pct = ((count / data.shots) * 100).toFixed(2);
    console.log(`  ${bits} → ${name ?? 'INVALID'} (${count} shots, ${pct}%)`);
  }

  // Find the winning name
  for (const [bits, count] of sorted) {
    const name = bitsToName(bits);
    if (name) {
      const pct = ((count / data.shots) * 100).toFixed(2);
      console.log(`\n${'='.repeat(50)}`);
      console.log(`  VERIFIED TOKEN NAME: ${name}`);
      console.log(`  Measured ${count}/${data.shots} times (${pct}%)`);
      console.log(`  Bitstring: ${bits}`);
      console.log(`  Breakdown:`);
      for (let g = 0; g < 4; g++) {
        const groupBits = bits.substring(g * 5, g * 5 + 5);
        const val = parseInt(groupBits, 2);
        const letter = String.fromCharCode(65 + val);
        console.log(`    Position ${g + 1}: ${groupBits} = ${val} = "${letter}"`);
      }
      console.log(`${'='.repeat(50)}\n`);
      return;
    }
  }

  console.error('No valid 4-letter name found in results.');
  process.exit(1);
}

function bitsToName(bitstring: string): string | null {
  if (bitstring.length !== 20) return null;
  let name = '';
  for (let g = 0; g < 4; g++) {
    const val = parseInt(bitstring.substring(g * 5, g * 5 + 5), 2);
    if (val > 25) return null;
    name += String.fromCharCode(65 + val);
  }
  return name;
}

main().catch(e => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
