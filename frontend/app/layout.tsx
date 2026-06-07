import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INFODOG",
  description: "INFODOG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center">{children}</body>
    </html>
  );
}
