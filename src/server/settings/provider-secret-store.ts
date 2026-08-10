import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import crypto from "crypto";
import { ProviderId } from "../../domain/settings/provider-id";
import { MaskedSecretValue } from "../../domain/settings/provider-setting-snapshot";

// Statically resolved path to avoid Next.js dynamic asset tracing warning
const SECRETS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "secrets");
const SECRETS_PATH = path.join(SECRETS_DIR, "provider-secrets.json");

const ALGORITHM = "aes-256-gcm";

function getMasterKey(): Buffer {
  const seed =
    process.env.PROVIDER_SECRET_MASTER_KEY ||
    process.env.INTERNAL_SMOKE_KEY ||
    process.env.PROVIDER_ADMIN_TOKEN ||
    "k-terminal-local-secret-master-seed-key-32b";
  return crypto.createHash("sha256").update(seed).digest();
}

type StoredSecretEntry = {
  encrypted?: boolean;
  iv?: string; // hex
  tag?: string; // hex
  value: string; // ciphertext (or plaintext for legacy entries)
  updatedAt: string;
};

type SecretStoreData = Record<string, Record<string, StoredSecretEntry>>;

function encryptValue(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    tag,
  };
}

function decryptEntry(entry: StoredSecretEntry): string {
  if (!entry.encrypted || !entry.iv || !entry.tag) {
    // Legacy plaintext entry
    return entry.value;
  }
  try {
    const key = getMasterKey();
    const iv = Buffer.from(entry.iv, "hex");
    const tag = Buffer.from(entry.tag, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(entry.value, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // Return empty on decryption failure to prevent leaking or crashing
    return "";
  }
}

function readSecretsSync(): SecretStoreData {
  try {
    if (!fs.existsSync(SECRETS_PATH)) {
      return {};
    }
    const content = fs.readFileSync(SECRETS_PATH, "utf8");
    return JSON.parse(content) as SecretStoreData;
  } catch (err) {
    return {};
  }
}

async function readSecretsAsync(): Promise<SecretStoreData> {
  try {
    if (!fs.existsSync(SECRETS_PATH)) {
      return {};
    }
    const content = await fsPromises.readFile(SECRETS_PATH, "utf8");
    return JSON.parse(content) as SecretStoreData;
  } catch (err) {
    return {};
  }
}

async function writeSecretsAsync(data: SecretStoreData): Promise<void> {
  try {
    await fsPromises.mkdir(SECRETS_DIR, { recursive: true });
    // Try setting file permissions to 0600 (owner read/write only)
    await fsPromises.writeFile(SECRETS_PATH, JSON.stringify(data, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (err) {
    // Fallback if permission/mode setting fails on some platforms
    await fsPromises.writeFile(SECRETS_PATH, JSON.stringify(data, null, 2), "utf8");
  }
}

export async function saveProviderSecret(params: {
  providerId: ProviderId;
  key: string;
  value: string;
}): Promise<void> {
  const data = await readSecretsAsync();
  if (!data[params.providerId]) {
    data[params.providerId] = {};
  }
  const encrypted = encryptValue(params.value);
  data[params.providerId][params.key] = {
    encrypted: true,
    iv: encrypted.iv,
    tag: encrypted.tag,
    value: encrypted.ciphertext,
    updatedAt: new Date().toISOString(),
  };
  await writeSecretsAsync(data);
}

export async function getProviderSecret(params: {
  providerId: ProviderId;
  key: string;
}): Promise<string | null> {
  const data = await readSecretsAsync();
  const providerSecrets = data[params.providerId];
  if (!providerSecrets || !providerSecrets[params.key]) {
    return null;
  }
  const plaintext = decryptEntry(providerSecrets[params.key]);
  return plaintext || null;
}

export function getProviderSecretSync(params: {
  providerId: ProviderId;
  key: string;
}): string | null {
  const data = readSecretsSync();
  const providerSecrets = data[params.providerId];
  if (!providerSecrets || !providerSecrets[params.key]) {
    return null;
  }
  const plaintext = decryptEntry(providerSecrets[params.key]);
  return plaintext || null;
}

export async function deleteProviderSecret(params: {
  providerId: ProviderId;
  key: string;
}): Promise<void> {
  const data = await readSecretsAsync();
  const providerSecrets = data[params.providerId];
  if (providerSecrets && providerSecrets[params.key]) {
    delete providerSecrets[params.key];
    if (Object.keys(providerSecrets).length === 0) {
      delete data[params.providerId];
    }
    await writeSecretsAsync(data);
  }
}

export async function getMaskedProviderSecret(params: {
  providerId: ProviderId;
  key: string;
}): Promise<MaskedSecretValue> {
  const data = await readSecretsAsync();
  const providerSecrets = data[params.providerId];
  if (!providerSecrets || !providerSecrets[params.key]) {
    return {
      configured: false,
      maskedValue: null,
      updatedAt: null,
    };
  }

  const entry = providerSecrets[params.key];
  const plaintext = decryptEntry(entry);
  return {
    configured: true,
    maskedValue: maskSecret(plaintext),
    updatedAt: entry.updatedAt,
  };
}

export function maskSecret(val: string): string {
  if (!val) return "";
  if (val.length < 8) {
    return "********";
  }
  return `${val.substring(0, 4)}****${val.substring(val.length - 4)}`;
}
