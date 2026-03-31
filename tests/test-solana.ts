import { loadWalletKeypair, generateMintKeypair, secretKeyToBase58 } from '../src/solana/wallet';
import { Connection } from '@solana/web3.js';
import { config } from '../src/config/env';

async function main() {
  console.log('=== Solana Wallet Tests ===\n');

  // Test 1: Load wallet keypair
  console.log('--- Test 1: Load wallet keypair ---');
  const wallet = loadWalletKeypair();
  console.log(`Public key: ${wallet.publicKey.toBase58()}`);
  console.log(`Secret key length: ${wallet.secretKey.length} bytes`);
  if (wallet.secretKey.length !== 64) throw new Error('Secret key should be 64 bytes');
  console.log('✓ Wallet loaded\n');

  // Test 2: Generate mint keypair
  console.log('--- Test 2: Generate mint keypair ---');
  const mint = generateMintKeypair();
  console.log(`Mint public key: ${mint.publicKey.toBase58()}`);
  const b58 = secretKeyToBase58(mint);
  console.log(`Mint secret (base58, first 10 chars): ${b58.substring(0, 10)}...`);
  console.log('✓ Mint keypair generated\n');

  // Test 3: Check wallet balance on mainnet
  console.log('--- Test 3: Check wallet balance ---');
  const connection = new Connection(config.solana.rpcUrl, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  const solBalance = balance / 1e9;
  console.log(`Wallet balance: ${solBalance} SOL`);

  if (solBalance < 0.01) {
    console.log(`⚠ Low balance! You need SOL to create tokens.`);
    console.log(`  Fund this wallet: ${wallet.publicKey.toBase58()}`);
  } else {
    console.log('✓ Wallet has sufficient balance');
  }

  // Test 4: Connection health check
  console.log('\n--- Test 4: RPC connection health ---');
  const slot = await connection.getSlot();
  console.log(`Current slot: ${slot}`);
  const version = await connection.getVersion();
  console.log(`Solana version: ${JSON.stringify(version)}`);
  console.log('✓ RPC connection healthy\n');

  console.log('=== ALL SOLANA TESTS PASSED ===');
}

main().catch(e => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
