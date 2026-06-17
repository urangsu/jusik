import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getServerLocale } from "@/i18n/server-locale";
import { ThemeScript } from "@/theme/theme-script";
import { ThemeProvider } from "@/theme/theme-context";
import { resolveServerTheme } from "@/theme/theme-storage";
import "./globals.css";

export const metadata: Metadata = {
  title: "K-Terminal - 개인투자용 금융 터미널",
  description:
    "미국주식과 한국주식을 함께 분석하는 개인투자용 한국어 금융 터미널의 첫 번째 기반",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  // Resolve theme from cookie for SSR (no searchParams at layout level)
  let initialTheme = "dark";
  try {
    const cookieStore = await cookies();
    const cookieStr = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    initialTheme = resolveServerTheme(undefined, cookieStr);
  } catch {
    // cookies() unavailable in static generation — use default
  }

  return (
    <html lang={locale} className="h-full" data-theme={initialTheme}>
      <head>
        {/* Inline script runs before first paint to prevent theme flash */}
        <ThemeScript initialTheme={initialTheme} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={initialTheme as "dark" | "light" | "system"}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
