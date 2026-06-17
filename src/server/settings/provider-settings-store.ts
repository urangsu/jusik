import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { ProviderId } from "../../domain/settings/provider-id";
import { ProviderSettingSnapshot } from "../../domain/settings/provider-setting-snapshot";
import { PROVIDER_SETTING_DEFINITIONS } from "../../domain/settings/provider-setting-definition";
import { getMaskedProviderSecret, saveProviderSecret, getProviderSecret } from "./provider-secret-store";

const SETTINGS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "settings");
const SETTINGS_PATH = path.join(SETTINGS_DIR, "provider-settings.json");

type ProviderStoreRecord = {
  enabled: boolean;
  values: Record<string, string | number | boolean | null>;
  status: ProviderSettingSnapshot["status"];
  lastCheckedAt: string | null;
  message: string | null;
};

type SettingsStoreData = Record<string, ProviderStoreRecord>;

function readSettingsSync(): SettingsStoreData {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return {};
    }
    const content = fs.readFileSync(SETTINGS_PATH, "utf8");
    return JSON.parse(content) as SettingsStoreData;
  } catch (err) {
    return {};
  }
}

async function readSettingsAsync(): Promise<SettingsStoreData> {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return {};
    }
    const content = await fsPromises.readFile(SETTINGS_PATH, "utf8");
    return JSON.parse(content) as SettingsStoreData;
  } catch (err) {
    return {};
  }
}

async function writeSettingsAsync(data: SettingsStoreData): Promise<void> {
  await fsPromises.mkdir(SETTINGS_DIR, { recursive: true });
  await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function getProviderSettingsSync(providerId: ProviderId): ProviderStoreRecord | null {
  const data = readSettingsSync();
  return data[providerId] || null;
}

export async function getProviderSettings(providerId: ProviderId): Promise<ProviderSettingSnapshot> {
  const def = PROVIDER_SETTING_DEFINITIONS.find((d) => d.providerId === providerId);
  if (!def) {
    throw new Error(`정의되지 않은 Provider: ${providerId}`);
  }

  const storeData = await readSettingsAsync();
  const record = storeData[providerId] || {
    enabled: false,
    values: {},
    status: "not_configured",
    lastCheckedAt: null,
    message: null,
  };

  const values: ProviderSettingSnapshot["values"] = {};

  // For each field, resolve its value
  for (const field of def.fields) {
    const envVarName = field.key;
    
    if (field.secret) {
      // Secret values are masked in snapshots
      const masked = await getMaskedProviderSecret({ providerId, key: field.key });
      
      // But if there is an environment variable, mark it as configured from env
      if (process.env[envVarName]) {
        values[field.key] = {
          configured: true,
          maskedValue: "******** (Environment Variable)",
          updatedAt: new Date().toISOString(),
        };
      } else {
        values[field.key] = masked;
      }
    } else {
      // Non-secret values are read directly
      // Priority: env -> store -> default
      const envVal = process.env[envVarName];
      let resolvedVal: string | number | boolean | null = null;
      
      if (envVal !== undefined) {
        if (field.type === "boolean") {
          resolvedVal = envVal === "true";
        } else if (field.type === "number") {
          resolvedVal = parseInt(envVal, 10);
        } else {
          resolvedVal = envVal;
        }
      } else if (record.values[field.key] !== undefined) {
        resolvedVal = record.values[field.key];
      } else {
        resolvedVal = field.defaultValue ?? null;
      }
      values[field.key] = resolvedVal;
    }
  }

  // Determine actual enabled status
  const enabledKey = `${providerId.toUpperCase()}_ENABLED`;
  let isEnabled = false;
  if (process.env[enabledKey] !== undefined) {
    isEnabled = process.env[enabledKey] === "true";
  } else {
    isEnabled = !!values[enabledKey];
  }

  // Determine config status based on keys presence
  let status = record.status;
  if (status === "not_configured" || !status) {
    const hasKeys = def.fields
      .filter((f) => f.required && f.secret)
      .every((f) => {
        const envVal = process.env[f.key];
        const secretVal = values[f.key] as any;
        return !!envVal || (secretVal && secretVal.configured);
      });
    status = hasKeys ? "configured" : "not_configured";
  }

  return {
    providerId,
    enabled: isEnabled,
    values,
    status,
    lastCheckedAt: record.lastCheckedAt,
    message: record.message,
  };
}

export async function updateProviderSettings(
  providerId: ProviderId,
  submittedValues: Record<string, string | number | boolean>
): Promise<ProviderSettingSnapshot> {
  const def = PROVIDER_SETTING_DEFINITIONS.find((d) => d.providerId === providerId);
  if (!def) {
    throw new Error(`정의되지 않은 Provider: ${providerId}`);
  }

  const storeData = await readSettingsAsync();
  const record = storeData[providerId] || {
    enabled: false,
    values: {},
    status: "not_configured",
    lastCheckedAt: null,
    message: null,
  };

  // Separate secrets and non-secrets
  for (const field of def.fields) {
    const val = submittedValues[field.key];
    if (val === undefined) continue;

    if (field.secret) {
      // Only update secret if a new value is submitted
      if (typeof val === "string" && val.trim().length > 0 && !val.includes("****")) {
        await saveProviderSecret({
          providerId,
          key: field.key,
          value: val.trim(),
        });
      }
    } else {
      record.values[field.key] = val;
    }
  }

  // Check if enabled toggle changed
  const enabledKey = `${providerId.toUpperCase()}_ENABLED`;
  if (submittedValues[enabledKey] !== undefined) {
    record.enabled = submittedValues[enabledKey] === true;
  }

  // Reset status to configured (or not_configured) since settings were modified
  const hasSecrets = def.fields
    .filter((f) => f.required && f.secret)
    .every(async (f) => {
      if (process.env[f.key]) return true;
      const secretVal = await getProviderSecret({ providerId, key: f.key });
      return !!secretVal;
    });

  record.status = (await hasSecrets) ? "configured" : "not_configured";
  record.lastCheckedAt = new Date().toISOString();
  record.message = "설정이 저장되었습니다.";

  storeData[providerId] = record;
  await writeSettingsAsync(storeData);

  return getProviderSettings(providerId);
}

export async function updateProviderStatus(
  providerId: ProviderId,
  status: ProviderSettingSnapshot["status"],
  message: string | null
): Promise<void> {
  const storeData = await readSettingsAsync();
  const record = storeData[providerId] || {
    enabled: false,
    values: {},
    status: "not_configured",
    lastCheckedAt: null,
    message: null,
  };

  record.status = status;
  record.message = message;
  record.lastCheckedAt = new Date().toISOString();

  storeData[providerId] = record;
  await writeSettingsAsync(storeData);
}

export async function listProviderSettings(): Promise<ProviderSettingSnapshot[]> {
  const snapshots: ProviderSettingSnapshot[] = [];
  for (const def of PROVIDER_SETTING_DEFINITIONS) {
    const snap = await getProviderSettings(def.providerId);
    snapshots.push(snap);
  }
  return snapshots;
}
