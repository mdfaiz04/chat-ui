import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { SidebarProvider } from "@/lib/context/SidebarContext";

// Load the Inter font — a clean, modern font great for UIs
const inter = Inter({
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
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}