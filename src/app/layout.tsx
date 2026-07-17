import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

// latin-ext covers Turkish glyphs (ş, ğ, İ …) so both locales render in
// the brand font instead of falling back mid-word.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "ApplyPilot AI — Tailor every job application with AI",
    template: "%s — ApplyPilot AI",
  },
  description:
    "Paste a job description and your resume. Get an AI fit score, skills-gap analysis, a tailored professional summary, and a ready-to-send cover letter.",
  openGraph: {
    title: "ApplyPilot AI",
    description:
      "AI-powered fit scores, skills-gap analysis, and cover letters for job seekers.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the locale cookie here renders every page server-side in the
  // selected language (no flash) and sets the document lang correctly.
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
