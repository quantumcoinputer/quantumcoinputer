import { Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import bs58 from 'bs58';
import { config } from '../config/env';

/**
 * Load the Solana wallet keypair from the configured path.
 * The keypair file is a JSON array of 64 bytes (secret key).
 */
export function loadWalletKeypair(): Keypair {
  const keypairPath = config.solana.keypairPath();
  console.log(`[Wallet] Loading keypair from ${keypairPath}`);

  const raw = readFileSync(keypairPath, 'utf-8');
  const secretKeyArray = JSON.parse(raw) as number[];
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));

  console.log(`[Wallet] Loaded wallet: ${keypair.publicKey.toBase58()}`);
  return keypair;
}

/**
 * Generate a new keypair for the token mint.
 */
export function generateMintKeypair(): Keypair {
  const keypair = Keypair.generate();
  console.log(`[Wallet] Generated mint keypair: ${keypair.publicKey.toBase58()}`);
  return keypair;
}

/**
 * Encode a keypair's secret key as base58 (for PumpPortal API).
 */
export function secretKeyToBase58(keypair: Keypair): string {
  return bs58.encode(keypair.secretKey);
}
