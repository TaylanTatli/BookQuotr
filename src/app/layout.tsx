import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dictionary = await getDictionary();
  const locale = await getLocale();

  return (
    <html lang={locale} className="dark">
      <body>
        <I18nProvider dictionary={dictionary} locale={locale}>
          <TooltipProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
