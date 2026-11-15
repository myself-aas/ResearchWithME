import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/**
 * Derives a 32-byte key from the encryption secret using scrypt.
 * The secret should be set via ENCRYPTION_SECRET environment variable.
 */
async function getEncryptionKey(): Promise<Buffer> {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is not set');
  }
  // Use a fixed salt for deterministic key derivation (in production, consider per-value salts)
  const salt = Buffer.from('researchwithme-linkedin-salt', 'utf8');
  return scryptAsync(secret, salt, 32) as Promise<Buffer>;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: iv:authTag:ciphertext
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, ciphertext]);
  return combined.toString('base64');
}

/**
 * Decrypts a base64-encoded string encrypted with encrypt().
 * Expects format: iv:authTag:ciphertext (base64 decoded)
 */
export async function decrypt(ciphertextB64: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Buffer.from(ciphertextB64, 'base64');
  
  // Extract components: iv (12 bytes) + authTag (16 bytes) + ciphertext (rest)
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const ciphertext = combined.subarray(28);
  
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  
  return plaintext.toString('utf8');
}