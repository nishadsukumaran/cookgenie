import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ProjectTracker } from "@/components/debug/project-tracker";
import { AnalyticsPanel } from "@/components/debug/analytics-panel";
import "./globals.css";

const headingFont = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const monoFont = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CookGenie — Never Mess Up a Dish Again",
  description:
    "AI-powered cooking assistant that helps you find the best recipes, adapt them intelligently, and rescue you in real time.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CookGenie",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FAFAF7",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <TooltipProvider>
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <BottomNav />
            <ProjectTracker />
            <AnalyticsPanel />
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
