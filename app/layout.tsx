import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ogawa Kintai",
  description: "店舗アルバイト向け勤怠管理システム",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ogawa Kintai",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center gap-0 px-4 py-3 sm:px-6 lg:px-8">
            <img src="/OGAWA-logo.png" alt="OGAWA" className="h-10 w-auto" />
            <img src="/coffee-logo.png" alt="Coffee" className="h-12 w-auto" />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
