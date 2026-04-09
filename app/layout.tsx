// Import the Geist font from Next.js built-in fonts
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";


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
// "children" is whatever page is currently being shown
export default function RootLayout({
  children,
}: {
  children: React.ReactNode; // ReactNode = any valid React content
}) {
  return (
    // suppressHydrationWarning prevents a warning caused by dark mode
    // class on <html> being set by JavaScript after the page loads
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} antialiased`}>
        {/* antialiased makes text look smoother on screens */}
        {children}
      </body>
    </html>
  );
}