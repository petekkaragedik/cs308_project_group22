const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY || '';
  if (hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

// Returns "ivHex:tagHex:ciphertextHex" or the original value if falsy
function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// Accepts the "ivHex:tagHex:ciphertextHex" format, returns plaintext
// Falls through for null/undefined or plaintext values (migration safety)
function decrypt(value) {
  if (!value) return value;
  const parts = value.split(':');
  if (parts.length !== 3) return value; // not encrypted yet — passthrough
  const [ivHex, tagHex, dataHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return value; // return raw if decryption fails (e.g. wrong key in dev)
  }
}

module.exports = { encrypt, decrypt };
