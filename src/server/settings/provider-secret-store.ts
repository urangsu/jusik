import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { ProviderId } from "../../domain/settings/provider-id";
import { MaskedSecretValue } from "../../domain/settings/provider-setting-snapshot";

// Statically resolved path to avoid Next.js dynamic asset tracing warning
const SECRETS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "secrets");
const SECRETS_PATH = path.join(SECRETS_DIR, "provider-secrets.json");

type SecretEntry = {
  value: string;
  updatedAt: string;
};

type SecretStoreData = Record<string, Record<string, SecretEntry>>;

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
  data[params.providerId][params.key] = {
    value: params.value,
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
  return providerSecrets[params.key].value;
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
  return providerSecrets[params.key].value;
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

  const { value, updatedAt } = providerSecrets[params.key];
  return {
    configured: true,
    maskedValue: maskSecret(value),
    updatedAt,
  };
}

export function maskSecret(val: string): string {
  if (!val) return "";
  if (val.length < 8) {
    return "********";
  }
  return `${val.substring(0, 4)}****${val.substring(val.length - 4)}`;
}
