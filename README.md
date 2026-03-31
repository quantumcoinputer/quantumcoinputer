# Quantum-Originated Token (QOT) System

I had this concept in the works for many months, but with the sudden interest in quantum resistance, and the gimmicky quantum coins that followed, I rushed to finish it.

A pipeline that runs a quantum circuit on IBM Quantum hardware, uses the measurement results to generate a 4-letter token name, renders qubit measurement data as visual art, uploads it to IPFS, and creates a pump.fun token on Solana — all atomically, with the IBM job ID embedded as provenance metadata.

## How It Works

```
Build 20-qubit circuit
        |
        v
Execute on IBM QPU (8,192 shots)
        |
        v
Extract measurement histogram
        |
        v
Derive 4-letter name from most-measured bitstring
        |
        v
Render qubit measurement data as token art (PNG)
        |
        v
Upload art + metadata to IPFS via pump.fun
        |
        v
Create token on pump.fun via PumpPortal (Solana mainnet)
```

### The Quantum Circuit

- **20 qubits** arranged in 4 groups of 5
- Each group of 5 qubits encodes one letter position (2^5 = 32 states, A-Z = 0-25)
- Hadamard gates create uniform superposition, Ry rotations bias toward English letter frequencies (Norvig corpus)
- CX entanglement gates create correlations between letter positions
- Circuit is transpiled via Qiskit to the target backend's native gate set (sx, rz, cz)
- Executed on real IBM QPU hardware (e.g., ibm_fez, 156 qubits)

### Name Derivation

The most-frequently measured 20-bit string is split into 4 groups of 5 bits, each mapped to a letter (0=A, 1=B, ..., 25=Z). The name is deterministic from the measurement results — anyone with the IBM job ID can verify it.

### Token Art

A 4x5 grid of glowing circles representing the 20 physical qubits. Each qubit's brightness reflects its |1> measurement bias. The derived letter for each row is shown alongside the binary encoding. Every token produces a unique visual fingerprint.

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- **Solana CLI** (optional, for key generation)
- **IBM Quantum account** (free tier works) — [quantum.cloud.ibm.com](https://quantum.cloud.ibm.com)
- **Solana wallet** with SOL for transaction fees (~0.02-0.03 SOL)

## Setup

### 1. Install dependencies

```bash
npm install
pip3 install qiskit qiskit-ibm-runtime
```

### 2. Generate a Solana wallet

```bash
solana-keygen new --outfile wallet-keypair.json --no-bip39-passphrase
```

Note the public key — you'll need to fund it with SOL.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# IBM Quantum API token (from quantum.cloud.ibm.com > Account settings)
IBM_QUANTUM_TOKEN=your_ibm_quantum_api_token

# Path to your Solana keypair
SOLANA_KEYPAIR_PATH=./wallet-keypair.json

# Solana RPC (mainnet)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Circuit style: soft | hard | harmonic
CIRCUIT_STYLE=soft

# Measurement shots (max 8192 on free tier)
SHOTS=8192
```

### 4. Fund the Solana wallet

Send ~0.03 SOL to your wallet's public address. You can find it with:

```bash
solana-keygen pubkey wallet-keypair.json
```

## Usage

### Full pipeline (real quantum + real token creation)

```bash
npx ts-node src/index.ts
```

### Dry run (real quantum, skip token creation)

```bash
npx ts-node src/index.ts --dry-run
```

### Simulated quantum (no IBM API key needed)

```bash
npx ts-node src/index.ts --simulate --dry-run
```

### Override circuit style

```bash
npx ts-node src/index.ts --style=harmonic --dry-run
```

### Output

Results are saved to `output/token_result.json` with full provenance:

```json
{
  "tokenName": { "name": "QXEY", "symbol": "QXEY", "probability": 0.0004, ... },
  "ibm": { "jobId": "d75s3oq3qcgc73fs60p0", "backend": "ibm_fez", "shots": 8192, ... },
  "ipfs": { "metadataUri": "https://ipfs.io/ipfs/Qm..." },
  "solana": { "signature": "...", "mintAddress": "...", "pumpFunUrl": "..." }
}
```

## Project Structure

```
src/
  index.ts                    Main orchestrator pipeline
  config/
    env.ts                    Environment variable loading
    styles.ts                 Circuit style presets (soft, hard, harmonic)
  quantum/
    circuit-builder.ts        Builds 20-qubit circuit (TypeScript, for simulation)
    run_quantum.py            Builds, transpiles, and executes circuit via Qiskit
    ibm-client.ts             Calls run_quantum.py from Node.js
    result-parser.ts          Parses IBM samples into 4-letter token name
  frequency/
    letter-weights.ts         Position-specific English letter frequencies
    angle-calculator.ts       Converts frequency distributions to Ry angles
  art/
    measurement-renderer.ts   Renders qubit measurement grid as PNG
    themes.ts                 Color theme definitions
  ipfs/
    uploader.ts               Uploads art + metadata to pump.fun IPFS
  solana/
    wallet.ts                 Loads Solana keypair from file
    token-creator.ts          Creates token via PumpPortal local transaction API
data/
  norvig-frequencies.json     Letter-position frequency tables (Norvig corpus)
tests/
  test-*.ts                   Isolated tests for each component
```

## Testing Individual Components

```bash
npm run test:freq       # Letter frequency data + angle calculation
npm run test:circuit    # Quantum circuit builder
npm run test:ibm        # IBM Quantum API (requires API key)
npm run test:parser     # Result parser + name derivation
npm run test:ipfs       # IPFS upload (--live flag for real upload)
npm run test:solana     # Solana wallet + RPC connection
```

## Verification

This repo includes a verifier. Given any IBM Quantum job ID, it pulls the measurement results and reproduces the token name:

```bash
npx ts-node verify.ts <IBM_JOB_ID>
```

Example:

```
$ npx ts-node verify.ts d75s3oq3qcgc73fs60p0

Fetching measurement results from IBM Quantum...
Backend: ibm_fez
Shots: 8192
Unique outcomes: 8086

Top 10 measurement outcomes:
  10000101110010011000 → QXEY (3 shots, 0.04%)
  00001001010110010000 → BFMQ (3 shots, 0.04%)
  ...

==================================================
  VERIFIED TOKEN NAME: QXEY
  Measured 3/8192 times (0.04%)
  Bitstring: 10000101110010011000
  Breakdown:
    Position 1: 10000 = 16 = "Q"
    Position 2: 10111 = 23 = "X"
    Position 3: 00100 = 4  = "E"
    Position 4: 11000 = 24 = "Y"
==================================================
```

You need an IBM Quantum account (free) and your `IBM_QUANTUM_TOKEN` set in `.env`. The verifier connects to IBM, fetches the job's raw measurement data, and runs the same derivation algorithm — no trust required.

## Circuit Styles

| Style | Description | Entanglement |
|-------|-------------|-------------|
| `soft` | Adjacent group entanglement, vowel-consonant bias | Pos1→2, 2→3, 3→4 |
| `hard` | Minimal entanglement, more random names | Sparse connections |
| `harmonic` | Cross-position entanglement, palindromic tendencies | Pos1↔3, Pos2↔4 |

## Security

- Private keys never leave the machine
- Solana transactions are signed locally, submitted via public RPC
- IBM API token is used only for circuit execution
- No secrets are stored in code or committed to git
