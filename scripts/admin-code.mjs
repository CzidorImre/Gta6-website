#!/usr/bin/env node
// Prints the current TOTP code for the LOCAL seeded admin (admin@wantedlevel.test), so you can
// pass the MFA screen without an authenticator app. The secret only exists in supabase/seed.sql.
import { createHmac } from 'node:crypto';

const SECRET = 'WANTEDLEVELLOCALADMINTOTPSEED234';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const bits = [...SECRET].map((c) => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('');
const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
const counter = Buffer.alloc(8);
counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
const hmac = createHmac('sha1', key).update(counter).digest();
const offset = hmac[hmac.length - 1] & 0xf;
const code = String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
console.log(`${code}  (valid for ${secondsLeft}s)`);
