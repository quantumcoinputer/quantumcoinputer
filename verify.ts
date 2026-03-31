/**
 * QOT Verifier — Reproduce a token name from an IBM Quantum job ID.
 *
 * Usage:
 *   npx ts-node verify.ts <job_id>
 *
 * Requires IBM_QUANTUM_TOKEN in .env or as environment variable.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env'), debug: false });

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx ts-node verify.ts <IBM_JOB_ID>');
  process.exit(1);
}

const token = process.env.IBM_QUANTUM_TOKEN;
if (!token) {
  console.error('Set IBM_QUANTUM_TOKEN in .env or environment.');
  process.exit(1);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function typeOut(text: string, delayMs: number = 0) {
  process.stdout.write(text + '\n');
  if (delayMs) await sleep(delayMs);
}

async function main() {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const outputPath = path.resolve(__dirname, 'output', `verify_${jobId}.json`);

  // ─── Header ───
  await typeOut('');
  await typeOut('┌─────────────────────────────────────────────────────┐');
  await typeOut('│     QOT Verifier — Quantum-Originated Token Proof   │');
  await typeOut('└─────────────────────────────────────────────────────┘');
  await typeOut('');

  // ─── Step 1: Show what we're verifying ───
  await typeOut(`  Job ID:  ${jobId}`);
  await typeOut(`  Source:  IBM Quantum Platform (quantum.cloud.ibm.com)`);
  await typeOut('');

  // ─── Step 2: Connect to IBM ───
  await typeOut('▸ Step 1/5 — Connecting to IBM Quantum Platform...', 300);

  const script = `
import json, sys, warnings, logging
warnings.filterwarnings("ignore")
logging.disable(logging.CRITICAL)

from qiskit_ibm_runtime import QiskitRuntimeService

service = QiskitRuntimeService(
    channel="ibm_quantum_platform",
    token="${token}",
)

job = service.job("${jobId}")
status = str(job.status())
backend_name = str(job.backend())

# Clean up backend name
if "IBMBackend" in backend_name:
    backend_name = backend_name.split("'")[1]

result = job.result()
pub_result = result[0]
bit_array = pub_result.data.meas
samples = []
for bitstring in bit_array.get_bitstrings():
    val = int(bitstring, 2)
    samples.append(f"0x{val:x}")

meta = {
    "jobId": "${jobId}",
    "backend": backend_name,
    "status": status,
    "samples": samples,
    "numBits": 20,
    "shots": len(samples),
}

with open("${outputPath}", "w") as f:
    json.dump(meta, f)

# Only output clean JSON to stdout
print(json.dumps({"backend": backend_name, "status": status, "shots": len(samples), "unique": len(set(samples))}))
`;

  const stdout = execSync(`python3 -c '${script.replace(/'/g, "'\\''")}'`, {
    stdio: ['pipe', 'pipe', 'pipe'], // suppress all stderr
    timeout: 120000,
  });

  const ibmInfo = JSON.parse(stdout.toString().trim());

  await typeOut(`  ✓ Connected to IBM Quantum`);
  await typeOut('');

  // ─── Step 3: Show job metadata ───
  await typeOut('▸ Step 2/5 — Retrieving job metadata from IBM...', 300);
  await typeOut(`  ✓ Job status:  ${ibmInfo.status}`);
  await typeOut(`  ✓ Backend:     ${ibmInfo.backend}`);
  await typeOut(`  ✓ Total shots: ${ibmInfo.shots.toLocaleString()}`);
  await typeOut('');

  // ─── Step 4: Parse measurements ───
  await typeOut('▸ Step 3/5 — Parsing measurement results...', 300);

  const data = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

  // Build histogram
  const histogram = new Map<string, number>();
  for (const sample of data.samples) {
    const value = parseInt(sample, 16);
    const bitstring = value.toString(2).padStart(20, '0');
    histogram.set(bitstring, (histogram.get(bitstring) || 0) + 1);
  }
  const sorted = Array.from(histogram.entries()).sort((a, b) => b[1] - a[1]);

  await typeOut(`  ✓ ${ibmInfo.shots.toLocaleString()} raw samples parsed`);
  await typeOut(`  ✓ ${histogram.size.toLocaleString()} unique measurement outcomes`);
  await typeOut('');

  // ─── Step 5: Show top outcomes ───
  await typeOut('▸ Step 4/5 — Ranking measurement outcomes by frequency...', 300);
  await typeOut('');
  await typeOut('  Rank  Bitstring              Name    Shots   Freq');
  await typeOut('  ────  ─────────────────────  ──────  ──────  ──────');

  let rank = 0;
  let validRank = 0;
  for (const [bits, count] of sorted.slice(0, 20)) {
    rank++;
    const name = bitsToName(bits);
    const pct = ((count / data.shots) * 100).toFixed(2);
    const nameStr = name ? name : '------';
    const marker = name && validRank === 0 ? '  ◄ WINNER' : '';
    if (name && validRank === 0) validRank = rank;
    await typeOut(`  #${String(rank).padStart(2, '0')}   ${bits}  ${nameStr.padEnd(6)}  ${String(count).padStart(5)}   ${pct}%${marker}`);
  }
  await typeOut('');

  // ─── Step 6: Derive the name ───
  await typeOut('▸ Step 5/5 — Deriving token name...', 500);
  await typeOut('');

  for (const [bits, count] of sorted) {
    const name = bitsToName(bits);
    if (name) {
      const pct = ((count / data.shots) * 100).toFixed(2);

      // Show the derivation step by step
      await typeOut('  Most-measured valid 20-bit string:');
      await typeOut(`  ${bits}`, 200);
      await typeOut('');
      await typeOut('  Split into 4 groups of 5 qubits:', 200);
      await typeOut('');

      for (let g = 0; g < 4; g++) {
        const groupBits = bits.substring(g * 5, g * 5 + 5);
        const val = parseInt(groupBits, 2);
        const letter = String.fromCharCode(65 + val);
        await typeOut(`    Qubits ${String(g * 5).padStart(2)}-${String(g * 5 + 4).padStart(2)}:  ${groupBits}  →  decimal ${String(val).padStart(2)}  →  letter "${letter}"`, 300);
      }

      await typeOut('');
      await typeOut('  ╔══════════════════════════════════════════════╗');
      await typeOut(`  ║                                              ║`);
      await typeOut(`  ║   VERIFIED TOKEN NAME:  ${name}                  ║`);
      await typeOut(`  ║                                              ║`);
      await typeOut(`  ║   Measured ${count}/${data.shots} times (${pct}%)              ║`);
      await typeOut(`  ║   IBM Job: ${jobId}        ║`);
      await typeOut(`  ║   Backend: ${ibmInfo.backend.padEnd(35)}║`);
      await typeOut(`  ║                                              ║`);
      await typeOut('  ╚══════════════════════════════════════════════╝');
      await typeOut('');
      return;
    }
  }

  console.error('No valid 4-letter name found.');
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
