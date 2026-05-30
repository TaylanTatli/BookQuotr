import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
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
  title: "BookQuotr",
  description: "Your personal book quotes manager",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

import { I18nProvider } from "@/i18n/client";
import { getDictionary, getLocale } from "@/i18n/server";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dictionary = await getDictionary();
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var fs = localStorage.getItem('bq_font_size');
  var fm = localStorage.getItem('bq_font_mode');
  if (fs) {
    var n = parseFloat(fs);
    if (!isNaN(n)) {
      if (fm === 'responsive') {
        var min = Math.max(12, n - 2);
        var max = Math.min(26, n + 4);
        var spread = max - min;
        document.documentElement.style.fontSize = 'clamp(' + min + 'px, calc(' + (min - 4) + 'px + ' + (spread / 16 * 100).toFixed(2) + 'vw), ' + max + 'px)';
      } else {
        document.documentElement.style.fontSize = n + 'px';
      }
    }
  }
} catch(e) {}
          `,
          }}
        />
        <ThemeProvider>
          <I18nProvider dictionary={dictionary} locale={locale}>
            <TooltipProvider>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
