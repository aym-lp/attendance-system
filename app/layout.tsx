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

const title = "勤怠管理システム";
const description = "小川珈琲和泉府中店 勤怠管理システム";
const iconVersion = "20260527";
const coffeeIcon = `/coffee-img.png?v=${iconVersion}` as const;
const faviconIcon = `/favicon.ico?v=${iconVersion}` as const;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [
      {
        url: coffeeIcon,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [coffeeIcon],
  },
  icons: {
    icon: [
      { url: coffeeIcon, type: "image/png" },
      { url: faviconIcon, rel: "icon", type: "image/x-icon" },
    ],
    shortcut: [{ url: coffeeIcon }],
    apple: [{ url: coffeeIcon, sizes: "180x180", type: "image/png" }],
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
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <img src="/OGAWA-logo.png" alt="OGAWA" className="h-10 w-auto" />
            <img src="/coffee-logo.png" alt="Coffee" className="h-12 w-auto" />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
