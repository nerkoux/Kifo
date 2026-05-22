import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "../components/app-providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kifo - AI Discord Automation Platform",
  description: "Build powerful Discord automations with AI-powered workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
