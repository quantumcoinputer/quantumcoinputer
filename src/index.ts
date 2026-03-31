import { config } from './config/env';
import { buildCircuit, circuitSummary } from './quantum/circuit-builder';
import { executeCircuit, IBMJobResult } from './quantum/ibm-client';
import { deriveTokenName, generateSimulatedSamples, TokenName } from './quantum/result-parser';
import { extractMeasurementData, renderMeasurementArt } from './art/measurement-renderer';
import { uploadToIPFS, buildDescription, IPFSUploadResult } from './ipfs/uploader';
import { createToken, TokenCreateResult } from './solana/token-creator';
import { writeFileSync } from 'fs';
import path from 'path';

export interface PipelineResult {
  tokenName: TokenName;
  circuit: { style: string; numQubits: number; gateCount: number; qasm: string };
  ibm: { jobId: string; backend: string; shots: number; timestamp: string };
  art: { path: string; width: number; height: number };
  ipfs: { metadataUri: string };
  solana: TokenCreateResult;
}

/**
 * Main orchestrator pipeline.
 * Runs the full quantum-to-token flow:
 * 1. Build quantum circuit
 * 2. Execute on IBM Quantum (or simulate)
 * 3. Derive token name from measurements
 * 4. Render circuit art
 * 5. Upload to IPFS via pump.fun
 * 6. Create token on pump.fun via PumpPortal
 */
export async function runPipeline(options?: {
  simulate?: boolean;
  style?: string;
  skipTokenCreation?: boolean;
}): Promise<PipelineResult> {
  const simulate = options?.simulate ?? false;
  const style = options?.style ?? config.token.circuitStyle;
  const shots = config.token.shots;
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Quantum-Originated Token (QOT) Pipeline ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ─── Step 1: Build Circuit ─────────────────────────────
  console.log('▸ Step 1: Building quantum circuit...');
  const circuit = buildCircuit(style);
  console.log(`  ${circuitSummary(circuit)}\n`);

  // ─── Step 2: Execute on IBM Quantum ────────────────────
  let ibmResult: IBMJobResult;
  let jobId: string;
  let backend: string;
  let timestamp: string;

  if (simulate) {
    console.log('▸ Step 2: Simulating quantum execution (no IBM API key)...');
    const samples = generateSimulatedSamples(shots);
    jobId = `sim-${Date.now()}`;
    backend = 'simulator';
    timestamp = new Date().toISOString();
    ibmResult = {
      jobId,
      backend,
      status: 'Completed',
      samples,
      numBits: 20,
      shots,
      createdAt: timestamp,
    };
    console.log(`  Simulated ${shots} shots\n`);
  } else {
    console.log('▸ Step 2: Transpiling and submitting to IBM Quantum...');
    ibmResult = executeCircuit(style, shots);
    jobId = ibmResult.jobId;
    backend = ibmResult.backend;
    timestamp = ibmResult.createdAt;
    console.log(`  Job ${jobId} completed on ${backend}\n`);
  }

  // ─── Step 3: Derive Token Name ─────────────────────────
  console.log('▸ Step 3: Deriving token name from measurements...');
  const tokenName = deriveTokenName(ibmResult.samples, ibmResult.numBits);
  console.log(`  Token: ${tokenName.name} (${(tokenName.probability * 100).toFixed(2)}% probability)\n`);

  // ─── Step 4: Render Measurement Art ─────────────────────
  console.log('▸ Step 4: Rendering measurement visualization...');
  const { qubitBias } = extractMeasurementData(ibmResult.samples, ibmResult.numBits);
  const artPath = path.resolve(__dirname, '../output/token_art.png');
  const artResult = renderMeasurementArt({
    tokenName: tokenName.name,
    qubitBias,
    jobId,
    backend,
    shots,
  }, artPath);
  console.log(`  Art: ${artResult.width}x${artResult.height} → ${artPath}\n`);

  // ─── Step 5: Upload to IPFS ────────────────────────────
  console.log('▸ Step 5: Uploading to IPFS via pump.fun...');
  const description = buildDescription({ jobId, backend, shots, timestamp });
  const ipfsResult = await uploadToIPFS({
    name: tokenName.name,
    symbol: tokenName.symbol,
    description,
    imagePath: artPath,
    website: config.token.website || undefined,
    showName: true,
  });
  console.log(`  IPFS: ${ipfsResult.metadataUri}\n`);

  // ─── Step 6: Create Token ──────────────────────────────
  let tokenResult: TokenCreateResult;

  if (options?.skipTokenCreation) {
    console.log('▸ Step 6: Token creation skipped (dry run)');
    tokenResult = {
      signature: 'DRY_RUN',
      mintAddress: 'DRY_RUN',
      walletAddress: 'DRY_RUN',
      pumpFunUrl: 'DRY_RUN',
      solscanUrl: 'DRY_RUN',
    };
  } else {
    console.log('▸ Step 6: Creating token on pump.fun...');
    tokenResult = await createToken({
      name: tokenName.name,
      symbol: tokenName.symbol,
      metadataUri: ipfsResult.metadataUri,
    });
  }

  // ─── Output ────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const result: PipelineResult = {
    tokenName,
    circuit: {
      style,
      numQubits: circuit.numQubits,
      gateCount: circuit.gates.length,
      qasm: circuit.qasm,
    },
    ibm: { jobId, backend, shots, timestamp },
    art: { path: artPath, width: artResult.width, height: artResult.height },
    ipfs: { metadataUri: ipfsResult.metadataUri },
    solana: tokenResult,
  };

  // Save full result
  const resultPath = path.resolve(__dirname, '../output/token_result.json');
  writeFileSync(resultPath, JSON.stringify(result, null, 2));

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║            PIPELINE COMPLETE              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Token Name:    ${tokenName.name}`);
  console.log(`  Token Symbol:  ${tokenName.symbol}`);
  console.log(`  IBM Job ID:    ${jobId}`);
  console.log(`  Backend:       ${backend}`);
  console.log(`  IPFS:          ${ipfsResult.metadataUri}`);
  console.log(`  pump.fun:      ${tokenResult.pumpFunUrl}`);
  console.log(`  Solscan:       ${tokenResult.solscanUrl}`);
  console.log(`  Elapsed:       ${elapsed}s`);
  console.log(`  Result saved:  ${resultPath}`);

  return result;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const simulate = args.includes('--simulate');
  const dryRun = args.includes('--dry-run');
  const style = args.find(a => a.startsWith('--style='))?.split('=')[1];

  runPipeline({
    simulate,
    skipTokenCreation: dryRun,
    style,
  }).catch(e => {
    console.error(`\n✗ Pipeline failed: ${e.message}`);
    process.exit(1);
  });
}
