import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
