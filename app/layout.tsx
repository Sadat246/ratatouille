import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ratatouille.vercel.app"),
  title: {
    default: "Ratatouille",
    template: "%s | Ratatouille",
  },
  description:
    "A marketplace for sealed grocery deals that move fast before expiry.",
  applicationName: "Ratatouille",
  icons: {
    icon: [
      { url: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Ratatouille",
    description:
      "Auction sealed grocery deals before they expire, with separate shopper and business shells.",
    siteName: "Ratatouille",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f75d36",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} scroll-smooth`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
