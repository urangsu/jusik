import { NextRequest } from "next/server";
import { NotificationChannelProfile } from "@/domain/alerts/alert-channel";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(request: NextRequest) {
  void request;
  try {
    const channels: NotificationChannelProfile[] = [
      {
        id: "web_inbox",
        displayName: "Web Inbox (앱 내 알림)",
        status: process.env.WEB_INBOX_ENABLED !== "false" ? "enabled" : "disabled",
        supportsRichMessage: true,
        supportsButtons: true,
        supportsMarkdown: true,
        supportsImages: true,
        supportsImmediateDelivery: true,
        riskLevel: "low",
      },
      {
        id: "console",
        displayName: "Console (로그 출력)",
        status: process.env.CONSOLE_NOTIFICATION_ENABLED !== "false" ? "enabled" : "disabled",
        supportsRichMessage: false,
        supportsButtons: false,
        supportsMarkdown: false,
        supportsImages: false,
        supportsImmediateDelivery: true,
        riskLevel: "low",
      },
      {
        id: "telegram",
        displayName: "Telegram Bot (텔레그램)",
        status: process.env.TELEGRAM_ENABLED === "true" ? "enabled" : "disabled",
        supportsRichMessage: true,
        supportsButtons: true,
        supportsMarkdown: true,
        supportsImages: true,
        supportsImmediateDelivery: true,
        riskLevel: "medium",
      },
      {
        id: "kakao",
        displayName: "KakaoTalk (카카오톡)",
        status: process.env.KAKAO_ENABLED === "true" ? "enabled" : "disabled",
        supportsRichMessage: true,
        supportsButtons: false,
        supportsMarkdown: false,
        supportsImages: false,
        supportsImmediateDelivery: true,
        riskLevel: "medium",
      },
      {
        id: "email",
        displayName: "Email (이메일)",
        status: process.env.EMAIL_ENABLED === "true" ? "enabled" : "disabled",
        supportsRichMessage: true,
        supportsButtons: false,
        supportsMarkdown: true,
        supportsImages: false,
        supportsImmediateDelivery: false,
        riskLevel: "low",
      },
    ];

    return createSafeResponse({ channels });
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 500);
  }
}

export const dynamic = "force-dynamic";
