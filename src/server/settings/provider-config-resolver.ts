import { ProviderId } from "../../domain/settings/provider-id";
import { PROVIDER_SETTING_DEFINITIONS } from "../../domain/settings/provider-setting-definition";
import { getProviderSettingsSync } from "./provider-settings-store";
import { getProviderSecretSync } from "./provider-secret-store";

export async function resolveProviderConfig(
  providerId: ProviderId
): Promise<Record<string, string | number | boolean | null>> {
  return resolveProviderConfigSync(providerId);
}

export function resolveProviderConfigSync(
  providerId: ProviderId
): Record<string, string | number | boolean | null> {
  const def = PROVIDER_SETTING_DEFINITIONS.find((d) => d.providerId === providerId);
  if (!def) {
    return {};
  }

  const storeRecord = getProviderSettingsSync(providerId);
  const config: Record<string, string | number | boolean | null> = {};

  for (const field of def.fields) {
    const envVarName = field.key;
    const envVal = process.env[envVarName];

    if (envVal !== undefined) {
      if (field.type === "boolean") {
        config[field.key] = envVal === "true";
      } else if (field.type === "number") {
        config[field.key] = parseInt(envVal, 10);
      } else {
        config[field.key] = envVal;
      }
    } else {
      if (field.secret) {
        const secretVal = getProviderSecretSync({ providerId, key: field.key });
        config[field.key] = secretVal;
      } else {
        const storeVal = storeRecord?.values[field.key];
        if (storeVal !== undefined) {
          config[field.key] = storeVal;
        } else {
          config[field.key] = field.defaultValue ?? null;
        }
      }
    }
  }

  return config;
}
