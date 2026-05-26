import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { FaviconAnimator } from "@/components/layout/FaviconAnimator";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lunarea - Sistem Manajemen Gudang",
  description: "Sistem Aplikasi Manajemen Gudang & Inventaris Modern",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <Providers>
          <FaviconAnimator />
          {children}
          <Toaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
