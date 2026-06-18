import { AlertEvent } from "../../../domain/alerts/alert-event";

export function redactSensitiveConsoleData(text: string): string {
  if (!text) return text;
  
  let redacted = text;

  // Redact potential KIS account numbers (e.g. 12345678-01, 1234567801, or 8 consecutive digits followed by 2 digits)
  redacted = redacted.replace(/\b\d{8}[-\s]?\d{2}\b/g, "[ACCOUNT_REDACTED]");
  
  // Redact potential API keys (alphanumeric strings of length 16+ that could be keys, tokens, etc.)
  // e.g. "key=abcde..." or "token: xyz..."
  redacted = redacted.replace(/(key|token|secret|password|auth|pass)([\s:=]+)([a-zA-Z0-9_-]{12,})/gi, "$1$2[SECRET_REDACTED]");

  return redacted;
}

export async function sendConsoleNotification(event: AlertEvent): Promise<void> {
  const severityEmojiMap = {
    info: "ℹ️",
    watch: "👀",
    warning: "⚠️",
    critical: "🚨",
  };
  const emoji = severityEmojiMap[event.severity] || "🔔";
  const title = redactSensitiveConsoleData(event.titleKo || event.titleEn);
  const msg = redactSensitiveConsoleData(event.messageKo || event.messageEn);

  console.log(`\n=== [ALERT ${event.severity.toUpperCase()}] ${emoji} ===`);
  console.log(`Rule Type: ${event.ruleType}`);
  console.log(`Title: ${title}`);
  console.log(`Message: ${msg}`);
  if (event.symbol) console.log(`Asset: ${event.symbol}`);
  if (event.providerId) console.log(`Provider: ${event.providerId}`);
  console.log(`Occurred At: ${event.occurredAt}`);
  console.log(`==================================\n`);
}
