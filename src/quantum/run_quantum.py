"""
Complete quantum pipeline via Qiskit:
  1. Build circuit from letter frequencies
  2. Transpile for target backend
  3. Submit to IBM Quantum via Sampler
  4. Wait for results
  5. Output samples as JSON

Usage:
  python3 run_quantum.py --style soft --token <IBM_TOKEN> --shots 8192 --output results.json
"""

import sys
import json
import math
import argparse
import time

from qiskit import QuantumCircuit
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler

# ── Letter frequency data ──

FREQUENCIES = {
    0: {
        'T': 0.148, 'S': 0.102, 'A': 0.080, 'C': 0.065, 'B': 0.060,
        'W': 0.055, 'P': 0.052, 'M': 0.050, 'D': 0.045, 'F': 0.042,
        'H': 0.040, 'R': 0.035, 'L': 0.032, 'I': 0.028, 'G': 0.025,
        'N': 0.022, 'E': 0.020, 'O': 0.018, 'J': 0.016, 'K': 0.015,
        'V': 0.013, 'U': 0.010, 'Q': 0.005, 'Y': 0.004, 'Z': 0.003,
        'X': 0.001,
    },
    1: {
        'O': 0.140, 'A': 0.130, 'E': 0.115, 'I': 0.100, 'U': 0.080,
        'R': 0.060, 'H': 0.055, 'L': 0.050, 'N': 0.040, 'T': 0.030,
        'W': 0.025, 'X': 0.020, 'Y': 0.018, 'S': 0.016, 'P': 0.015,
        'C': 0.014, 'K': 0.012, 'M': 0.010, 'B': 0.008, 'D': 0.007,
        'F': 0.006, 'G': 0.005, 'J': 0.004, 'Q': 0.003, 'V': 0.002,
        'Z': 0.001,
    },
    2: {
        'A': 0.115, 'E': 0.110, 'I': 0.095, 'O': 0.085, 'R': 0.070,
        'N': 0.065, 'L': 0.060, 'S': 0.050, 'T': 0.045, 'U': 0.040,
        'C': 0.035, 'D': 0.030, 'G': 0.025, 'M': 0.022, 'P': 0.020,
        'W': 0.018, 'K': 0.016, 'B': 0.014, 'F': 0.012, 'V': 0.010,
        'Y': 0.008, 'H': 0.006, 'X': 0.004, 'Z': 0.003, 'J': 0.002,
        'Q': 0.001,
    },
    3: {
        'E': 0.170, 'S': 0.110, 'T': 0.085, 'D': 0.075, 'N': 0.065,
        'Y': 0.060, 'R': 0.055, 'L': 0.050, 'K': 0.045, 'A': 0.040,
        'P': 0.030, 'M': 0.025, 'G': 0.022, 'H': 0.018, 'O': 0.016,
        'W': 0.014, 'F': 0.012, 'B': 0.010, 'X': 0.008, 'I': 0.007,
        'C': 0.006, 'U': 0.005, 'Z': 0.004, 'V': 0.003, 'J': 0.002,
        'Q': 0.001,
    },
}

STYLES = {
    'soft': [(2, 5), (3, 6), (7, 10), (8, 11), (12, 15), (13, 16)],
    'hard': [(4, 9), (14, 19)],
    'harmonic': [(0, 10), (2, 12), (4, 14), (5, 15), (7, 17), (9, 19)],
}


def get_target_distribution(position):
    freqs = FREQUENCIES[position]
    dist = [0.0] * 32
    for letter, freq in freqs.items():
        dist[ord(letter) - ord('A')] = freq
    total = sum(dist)
    return [d / total for d in dist]


def compute_tree_angles(distribution, num_qubits):
    angles = []
    for level in range(num_qubits):
        block_size = 2 ** (num_qubits - level)
        half_block = block_size // 2
        for block in range(2 ** level):
            start = block * block_size
            p0 = sum(distribution[start:start + half_block])
            p1 = sum(distribution[start + half_block:start + block_size])
            total_block = p0 + p1
            if total_block < 1e-10:
                angles.append(0.0)
            else:
                p_one = p1 / total_block
                angles.append(2 * math.asin(math.sqrt(min(1, max(0, p_one)))))
    return angles


def build_circuit(style='soft'):
    """
    Build a 20-qubit circuit optimized for noisy hardware.

    Strategy: Start with Hadamards to create uniform superposition across all
    32 states per group, then apply targeted Ry rotations to bias toward the
    letter frequency distribution. This is shallow (low depth) so it survives
    hardware noise, while still producing frequency-shaped distributions.

    The Hadamard creates equal probability across all 2^5=32 states.
    The Ry rotations then tilt probability toward common letters.
    The entanglement gates create correlations between letter positions.
    """
    qc = QuantumCircuit(20)

    for group in range(4):
        dist = get_target_distribution(group)
        base = group * 5

        # Step 1: Hadamard all 5 qubits → uniform superposition over 32 states
        for q in range(5):
            qc.h(base + q)

        # Step 2: Apply Ry bias rotations derived from letter frequencies
        # For each qubit, compute the marginal P(|1⟩) from the target distribution
        # and apply a small Ry correction to shift from 50% toward the target.
        for q in range(5):
            # Marginal P(|1⟩) for this qubit = sum of dist entries where bit q is 1
            bit_position = 4 - q  # MSB first
            p_one_target = 0.0
            for state in range(32):
                if (state >> bit_position) & 1:
                    p_one_target += dist[state]

            # Current P(|1⟩) after Hadamard = 0.5
            # We want to shift toward p_one_target
            # Ry(theta) after H: effective P(|1⟩) ≈ sin²((π/4) + theta/2)
            # Solve for theta: theta = 2*(arcsin(sqrt(p_target)) - π/4)
            if p_one_target > 0.001 and p_one_target < 0.999:
                theta = 2 * (math.asin(math.sqrt(p_one_target)) - math.pi / 4)
                if abs(theta) > 0.01:
                    qc.ry(theta, base + q)

    # Step 3: Cross-group entanglement
    for ctrl, tgt in STYLES.get(style, STYLES['soft']):
        qc.cx(ctrl, tgt)

    qc.measure_all()
    return qc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--style', default='soft')
    parser.add_argument('--token', required=True)
    parser.add_argument('--shots', type=int, default=8192)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    log = lambda msg: print(f"[Quantum] {msg}", file=sys.stderr)

    # Connect
    log("Connecting to IBM Quantum Platform...")
    service = QiskitRuntimeService(
        channel="ibm_quantum_platform",
        token=args.token,
    )

    # Pick least-busy backend
    log("Finding best available backend...")
    backends = service.backends(operational=True)
    if not backends:
        raise RuntimeError("No backends available")

    # Use least_busy or just first available
    backend = service.least_busy(operational=True)
    log(f"Selected backend: {backend.name} ({backend.num_qubits} qubits)")

    # Build circuit
    log(f"Building circuit (style={args.style})...")
    qc = build_circuit(args.style)
    log(f"Original: depth={qc.depth()}, gates={dict(qc.count_ops())}")

    # Transpile
    log(f"Transpiling for {backend.name}...")
    pm = generate_preset_pass_manager(optimization_level=1, target=backend.target)
    isa_circuit = pm.run(qc)
    log(f"ISA: depth={isa_circuit.depth()}, gates={dict(isa_circuit.count_ops())}")

    # Submit via Sampler
    log(f"Submitting job ({args.shots} shots)...")
    sampler = Sampler(mode=backend)
    job = sampler.run([isa_circuit], shots=args.shots)
    job_id = job.job_id()
    log(f"Job submitted: {job_id}")

    # Wait for results
    log("Waiting for results...")
    start = time.time()
    result = job.result()
    elapsed = time.time() - start
    log(f"Job completed in {elapsed:.1f}s")

    # Extract samples
    pub_result = result[0]
    # Get the bitstring samples from the data
    bit_array = pub_result.data.meas
    # Convert to hex strings for our Node.js parser
    samples = []
    for bitstring in bit_array.get_bitstrings():
        # bitstring is like '00101010010100101001' (MSB first)
        # We need to convert to hex
        val = int(bitstring, 2)
        samples.append(f"0x{val:x}")

    log(f"Got {len(samples)} samples")
    log(f"Unique outcomes: {len(set(samples))}")

    # Output
    output = {
        "jobId": job_id,
        "backend": backend.name,
        "status": "Completed",
        "samples": samples,
        "numBits": 20,
        "shots": args.shots,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    with open(args.output, 'w') as f:
        json.dump(output, f)

    log(f"Results written to {args.output}")
    # Print job ID to stdout for Node.js to capture
    print(job_id)


if __name__ == '__main__':
    main()
