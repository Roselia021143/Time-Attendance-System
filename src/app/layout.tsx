import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ลงเวลาเข้า-ออกงาน" };
export const viewport: Viewport = { themeColor: "#0284c7", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" />
      </head>
      <body className="min-h-dvh bg-gradient-to-b from-sky-50 to-white font-sans text-slate-800 antialiased">{children}</body>
    </html>
  );
}
