import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K-Terminal - 개인투자용 금융 터미널",
  description: "미국주식과 한국주식을 함께 분석하는 개인투자용 한국어 금융 터미널의 첫 번째 기반",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
