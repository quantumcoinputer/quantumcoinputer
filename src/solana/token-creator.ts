import {
  Connection,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
} from '@solana/web3.js';
import { config } from '../config/env';
import { loadWalletKeypair, generateMintKeypair, secretKeyToBase58 } from './wallet';

const PUMPPORTAL_TRADE_LOCAL_URL = 'https://pumpportal.fun/api/trade-local';

export interface TokenCreateParams {
  name: string;
  symbol: string;
  metadataUri: string;
  devBuySol?: number;
  slippage?: number;
  priorityFee?: number;
}

export interface TokenCreateResult {
  signature: string;
  mintAddress: string;
  walletAddress: string;
  pumpFunUrl: string;
  solscanUrl: string;
}

/**
 * Create a token on pump.fun using PumpPortal's local transaction API.
 *
 * Flow:
 * 1. Get unsigned transaction from PumpPortal
 * 2. Deserialize and sign it locally
 * 3. Submit to Solana mainnet
 *
 * Private keys never leave the machine.
 */
export async function createToken(params: TokenCreateParams): Promise<TokenCreateResult> {
  const walletKeypair = loadWalletKeypair();
  const mintKeypair = generateMintKeypair();

  const devBuy = params.devBuySol ?? config.token.devBuySol;
  const slippage = params.slippage ?? 10;
  const priorityFee = params.priorityFee ?? 0.0005;

  console.log(`[Token] Creating token: ${params.name} (${params.symbol})`);
  console.log(`[Token] Wallet: ${walletKeypair.publicKey.toBase58()}`);
  console.log(`[Token] Mint: ${mintKeypair.publicKey.toBase58()}`);
  console.log(`[Token] Dev buy: ${devBuy} SOL`);
  console.log(`[Token] Metadata URI: ${params.metadataUri}`);

  // Step 1: Request unsigned transaction from PumpPortal
  console.log('[Token] Requesting transaction from PumpPortal...');

  const payload = {
    publicKey: walletKeypair.publicKey.toBase58(),
    action: 'create',
    tokenMetadata: {
      name: params.name,
      symbol: params.symbol,
      uri: params.metadataUri,
    },
    mint: mintKeypair.publicKey.toBase58(),
    denominatedInSol: 'true',
    amount: 0,
    slippage,
    priorityFee,
    pool: 'pump',
    isCashbackCoin: 'true',
  };

  const response = await fetch(PUMPPORTAL_TRADE_LOCAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PumpPortal API failed (${response.status}): ${text}`);
  }

  // Step 2: Deserialize and sign
  console.log('[Token] Deserializing transaction...');
  const data = await response.arrayBuffer();
  const tx = VersionedTransaction.deserialize(new Uint8Array(data));

  console.log('[Token] Signing transaction...');
  tx.sign([mintKeypair, walletKeypair]);

  // Step 3: Submit to Solana
  console.log('[Token] Submitting to Solana mainnet...');
  const connection = new Connection(config.solana.rpcUrl, 'confirmed');

  const signature = await connection.sendTransaction(tx, {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log(`[Token] Transaction submitted: ${signature}`);

  // Wait for confirmation
  console.log('[Token] Waiting for confirmation...');
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  const mintAddress = mintKeypair.publicKey.toBase58();
  const result: TokenCreateResult = {
    signature,
    mintAddress,
    walletAddress: walletKeypair.publicKey.toBase58(),
    pumpFunUrl: `https://pump.fun/${mintAddress}`,
    solscanUrl: `https://solscan.io/tx/${signature}`,
  };

  console.log(`[Token] Token created successfully!`);
  console.log(`[Token] pump.fun: ${result.pumpFunUrl}`);
  console.log(`[Token] Solscan: ${result.solscanUrl}`);

  return result;
}
