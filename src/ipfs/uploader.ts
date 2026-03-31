import { readFileSync } from 'fs';
import path from 'path';
import { config } from '../config/env';

const PUMP_FUN_IPFS_URL = 'https://pump.fun/api/ipfs';

export interface IPFSUploadResult {
  metadataUri: string;
}

export interface TokenMetadataInput {
  name: string;
  symbol: string;
  description: string;
  imagePath: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  showName?: boolean;
}

/**
 * Build the token description from the env var + dynamic job provenance.
 * The base description comes from TOKEN_DESCRIPTION env var.
 * The IBM job ID, backend, and timestamp are appended at runtime.
 */
export function buildDescription(params: {
  jobId: string;
  backend: string;
  shots: number;
  timestamp: string;
}): string {
  const base = config.token.description;
  return `${base}\n\nIBM Job ID: ${params.jobId} | Backend: ${params.backend} | Shots: ${params.shots} | ${params.timestamp}`;
}

/**
 * Upload token image and metadata to pump.fun's IPFS endpoint.
 * Returns the metadata URI (ipfs://...) that can be used in token creation.
 */
export async function uploadToIPFS(metadata: TokenMetadataInput): Promise<IPFSUploadResult> {
  console.log(`[IPFS] Uploading ${metadata.name} to pump.fun IPFS...`);

  const imageBuffer = readFileSync(metadata.imagePath);
  const fileName = path.basename(metadata.imagePath);

  // Build multipart form data manually using the Blob/FormData API
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/png' }), fileName);
  formData.append('name', metadata.name);
  formData.append('symbol', metadata.symbol);
  formData.append('description', metadata.description);
  formData.append('showName', metadata.showName ? 'true' : 'false');
  if (metadata.website) formData.append('website', metadata.website);
  if (metadata.twitter) formData.append('twitter', metadata.twitter);
  if (metadata.telegram) formData.append('telegram', metadata.telegram);

  const response = await fetch(PUMP_FUN_IPFS_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IPFS upload failed (${response.status}): ${text}`);
  }

  const result = await response.json() as any;
  const metadataUri = result.metadataUri;

  if (!metadataUri) {
    throw new Error(`IPFS upload returned unexpected response: ${JSON.stringify(result)}`);
  }

  console.log(`[IPFS] Upload successful: ${metadataUri}`);
  return { metadataUri };
}
