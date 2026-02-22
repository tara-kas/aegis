/**
 * Aegis Wallet Setup Script
 *
 * Generates a new Solana keypair, saves it to aegis-wallet.json,
 * and airdrops 2 SOL on Devnet.
 *
 * Usage:  node setup-wallet.js
 *
 * ⚠️  IMPORTANT: Add aegis-wallet.json to .gitignore — NEVER commit private keys.
 */

const { Connection, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } = require('@solana/web3.js');
const fs = require('node:fs');
const path = require('node:path');

const RPC_ENDPOINT = process.env.VITE_SOLANA_RPC_ENDPOINT || clusterApiUrl('devnet');
const WALLET_PATH = path.resolve(__dirname, 'aegis-wallet.json');
const AIRDROP_SOL = 2;

async function main() {
    console.log('🔑  Generating new Solana keypair …');
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();

    // Persist secret key as a JSON array of bytes (same format as `solana-keygen new`)
    fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(keypair.secretKey)), 'utf-8');
    console.log(`✅  Keypair saved to ${WALLET_PATH}`);
    console.log(`    Public key : ${publicKey}`);
    console.log('');
    console.log('⚠️   Remember to add aegis-wallet.json to .gitignore!');
    console.log('');

    // Connect to Devnet
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    console.log(`🌐  Connected to ${RPC_ENDPOINT}`);

    // Airdrop
    console.log(`💰  Requesting airdrop of ${AIRDROP_SOL} SOL …`);
    try {
        const signature = await connection.requestAirdrop(
            keypair.publicKey,
            AIRDROP_SOL * LAMPORTS_PER_SOL,
        );

        console.log(`    Airdrop tx : ${signature}`);
        console.log('⏳  Confirming transaction …');

        await connection.confirmTransaction(signature, 'confirmed');

        const balance = await connection.getBalance(keypair.publicKey);
        console.log(`✅  Balance    : ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (err) {
        console.error('❌  Airdrop failed (Devnet faucet may be rate-limited). Try again later.');
        console.error(`    ${err.message ?? err}`);
        process.exitCode = 1;
    }
}

main();
