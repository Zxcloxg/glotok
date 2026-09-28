// Создаёт ключи для уведомлений и доступа: node scripts/gen-keys.mjs
// Результат пишется в secrets.local.json (в git не попадает).
import { writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (existsSync('secrets.local.json')) {
  console.log('secrets.local.json уже есть, новые ключи не создаю.');
  process.exit(0);
}
const { subtle } = globalThis.crypto;
const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await subtle.exportKey('jwk', kp.privateKey);
const pub = Buffer.from(await subtle.exportKey('raw', kp.publicKey)).toString('base64url');
const out = {
  VAPID_PUBLIC: pub,
  VAPID_PRIVATE_JWK: JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }),
  APP_KEY: randomBytes(18).toString('base64url'),
  ADMIN_KEY: randomBytes(12).toString('base64url')
};
writeFileSync('secrets.local.json', JSON.stringify(out, null, 2));
console.log('Готово: secrets.local.json');
