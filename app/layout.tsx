import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FF9900",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Zee Sip Rewards",
  description:
    "Zee Sip Rewards is almost here. Spin, win Sip Coins and unlock free Zee Sip.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-amber-500 text-slate-900 selection:bg-amber-300 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
