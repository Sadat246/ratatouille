import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ratatouille",
  description: "Foundation for a mobile-first marketplace for sealed grocery deals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
