import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: "ADTO",
  title: {
    default: "ADTO | ACE Database and Tracking Operations",
    template: "%s | ADTO",
  },
  description:
    "ADTO centralizes ACE school operations, facilitator sessions, project tracking, inventory verification, reports, and implementation progress.",
  keywords: [
    "ADTO",
    "ACE Database and Tracking Operations",
    "ACE sessions",
    "facilitator workflow",
    "school implementation tracking",
    "inventory verification",
  ],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "ADTO | ACE Database and Tracking Operations",
    description:
      "Track ACE school implementation, facilitator sessions, projects, inventory, reports, and operational progress in one system.",
    url: "/",
    siteName: "ADTO",
    images: [
      {
        url: "/favicon.ico",
        width: 256,
        height: 256,
        alt: "ADTO logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ADTO | ACE Database and Tracking Operations",
    description:
      "Track ACE school implementation, facilitator sessions, projects, inventory, reports, and operational progress in one system.",
    images: ["/favicon.ico"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
