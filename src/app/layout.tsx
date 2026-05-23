import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";
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
  title: "HA Device Manager",
  description: "Manage Home Assistant devices, areas, and entity names",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <Providers>
          <Nav />
          <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">{children}</main>
          <footer className="mx-auto max-w-[1600px] px-6 pb-8 text-center text-xs text-muted-foreground">
            Connected to Home Assistant · Changes apply to your live instance
          </footer>
        </Providers>
      </body>
    </html>
  );
}
