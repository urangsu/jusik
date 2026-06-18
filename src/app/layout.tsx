import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getServerLocale } from "@/i18n/server-locale";
import { ThemeScript } from "@/theme/theme-script";
import { ThemeProvider } from "@/theme/theme-context";
import {
  normalizeThemePreference,
  resolveThemeForServer,
} from "@/theme/theme-storage";
import { THEME_COOKIE_NAME, ThemePreference } from "@/theme/theme-types";
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

  // Resolve theme preference from cookie for SSR
  let themePreference: ThemePreference = "dark";
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(THEME_COOKIE_NAME)?.value;
    themePreference = normalizeThemePreference(cookieVal);
  } catch {
    // cookies() unavailable in static generation — use default
  }

  const resolvedTheme = resolveThemeForServer(themePreference);

  return (
    <html
      lang={locale}
      className="h-full"
      data-theme={resolvedTheme}
      data-theme-preference={themePreference}
      suppressHydrationWarning
    >
      <head>
        {/* Inline script runs before first paint to prevent theme flash */}
        <ThemeScript initialThemePreference={themePreference} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          initialThemePreference={themePreference}
          initialResolvedTheme={resolvedTheme}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
