// Import the Geist font from Next.js built-in fonts
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

// Load the Geist font — a clean, modern font great for UIs
const geist = Geist({
  subsets: ["latin"], // Only load Latin characters (smaller file = faster load)
});

// Metadata appears in the browser tab and search engines
export const metadata: Metadata = {
  title: "AI Chat Assistant",
  description: "A modern chat interface powered by AI",
};

// RootLayout wraps EVERY page in the app
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}