export type VetoSeverity = "info" | "warning" | "fatal";

export type VetoReason = {
  code: string;
  message: string;
  severity: VetoSeverity;
};
