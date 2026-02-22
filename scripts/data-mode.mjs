#!/usr/bin/env node

/**
 * Aegis Data Mode Selector
 *
 * Interactive CLI to switch between live, mock, and hybrid data modes.
 * Writes VITE_DATA_MODE to .env so Vite picks it up on next dev start.
 *
 * Usage:
 *   node scripts/data-mode.mjs          # interactive prompt
 *   node scripts/data-mode.mjs live     # set directly
 *   node scripts/data-mode.mjs mock
 *   node scripts/data-mode.mjs hybrid
 */

import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '..', '.env');
const ENV_KEY = 'VITE_DATA_MODE';

const MODES = {
    live: {
        label: 'Live',
        description: 'Real APIs only (Stripe, Solana, Paid.ai, ElevenLabs). Fails visibly if keys are missing.',
    },
    mock: {
        label: 'Mock',
        description: 'All mock data. No API calls. Safe for demos and offline development.',
    },
    hybrid: {
        label: 'Hybrid (default)',
        description: 'Try live APIs first, fall back to mock on failure. Best for hackathon demos.',
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readCurrentMode() {
    try {
        const env = readFileSync(ENV_PATH, 'utf-8');
        const match = env.match(new RegExp(`^${ENV_KEY}=["']?(\\w+)["']?`, 'm'));
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function writeMode(mode) {
    let env;
    try {
        env = readFileSync(ENV_PATH, 'utf-8');
    } catch {
        env = '';
    }

    const line = `${ENV_KEY}="${mode}"`;
    const regex = new RegExp(`^${ENV_KEY}=.*$`, 'm');

    if (regex.test(env)) {
        env = env.replace(regex, line);
    } else {
        // Add after a blank line at the end, or create the section
        const section = `\n# Data Mode: live | mock | hybrid\n${line}\n`;
        env = env.trimEnd() + '\n' + section;
    }

    writeFileSync(ENV_PATH, env);
}

function printStatus(mode) {
    const info = MODES[mode];
    const color = mode === 'live' ? '\x1b[32m' : mode === 'mock' ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';
    console.log(`\n${color}✓ Data mode set to: ${info.label}${reset}`);
    console.log(`  ${info.description}\n`);
    console.log('  Restart the dev server for changes to take effect:');
    console.log('  \x1b[1mnpm run dev\x1b[0m\n');
}

// ─── Interactive Prompt ──────────────────────────────────────────────────────

async function promptUser() {
    const current = readCurrentMode() ?? 'hybrid';
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise((res) => rl.question(q, res));

    console.log('\n\x1b[1m⚕  Aegis Data Mode Selector\x1b[0m\n');
    console.log(`  Current mode: \x1b[1m${current}\x1b[0m\n`);

    const entries = Object.entries(MODES);
    entries.forEach(([key, { label, description }], i) => {
        const marker = key === current ? ' ← current' : '';
        console.log(`  ${i + 1}) ${label}${marker}`);
        console.log(`     ${description}`);
    });

    console.log();
    const answer = await ask('  Select mode [1-3]: ');
    rl.close();

    const index = parseInt(answer, 10) - 1;
    if (index < 0 || index >= entries.length) {
        console.log('\x1b[31m  Invalid selection. No changes made.\x1b[0m\n');
        process.exit(1);
    }

    return entries[index][0];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    const directArg = process.argv[2]?.toLowerCase();

    let mode;
    if (directArg && directArg in MODES) {
        mode = directArg;
    } else if (directArg) {
        console.error(`\x1b[31mUnknown mode "${directArg}". Valid modes: live, mock, hybrid\x1b[0m`);
        process.exit(1);
    } else {
        mode = await promptUser();
    }

    writeMode(mode);
    printStatus(mode);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
