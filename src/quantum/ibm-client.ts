import { config } from '../config/env';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

export interface IBMJobResult {
  jobId: string;
  backend: string;
  status: string;
  samples: string[];
  numBits: number;
  shots: number;
  createdAt: string;
}

/**
 * Execute a quantum circuit on IBM hardware via Qiskit Python.
 *
 * Handles: circuit building, transpilation, job submission, polling, and result parsing.
 * All IBM auth and hardware details are managed by Qiskit Runtime SDK in Python.
 */
export function executeCircuit(
  style: string,
  shots: number = 8192,
): IBMJobResult {
  const apiKey = config.ibm.token();
  const scriptPath = path.resolve(__dirname, 'run_quantum.py');
  const outputPath = path.resolve(__dirname, '../../output/ibm_results.json');

  console.log(`[IBM] Running quantum circuit (style=${style}, shots=${shots})...`);

  const cmd = [
    'python3', scriptPath,
    '--style', style,
    '--token', apiKey,
    '--shots', String(shots),
    '--output', outputPath,
  ].join(' ');

  // Run Python — stderr shows progress, stdout returns job ID
  const stdout = execSync(cmd, {
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 600000, // 10 min max for queue + execution
  });

  const jobId = stdout.toString().trim();
  console.log(`[IBM] Job completed: ${jobId}`);

  // Read the full results JSON written by Python
  const result: IBMJobResult = JSON.parse(readFileSync(outputPath, 'utf-8'));
  console.log(`[IBM] Backend: ${result.backend}, Samples: ${result.samples.length}`);

  return result;
}
