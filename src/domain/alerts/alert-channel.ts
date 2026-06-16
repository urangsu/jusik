export type NotificationChannelId =
  | "web_inbox"
  | "console"
  | "telegram"
  | "kakao"
  | "email"
  | "web_push";

export type NotificationChannelStatus =
  | "enabled"
  | "disabled"
  | "api_required"
  | "permission_required"
  | "not_configured"
  | "error";

export type NotificationChannelProfile = {
  id: NotificationChannelId;
  displayName: string;
  status: NotificationChannelStatus;
  supportsRichMessage: boolean;
  supportsButtons: boolean;
  supportsMarkdown: boolean;
  supportsImages: boolean;
  supportsImmediateDelivery: boolean;
  riskLevel: "low" | "medium" | "high";
};
