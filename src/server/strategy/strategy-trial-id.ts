import crypto from "crypto";

export function createStrategyTrialId(input: {
  strategyId: string;
  universeId: string;
  variantId: string;
  createdAt: string;
}): string {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");

  const strategyId = clean(input.strategyId);
  const universeId = clean(input.universeId);
  const variantId = clean(input.variantId);

  const d = new Date(input.createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  
  // Format: YYYYMMDDTHHmmSS
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const date = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const dateStr = `${year}${month}${date}T${hours}${minutes}${seconds}`;

  const hashInput = `${strategyId}_${universeId}_${variantId}_${input.createdAt}`;
  const shortHash = crypto
    .createHash("sha256")
    .update(hashInput)
    .digest("hex")
    .substring(0, 6);

  return `trial_${strategyId}_${universeId}_${variantId}_${dateStr}_${shortHash}`;
}
