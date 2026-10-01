import type { Metadata, Viewport } from "next";
import { Anton, Montserrat } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const montserrat = Montserrat({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#B92429",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Zee Sip Rewards",
  description: "Spin, win Sip Coins, and unlock free Zee Sip beverages!",
  icons: {
    icon: "/zeesip-logo.png",
    shortcut: "/zeesip-logo.png",
    apple: "/zeesip-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anton.variable} ${montserrat.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://ooziftqctxziegrrrmdv.supabase.co" />
      </head>
      <body className="min-h-full bg-[#3D0B0E] text-[#3D0B0E] flex justify-center items-stretch selection:bg-[#FFC93C] selection:text-[#3D0B0E]">
        <div className="w-full max-w-[390px] min-h-[100dvh] relative flex flex-col shadow-2xl overflow-x-hidden bg-[#FFF5F3]">
          {children}
        </div>
      </body>
    </html>
  );
}
