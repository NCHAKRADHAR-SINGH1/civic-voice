import type { Metadata } from "next";
import { Space_Grotesk, Sora } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { SiteHeader } from "@/components/site-header";

const heading = Sora({ subsets: ["latin"], variable: "--font-heading" });
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Civic Voice",
  description: "Citizen-first civic issue reporting and escalation platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${body.variable}`}>
        <I18nProvider>
          <div className="mx-auto min-h-screen max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
            <div className="page-shell soft-grid">
              <SiteHeader />
              {children}
            </div>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
