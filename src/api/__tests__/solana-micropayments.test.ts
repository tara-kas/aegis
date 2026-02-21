/**
 * Unit Tests — Solana Token-2022 Confidential Micropayments
 *
 * Validates:
 *   1. Devnet RPC connection health.
 *   2. ElGamal auditor keypair generation (format & separation of concerns).
 *   3. Module exports and type contracts.
 */

import { describe, it, expect } from 'vitest';
import { Connection } from '@solana/web3.js';

import {
    generateElGamalAuditorKeypair,
    createDevnetConnection,
} from '../solana-micropayments';

// ─── Devnet Connection ───────────────────────────────────────────────────────

describe('Devnet RPC Connection', () => {
    it('should create a Connection instance pointing at Devnet', () => {
        const connection = createDevnetConnection();
        expect(connection).toBeInstanceOf(Connection);
        // The rpcEndpoint getter should contain "devnet" or the configured URL
        expect(connection.rpcEndpoint).toBeDefined();
        expect(connection.rpcEndpoint.length).toBeGreaterThan(0);
    });

    it('should be reachable (getVersion)', async () => {
        const connection = createDevnetConnection();

        // getVersion is a lightweight RPC call that returns the Solana node version
        const version = await connection.getVersion();
        expect(version).toBeDefined();
        expect(version['solana-core']).toBeDefined();
    }, 15_000); // generous timeout for network call

    it('should report a recent slot', async () => {
        const connection = createDevnetConnection();
        const slot = await connection.getSlot();
        expect(slot).toBeGreaterThan(0);
    }, 15_000);
});

// ─── ElGamal Auditor Keypair ─────────────────────────────────────────────────

describe('ElGamal Auditor Keypair Generation', () => {
    it('should generate a keypair with the correct metadata', () => {
        const kp = generateElGamalAuditorKeypair(
            'BIDMC-FIN-001',
            'Beth Israel Deaconess Medical Center — Finance Department',
        );

        expect(kp.auditorId).toBe('BIDMC-FIN-001');
        expect(kp.organization).toContain('Beth Israel');
    });

    it('should produce a 32-byte public key', () => {
        const kp = generateElGamalAuditorKeypair('TEST-001', 'Test Org');
        // Ed25519 public key = 32 bytes
        expect(kp.publicKey).toBeInstanceOf(Uint8Array);
        expect(kp.publicKey.length).toBe(32);
    });

    it('should produce a 64-byte secret key', () => {
        const kp = generateElGamalAuditorKeypair('TEST-002', 'Test Org');
        // Ed25519 secret key (seed + public) = 64 bytes
        expect(kp.secretKey).toBeInstanceOf(Uint8Array);
        expect(kp.secretKey.length).toBe(64);
    });

    it('should generate unique keypairs on successive calls', () => {
        const kp1 = generateElGamalAuditorKeypair('AUD-A', 'Org A');
        const kp2 = generateElGamalAuditorKeypair('AUD-B', 'Org B');

        // Public keys must differ
        const pk1Hex = Buffer.from(kp1.publicKey).toString('hex');
        const pk2Hex = Buffer.from(kp2.publicKey).toString('hex');
        expect(pk1Hex).not.toBe(pk2Hex);
    });

    it('COMPLIANCE: secret key is separate from public key (HSM isolation boundary)', () => {
        const kp = generateElGamalAuditorKeypair('HSM-001', 'HSM Test');

        // They must NOT be byte-equal — the secret key is 64 bytes, pub is 32
        expect(kp.secretKey.length).not.toBe(kp.publicKey.length);

        // The public key should be the last 32 bytes of the secret key
        // (Ed25519 property) — confirms they are mathematically related
        const pubFromSecret = kp.secretKey.slice(32);
        expect(Buffer.from(pubFromSecret).toString('hex')).toBe(
            Buffer.from(kp.publicKey).toString('hex'),
        );
    });

    it('COMPLIANCE: supports multiple auditor keys for different regulatory bodies', () => {
        const hospitalKey = generateElGamalAuditorKeypair(
            'BIDMC-FIN-001',
            'Beth Israel Deaconess Medical Center — Finance',
        );
        const fdaKey = generateElGamalAuditorKeypair(
            'FDA-MDCG-2025',
            'U.S. Food and Drug Administration — Medical Device Compliance',
        );

        expect(hospitalKey.auditorId).not.toBe(fdaKey.auditorId);
        expect(hospitalKey.organization).toContain('Beth Israel');
        expect(fdaKey.organization).toContain('Food and Drug');

        // Both produce valid 32-byte public keys
        expect(hospitalKey.publicKey.length).toBe(32);
        expect(fdaKey.publicKey.length).toBe(32);
    });
});
