import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { writeFileSync } from 'fs';

type Ctx = CanvasRenderingContext2D;

const QUBITS_PER_GROUP = 5;
const NUM_GROUPS = 4;

export interface MeasurementArtInput {
  tokenName: string;
  qubitBias: number[];
  jobId: string;
  backend: string;
  shots: number;
}

/**
 * Extract per-qubit |1⟩ bias from raw hex samples.
 */
export function extractMeasurementData(
  samples: string[],
  numBits: number = 20
): { qubitBias: number[] } {
  const totalShots = samples.length;
  const qubitOneCounts = new Array(numBits).fill(0);

  for (const sample of samples) {
    const value = parseInt(sample, 16);
    const bitstring = value.toString(2).padStart(numBits, '0');
    for (let q = 0; q < numBits; q++) {
      if (bitstring[q] === '1') qubitOneCounts[q]++;
    }
  }

  return { qubitBias: qubitOneCounts.map(c => c / totalShots) };
}

/**
 * Render a 4×5 qubit grid with per-row letter derivation shown.
 *
 * Layout:
 *   - Token name top center (glowing)
 *   - 4 rows of 5 glowing qubit circles
 *   - Each row has: the 5 bit values → binary string → letter, shown to the right
 *   - Footer with provenance
 */
export function renderMeasurementArt(
  input: MeasurementArtInput,
  outputPath: string
): { width: number; height: number; path: string } {

  const W = 800;
  const H = 800;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Background ──
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, W, H);

  // ── Token name ──
  ctx.font = 'bold 56px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#6e44ff';
  ctx.shadowBlur = 30;
  ctx.fillText(input.tokenName, W / 2, 68);
  ctx.shadowBlur = 0;

  // Thin separator
  ctx.strokeStyle = '#1a1a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, 110);
  ctx.lineTo(W - 120, 110);
  ctx.stroke();

  // ── Grid layout ──
  const gridLeft = 80;
  const gridRight = 580;     // qubit area ends here, annotation area to the right
  const gridTop = 145;
  const gridBottom = 665;
  const gridW = gridRight - gridLeft;
  const gridH = gridBottom - gridTop;
  const colSpacing = gridW / QUBITS_PER_GROUP;
  const rowSpacing = gridH / NUM_GROUPS;
  const maxR = Math.min(colSpacing, rowSpacing) * 0.36;

  // Derive the winning bit values per row from the token name
  const letters = input.tokenName.split('');
  const rowBits: string[] = letters.map(ch => {
    const code = ch.charCodeAt(0) - 65;
    return code.toString(2).padStart(5, '0');
  });

  for (let row = 0; row < NUM_GROUPS; row++) {
    const rowCenterY = gridTop + row * rowSpacing + rowSpacing / 2;
    const letter = letters[row] || '?';
    const bits = rowBits[row] || '00000';

    // ── Draw the 5 qubit circles ──
    for (let col = 0; col < QUBITS_PER_GROUP; col++) {
      const qIdx = row * QUBITS_PER_GROUP + col;
      const bias = input.qubitBias[qIdx];
      const cx = gridLeft + col * colSpacing + colSpacing / 2;
      drawQubit(ctx, cx, rowCenterY, maxR, bias);

      // Bit value label just below the qubit
      const bitVal = bits[col];
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = bitVal === '1' ? '#8888cc' : '#333344';
      ctx.shadowBlur = 0;
      ctx.fillText(bitVal, cx, rowCenterY + maxR + 18);
    }

    // ── Annotation to the right: arrow → binary = letter ──
    const annoX = gridRight + 20;

    // Small arrow
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(annoX, rowCenterY);
    ctx.lineTo(annoX + 16, rowCenterY);
    ctx.lineTo(annoX + 12, rowCenterY - 3);
    ctx.moveTo(annoX + 16, rowCenterY);
    ctx.lineTo(annoX + 12, rowCenterY + 3);
    ctx.stroke();

    // Binary string
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#555566';
    ctx.fillText(bits, annoX + 22, rowCenterY - 10);

    // "= N = LETTER"
    const code = letter.charCodeAt(0) - 65;
    ctx.fillStyle = '#666677';
    ctx.fillText(`= ${code}`, annoX + 22, rowCenterY + 4);

    // The derived letter, large and glowing
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#6e44ff';
    ctx.shadowBlur = 14;
    ctx.fillText(letter, annoX + 70, rowCenterY + 2);
    ctx.shadowBlur = 0;
  }

  // ── Column header: bit position labels ──
  ctx.font = '9px monospace';
  ctx.fillStyle = '#333344';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let col = 0; col < QUBITS_PER_GROUP; col++) {
    const cx = gridLeft + col * colSpacing + colSpacing / 2;
    ctx.fillText(`2${superscript(4 - col)}`, cx, gridTop - 18);
  }

  // ── Footer ──
  ctx.strokeStyle = '#1a1a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, H - 80);
  ctx.lineTo(W - 120, H - 80);
  ctx.stroke();

  ctx.font = '10px monospace';
  ctx.fillStyle = '#333344';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${input.backend}  ·  ${input.shots.toLocaleString()} shots  ·  ${input.jobId}`, W / 2, H - 55);
  ctx.fillText('the name was not chosen. it was measured.', W / 2, H - 38);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  return { width: W, height: H, path: outputPath };
}

/**
 * Draw a single qubit as a glowing orb.
 * bias 0.0 = dim/cool blue, bias 1.0 = bright hot cyan-white.
 */
function drawQubit(ctx: Ctx, cx: number, cy: number, maxR: number, bias: number): void {
  const t = Math.pow(bias, 0.7);

  // Color ramp: deep indigo → blue-violet → cyan → white
  const r = lerp(10, 180, t);
  const g = lerp(14, 230, t);
  const b = lerp(60, 255, t);

  // Glow layers
  const glowAlpha = 0.06 + t * 0.28;
  const glowR = maxR * (0.5 + t * 0.9);

  for (let i = 4; i >= 0; i--) {
    const layerR = glowR + i * maxR * 0.2;
    const layerAlpha = glowAlpha * (1 - i * 0.2);
    ctx.beginPath();
    ctx.arc(cx, cy, layerR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${layerAlpha.toFixed(3)})`;
    ctx.fill();
  }

  // Core
  const coreR = maxR * (0.22 + t * 0.32);
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();

  // Hot center
  const dotR = coreR * 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${(0.15 + t * 0.65).toFixed(2)})`;
  ctx.fill();
}

/** Render an exponent as unicode superscript for bit position labels. */
function superscript(n: number): string {
  const sup: Record<number, string> = { 0: '\u2070', 1: '\u00B9', 2: '\u00B2', 3: '\u00B3', 4: '\u2074' };
  return sup[n] ?? String(n);
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
}
