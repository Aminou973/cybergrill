#!/usr/bin/env node
/* Generate the admin_salt / admin_hash pair for config.yml.
     npm run passcode -- mypasscode                                        */
import { webcrypto as crypto } from 'node:crypto';

const pass = process.argv.slice(2).join(' ').trim();
if (!pass) { console.error('usage: npm run passcode -- <passcode>'); process.exit(1); }
if (pass.length < 4) { console.error('✗ use at least 4 characters'); process.exit(1); }

const ITER = 150000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, key, 256);
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

console.log('\nPaste these two lines into config.yml:\n');
console.log(`admin_salt: "${hex(salt)}"`);
console.log(`admin_hash: "${hex(bits)}"`);
console.log(`\nPasscode: ${pass}   (${ITER} PBKDF2 rounds)\n`);
