import {
  Connection,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import { config } from '../config/env';
import { loadWalletKeypair, generateMintKeypair } from './wallet';

// @ts-ignore — pump SDK CJS import
const { PUMP_SDK } = require('@pump-fun/pump-sdk');

export interface TokenCreateParams {
  name: string;
  symbol: string;
  metadataUri: string;
}

export interface TokenCreateResult {
  signature: string;
  mintAddress: string;
  walletAddress: string;
  pumpFunUrl: string;
  solscanUrl: string;
}

/**
 * Create a token on pump.fun using the official pump SDK (create_v2 instruction).
 * Cashback enabled, mayhem mode disabled.
 * Private keys never leave the machine.
 */
export async function createToken(params: TokenCreateParams): Promise<TokenCreateResult> {
  const walletKeypair = loadWalletKeypair();
  const mintKeypair = generateMintKeypair();

  console.log(`[Token] Creating token: ${params.name} (${params.symbol})`);
  console.log(`[Token] Wallet: ${walletKeypair.publicKey.toBase58()}`);
  console.log(`[Token] Mint: ${mintKeypair.publicKey.toBase58()}`);
  console.log(`[Token] Metadata URI: ${params.metadataUri}`);
  console.log(`[Token] Cashback: enabled`);

  // Build create_v2 instruction via pump SDK
  console.log('[Token] Building create_v2 instruction...');
  const createIx = await PUMP_SDK.createV2Instruction({
    mint: mintKeypair.publicKey,
    name: params.name,
    symbol: params.symbol,
    uri: params.metadataUri,
    creator: walletKeypair.publicKey,
    user: walletKeypair.publicKey,
    mayhemMode: false,
    cashback: true,
  });

  // Build and sign transaction
  const connection = new Connection(config.solana.rpcUrl, 'confirmed');
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  const message = new TransactionMessage({
    payerKey: walletKeypair.publicKey,
    recentBlockhash: blockhash,
    instructions: [createIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([walletKeypair, mintKeypair]);
  console.log('[Token] Transaction signed');

  // Submit to Solana
  console.log('[Token] Submitting to Solana mainnet...');
  const signature = await connection.sendTransaction(tx, { maxRetries: 3 });
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
