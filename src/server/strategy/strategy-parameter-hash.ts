import crypto from "crypto";

export function createStrategyParameterHash(parameters: Record<string, unknown>): string {
  const serialize = (val: any): any => {
    if (val === undefined) {
      return undefined;
    }
    if (val === null) {
      return null;
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    if (Array.isArray(val)) {
      return val.map(serialize).filter((v) => v !== undefined);
    }
    if (typeof val === "object") {
      const sortedKeys = Object.keys(val).sort();
      const obj: Record<string, any> = {};
      for (const key of sortedKeys) {
        const sVal = serialize(val[key]);
        if (sVal !== undefined) {
          obj[key] = sVal;
        }
      }
      return obj;
    }
    return val;
  };

  const serialized = serialize(parameters) || {};
  const jsonStr = JSON.stringify(serialized);

  return crypto
    .createHash("sha256")
    .update(jsonStr)
    .digest("hex")
    .substring(0, 12);
}
